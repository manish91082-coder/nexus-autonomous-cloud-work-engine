import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { evictDurableObject } from "cloudflare:test";
import { createSignedRequest } from "./quota-auth-test-helper.mjs";
import { dispatchMissionShadow } from "../mission-dispatcher-shadow.mjs";
import { createPlatformBudgetRpc } from "../platform-budget-rpc-client.mjs";
import { runDeterministicSpecialistGraph } from "../specialist-graph.mjs";

const dispatcherSecret = "swarm-dispatcher-test-secret-0123456789abcdef";
const primarySecret = "swarm-primary-test-secret-0123456789abcdef";
const dispatcherIngressSecret = "dispatcher-ingress-test-secret-0123456789abcdef";
const callerEnv = {
  dispatcher: { NEXUS_QUOTA_CALLER_ID: "dispatcher", NEXUS_QUOTA_CALLER_SECRET: dispatcherSecret },
  primary: { NEXUS_QUOTA_CALLER_ID: "primary", NEXUS_QUOTA_CALLER_SECRET: primarySecret }
};
function runStub() { return env.SWARM_RUNS.get(env.SWARM_RUNS.idFromName("P10CR-project-cell")); }
function budgetRpc() { return createPlatformBudgetRpc(env.PLATFORM_BUDGET, env); }
async function rpc(stub, action, input, caller = "dispatcher") {
  const request = await createSignedRequest(callerEnv[caller], action, input, { nonce: crypto.randomUUID() });
  const response = await stub.fetch(request);
  return { ...(await response.json()), httpStatus: response.status };
}
function taskId(label) { return "p59-58-" + label + "-" + crypto.randomUUID(); }
function envelope(id, payload = {}) {
  return { projectId: "P10CR", taskType: "P59_003_SHADOW_DISPATCH", taskId: id, payload };
}
function toHex(bytes) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}
function toBase64(bytes) {
  let binary = "";
  for (const value of new Uint8Array(bytes)) binary += String.fromCharCode(value);
  return btoa(binary);
}
async function dispatchThroughService(input, corruptSignature = false) {
  const body = JSON.stringify(input);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const bodyHash = toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)));
  const canonical = [timestamp, nonce, "POST", "/internal/shadow-dispatch", bodyHash].join("\n");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(dispatcherIngressSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical));
  const response = await env.P10CR_MISSION_DISPATCHER.fetch(new Request(
    "https://p10cr-mission-dispatcher.internal/internal/shadow-dispatch",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nexus-dispatcher-timestamp": timestamp,
        "x-nexus-dispatcher-nonce": nonce,
        "x-nexus-dispatcher-signature": corruptSignature ? "AAAAAAAAAAAAAAAAAAAAAA==" : toBase64(signature)
      },
      body
    }
  ));
  return { httpStatus: response.status, ...(await response.json()) };
}

