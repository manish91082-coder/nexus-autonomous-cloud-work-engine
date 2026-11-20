/**
 * Phase 59.61 — durable P10CR mission dispatcher with account-budget gating.
 * Task payload is untrusted JSON; only deterministic specialist code is invoked.
 */
import { runDeterministicSpecialistGraph } from "./specialist-graph.mjs";
const encoder = new TextEncoder();
const TASK_TYPE = "P59_003_SHADOW_DISPATCH";
const BUDGET_PHASE = "P59.62";
const BUDGET_OPERATION = "p10cr.shadow.dispatch.v1";
const CANONICAL_REPOSITORY = "manish91082-coder/nexus-autonomous-cloud-work-engine";
const POLICY = {
  policyVersion: "P59.62-DISPATCH-POLICY-1", projectId: "P10CR", taskType: TASK_TYPE,
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
function budgetEvidence(kind, details) {
  return { kind, phase: BUDGET_PHASE, projectId: "P10CR", repository: CANONICAL_REPOSITORY, ...details };
}
async function readBudgetSnapshot(budgetRpc, reservationId) {
  const snapshot = requireStatus(await budgetRpc("snapshot", {}), ["SNAPSHOT"], "budget_snapshot");
  if (snapshot.eventChainValid !== true) throw new Error("DISPATCH_BUDGET_EVENT_CHAIN_INVALID");
  const reservation = snapshot.reservations?.find(row => row.reservationId === reservationId);
  if (!reservation) throw new Error("DISPATCH_BUDGET_RESERVATION_MISSING");
  return { snapshot, reservation };
}
async function settleBudget({ budgetRpc, budgetLease, outcome, evidence }) {
  const evidenceHash = await sha256(canonical(evidence));
  const settled = await budgetRpc("settle", {
    reservationId: budgetLease.reservationId,
    fencingToken: budgetLease.fencingToken,
    leaseVersion: budgetLease.leaseVersion,
    outcome,
    evidenceHash
  });
  if (!settled || !["SETTLED", "UNCERTAIN", "SETTLEMENT_ALREADY_APPLIED"].includes(settled.status)) {
    throw new Error("DISPATCH_BUDGET_SETTLEMENT_FAILED:" + String(settled?.status || "NO_RESULT"));
  }
  const readback = await readBudgetSnapshot(budgetRpc, budgetLease.reservationId);
  const expected = outcome === "UNCERTAIN" ? "UNCERTAIN" : "SETTLED";
  if (readback.reservation.status !== expected) throw new Error("DISPATCH_BUDGET_SETTLEMENT_READBACK_MISMATCH");
  return { reservationId: budgetLease.reservationId, status: readback.reservation.status, evidenceHash };
}
async function completedEvidence({ taskId, executionId, payloadHash, policyHash, task }) {
  if (task?.status !== "COMPLETED" || typeof task.result_hash !== "string" ||
      !/^[a-f0-9]{64}$/.test(task.result_hash) || typeof task.result_run_id !== "string") {
    throw new Error("DISPATCH_COMPLETION_EVIDENCE_INVALID");
  }
  return budgetEvidence("DURABLE_COMPLETION_READBACK", {
    taskId, executionId, payloadHash, policyHash,
    resultRunId: task.result_run_id, resultHash: task.result_hash,
    taskStatus: task.status, eventChainValid: true
  });
}
export async function dispatchMissionShadow({
  rpc, budgetRpc, taskId, workerId, payload, leaseSeconds = 60,
  workflowRunId = crypto.randomUUID(),
  specialistGraph = runDeterministicSpecialistGraph, testHooks = null
}) {
  if (typeof rpc !== "function" || typeof budgetRpc !== "function" || typeof specialistGraph !== "function") {
    throw new TypeError("DISPATCH_DEPENDENCIES_REQUIRED");
  }
  if (typeof taskId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(taskId)) throw new TypeError("INVALID_TASK_ID");
  if (typeof workerId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(workerId)) throw new TypeError("INVALID_WORKER_ID");
  if (typeof workflowRunId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(workflowRunId)) throw new TypeError("INVALID_WORKFLOW_RUN_ID");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("TASK_PAYLOAD_OBJECT_REQUIRED");
  if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 300) throw new TypeError("INVALID_LEASE_SECONDS");

  const payloadJson = canonical(payload);
  if (encoder.encode(payloadJson).byteLength > 8192) throw new TypeError("TASK_PAYLOAD_TOO_LARGE");
  const payloadHash = await sha256(payloadJson);
  const policyHash = await sha256(canonical(POLICY));
  const executionId = await sha256(canonical({ taskId, payloadHash, policyHash }));
  const idempotencyKey = "p10cr:p59-003-shadow:" + taskId;

  // Reserve the fixed server-owned resource vector before registering or claiming work.
  let reservationResult;
  try {
    reservationResult = await budgetRpc("reserve", {
      projectId: "P10CR", repository: CANONICAL_REPOSITORY,
      taskId: "P59-003", phaseId: BUDGET_PHASE, workflowRunId,
      executionId, operationId: BUDGET_OPERATION
    });
  } catch {
    return { status: "BUDGET_RESERVATION_OUTCOME_UNKNOWN", taskId };
  }
  if (reservationResult?.status === "WAITING_FOR_BUDGET") {
    return { status: "WAITING_FOR_BUDGET", taskId, resource: reservationResult.resource };
  }
  if (reservationResult?.status === "IDEMPOTENCY_CONFLICT") {
    return { status: "BUDGET_IDEMPOTENCY_CONFLICT", taskId };
  }
  if (!reservationResult || !["RESERVED", "DUPLICATE_RESERVATION"].includes(reservationResult.status)) {
    return { status: "BUDGET_RESERVATION_REJECTED", taskId, reason: reservationResult?.status || "NO_RESULT" };
  }
  const budgetLease = {
    reservationId: reservationResult.reservationId,
    fencingToken: reservationResult.fencingToken,
    leaseVersion: reservationResult.leaseVersion,
    status: reservationResult.status === "RESERVED" ? "RESERVED" : reservationResult.reservationStatus
  };
  if (typeof budgetLease.reservationId !== "string" ||
      !Number.isSafeInteger(budgetLease.fencingToken) ||
      !Number.isSafeInteger(budgetLease.leaseVersion)) {
    return { status: "BUDGET_RESERVATION_IDENTITY_INVALID", taskId };
  }
  if (budgetLease.status === "UNCERTAIN") return { status: "BUDGET_UNCERTAIN", taskId, reservationId: budgetLease.reservationId };

  if (budgetLease.status === "SETTLED") {
    const snapshot = requireStatus(await rpc("snapshot", { taskId }), ["SNAPSHOT"], "settled_budget_task_snapshot");
    if (snapshot.eventChainValid !== true) throw new Error("DISPATCH_EVENT_CHAIN_INVALID");
    const task = snapshot.tasks?.find(row => row.task_id === taskId);
    if (!task || task.status !== "COMPLETED") throw new Error("BUDGET_SETTLED_WITHOUT_DURABLE_COMPLETION");
    const budgetReadback = await readBudgetSnapshot(budgetRpc, budgetLease.reservationId);
    if (budgetReadback.reservation.status !== "SETTLED") throw new Error("DISPATCH_BUDGET_SETTLED_READBACK_INVALID");
    return { status: "DUPLICATE_SUPPRESSED", taskId, runId: task.result_run_id, resultHash: task.result_hash,
      budgetReservationId: budgetLease.reservationId, budgetStatus: "SETTLED", eventChainValid: true };
  }
  if (budgetLease.status !== "RESERVED") return { status: "BUDGET_RESERVATION_NOT_ACTIVE", taskId };

  let settlementAttempted = false;
  try {
    requireStatus(await rpc("register", {
      taskId, projectId: "P10CR", taskType: TASK_TYPE, idempotencyKey,
      payloadHash, policyHash, ownerGate: false, maxAttempts: 3
    }), ["REGISTERED", "DUPLICATE_TASK"], "register");

    let snapshot = requireStatus(await rpc("snapshot", { taskId }), ["SNAPSHOT"], "snapshot");
    if (snapshot.eventChainValid !== true) throw new Error("DISPATCH_EVENT_CHAIN_INVALID");
    const task = snapshot.tasks?.find(row => row.task_id === taskId);
    if (!task) throw new Error("DISPATCH_TASK_MISSING");

    if (task.status === "COMPLETED") {
      const evidence = await completedEvidence({ taskId, executionId, payloadHash, policyHash, task });
      settlementAttempted = true;
      const budgetResult = await settleBudget({ budgetRpc, budgetLease, outcome: "COMPLETED", evidence });
      return { status: "DUPLICATE_SUPPRESSED", taskId, runId: task.result_run_id, resultHash: task.result_hash,
        budgetReservationId: budgetResult.reservationId, budgetStatus: budgetResult.status, eventChainValid: true };
    }
    if (task.status === "DEAD_LETTER") {
      const evidenceHash = await sha256(canonical(budgetEvidence("DURABLE_DEAD_LETTER_READBACK", {
        taskId, executionId, payloadHash, policyHash, taskStatus: task.status, eventChainValid: true
      })));
      settlementAttempted = true;
      const budgetResult = await settleBudget({ budgetRpc, budgetLease, outcome: "FAILED",
        evidence: budgetEvidence("DURABLE_DEAD_LETTER_READBACK", { taskId, executionId, payloadHash, policyHash, taskStatus: task.status, evidenceHash }) });
      return { status: "DEAD_LETTER", taskId, budgetReservationId: budgetResult.reservationId, budgetStatus: budgetResult.status };
    }
    if (task.owner_gate && task.owner_approved_at === null) {
      settlementAttempted = true;
      const budgetResult = await settleBudget({ budgetRpc, budgetLease, outcome: "FAILED",
        evidence: budgetEvidence("OWNER_GATE_BLOCKED_BEFORE_CLAIM", { taskId, executionId, payloadHash, policyHash }) });
      return { status: "OWNER_APPROVAL_REQUIRED", taskId, budgetReservationId: budgetResult.reservationId };
    }

    const currentLease = snapshot.leases?.find(row => row.task_id === taskId);
    const now = Math.floor(Date.now() / 1000);
    if (task.status === "LEASED" && currentLease && currentLease.expires_at > now) {
      return { status: "BUSY", taskId, leaseExpiresAt: currentLease.expires_at,
        budgetReservationId: budgetLease.reservationId };
    }

    // Renew the budget lease immediately before claiming durable work.
    const heartbeat = await budgetRpc("heartbeat", {
      reservationId: budgetLease.reservationId,
      fencingToken: budgetLease.fencingToken,
      leaseVersion: budgetLease.leaseVersion
    });
    if (heartbeat?.status === "LEASE_EXPIRED_UNCERTAIN" || heartbeat?.status === "RESERVATION_NOT_ACTIVE") {
      return { status: "BUDGET_UNCERTAIN", taskId, reservationId: budgetLease.reservationId };
    }
    if (heartbeat?.status === "LEASE_RENEWED") budgetLease.leaseVersion = heartbeat.leaseVersion;
    else if (heartbeat?.status !== "LEASE_UNCHANGED") {
      throw new Error("DISPATCH_BUDGET_HEARTBEAT_FAILED:" + String(heartbeat?.status || "NO_RESULT"));
    }

    const claim = await rpc("claim", { taskId, workerId, leaseSeconds });
    if (claim?.status === "BUSY" || claim?.status === "LEASE_HELD") {
      return { status: "BUSY", taskId, budgetReservationId: budgetLease.reservationId };
    }
    requireStatus(claim, ["CLAIMED"], "claim");
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
    if (finalTask?.status !== "COMPLETED") throw new Error("DISPATCH_FINAL_READBACK_MISMATCH");
    const evidence = await completedEvidence({ taskId, executionId, payloadHash, policyHash, task: finalTask });
    settlementAttempted = true;
    const budgetResult = await settleBudget({ budgetRpc, budgetLease, outcome: "COMPLETED", evidence });
    const finalStatus = finalTask.result_run_id === run.runId && completed.status === "COMPLETED"
      ? "COMPLETED" : "DUPLICATE_SUPPRESSED";
    return {
      status: finalStatus, taskId, runId: finalTask.result_run_id,
      fencingToken: run.fencingToken, graphDecision: graphResult.decision,
      graphResult, graphResultHash: finalTask.result_hash, eventChainValid: final.eventChainValid,
      budgetReservationId: budgetResult.reservationId, budgetStatus: budgetResult.status
    };
  } catch (error) {
    // A simulated hard process death deliberately leaves the reservation untouched;
    // expiry/retry then follows the same conservative path as a real terminated isolate.
    if (budgetLease.status === "RESERVED" && !settlementAttempted && error?.simulatedProcessCrash !== true) {
      settlementAttempted = true;
      try {
        await settleBudget({
          budgetRpc, budgetLease, outcome: "UNCERTAIN",
          evidence: budgetEvidence("DISPATCH_ABORTED_OR_AMBIGUOUS", {
            taskId, executionId, payloadHash, policyHash,
            reason: String(error?.message || "UNKNOWN_FAILURE").slice(0, 128)
          })
        });
      } catch { /* retain the reservation; expiry/readback remains fail-closed */ }
    }
    throw error;
  }
}
