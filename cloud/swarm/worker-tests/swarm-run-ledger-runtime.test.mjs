import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { evictDurableObject } from "cloudflare:test";
import { createSignedRequest } from "./quota-auth-test-helper.mjs";

const PRIMARY = "swarm-primary-test-secret-0123456789abcdef";
const SECONDARY = "swarm-secondary-test-secret-0123456789abcdef";
const callerEnv = {
  primary: { NEXUS_QUOTA_CALLER_ID: "primary", NEXUS_QUOTA_CALLER_SECRET: PRIMARY },
  secondary: { NEXUS_QUOTA_CALLER_ID: "secondary", NEXUS_QUOTA_CALLER_SECRET: SECONDARY }
};
const taskId = label => `phase59-54-${label}-${crypto.randomUUID()}`;
async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, "0")).join("");
}
function stubFor(name = "P10CR-project-cell") {
  return env.SWARM_RUNS.get(env.SWARM_RUNS.idFromName(name));
}
async function rpc(stub, action, input, caller = "primary") {
  const request = await createSignedRequest(callerEnv[caller], action, input, { nonce: crypto.randomUUID() });
  const response = await stub.fetch(request);
  return { httpStatus: response.status, ...(await response.json()) };
}
async function register(stub, label, options = {}) {
  const id = taskId(label);
  const input = {
    taskId: id, projectId: "P10CR", taskType: "DETERMINISTIC_SHADOW_FIXTURE",
    idempotencyKey: `idem:${id}`, payloadHash: await digest(`payload:${id}`),
    policyHash: await digest(`policy:${id}`), ownerGate: options.ownerGate ?? false,
    maxAttempts: options.maxAttempts ?? 3
  };
  const result = await rpc(stub, "register", input);
  expect(result.status).toBe("REGISTERED");
  return input;
}

