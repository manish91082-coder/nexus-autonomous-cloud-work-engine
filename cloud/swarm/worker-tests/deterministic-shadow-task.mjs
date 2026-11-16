/**
 * Phase 59.54 — deterministic, non-provider shadow task path.
 * Test-harness-only; no network, model inference, provider, publication or payment.
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
  if (priorTask.status === "COMPLETED") return { status: "ALREADY_COMPLETED", resultHash: priorTask.result_hash, runId: priorTask.result_run_id, eventChainValid: true };
  if (priorTask.status === "DEAD_LETTER") throw new Error("SHADOW_TASK_DEAD_LETTERED");
  if (priorTask.owner_gate && !priorTask.owner_approved_at) return { status: "OWNER_APPROVAL_REQUIRED" };
  const claim = await rpc("claim", { taskId: task.taskId, workerId, leaseSeconds: 30 });
  if (claim.status !== "CLAIMED") return { status: claim.status || "CLAIM_FAILED" };
  const lease = { taskId: task.taskId, workerId, runId: claim.runId, fencingToken: claim.fencingToken };
  const first = await rpc("checkpoint", { ...lease, checkpointSeq: 1, checkpoint: { stage: "CLAIMED", fixtureVersion: "p59.54-v1" } });
  if (first.status !== "CHECKPOINT_SAVED") throw new Error("SHADOW_INITIAL_CHECKPOINT_FAILED");
  const output = {
    outcome: "DETERMINISTIC_SHADOW_VERIFIED",
    fixtureVersion: "p59.54-v1",
    taskId: task.taskId,
    taskType: task.taskType,
    payloadHash: task.payloadHash,
    policyHash: task.policyHash
  };
  return { status: "CHECKPOINTED", lease, output, outputHash: await sha256(canonical(output)) };
}

export async function resumeDeterministicShadowTask({ rpc, prepared }) {
  if (!prepared || prepared.status !== "CHECKPOINTED" || !prepared.lease) throw new TypeError("checkpointed execution state is required");
  const { lease, output, outputHash } = prepared;
  const second = await rpc("checkpoint", { ...lease, checkpointSeq: 2, checkpoint: { stage: "FIXTURE_COMPLETE", outputHash } });
  if (second.status !== "CHECKPOINT_SAVED") throw new Error("SHADOW_RESULT_CHECKPOINT_FAILED");
  const completed = await rpc("complete", { ...lease, result: { ...output, outputHash } });
  if (completed.status !== "COMPLETED") throw new Error(`SHADOW_COMPLETION_FAILED:${completed.status || "UNKNOWN"}`);
  const final = await rpc("snapshot", { taskId: lease.taskId });
  if (final.eventChainValid !== true || final.tasks?.[0]?.status !== "COMPLETED") throw new Error("SHADOW_FINAL_READBACK_FAILED");
  return { status: "COMPLETED", resultHash: completed.resultHash, runId: lease.runId, output, eventChainValid: final.eventChainValid };
}
