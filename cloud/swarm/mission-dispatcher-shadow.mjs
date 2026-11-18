/**
 * Phase 59.58 — durable P10CR mission-dispatcher shadow path.
 * Task payload is untrusted JSON; only deterministic specialist code is invoked.
 */
import { runDeterministicSpecialistGraph } from "./specialist-graph.mjs";
const encoder = new TextEncoder();
const TASK_TYPE = "P59_003_SHADOW_DISPATCH";
const POLICY = {
  policyVersion: "P59.58-DISPATCH-POLICY-1", projectId: "P10CR", taskType: TASK_TYPE,
  specialistGraph: "P59.58.SPECIALIST_GRAPH_V1", modelInference: false,
  externalNetwork: false, codeExecution: false, repositoryWrite: false,
  publication: false, payments: false, ownerApproval: false
};
function sortJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("NON_FINITE_JSON_NUMBER");
    return value;
  }
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object" ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new TypeError("UNSUPPORTED_JSON_VALUE");
  }
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (["__proto__", "prototype", "constructor"].includes(key)) throw new TypeError("UNSAFE_JSON_KEY");
    result[key] = sortJson(value[key]);
  }
  return result;
}
function canonical(value) { return JSON.stringify(sortJson(value)); }
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function requireStatus(result, allowed, action) {
  if (!result || !allowed.includes(result.status)) {
    const reason = result?.error?.message || result?.reason || result?.status || "NO_RESULT";
    throw new Error("DISPATCH_" + action.toUpperCase() + "_FAILED:" + String(reason).slice(0, 96));
  }
  return result;
}
async function readCheckpoint(row, taskId, payloadHash, policyHash) {
  if (!row) return null;
  if (await sha256(row.checkpoint_json) !== row.checkpoint_hash) throw new Error("DISPATCH_CHECKPOINT_HASH_INVALID");
  let checkpoint;
  try { checkpoint = JSON.parse(row.checkpoint_json); } catch { throw new Error("DISPATCH_CHECKPOINT_JSON_INVALID"); }
  if (checkpoint.taskId !== taskId || checkpoint.payloadHash !== payloadHash || checkpoint.policyHash !== policyHash) {
    throw new Error("DISPATCH_CHECKPOINT_IDENTITY_MISMATCH");
  }
  if (checkpoint.runId !== row.run_id || checkpoint.fencingToken !== row.fencing_token) {
    throw new Error("DISPATCH_CHECKPOINT_FENCE_MISMATCH");
  }
  return checkpoint;
}

