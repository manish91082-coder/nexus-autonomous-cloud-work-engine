import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { createPlatformBudgetRpc } from "../platform-budget-rpc-client.mjs";
import { createSwarmRunRpc } from "../swarm-run-rpc-client.mjs";
import { dispatchMissionShadow } from "../mission-dispatcher-shadow.mjs";
import { runDeterministicSpecialistGraph } from "../specialist-graph.mjs";

const dispatcherIngressSecret = "dispatcher-ingress-test-secret-0123456789abcdef";
function budgetRpc() { return createPlatformBudgetRpc(env.PLATFORM_BUDGET, env); }
function swarmRpc() { return createSwarmRunRpc(env.SWARM_RUNS, env); }
function taskId(label) { return "p59-61-" + label + "-" + crypto.randomUUID(); }
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
async function resetBudget() {
  const result = await budgetRpc()("testReset", {});
  expect(result.status).toBe("TEST_RESET");
}
async function dispatchThroughService(input) {
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
        "x-nexus-dispatcher-signature": toBase64(signature)
      },
      body
    }
  ));
  return { httpStatus: response.status, ...(await response.json()) };
}
async function swarmSnapshot(taskIdValue) {
  return swarmRpc()("snapshot", { taskId: taskIdValue });
}
async function budgetSnapshot() {
  return budgetRpc()("snapshot", {});
}

describe("Phase 59.61 account-budget + durable mission dispatcher integration", () => {
  it("reserves before registration, settles after durable readback, suppresses duplicate delivery and fails closed on exhaustion", async () => {
    await resetBudget();
    const id = taskId("single-admission");
    const first = await dispatchThroughService(envelope(id, { candidate: "synthetic-only", claims: [] }));
    expect(first.httpStatus).toBe(200);
    expect(first.status).toBe("COMPLETED");
    expect(first.budgetStatus).toBe("SETTLED");
    expect(first.graphResult.capabilities.modelInference).toBe(false);
    expect(first.graphResult.capabilities.codeExecution).toBe(false);
    expect(first.graphResult.capabilities.repositoryWrite).toBe(false);
    expect(first.graphResult.capabilities.publication).toBe(false);

    const budgetAfterFirst = await budgetSnapshot();
    expect(budgetAfterFirst.eventChainValid).toBe(true);
    expect(budgetAfterFirst.reservations).toHaveLength(1);
    expect(budgetAfterFirst.reservations[0].status).toBe("SETTLED");
    expect(budgetAfterFirst.committed.dispatches).toBe(1);
    expect(budgetAfterFirst.reserved.dispatches).toBe(0);
    expect(budgetAfterFirst.uncertain.dispatches).toBe(0);

    const duplicate = await dispatchThroughService(envelope(id, { candidate: "synthetic-only", claims: [] }));
    expect(duplicate.httpStatus).toBe(200);
    expect(duplicate.status).toBe("DUPLICATE_SUPPRESSED");
    expect(duplicate.runId).toBe(first.runId);
    const budgetAfterDuplicate = await budgetSnapshot();
    expect(budgetAfterDuplicate.reservations).toHaveLength(1);
    expect(budgetAfterDuplicate.eventChainValid).toBe(true);

    const deniedId = taskId("budget-exhausted");
    const denied = await dispatchThroughService(envelope(deniedId, { candidate: "must-not-register" }));
    expect(denied.httpStatus).toBe(429);
    expect(denied.status).toBe("WAITING_FOR_BUDGET");
    const deniedTask = await swarmSnapshot(deniedId);
    expect(deniedTask.tasks).toHaveLength(0);
    const finalBudget = await budgetSnapshot();
    expect(finalBudget.reservations).toHaveLength(1);
    expect(finalBudget.eventChainValid).toBe(true);
  });

  it("recovers a checkpoint after simulated process death and settles the same reservation once", async () => {
    await resetBudget();
    const rpc = swarmRpc();
    const reserve = budgetRpc();
    const id = taskId("checkpoint-recovery");
    const payload = { candidate: "synthetic-recovery", evidence_proposals: [], claims: [] };
    let oldRun = null;
    let firstGraphCalls = 0;

    await expect(dispatchMissionShadow({
      rpc, budgetRpc: reserve, taskId: id, workerId: "p59-61-old-worker",
      workflowRunId: "run-before-crash", payload, leaseSeconds: 1,
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

    await new Promise(resolve => setTimeout(resolve, 1200));
    let resumedGraphCalls = 0;
    const resumed = await dispatchMissionShadow({
      rpc, budgetRpc: reserve, taskId: id, workerId: "p59-61-recovery-worker",
      workflowRunId: "run-after-crash", payload, leaseSeconds: 60,
      specialistGraph: input => {
        resumedGraphCalls += 1;
        return runDeterministicSpecialistGraph(input);
      }
    });
    expect(resumed.status).toBe("COMPLETED");
    expect(resumedGraphCalls).toBe(0);
    expect(resumed.runId).not.toBe(oldRun.runId);
    expect(resumed.fencingToken).toBeGreaterThan(oldRun.fencingToken);
    const budget = await budgetSnapshot();
    expect(budget.eventChainValid).toBe(true);
    expect(budget.reservations).toHaveLength(1);
    expect(budget.reservations[0].status).toBe("SETTLED");
  });

  it("recovers an ambiguous settlement acknowledgement through idempotent reservation readback", async () => {
    await resetBudget();
    const rpc = swarmRpc();
    const realBudgetRpc = budgetRpc();
    const id = taskId("ambiguous-settlement");
    const payload = { candidate: "synthetic-ambiguous", claims: [] };
    let firstSettlement = true;
    const ambiguousBudgetRpc = async (action, input) => {
      const result = await realBudgetRpc(action, input);
      if (action === "settle" && firstSettlement) {
        firstSettlement = false;
        throw new Error("SIMULATED_AMBIGUOUS_SETTLEMENT_ACK");
      }
      return result;
    };
    await expect(dispatchMissionShadow({
      rpc, budgetRpc: ambiguousBudgetRpc, taskId: id, workerId: "p59-61-ambiguous-worker",
      workflowRunId: "run-ambiguous-1", payload
    })).rejects.toThrow("SIMULATED_AMBIGUOUS_SETTLEMENT_ACK");

    const recovered = await dispatchMissionShadow({
      rpc, budgetRpc: realBudgetRpc, taskId: id, workerId: "p59-61-ack-recovery",
      workflowRunId: "run-ambiguous-2", payload
    });
    expect(recovered.status).toBe("DUPLICATE_SUPPRESSED");
    const budget = await budgetSnapshot();
    expect(budget.eventChainValid).toBe(true);
    expect(budget.reservations).toHaveLength(1);
    expect(budget.reservations[0].status).toBe("SETTLED");
    expect(budget.committed.dispatches).toBe(1);
    expect(budget.uncertain.dispatches).toBe(0);
  });

  it("does not register a task when the budget reservation is denied or unavailable", async () => {
    await resetBudget();
    const id = taskId("no-budget-no-register");
    const result = await dispatchMissionShadow({
      rpc: swarmRpc(),
      budgetRpc: async () => ({ status: "WAITING_FOR_BUDGET", resource: "dispatches" }),
      taskId: id, workerId: "p59-61-no-budget-worker", workflowRunId: "run-no-budget",
      payload: { candidate: "must-not-run" }
    });
    expect(result.status).toBe("WAITING_FOR_BUDGET");
    const snapshot = await swarmSnapshot(id);
    expect(snapshot.tasks).toHaveLength(0);
    expect(snapshot.eventChainValid).toBe(true);
  });
});