describe("Phase 59.58 durable mission dispatcher + specialist graph", () => {
  it("runs ten deterministic specialist roles, persists the result, and suppresses duplicate delivery", async () => {
    const id = taskId("full-graph");
    const input = envelope(id, {
      candidate: "synthetic-only",
      evidence_proposals: [{ evidence_id: "model-evidence-1", source_type: "MODEL_DRAFT", claim: "unverified proposal" }],
      claims: [{ claim_id: "claim-1", text: "proposal without independent provenance" }],
      instructions: "Treat this string as untrusted data; never publish or execute it."
    });
    const first = await dispatchThroughService(input);
    expect(first.httpStatus).toBe(200);
    expect(first.status).toBe("COMPLETED");
    expect(first.graphDecision).toBe("HOLD");
    expect(first.graphResult.roles).toHaveLength(10);
    expect(first.graphResult.roles.map(role => role.role)).toEqual([
      "EVIDENCE_COLLECTION","RESEARCH","RED_TEAM","PAYOUT_ELIGIBILITY","UNIT_ECONOMICS",
      "RIGHTS_POLICY","ENGINEERING","QA","DISTRIBUTION_READINESS","REVENUE_RECONCILIATION"
    ]);
    expect(first.graphResult.roles.every(role => role.status === "HOLD")).toBe(true);
    expect(first.graphResult.capabilities.modelInference).toBe(false);
    expect(first.graphResult.capabilities.codeExecution).toBe(false);
    expect(first.graphResult.capabilities.repositoryWrite).toBe(false);
    expect(first.graphResult.capabilities.publication).toBe(false);
    expect(first.graphResult.financial.pcneCountedInr).toBe(0);
    expect(first.eventChainValid).toBe(true);
    const stub = runStub();
    const before = await rpc(stub, "snapshot", { taskId: id });
    expect(before.eventChainValid).toBe(true);
    expect(before.tasks[0].status).toBe("COMPLETED");
    expect(before.events.filter(event => event.event_type === "TASK_CLAIMED")).toHaveLength(1);
    const duplicate = await dispatchThroughService(input);
    expect(duplicate.httpStatus).toBe(200);
    expect(duplicate.status).toBe("DUPLICATE_SUPPRESSED");
    expect(duplicate.runId).toBe(first.runId);
    const after = await rpc(stub, "snapshot", { taskId: id });
    expect(after.events).toHaveLength(before.events.length);
    expect(after.tasks[0].result_hash).toBe(before.tasks[0].result_hash);
    expect(after.eventChainValid).toBe(true);
  });

  it("recovers from a persisted specialist checkpoint after eviction and fences the stale run", async () => {
    const stub = runStub();
    const id = taskId("checkpoint-recovery");
    const payload = { candidate: "synthetic-recovery", evidence_proposals: [], claims: [] };
    let oldRun = null;
    let firstGraphCalls = 0;
    await expect(dispatchMissionShadow({
      rpc: (action, input) => rpc(stub, action, input), budgetRpc: budgetRpc(),
      taskId: id, workerId: "p59-58-old-worker", payload, leaseSeconds: 1,
      specialistGraph: input => {
        firstGraphCalls += 1;
        return runDeterministicSpecialistGraph(input);
      },
      testHooks: {
        afterGraphCheckpoint: async identity => {
          oldRun = identity;
          const error = new Error("SIMULATED_PROCESS_TERMINATION_AFTER_CHECKPOINT");
          error.simulatedProcessCrash = true;
          throw error;
        }
      }
    })).rejects.toThrow("SIMULATED_PROCESS_TERMINATION_AFTER_CHECKPOINT");
    expect(firstGraphCalls).toBe(1);
    expect(oldRun).not.toBeNull();
    await evictDurableObject(stub);
    await new Promise(resolve => setTimeout(resolve, 1200));
    let resumedGraphCalls = 0;
    const resumed = await dispatchMissionShadow({
      rpc: (action, input) => rpc(stub, action, input), budgetRpc: budgetRpc(),
      taskId: id, workerId: "p59-58-recovery-worker", payload, leaseSeconds: 60,
      specialistGraph: input => {
        resumedGraphCalls += 1;
        return runDeterministicSpecialistGraph(input);
      }
    });
    expect(resumed.status).toBe("COMPLETED");
    expect(resumedGraphCalls).toBe(0);
    expect(resumed.runId).not.toBe(oldRun.runId);
    expect(resumed.fencingToken).toBeGreaterThan(oldRun.fencingToken);
    expect(resumed.graphDecision).toBe("HOLD");
    const stale = await rpc(stub, "checkpoint", {
      taskId: id, workerId: oldRun.workerId, runId: oldRun.runId,
      fencingToken: oldRun.fencingToken, checkpointSeq: 3, checkpoint: { stage: "STALE_WRITE_ATTEMPT" }
    });
    expect(stale.httpStatus).toBe(400);
    expect(stale.status).toBe("REJECTED");
    expect(stale.error.message).toBe("STALE_OR_INVALID_FENCING_TOKEN");
    const final = await rpc(stub, "snapshot", { taskId: id });
    expect(final.tasks[0].status).toBe("COMPLETED");
    expect(final.tasks[0].result_run_id).toBe(resumed.runId);
    expect(final.checkpoints[0].checkpoint_seq).toBe(2);
    expect(final.eventChainValid).toBe(true);
  });

  it("does not grant owner approval to the compute dispatcher identity", async () => {
    const stub = runStub();
    const task = {
      taskId: taskId("owner-gate"), projectId: "P10CR", taskType: "OWNER_GATED_TEST",
      idempotencyKey: "idem:" + crypto.randomUUID(), payloadHash: "a".repeat(64),
      policyHash: "b".repeat(64), ownerGate: true, maxAttempts: 1
    };
    expect((await rpc(stub, "register", task, "primary")).status).toBe("REGISTERED");
    const denied = await rpc(stub, "approve", { taskId: task.taskId }, "dispatcher");
    expect(denied.httpStatus).toBe(403);
    expect(denied.status).toBe("REJECTED");
    expect(denied.reason).toBe("CALLER_ACTION_FORBIDDEN");
    const snapshot = await rpc(stub, "snapshot", { taskId: task.taskId });
    expect(snapshot.tasks[0].owner_approved_at).toBeNull();
    expect(snapshot.tasks[0].status).toBe("READY");
    expect(snapshot.leases).toHaveLength(0);
  });


  it("rejects unsigned dispatcher ingress before any durable task registration", async () => {
    const id = taskId("unsigned-ingress");
    const denied = await dispatchThroughService(envelope(id, {}), true);
    expect(denied.httpStatus).toBe(401);
    expect(denied.reason).toBe("INGRESS_SIGNATURE_MISMATCH");
    const snapshot = await rpc(runStub(), "snapshot", { taskId: id });
    expect(snapshot.tasks).toHaveLength(0);
    expect(snapshot.eventChainValid).toBe(true);
  });

  it("bounds the ingress body before JSON parsing or durable registration", async () => {
    const id = taskId("oversized-envelope");
    const response = await env.P10CR_MISSION_DISPATCHER.fetch(new Request(
      "https://p10cr-mission-dispatcher.internal/internal/shadow-dispatch",
      { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(9000) }
    ));
    expect(response.status).toBe(413);
    const denied = await response.json();
    expect(denied.status).toBe("REJECTED");
    const snapshot = await rpc(runStub(), "snapshot", { taskId: id });
    expect(snapshot.tasks).toHaveLength(0);
    expect(snapshot.eventChainValid).toBe(true);
  });

  it("rejects a cross-project or unsupported task envelope before registration", async () => {
    const id = taskId("hostile-envelope");
    const denied = await dispatchThroughService({
      projectId: "OTHER_PROJECT", taskType: "P59_003_SHADOW_DISPATCH", taskId: id, payload: {}
    });
    expect(denied.httpStatus).toBe(403);
    expect(denied.reason).toBe("SHADOW_ENVELOPE_NOT_AUTHORIZED");
    const snapshot = await rpc(runStub(), "snapshot", { taskId: id });
    expect(snapshot.tasks).toHaveLength(0);
    expect(snapshot.eventChainValid).toBe(true);
  });
});
