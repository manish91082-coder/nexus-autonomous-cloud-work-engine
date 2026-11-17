/**
 * Phase 59.54 — deterministic, non-provider shadow task path.
 * Test-harness-only; no network, model inference, provider, publication or payment.
 * Resume derives work only from the durable checkpoint read after reconstruction.
 */
const encoder = new TextEncoder();
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
const canonical = value => JSON.stringify(value);

export async function prepareDeterministicShadowTask({ rpc, task, workerId }) {
  if (typeof rpc !== "function") throw new TypeError("rpc callback is required");
  if (!task || typeof task !== "object" || typeof task.taskId !== "string") throw new TypeError("task identity is required");
  if (typeof workerId !== "string" || !workerId) throw new TypeError("workerId is required");
  const registration = await rpc("register", task);
  if (!["REGISTERED", "DUPLICATE_TASK"].includes(registration.status)) throw new Error(`SHADOW_REGISTRATION_FAILED:${registration.status || "UNKNOWN"}`);
  const prior = await rpc("snapshot", { taskId: task.taskId });
  if (prior.eventChainValid !== true) throw new Error("SHADOW_EVENT_CHAIN_INVALID");
  const priorTask = prior.tasks?.[0];
  if (!priorTask) throw new Error("SHADOW_TASK_NOT_FOUND");
  if (priorTask.status === "COMPLETED") {
    return { status: "ALREADY_COMPLETED", resultHash: priorTask.result_hash, runId: priorTask.result_run_id, eventChainValid: true };
  }
  if (priorTask.status === "DEAD_LETTER") throw new Error("SHADOW_TASK_DEAD_LETTERED");
  if (priorTask.owner_gate && !priorTask.owner_approved_at) return { status: "OWNER_APPROVAL_REQUIRED" };
  const claim = await rpc("claim", { taskId: task.taskId, workerId, leaseSeconds: 30 });
  if (claim.status !== "CLAIMED") return { status: claim.status || "CLAIM_FAILED" };
  const lease = { taskId: task.taskId, workerId, runId: claim.runId, fencingToken: claim.fencingToken };
  const checkpoint = {
    stage: "CLAIMED",
    fixtureVersion: "p59.54-v2",
    taskId: task.taskId,
    payloadHash: task.payloadHash,
    policyHash: task.policyHash
  };
  const saved = await rpc("checkpoint", { ...lease, checkpointSeq: 1, checkpoint });
  if (saved.status !== "CHECKPOINT_SAVED") throw new Error("SHADOW_INITIAL_CHECKPOINT_FAILED");
  // Return only lease identity. The result is intentionally not carried in memory.
  return { status: "CHECKPOINTED", ...lease };
}

export async function resumeDeterministicShadowTask({ rpc, taskId, workerId, runId, fencingToken }) {
  if (typeof rpc !== "function") throw new TypeError("rpc callback is required");
  if (typeof taskId !== "string" || typeof workerId !== "string" || typeof runId !== "string" || !Number.isSafeInteger(fencingToken)) {
    throw new TypeError("durable lease identity is required");
  }

  // Reconstruct the execution solely from the durable snapshot after DO eviction.
  const recovered = await rpc("snapshot", { taskId });
  if (recovered.eventChainValid !== true) throw new Error("SHADOW_RECOVERY_EVENT_CHAIN_INVALID");
  const task = recovered.tasks?.find(row => row.task_id === taskId);
  const lease = recovered.leases?.find(row => row.task_id === taskId);
  const checkpoint = recovered.checkpoints?.find(row => row.task_id === taskId);
  if (!task || task.status !== "LEASED" || !lease || !checkpoint) throw new Error("SHADOW_DURABLE_STATE_INCOMPLETE");
  if (lease.worker_id !== workerId || lease.run_id !== runId || lease.fencing_token !== fencingToken) {
    throw new Error("SHADOW_RECOVERED_LEASE_IDENTITY_MISMATCH");
  }
  if (checkpoint.run_id !== runId || checkpoint.fencing_token !== fencingToken || checkpoint.checkpoint_seq !== 1) {
    throw new Error("SHADOW_RECOVERED_CHECKPOINT_IDENTITY_MISMATCH");
  }
  if (await sha256(checkpoint.checkpoint_json) !== checkpoint.checkpoint_hash) throw new Error("SHADOW_RECOVERED_CHECKPOINT_HASH_INVALID");
  let persisted;
  try { persisted = JSON.parse(checkpoint.checkpoint_json); } catch { throw new Error("SHADOW_RECOVERED_CHECKPOINT_JSON_INVALID"); }
  if (persisted.stage !== "CLAIMED" || persisted.fixtureVersion !== "p59.54-v2" ||
      persisted.taskId !== taskId || persisted.payloadHash !== task.payload_hash || persisted.policyHash !== task.policy_hash) {
    throw new Error("SHADOW_RECOVERED_CHECKPOINT_CONTENT_MISMATCH");
  }

  const output = {
    outcome: "DETERMINISTIC_SHADOW_VERIFIED",
    fixtureVersion: persisted.fixtureVersion,
    taskId,
    taskType: task.task_type,
    payloadHash: task.payload_hash,
    policyHash: task.policy_hash
  };
  const outputHash = await sha256(canonical(output));
  const leaseIdentity = { taskId, workerId, runId, fencingToken };
  const second = await rpc("checkpoint", {
    ...leaseIdentity,
    checkpointSeq: 2,
    checkpoint: { stage: "FIXTURE_COMPLETE", outputHash, recoveredFromCheckpointSeq: 1 }
  });
  if (second.status !== "CHECKPOINT_SAVED") throw new Error("SHADOW_RESULT_CHECKPOINT_FAILED");
  const completed = await rpc("complete", { ...leaseIdentity, result: { ...output, outputHash } });
  if (completed.status !== "COMPLETED") throw new Error(`SHADOW_COMPLETION_FAILED:${completed.status || "UNKNOWN"}`);
  const final = await rpc("snapshot", { taskId });
  if (final.eventChainValid !== true || final.tasks?.[0]?.status !== "COMPLETED") throw new Error("SHADOW_FINAL_READBACK_FAILED");
  return { status: "COMPLETED", resultHash: completed.resultHash, runId, output, eventChainValid: final.eventChainValid };
}
