import { describe, it, expect } from "vitest";
import { env, evictDurableObject, runInDurableObject } from "cloudflare:test";
import {
  getQuotaLedgerStub, quotaLedgerObjectName
} from "../quota-ledger-do.mjs";

const base = {
  provider: "github-rest",
  credentialScope: "app-7/repo-p10cr",
  windowId: "2026-11-15T17Z",
  controlPlaneProvider: "cloudflare-do"
};

function request(reservationId, overrides = {}) {
  const buckets = overrides.buckets ?? [
    { bucketId: "core", limitUnits: 1000, observedRemainingUnits: 500,
      safetyReserveUnits: 50, recoveryReserveUnits: 50,
      observedAtEpoch: 1000, maxTelemetryAgeSeconds: 300, nowEpoch: 1010 },
    { bucketId: "search", limitUnits: 500, observedRemainingUnits: 300,
      safetyReserveUnits: 20, recoveryReserveUnits: 20,
      observedAtEpoch: 1000, maxTelemetryAgeSeconds: 300, nowEpoch: 1010 }
  ];
  return {
    ...base,
    reservationId,
    workerId: `worker-${reservationId}`,
    operation: "runtime-contract",
    buckets,
    costs: overrides.costs ?? { core: 10, search: 5 }
  };
}

function ledger(identity = base) {
  return getQuotaLedgerStub(env, identity.provider, identity.credentialScope, identity.windowId);
}

