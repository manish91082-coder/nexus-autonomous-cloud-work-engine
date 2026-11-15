import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { quotaLedgerObjectName } from "../quota-ledger-contract.mjs";

const identity = (suffix) => ({
  provider: "github",
  credentialScope: "installation-42/repository-99/" + suffix,
  windowId: "hour-2026-11-15T18/" + suffix,
  controlPlaneProvider: "cloudflare",
  reservationId: "reservation-" + suffix,
  workerId: "worker-" + suffix,
  operation: "core+search"
});

function bucket(bucketId, remaining = 100, overrides = {}) {
  return {
    bucketId,
    limitUnits: 1000,
    observedRemainingUnits: remaining,
    safetyReserveUnits: 5,
    recoveryReserveUnits: 5,
    observedAtEpoch: 1000,
    maxTelemetryAgeSeconds: 120,
    nowEpoch: 1010,
    ...overrides
  };
}

function stubFor(input) {
  const id = env.QUOTA_LEDGER.idFromName(
    quotaLedgerObjectName(input.provider, input.credentialScope, input.windowId)
  );
  return env.QUOTA_LEDGER.get(id);
}

describe("Phase 59.35 Cloudflare Workers runtime: SQLite Durable Object", () => {
  it("initializes SQLite schema and accepts first reservation (zero-row lookups)", async () => {
    const input = {
      ...identity("first"),
      buckets: [bucket("core"), bucket("search")],
      costs: { core: 10, search: 3 }
    };
    const stub = stubFor(input);
    const result = await stub.reserve(input);
    expect(result.status).toBe("RESERVED");
    expect(result.reservedByBucket).toEqual({ core: 10, search: 3 });
    const snapshot = await stub.snapshot();
    expect(snapshot.buckets).toHaveLength(2);
  });

  it("settles every bucket and persists committed usage across stub reacquisition", async () => {
    const input = {
      ...identity("settle"),
      buckets: [bucket("core"), bucket("search")],
      costs: { core: 20, search: 5 }
    };
    const name = quotaLedgerObjectName(input.provider, input.credentialScope, input.windowId);
    const id = env.QUOTA_LEDGER.idFromName(name);
    let stub = env.QUOTA_LEDGER.get(id);
    await stub.reserve(input);
    const result = await stub.settle({
      reservationId: input.reservationId,
      workerId: input.workerId,
      actualByBucket: { core: 12, search: 3 },
      nowEpoch: 1020
    });
    expect(result.status).toBe("SETTLED");
    stub = env.QUOTA_LEDGER.get(id);
    const snapshot = await stub.snapshot();
    const core = snapshot.buckets.find(x => x.bucket_id === "core");
    expect(core.reserved_units).toBe(0);
    expect(core.committed_units).toBe(12);
  });

  it("persists exhausted telemetry but admits none of a multi-bucket reservation", async () => {
    const input = {
      ...identity("rollback"),
      buckets: [bucket("core"), bucket("search", 11)],
      costs: { core: 10, search: 2 }
    };
    const stub = stubFor(input);
    const rejected = await stub.reserve(input);
    expect(rejected.status).toBe("WAITING_FOR_QUOTA");
    expect(rejected.reason).toMatch(/exhausted/);
    const snapshot = await stub.snapshot();
    expect(snapshot.buckets).toHaveLength(2);
    expect(snapshot.buckets.every(row => row.reserved_units === 0)).toBe(true);
    expect(snapshot.reservations).toHaveLength(0);
  });

  it("serializes concurrent reservations against one shared bucket", async () => {
    const input = {
      ...identity("contention"),
      buckets: [bucket("core", 100, { safetyReserveUnits: 0, recoveryReserveUnits: 0 })],
      costs: { core: 10 }
    };
    const stub = stubFor(input);
    const attempts = Array.from({ length: 20 }, (_, i) =>
      stub.reserve({
        ...input,
        reservationId: "contend-" + i,
        workerId: "parallel-worker-" + i
      }).then(result => result.status === "RESERVED")
    );
    const outcomes = await Promise.all(attempts);
    expect(outcomes.filter(Boolean)).toHaveLength(10);
    const snapshot = await stub.snapshot();
    const core = snapshot.buckets.find(x => x.bucket_id === "core");
    expect(core.reserved_units).toBe(100);
    expect(snapshot.reservations).toHaveLength(10);
  });

  it("rejects duplicate reservation IDs without double counting", async () => {
    const input = {
      ...identity("duplicate"),
      buckets: [bucket("core")],
      costs: { core: 7 }
    };
    const stub = stubFor(input);
    await stub.reserve(input);
    const rejected = await stub.reserve(input);
    expect(rejected.status).toBe("DUPLICATE_RESERVATION");
    const snapshot = await stub.snapshot();
    expect(snapshot.buckets[0].reserved_units).toBe(7);
  });

  it("retains uncertain usage instead of releasing reserved capacity", async () => {
    const input = {
      ...identity("uncertain"),
      buckets: [bucket("core")],
      costs: { core: 9 }
    };
    const stub = stubFor(input);
    await stub.reserve(input);
    const result = await stub.markUncertain({
      reservationId: input.reservationId,
      workerId: input.workerId
    });
    expect(result.status).toBe("UNCERTAIN_BUDGET_RETAINED");
    const snapshot = await stub.snapshot();
    expect(snapshot.buckets[0].reserved_units).toBe(0);
    expect(snapshot.buckets[0].uncertain_units).toBe(9);
  });

  it("rebases committed usage when a newer provider telemetry snapshot arrives", async () => {
    const input = {
      ...identity("telemetry-rebase"),
      buckets: [bucket("core", 100)],
      costs: { core: 10 }
    };
    const stub = stubFor(input);
    await stub.reserve(input);
    await stub.settle({
      reservationId: input.reservationId,
      workerId: input.workerId,
      actualByBucket: { core: 8 },
      nowEpoch: 1020
    });
    const refreshed = {
      ...input,
      reservationId: "reservation-telemetry-rebase-next",
      workerId: "worker-telemetry-rebase-next",
      buckets: [bucket("core", 70, { observedAtEpoch: 1030, nowEpoch: 1040 })],
      costs: { core: 1 }
    };
    expect((await stub.reserve(refreshed)).status).toBe("RESERVED");
    const core = (await stub.snapshot()).buckets.find(x => x.bucket_id === "core");
    expect(core.committed_units).toBe(8);
    expect(core.committed_since_observation_units).toBe(0);
    expect(core.reserved_units).toBe(1);
  });

  it("rejects a different provider credential window on an already-bound object", async () => {
    const input = {
      ...identity("identity-bound"),
      buckets: [bucket("core")],
      costs: { core: 5 }
    };
    const stub = stubFor(input);
    await stub.reserve(input);
    const intruder = {
      ...input,
      credentialScope: "different-installation/repository",
      reservationId: "reservation-identity-intruder",
      workerId: "worker-identity-intruder"
    };
    const rejected = await stub.reserve(intruder);
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.error.message).toMatch(/identity/);
  });

  it("recovers the durable reservation after a real Durable Object eviction", async () => {
    const input = {
      ...identity("eviction-recovery"),
      buckets: [bucket("core")],
      costs: { core: 9 }
    };
    const stub = stubFor(input);
    await stub.reserve(input);
    await evictDurableObject(stub);
    const recovered = stubFor(input);
    const snapshot = await recovered.snapshot();
    expect(snapshot.reservations.find(x => x.reservation_id === input.reservationId).status)
      .toBe("RESERVED");
    const settled = await recovered.settle({
      reservationId: input.reservationId,
      workerId: input.workerId,
      actualByBucket: { core: 7 },
      nowEpoch: 1020
    });
    expect(settled.status).toBe("SETTLED");
  });

  it("rolls back a failed SQLite transaction without persisting partial writes", async () => {
    const input = {
      ...identity("transaction-rollback"),
      buckets: [bucket("core")],
      costs: { core: 5 }
    };
    const stub = stubFor(input);
    await stub.reserve(input);
    await runInDurableObject(stub, (_instance, state) => {
      const before = state.storage.sql.exec(
        "SELECT COUNT(*) AS count FROM quota_buckets"
      ).toArray()[0].count;
      expect(() => state.storage.transactionSync(() => {
        state.storage.sql.exec(`INSERT INTO quota_buckets
          (bucket_id,provider,credential_scope,window_id,limit_units,
           observed_remaining_units,observed_at_epoch,safety_reserve_units,
           recovery_reserve_units,reserved_units,committed_units,
           committed_since_observation_units,uncertain_units)
          VALUES ('rollback-probe','github','installation-42/repository-99/transaction-rollback',
          'hour-2026-11-15T18/transaction-rollback',100,100,1000,0,0,0,0,0,0)`);
        throw new Error("forced-rollback-probe");
      })).toThrow("forced-rollback-probe");
      const after = state.storage.sql.exec(
        "SELECT COUNT(*) AS count FROM quota_buckets"
      ).toArray()[0].count;
      expect(after).toBe(before);
    });
  });

  it("derives collision-safe object names from the provider, credential and window tuple", () => {
    expect(quotaLedgerObjectName("ab", "c", "d")).not.toBe(
      quotaLedgerObjectName("a", "bc", "d")
    );
    expect(quotaLedgerObjectName("gh", "installation/1", "hour/2")).toBe(
      quotaLedgerObjectName("gh", "installation/1", "hour/2")
    );
  });
});
