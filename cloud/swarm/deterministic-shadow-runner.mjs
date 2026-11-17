/**
 * Phase 59.54 — deterministic, provider-free shadow runner.
 *
 * Orchestrates the project-cell SwarmRunDO through an injected authenticated
 * RPC function. It has no fetch, provider, model, publisher, wallet or payment
 * capability. The fixture callback must be deterministic and side-effect-free.
 */
const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const HEX_SHA256 = /^[a-f0-9]{64}$/;

function requireOk(result, expected, action) {
  if (!result || !expected.includes(result.status)) {
    const reason = result?.error?.message || result?.reason || result?.status || "NO_RESULT";
    throw new Error(`SHADOW_RUNNER_${action.toUpperCase()}_FAILED:${reason}`);
  }
  return result;
}

function validateTask(task) {
  if (!task || task.projectId !== "P10CR"
    || !SAFE_ID.test(task.taskId || "")
    || !SAFE_ID.test(task.taskType || "")
    || !SAFE_ID.test(task.idempotencyKey || "")
    || !HEX_SHA256.test(task.payloadHash || "")
    || !HEX_SHA256.test(task.policyHash || "")
    || typeof task.ownerGate !== "boolean") {
    throw new TypeError("INVALID_SHADOW_TASK");
  }
}

async function sha256(value) {\n  const bytes = new TextEncoder().encode(value);\n  const hash = await crypto.subtle.digest("SHA-256", bytes);\n  return Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, "0")).join("");\n}\n\nfunction validateFixtureResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("FIXTURE_RESULT_MUST_BE_OBJECT");
  }
  const serialized = JSON.stringify(value);
  if (new TextEncoder().encode(serialized).byteLength > 12000) {
    throw new TypeError("FIXTURE_RESULT_TOO_LARGE");
  }
  return value;
}

/**
 * call(action, input) must route only to the authenticated SwarmRunDO RPC.
 * fixture(input) must be deterministic and must not perform I/O.
 */
export async function runDeterministicShadowTask({
  call, task, workerId, fixture, leaseSeconds = 60
}) {
  if (typeof call !== "function" || typeof fixture !== "function") {
    throw new TypeError("CALL_AND_FIXTURE_REQUIRED");
  }
  validateTask(task);
  if (!SAFE_ID.test(workerId || "")) throw new TypeError("INVALID_WORKER_ID");

  requireOk(await call("register", {
    taskId: task.taskId,
    projectId: task.projectId,
    taskType: task.taskType,
    idempotencyKey: task.idempotencyKey,
    payloadHash: task.payloadHash,
    policyHash: task.policyHash,
    ownerGate: task.ownerGate,
    maxAttempts: task.maxAttempts ?? 3
  }), ["REGISTERED", "DUPLICATE_TASK"], "register");

  let snapshot = requireOk(await call("snapshot", { taskId: task.taskId }), ["SNAPSHOT"], "snapshot");
  if (!snapshot.eventChainValid) throw new Error("EVENT_CHAIN_INVALID");
  let currentTask = snapshot.tasks.find(row => row.task_id === task.taskId);
  if (!currentTask) throw new Error("REGISTERED_TASK_MISSING_FROM_SNAPSHOT");
  if (currentTask.status === "COMPLETED") {
    return { status: "ALREADY_COMPLETED", taskId: task.taskId, resultHash: currentTask.result_hash, resumed: true };
  }
  if (currentTask.status === "DEAD_LETTER") throw new Error("TASK_DEAD_LETTERED");

  let lease = snapshot.leases.find(row => row.task_id === task.taskId);
  let resumed = false;
  if (currentTask.status === "LEASED" && lease?.worker_id === workerId && lease.expires_at > Math.floor(Date.now() / 1000)) {
    resumed = true;
  } else {
    const claim = await call("claim", { taskId: task.taskId, workerId, leaseSeconds });
    requireOk(claim, ["CLAIMED"], "claim");
    lease = {
      run_id: claim.runId,
      worker_id: workerId,
      fencing_token: claim.fencingToken
    };
  }
  if (!lease || lease.worker_id !== workerId || !lease.run_id
    || !Number.isSafeInteger(lease.fencing_token)) {
    throw new Error("CURRENT_RUN_LEASE_UNAVAILABLE");
  }

  const run = {
    taskId: task.taskId,
    workerId,
    runId: lease.run_id,
    fencingToken: lease.fencing_token
  };
  const priorCheckpoint = snapshot.checkpoints.find(row => row.task_id === task.taskId);
  let checkpointSeq = priorCheckpoint?.checkpoint_seq ?? 0;
  let fixtureResult;

  if (priorCheckpoint?.run_id === run.runId
    && priorCheckpoint?.fencing_token === run.fencingToken
    && checkpointSeq >= 2) {
    fixtureResult = priorCheckpoint.checkpoint_json
      ? JSON.parse(priorCheckpoint.checkpoint_json).fixtureResult
      : null;
    if (!fixtureResult) throw new Error("RESUME_FIXTURE_CHECKPOINT_INVALID");
  } else {
    if (checkpointSeq === 0) {
      requireOk(await call("checkpoint", {
        ...run,
        checkpointSeq: 1,
        checkpoint: { stage: "CLAIMED", taskId: task.taskId, runId: run.runId }
      }), ["CHECKPOINT_SAVED", "DUPLICATE_CHECKPOINT"], "checkpoint_claimed");
      checkpointSeq = 1;
    } else if (priorCheckpoint?.run_id !== run.runId
      || priorCheckpoint?.fencing_token !== run.fencingToken) {
      throw new Error("CHECKPOINT_RUN_FENCE_MISMATCH");
    }

    fixtureResult = validateFixtureResult(await fixture(fixtureInput));
    requireOk(await call("checkpoint", {
      ...run,
      checkpointSeq: checkpointSeq + 1,
      checkpoint: { stage: "FIXTURE_COMPLETED", taskId: task.taskId, runId: run.runId, fixtureResult }
    }), ["CHECKPOINT_SAVED", "DUPLICATE_CHECKPOINT"], "checkpoint_fixture");
  }

  const completed = requireOk(await call("complete", {
    ...run,
    result: {
      outcome: "DETERMINISTIC_SHADOW_FIXTURE_VERIFIED",
      taskId: task.taskId,
      runId: run.runId,
      fixtureResult
    }
  }), ["COMPLETED", "DUPLICATE_COMPLETION"], "complete");

  const finalSnapshot = requireOk(await call("snapshot", { taskId: task.taskId }), ["SNAPSHOT"], "final_snapshot");
  if (!finalSnapshot.eventChainValid) throw new Error("FINAL_EVENT_CHAIN_INVALID");
  const finalTask = finalSnapshot.tasks.find(row => row.task_id === task.taskId);
  if (finalTask?.status !== "COMPLETED") throw new Error("FINAL_TASK_NOT_COMPLETED");

  return {
    status: completed.status,
    taskId: task.taskId,
    runId: run.runId,
    fencingToken: run.fencingToken,
    resumed,
    fixtureResult,
    eventChainValid: finalSnapshot.eventChainValid
  };
}