describe("Phase 59.35 Cloudflare Workers runtime validation", () => {
  it("routes the same provider/credential/window to one deterministic object", () => {
    const a = quotaLedgerObjectName("github", "app/repo", "hour-1");
    const b = quotaLedgerObjectName("github", "app/repo", "hour-1");
    const c = quotaLedgerObjectName("github", "app", "repo/hour-1");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    const id1 = env.QUOTA_LEDGER.idFromName(a);
    const id2 = env.QUOTA_LEDGER.idFromName(b);
    expect(id1.toString()).toBe(id2.toString());
  });

  it("executes multi-bucket reserve and settlement in SQLite-backed DO storage", async () => {
    const stub = ledger();
    const reserved = await stub.reserve(request("runtime-settle"));
    expect(reserved.status).toBe("RESERVED");
    const settled = await stub.settle({
      reservationId: "runtime-settle",
      workerId: "worker-runtime-settle",
      actualByBucket: { core: 7, search: 3 },
      nowEpoch: 1020
    });
    expect(settled.status).toBe("SETTLED");
    const snap = await stub.snapshot();
    expect(snap.buckets.find(x => x.bucket_id === "core").committed_units).toBe(7);
    expect(snap.buckets.find(x => x.bucket_id === "search").committed_units).toBe(3);
  });

  it("persists fresh exhausted telemetry but admits no work", async () => {
    const stub = ledger();
    const result = await stub.reserve(request("exhausted-telemetry", {
      buckets: [
        { bucketId: "core", limitUnits: 1000, observedRemainingUnits: 80,
          safetyReserveUnits: 50, recoveryReserveUnits: 50,
          observedAtEpoch: 1100, maxTelemetryAgeSeconds: 60, nowEpoch: 1110 }
      ],
      costs: { core: 1 }
    }));
    expect(result.status).toBe("WAITING_FOR_QUOTA");
    const snap = await stub.snapshot();
    expect(snap.buckets.find(x => x.bucket_id === "core").observed_remaining_units).toBe(80);
    expect(snap.buckets.find(x => x.bucket_id === "core").reserved_units).toBe(0);
    expect(snap.reservations).toHaveLength(0);
  });

  it("admits all required buckets or none when one bucket is exhausted", async () => {
    const stub = ledger();
    const result = await stub.reserve(request("atomic-no-go", {
      buckets: [
        { bucketId: "core", limitUnits: 1000, observedRemainingUnits: 500,
          safetyReserveUnits: 50, recoveryReserveUnits: 50,
          observedAtEpoch: 1000, maxTelemetryAgeSeconds: 300, nowEpoch: 1010 },
        { bucketId: "search", limitUnits: 500, observedRemainingUnits: 101,
          safetyReserveUnits: 50, recoveryReserveUnits: 50,
          observedAtEpoch: 1000, maxTelemetryAgeSeconds: 300, nowEpoch: 1010 }
      ],
      costs: { core: 20, search: 2 }
    }));
    expect(result.status).toBe("WAITING_FOR_QUOTA");
    const snap = await stub.snapshot();
    expect(snap.buckets.find(x => x.bucket_id === "core").reserved_units).toBe(0);
    expect(snap.reservations).toHaveLength(0);
  });

  it("serializes 32 concurrent RPC clients without oversubscribing one bucket", async () => {
    const stub = ledger();
    const requests = Array.from({ length: 32 }, (_, i) => request(`race-${i}`, {
      buckets: [
        { bucketId: "core", limitUnits: 1000, observedRemainingUnits: 500,
          safetyReserveUnits: 50, recoveryReserveUnits: 50,
          observedAtEpoch: 1000, maxTelemetryAgeSeconds: 300, nowEpoch: 1010 }
      ],
      costs: { core: 20 }
    }));
    const results = await Promise.all(requests.map(input => stub.reserve(input)));
    expect(results.filter(x => x.status === "RESERVED")).toHaveLength(20);
    expect(results.filter(x => x.status === "WAITING_FOR_QUOTA")).toHaveLength(12);
    const snap = await stub.snapshot();
    expect(snap.buckets[0].reserved_units).toBe(400);
    expect(snap.reservations).toHaveLength(20);
  });

  it("retains unknown outcomes and does not refund quota", async () => {
    const stub = ledger();
    await stub.reserve(request("uncertain-runtime"));
    const result = await stub.markUncertain({
      reservationId: "uncertain-runtime",
      workerId: "worker-uncertain-runtime"
    });
    expect(result.status).toBe("UNCERTAIN_BUDGET_RETAINED");
    const snap = await stub.snapshot();
    expect(snap.buckets.find(x => x.bucket_id === "core").reserved_units).toBe(0);
    expect(snap.buckets.find(x => x.bucket_id === "core").uncertain_units).toBe(10);
  });

  it("survives Durable Object eviction and resumes from SQLite", async () => {
    const stub = ledger();
    await stub.reserve(request("eviction-runtime"));
    await evictDurableObject(stub);
    const afterEviction = ledger();
    const snap = await afterEviction.snapshot();
    expect(snap.reservations.find(x => x.reservation_id === "eviction-runtime").status).toBe("RESERVED");
    const result = await afterEviction.settle({
      reservationId: "eviction-runtime",
      workerId: "worker-eviction-runtime",
      actualByBucket: { core: 8, search: 4 },
      nowEpoch: 1020
    });
    expect(result.status).toBe("SETTLED");
  });

  it("rebases committed usage on newer telemetry without double subtraction", async () => {
    const stub = ledger();
    await stub.reserve(request("telemetry-before"));
    await stub.settle({
      reservationId: "telemetry-before",
      workerId: "worker-telemetry-before",
      actualByBucket: { core: 10, search: 5 },
      nowEpoch: 1020
    });
    const refreshed = request("telemetry-after", {
      buckets: [
        { bucketId: "core", limitUnits: 1000, observedRemainingUnits: 470,
          safetyReserveUnits: 50, recoveryReserveUnits: 50,
          observedAtEpoch: 1030, maxTelemetryAgeSeconds: 300, nowEpoch: 1040 }
      ],
      costs: { core: 1 }
    });
    expect((await stub.reserve(refreshed)).status).toBe("RESERVED");
    const core = (await stub.snapshot()).buckets.find(x => x.bucket_id === "core");
    expect(core.committed_units).toBe(10);
    expect(core.committed_since_observation_units).toBe(0);
    expect(core.reserved_units).toBe(1);
  });

  it("rejects a mismatched provider/credential/window identity on the same object", async () => {
    const stub = ledger();
    await stub.reserve(request("identity-owner"));
    await expect(stub.reserve({
      ...request("identity-intruder"),
      credentialScope: "different-installation/repo"
    })).rejects.toThrow(/identity/);
  });

  it("rolls back SQLite writes when a transaction callback throws", async () => {
    const stub = ledger();
    const before = (await stub.snapshot()).buckets.length;
    await runInDurableObject(stub, (_instance, state) => {
      expect(() => state.storage.transactionSync(() => {
        state.storage.sql.exec(`INSERT INTO quota_buckets
          (bucket_id,provider,credential_scope,window_id,limit_units,
           observed_remaining_units,observed_at_epoch,safety_reserve_units,
           recovery_reserve_units,reserved_units,committed_units,
           committed_since_observation_units,uncertain_units)
          VALUES ('rollback-probe','github-rest','app-7/repo-p10cr',
          '2026-11-15T17Z',100,100,1000,0,0,0,0,0,0)`);
        throw new Error("forced-rollback-probe");
      })).toThrow("forced-rollback-probe");
    });
    expect((await stub.snapshot()).buckets).toHaveLength(before);
  });
});
