import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";

const bindingA = () => env.PLATFORM_BUDGET_CALLER_A;
const bindingB = () => env.PLATFORM_BUDGET_CALLER_B;
const hash = value => "a".repeat(64) === value ? value : "b".repeat(64);
const base = (repository, executionId, workflowRunId, extra = {}) => ({
  projectId: "P10CR",
  repository,
  workflowRunId,
  taskId: "P59-003",
  phaseId: "P59.60",
  executionId,
  operationId: "p10cr.shadow.dispatch.v1",
  ...extra
});
async function call(binding, action, input) {
  const response = await binding.fetch(new Request("https://budget-test.internal/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, input })
  }));
  return { httpStatus: response.status, ...(await response.json()) };
}
async function reset() {
  const result = await call(bindingA(), "testReset", {});
  if (result.status !== "TEST_RESET") throw new Error("TEST_RESET_FAILED:" + JSON.stringify(result));
}
async function snapshot() {
  return await call(bindingA(), "snapshot", {});
}

describe("Phase 59.60 account-scope platform budget", () => {
  beforeEach(async () => reset());

  it("admits exactly the shared cap across two repository identities and four run identities", async () => {
    const attempts = Array.from({ length: 100 }, (_, index) => ({
      binding: index % 2 === 0 ? bindingA() : bindingB(),
      input: base(
        index % 2 === 0
          ? "synthetic-org/p10cr-shadow-repo-a"
          : "synthetic-org/p10cr-shadow-repo-b",
        "execution-" + String(index).padStart(3, "0"),
        "workflow-run-" + String(index % 4)
      )
    }));
    const results = await Promise.all(attempts.map(item => call(item.binding, "reserve", item.input)));
    const admitted = results.filter(result => result.status === "RESERVED");
    const denied = results.filter(result => result.status === "WAITING_FOR_BUDGET");
    expect(admitted).toHaveLength(8);
    expect(denied).toHaveLength(92);
    expect(results.every(result => result.httpStatus === 200 || result.httpStatus === 429)).toBe(true);

    for (const result of admitted) {
      const source = attempts.find(item => item.input.executionId === result.idempotencyKey.split("|")[4]);
      const settlement = await call(source.binding, "settle", {
        reservationId: result.reservationId,
        fencingToken: result.fencingToken,
        leaseVersion: result.leaseVersion,
        outcome: "COMPLETED",
        evidenceHash: hash(result.reservationId)
      });
      expect(settlement.status).toBe("SETTLED");
    }
    const state = await snapshot();
    expect(state.status).toBe("SNAPSHOT");
    expect(state.eventChainValid).toBe(true);
    expect(state.reservations).toHaveLength(8);
    expect(state.reserved.dispatches).toBe(0);
    expect(state.committed.dispatches).toBe(8);
    expect(state.uncertain.dispatches).toBe(0);
    expect(state.committed.do_requests).toBe(64);
    expect(state.control.budget_rpc_requests).toBe(109);
  });

  it("suppresses a retry in a different workflow run and preserves idempotency", async () => {
    const first = await call(bindingA(), "reserve", base(
      "synthetic-org/p10cr-shadow-repo-a", "same-logical-execution", "workflow-run-100"
    ));
    expect(first.status).toBe("RESERVED");
    const retry = await call(bindingB(), "reserve", base(
      "synthetic-org/p10cr-shadow-repo-a", "same-logical-execution", "workflow-run-999"
    ));
    expect(retry.status).toBe("DUPLICATE_RESERVATION");
    expect(retry.reservationId).toBe(first.reservationId);
    const state = await snapshot();
    expect(state.reservations).toHaveLength(1);
    expect(state.reserved.dispatches).toBe(1);
  });

  it("accepts P59.62 and suppresses a retry across distinct workflow runs", async () => {
    const first = await call(bindingA(), "reserve", base(
      "synthetic-org/p10cr-shadow-repo-a", "phase59-62-cross-run-execution", "phase59-62-run-a",
      { phaseId: "P59.62" }
    ));
    expect(first.status).toBe("RESERVED");
    const retry = await call(bindingB(), "reserve", base(
      "synthetic-org/p10cr-shadow-repo-a", "phase59-62-cross-run-execution", "phase59-62-run-b",
      { phaseId: "P59.62" }
    ));
    expect(retry.status).toBe("DUPLICATE_RESERVATION");
    expect(retry.reservationId).toBe(first.reservationId);
    const state = await snapshot();
    expect(state.reservations).toHaveLength(1);
    expect(state.reservations[0].workflowRunId).toBe("phase59-62-run-a");
    expect(state.reserved.dispatches).toBe(1);
    expect(state.eventChainValid).toBe(true);
  });

  it("partitions P59.63 test reservations by two fixed repository aliases across distinct workflow runs", async () => {
    const repoA = "synthetic-org/p10cr-shadow-repo-a";
    const repoB = "synthetic-org/p10cr-shadow-repo-b";
    const first = await call(bindingA(), "reserve", base(repoA, "phase63-shared-execution", "phase63-run-1", { phaseId: "P59.63" }));
    const second = await call(bindingB(), "reserve", base(repoB, "phase63-shared-execution", "phase63-run-2", { phaseId: "P59.63" }));
    expect(first.status).toBe("RESERVED");
    expect(second.status).toBe("RESERVED");
    const state = await snapshot();
    expect(state.reservations).toHaveLength(2);
    expect(state.reservations.map(row => row.phaseId)).toEqual(["P59.63", "P59.63"]);
    expect(new Set(state.reservations.map(row => row.repository))).toEqual(new Set([repoA, repoB]));
    expect(new Set(state.reservations.map(row => row.workflowRunId))).toEqual(new Set(["phase63-run-1", "phase63-run-2"]));
    expect(state.eventChainValid).toBe(true);
  });

  it("enforces fencing and lease-version progression before settlement", async () => {
    const created = await call(bindingA(), "reserve", base(
      "synthetic-org/p10cr-shadow-repo-a", "fenced-execution", "workflow-run-fence"
    ));
    expect(created.status).toBe("RESERVED");
    const staleFence = await call(bindingA(), "settle", {
      reservationId: created.reservationId,
      fencingToken: created.fencingToken + 1,
      leaseVersion: created.leaseVersion,
      outcome: "COMPLETED",
      evidenceHash: hash("stale-fence")
    });
    expect(staleFence.status).toBe("STALE_FENCE_REJECTED");

    const renewed = await call(bindingA(), "heartbeat", {
      reservationId: created.reservationId,
      fencingToken: created.fencingToken,
      leaseVersion: created.leaseVersion,
      extensionSeconds: 60
    });
    expect(renewed.status).toBe("LEASE_RENEWED");
    expect(renewed.leaseVersion).toBe(created.leaseVersion + 1);

    const staleVersion = await call(bindingA(), "settle", {
      reservationId: created.reservationId,
      fencingToken: created.fencingToken,
      leaseVersion: created.leaseVersion,
      outcome: "COMPLETED",
      evidenceHash: hash("stale-version")
    });
    expect(staleVersion.status).toBe("STALE_FENCE_REJECTED");

    const settled = await call(bindingA(), "settle", {
      reservationId: created.reservationId,
      fencingToken: renewed.fencingToken,
      leaseVersion: renewed.leaseVersion,
      outcome: "COMPLETED",
      evidenceHash: hash("valid-settlement")
    });
    expect(settled.status).toBe("SETTLED");
    const replay = await call(bindingA(), "settle", {
      reservationId: created.reservationId,
      fencingToken: renewed.fencingToken,
      leaseVersion: renewed.leaseVersion,
      outcome: "COMPLETED",
      evidenceHash: hash("valid-settlement")
    });
    expect(replay.status).toBe("SETTLEMENT_ALREADY_APPLIED");
  });

  it("moves expired reservations to uncertain and never releases their budget", async () => {
    const created = await call(bindingA(), "reserve", base(
      "synthetic-org/p10cr-shadow-repo-b", "expiring-execution", "workflow-run-expiry"
    ));
    expect(created.status).toBe("RESERVED");
    const forced = await call(bindingA(), "testExpire", { reservationId: created.reservationId });
    expect(forced.status).toBe("TEST_EXPIRED");
    const settled = await call(bindingA(), "settle", {
      reservationId: created.reservationId,
      fencingToken: created.fencingToken,
      leaseVersion: created.leaseVersion,
      outcome: "COMPLETED",
      evidenceHash: hash("expired-evidence")
    });
    expect(settled.status).toBe("LEASE_EXPIRED_UNCERTAIN");
    const state = await snapshot();
    expect(state.reserved.dispatches).toBe(0);
    expect(state.uncertain.dispatches).toBe(1);
    expect(state.committed.dispatches).toBe(0);
  });

  it("rejects cross-project, wrong-task, wrong-phase and unregistered operations", async () => {
    const cases = [
      base("synthetic-org/p10cr-shadow-repo-a", "bad-project", "run-a", { projectId: "OTHER" }),
      base("synthetic-org/p10cr-shadow-repo-a", "bad-task", "run-b", { taskId: "P59-001" }),
      base("synthetic-org/p10cr-shadow-repo-a", "bad-phase", "run-c", { phaseId: "P59.64" }),
      base("synthetic-org/p10cr-shadow-repo-a", "bad-operation", "run-d", { operationId: "unknown" })
    ];
    for (const input of cases) {
      const result = await call(bindingA(), "reserve", input);
      expect(result.status).toBe("REJECTED");
    }
    const state = await snapshot();
    expect(state.reservations).toHaveLength(0);
    expect(state.eventChainValid).toBe(true);
  });

  it("keeps control-plane and workload budgets separate and fail-closed", async () => {
    const input = base("synthetic-org/p10cr-shadow-repo-a", "budget-test", "workflow-budget");
    const first = await call(bindingA(), "reserve", input);
    expect(first.status).toBe("RESERVED");
    const state = await snapshot();
    expect(state.control.budget_rpc_requests).toBeGreaterThan(0);
    expect(state.reserved.do_requests).toBe(8);
    expect(state.reserved.budget_rpc_requests).toBeUndefined();
    expect(state.caps.do_requests).toBe(64);
    expect(state.eventChainValid).toBe(true);
  });
});