describe("Phase 59.53 project-cell durable swarm run ledger", () => {
  it("registers idempotently, enforces owner approval, checkpoints across eviction and completes once", async () => {
    const stub = stubFor();
    const task = await register(stub, "owner-gated", { ownerGate: true });
    const duplicate = await rpc(stub, "register", task);
    expect(duplicate.status).toBe("DUPLICATE_TASK");
    const conflict = await rpc(stub, "register", { ...task, payloadHash: await digest("conflicting-payload") });
    expect(conflict.status).toBe("REJECTED");
    expect(conflict.error.message).toBe("TASK_IDEMPOTENCY_CONFLICT");
    const wrongProject = await rpc(stub, "register", {
      ...task, taskId: taskId("wrong-project"), projectId: "OTHER_PROJECT",
      idempotencyKey: "idem:" + taskId("wrong-project")
    });
    expect(wrongProject.status).toBe("REJECTED");
    expect(wrongProject.error.message).toBe("PROJECT_CELL_IDENTITY_MISMATCH");

    const blocked = await rpc(stub, "claim", { taskId: task.taskId, workerId: "worker-a", leaseSeconds: 30 }, "secondary");
    expect(blocked.status).toBe("OWNER_APPROVAL_REQUIRED");
    const approved = await rpc(stub, "approve", { taskId: task.taskId });
    expect(approved.status).toBe("APPROVED");
    const claim = await rpc(stub, "claim", { taskId: task.taskId, workerId: "worker-a", leaseSeconds: 30 }, "secondary");
    expect(claim.status).toBe("CLAIMED");
    const checkpoint = await rpc(stub, "checkpoint", {
      taskId: task.taskId, workerId: "worker-a", runId: claim.runId, fencingToken: claim.fencingToken,
      checkpointSeq: 1, checkpoint: { stage: "evidence-collected", evidenceHash: await digest("fixture-evidence") }
    }, "secondary");
    expect(checkpoint.status).toBe("CHECKPOINT_SAVED");
    await evictDurableObject(stub);
    const recovered = await rpc(stub, "snapshot", { taskId: task.taskId });
    expect(recovered.eventChainValid).toBe(true);
    expect(recovered.tasks[0].status).toBe("LEASED");
    expect(recovered.checkpoints[0].checkpoint_seq).toBe(1);
    expect(recovered.checkpoints[0].checkpoint_hash).toBe(checkpoint.checkpointHash);
    expect(recovered.checkpoints[0].run_id).toBe(claim.runId);
    const duplicateCheckpoint = await rpc(stub, "checkpoint", {
      taskId: task.taskId, workerId: "worker-a", runId: claim.runId, fencingToken: claim.fencingToken,
      checkpointSeq: 1, checkpoint: { stage: "evidence-collected", evidenceHash: await digest("fixture-evidence") }
    }, "secondary");
    expect(duplicateCheckpoint.status).toBe("DUPLICATE_CHECKPOINT");
    const conflictingCheckpoint = await rpc(stub, "checkpoint", {
      taskId: task.taskId, workerId: "worker-a", runId: claim.runId, fencingToken: claim.fencingToken,
      checkpointSeq: 1, checkpoint: { stage: "evidence-collected", evidenceHash: await digest("altered-evidence") }
    }, "secondary");
    expect(conflictingCheckpoint.status).toBe("REJECTED");
    expect(conflictingCheckpoint.error.message).toBe("CHECKPOINT_SEQUENCE_CONFLICT");

    const completed = await rpc(stub, "complete", {
      taskId: task.taskId, workerId: "worker-a", runId: claim.runId, fencingToken: claim.fencingToken,
      result: { outcome: "SHADOW_FIXTURE_VERIFIED", evidenceHash: await digest("fixture-evidence") }
    }, "secondary");
    expect(completed.status).toBe("COMPLETED");
    const duplicateCompletion = await rpc(stub, "complete", {
      taskId: task.taskId, workerId: "worker-a", runId: claim.runId, fencingToken: claim.fencingToken,
      result: { outcome: "SHADOW_FIXTURE_VERIFIED", evidenceHash: await digest("fixture-evidence") }
    }, "secondary");
    expect(duplicateCompletion.status).toBe("DUPLICATE_COMPLETION");
    const terminalConflict = await rpc(stub, "complete", {
      taskId: task.taskId, workerId: "worker-a", runId: claim.runId, fencingToken: claim.fencingToken, result: { outcome: "ALTERED" }
    }, "secondary");
    expect(terminalConflict.status).toBe("REJECTED");
    expect(terminalConflict.error.message).toBe("TERMINAL_RESULT_CONFLICT");
    const final = await rpc(stub, "snapshot", { taskId: task.taskId });
    expect(final.tasks[0].status).toBe("COMPLETED");
    expect(final.leases).toHaveLength(0);
    expect(final.eventChainValid).toBe(true);
  });

  it("serializes two independently authenticated claimers to one active lease", async () => {
    const stub = stubFor();
    const task = await register(stub, "two-client-contention");
    const claims = await Promise.all([
      rpc(stub, "claim", { taskId: task.taskId, workerId: "worker-primary", leaseSeconds: 30 }, "primary"),
      rpc(stub, "claim", { taskId: task.taskId, workerId: "worker-secondary", leaseSeconds: 30 }, "secondary")
    ]);
    expect(claims.filter(x => x.status === "CLAIMED")).toHaveLength(1);
    expect(claims.filter(x => x.status === "BUSY")).toHaveLength(1);
    const snapshot = await rpc(stub, "snapshot", { taskId: task.taskId });
    expect(snapshot.leases).toHaveLength(1);
    expect(snapshot.eventChainValid).toBe(true);
  });

  it("recovers an expired lease and fences the stale worker after reclaim", async () => {
    const stub = stubFor();
    const task = await register(stub, "stale-fencing", { maxAttempts: 3 });
    const first = await rpc(stub, "claim", { taskId: task.taskId, workerId: "worker-old", leaseSeconds: 1 });
    expect(first.status).toBe("CLAIMED");
    await new Promise(resolve => setTimeout(resolve, 1200));
    const recovery = await rpc(stub, "recover", {});
    expect(recovery.status).toBe("RECOVERY_COMPLETE");
    expect(recovery.recovered).toBeGreaterThanOrEqual(1);
    const second = await rpc(stub, "claim", { taskId: task.taskId, workerId: "worker-old", leaseSeconds: 30 }, "secondary");
    expect(second.status).toBe("CLAIMED");
    expect(second.fencingToken).toBeGreaterThan(first.fencingToken);
    expect(second.runId).not.toBe(first.runId);
    const wrongRun = await rpc(stub, "heartbeat", {
      taskId: task.taskId, workerId: "worker-old", runId: first.runId, fencingToken: second.fencingToken, leaseSeconds: 30
    }, "secondary");
    expect(wrongRun.status).toBe("REJECTED");
    expect(wrongRun.error.message).toBe("STALE_OR_INVALID_FENCING_TOKEN");
    const stale = await rpc(stub, "checkpoint", {
      taskId: task.taskId, workerId: "worker-old", runId: first.runId, fencingToken: first.fencingToken,
      checkpointSeq: 1, checkpoint: { stale: true }
    });
    expect(stale.status).toBe("REJECTED");
    expect(stale.error.message).toBe("STALE_OR_INVALID_FENCING_TOKEN");
    const valid = await rpc(stub, "heartbeat", {
      taskId: task.taskId, workerId: "worker-old", runId: second.runId, fencingToken: second.fencingToken, leaseSeconds: 30
    }, "secondary");
    expect(valid.status).toBe("HEARTBEAT_RECORDED");
    expect((await rpc(stub, "snapshot", { taskId: task.taskId })).eventChainValid).toBe(true);
  });

  it("backs off retryable failures and dead-letters after the configured attempt budget", async () => {
    const stub = stubFor();
    const retryTask = await register(stub, "retry-backoff", { maxAttempts: 2 });
    const first = await rpc(stub, "claim", { taskId: retryTask.taskId, workerId: "worker-retry", leaseSeconds: 30 });
    const failed = await rpc(stub, "fail", { taskId: retryTask.taskId, workerId: "worker-retry", runId: first.runId, fencingToken: first.fencingToken, errorCode: "FIXTURE_RETRYABLE" });
    expect(failed.status).toBe("RETRY_SCHEDULED");
    expect((await rpc(stub, "claim", { taskId: retryTask.taskId, workerId: "worker-too-soon" })).status).toBe("BACKOFF");

    const deadTask = await register(stub, "dead-letter", { maxAttempts: 1 });
    const only = await rpc(stub, "claim", { taskId: deadTask.taskId, workerId: "worker-dead", leaseSeconds: 30 });
    const dead = await rpc(stub, "fail", { taskId: deadTask.taskId, workerId: "worker-dead", runId: only.runId, fencingToken: only.fencingToken, errorCode: "FIXTURE_PERMANENT_FAILURE" });
    expect(dead.status).toBe("DEAD_LETTER");
    const snapshot = await rpc(stub, "snapshot", {});
    expect(snapshot.tasks.find(x => x.task_id === deadTask.taskId).status).toBe("DEAD_LETTER");
    expect(snapshot.eventChainValid).toBe(true);
  });

  it("rejects replayed authentication nonces and unauthorized owner approvals", async () => {
    const stub = stubFor();
    const task = await register(stub, "auth-gates", { ownerGate: true });
    const nonce = crypto.randomUUID();
    const request = await createSignedRequest(callerEnv.secondary, "approve", { taskId: task.taskId }, { nonce });
    const denied = await stub.fetch(request);
    expect(denied.status).toBe(403);
    const primaryRequest = await createSignedRequest(callerEnv.primary, "snapshot", { taskId: task.taskId }, { nonce: crypto.randomUUID() });
    const replayRequest = primaryRequest.clone();
    expect((await stub.fetch(primaryRequest)).status).toBe(200);
    const replay = await stub.fetch(replayRequest);
    expect(replay.status).toBe(409);
    expect((await replay.json()).reason).toBe("AUTH_REPLAY_DETECTED");
  });
  
  it("resumes a deterministic non-provider shadow task from durable checkpoint after eviction and suppresses duplicate delivery", async () => {
    const { prepareDeterministicShadowTask, resumeDeterministicShadowTask } = await import("./deterministic-shadow-task.mjs");
    const stub = stubFor("P10CR-phase59-54-integrated-shadow");
    const task = await register(stub, "phase59-54-integrated-shadow");

    // Match the proven eviction pattern: one stub for the entire test. The RPC
    // callback is scoped to preparation and is no longer retained at eviction.
    const prepared = await (async () => {
      const rpcCall = (action, input, caller) => rpc(stub, action, input, caller);
      return prepareDeterministicShadowTask({
        rpc: rpcCall,
        task,
        workerId: "phase59-54-shadow-worker"
      });
    })();
    expect(prepared.status).toBe("CHECKPOINTED");
    expect(prepared.output).toBeUndefined();

    // Reconstruct the Durable Object. Resume receives only the lease identity
    // and must reload/verify the persisted checkpoint rather than memory output.
    await evictDurableObject(stub);

    const first = await resumeDeterministicShadowTask({
      rpc: (action, input, caller) => rpc(stub, action, input, caller),
      taskId: prepared.taskId,
      workerId: prepared.workerId,
      runId: prepared.runId,
      fencingToken: prepared.fencingToken
    });
    expect(first.status).toBe("COMPLETED");
    expect(first.output.outcome).toBe("DETERMINISTIC_SHADOW_VERIFIED");
    expect(first.output.fixtureVersion).toBe("p59.54-v2");
    expect(first.eventChainValid).toBe(true);

    const replay = await prepareDeterministicShadowTask({
      rpc: (action, input, caller) => rpc(stub, action, input, caller),
      task,
      workerId: "phase59-54-shadow-worker"
    });
    expect(replay.status).toBe("ALREADY_COMPLETED");
    expect(replay.resultHash).toBe(first.resultHash);

    const final = await rpc(stub, "snapshot", { taskId: task.taskId });
    expect(final.tasks[0].status).toBe("COMPLETED");
    expect(final.tasks[0].result_hash).toBe(first.resultHash);
    expect(final.tasks[0].result_run_id).toBe(first.runId);
    expect(final.leases).toHaveLength(0);
    expect(final.checkpoints).toHaveLength(1);
    expect(final.checkpoints[0].checkpoint_seq).toBe(2);
    expect(final.checkpoints[0].checkpoint_json).toContain("recoveredFromCheckpointSeq");
    expect(final.eventChainValid).toBe(true);
  });
});