export async function dispatchMissionShadow({
  rpc, taskId, workerId, payload, leaseSeconds = 60,
  specialistGraph = runDeterministicSpecialistGraph, testHooks = null
}) {
  if (typeof rpc !== "function" || typeof specialistGraph !== "function") throw new TypeError("DISPATCH_DEPENDENCIES_REQUIRED");
  if (typeof taskId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(taskId)) throw new TypeError("INVALID_TASK_ID");
  if (typeof workerId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(workerId)) throw new TypeError("INVALID_WORKER_ID");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("TASK_PAYLOAD_OBJECT_REQUIRED");
  if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 300) throw new TypeError("INVALID_LEASE_SECONDS");

  const payloadJson = canonical(payload);
  if (encoder.encode(payloadJson).byteLength > 8192) throw new TypeError("TASK_PAYLOAD_TOO_LARGE");
  const payloadHash = await sha256(payloadJson);
  const policyHash = await sha256(canonical(POLICY));
  const idempotencyKey = "p10cr:p59-003-shadow:" + taskId;

  requireStatus(await rpc("register", {
    taskId, projectId: "P10CR", taskType: TASK_TYPE, idempotencyKey,
    payloadHash, policyHash, ownerGate: false, maxAttempts: 3
  }), ["REGISTERED", "DUPLICATE_TASK"], "register");

  let snapshot = requireStatus(await rpc("snapshot", { taskId }), ["SNAPSHOT"], "snapshot");
  if (snapshot.eventChainValid !== true) throw new Error("DISPATCH_EVENT_CHAIN_INVALID");
  const task = snapshot.tasks?.find(row => row.task_id === taskId);
  if (!task) throw new Error("DISPATCH_TASK_MISSING");
  if (task.status === "COMPLETED") {
    return { status: "DUPLICATE_SUPPRESSED", taskId, runId: task.result_run_id, resultHash: task.result_hash, eventChainValid: true };
  }
  if (task.status === "DEAD_LETTER") return { status: "DEAD_LETTER", taskId };
  if (task.owner_gate && task.owner_approved_at === null) return { status: "OWNER_APPROVAL_REQUIRED", taskId };
  const currentLease = snapshot.leases?.find(row => row.task_id === taskId);
  const now = Math.floor(Date.now() / 1000);
  if (task.status === "LEASED" && currentLease && currentLease.expires_at > now) {
    return { status: "BUSY", taskId, leaseExpiresAt: currentLease.expires_at };
  }

  const claim = requireStatus(await rpc("claim", { taskId, workerId, leaseSeconds }), ["CLAIMED"], "claim");
  const run = { taskId, workerId, runId: claim.runId, fencingToken: claim.fencingToken };
  snapshot = requireStatus(await rpc("snapshot", { taskId }), ["SNAPSHOT"], "post_claim_snapshot");
  if (snapshot.eventChainValid !== true) throw new Error("DISPATCH_POST_CLAIM_CHAIN_INVALID");
  const checkpointRow = snapshot.checkpoints?.find(row => row.task_id === taskId);
  const checkpoint = await readCheckpoint(checkpointRow, taskId, payloadHash, policyHash);
  let graphResult;
  let graphResultHash;

  if (checkpoint?.stage === "SPECIALIST_GRAPH_COMPLETED") {
    graphResult = checkpoint.graphResult;
    graphResultHash = checkpoint.graphResultHash;
    if (!graphResult || typeof graphResult !== "object" || await sha256(canonical(graphResult)) !== graphResultHash) {
      throw new Error("DISPATCH_GRAPH_RESULT_HASH_INVALID");
    }
  } else {
    let checkpointSeq = checkpointRow?.checkpoint_seq ?? 0;
    if (checkpoint && checkpoint.stage !== "DISPATCH_STARTED") throw new Error("DISPATCH_CHECKPOINT_STAGE_INVALID");
    if (!checkpoint) {
      requireStatus(await rpc("checkpoint", {
        ...run, checkpointSeq: 1,
        checkpoint: {
          stage: "DISPATCH_STARTED", taskId, runId: run.runId, fencingToken: run.fencingToken,
          payloadHash, policyHash, graphVersion: POLICY.specialistGraph
        }
      }), ["CHECKPOINT_SAVED", "DUPLICATE_CHECKPOINT"], "start_checkpoint");
      checkpointSeq = 1;
    } else if (checkpointSeq !== 1) {
      throw new Error("DISPATCH_START_CHECKPOINT_SEQUENCE_INVALID");
    }

    graphResult = specialistGraph(payload);
    graphResultHash = await sha256(canonical(graphResult));
    requireStatus(await rpc("checkpoint", {
      ...run, checkpointSeq: checkpointSeq + 1,
      checkpoint: {
        stage: "SPECIALIST_GRAPH_COMPLETED", taskId, runId: run.runId, fencingToken: run.fencingToken,
        payloadHash, policyHash, graphVersion: POLICY.specialistGraph, graphResult, graphResultHash
      }
    }), ["CHECKPOINT_SAVED", "DUPLICATE_CHECKPOINT"], "graph_checkpoint");
    if (testHooks?.afterGraphCheckpoint) await testHooks.afterGraphCheckpoint({ ...run, graphResultHash });
  }

  const completed = requireStatus(await rpc("complete", {
    ...run,
    result: {
      outcome: "P59_003_SHADOW_DISPATCH_COMPLETED", taskId, runId: run.runId,
      graphVersion: POLICY.specialistGraph, graphDecision: graphResult.decision, graphResultHash
    }
  }), ["COMPLETED", "DUPLICATE_COMPLETION"], "complete");

  const final = requireStatus(await rpc("snapshot", { taskId }), ["SNAPSHOT"], "final_snapshot");
  if (final.eventChainValid !== true) throw new Error("DISPATCH_FINAL_CHAIN_INVALID");
  const finalTask = final.tasks?.find(row => row.task_id === taskId);
  if (finalTask?.status !== "COMPLETED" || finalTask.result_run_id !== run.runId) {
    throw new Error("DISPATCH_FINAL_READBACK_MISMATCH");
  }
  return {
    status: completed.status, taskId, runId: run.runId, fencingToken: run.fencingToken,
    graphDecision: graphResult.decision, graphResult, graphResultHash, eventChainValid: final.eventChainValid
  };
}
