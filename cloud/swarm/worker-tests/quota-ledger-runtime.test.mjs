import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { quotaLedgerObjectName } from "../quota-ledger-contract.mjs";
import { createSignedRequest, signedCall } from "./quota-auth-test-helper.mjs";

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

async function call(stub, action, input, options = {}) {
  const result = await signedCall(stub, env, action, input, options);
  return { httpStatus: result.httpStatus, ...result.body };
}

describe("Phase 59.37 authenticated internal quota RPC", () => {
  it("accepts an authenticated first reservation and returns scoped snapshot", async () => {
    const input = {
      ...identity("first"),
      buckets: [bucket("core"), bucket("search")],
      costs: { core: 10, search: 3 }
    };
    const stub = stubFor(input);
    const result = await call(stub, "reserve", input);
    expect(result.httpStatus).toBe(200);
    expect(result.status).toBe("RESERVED");
    expect(result.reservedByBucket).toEqual({ core: 10, search: 3 });
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.buckets).toHaveLength(2);
  });

  it("settles every bucket using the authenticated identity envelope", async () => {
    const input = {
      ...identity("settle"),
      buckets: [bucket("core"), bucket("search")],
      costs: { core: 20, search: 5 }
    };
    const stub = stubFor(input);
    await call(stub, "reserve", input);
    const result = await call(stub, "settle", {
      ...input,
      actualByBucket: { core: 12, search: 3 },
      nowEpoch: 1020
    });
    expect(result.status).toBe("SETTLED");
    const snapshot = await call(stub, "snapshot", input);
    const core = snapshot.buckets.find(x => x.bucket_id === "core");
    expect(core.reserved_units).toBe(0);
    expect(core.committed_units).toBe(12);
  });

  it("persists exhausted telemetry but admits none of a multi-bucket reservation", async () => {
    const input = {
      ...identity("exhausted"),
      buckets: [bucket("core"), bucket("search", 11)],
      costs: { core: 10, search: 2 }
    };
    const stub = stubFor(input);
    const rejected = await call(stub, "reserve", input);
    expect(rejected.status).toBe("WAITING_FOR_QUOTA");
    expect(rejected.reason).toMatch(/exhausted/);
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.buckets).toHaveLength(2);
    expect(snapshot.buckets.every(row => row.reserved_units === 0)).toBe(true);
    expect(snapshot.reservations).toHaveLength(0);
  });

  it("serializes concurrent authenticated reservations against one shared bucket", async () => {
    const input = {
      ...identity("contention"),
      buckets: [bucket("core", 100, { safetyReserveUnits: 0, recoveryReserveUnits: 0 })],
      costs: { core: 10 }
    };
    const stub = stubFor(input);
    const attempts = Array.from({ length: 20 }, (_, i) =>
      call(stub, "reserve", {
        ...input,
        reservationId: "contend-" + i,
        workerId: "parallel-worker-" + i
      }).then(result => result.status)
    );
    const outcomes = await Promise.all(attempts);
    expect(outcomes.filter(x => x === "RESERVED")).toHaveLength(10);
    expect(outcomes.filter(x => x === "WAITING_FOR_QUOTA")).toHaveLength(10);
    const snapshot = await call(stub, "snapshot", input);
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
    await call(stub, "reserve", input);
    const rejected = await call(stub, "reserve", input);
    expect(rejected.status).toBe("DUPLICATE_RESERVATION");
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.buckets[0].reserved_units).toBe(7);
  });

  it("retains uncertain usage instead of releasing reserved capacity", async () => {
    const input = {
      ...identity("uncertain"),
      buckets: [bucket("core")],
      costs: { core: 9 }
    };
    const stub = stubFor(input);
    await call(stub, "reserve", input);
    const result = await call(stub, "markUncertain", input);
    expect(result.status).toBe("UNCERTAIN_BUDGET_RETAINED");
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.buckets[0].reserved_units).toBe(0);
    expect(snapshot.buckets[0].uncertain_units).toBe(9);
  });

  it("rebases committed usage when newer provider telemetry arrives", async () => {
    const input = {
      ...identity("telemetry-rebase"),
      buckets: [bucket("core", 100)],
      costs: { core: 10 }
    };
    const stub = stubFor(input);
    await call(stub, "reserve", input);
    await call(stub, "settle", {
      ...input,
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
    expect((await call(stub, "reserve", refreshed)).status).toBe("RESERVED");
    const core = (await call(stub, "snapshot", refreshed)).buckets.find(x => x.bucket_id === "core");
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
    await call(stub, "reserve", input);
    const intruder = {
      ...input,
      credentialScope: "different-installation/repository",
      reservationId: "reservation-identity-intruder",
      workerId: "worker-identity-intruder"
    };
    const rejected = await call(stub, "reserve", intruder);
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.error.message).toMatch(/identity/);
  });

  it("routes an auxiliary Worker caller to the same authenticated Durable Object", async () => {
    const input = {
      ...identity("cross-worker-shared"),
      buckets: [bucket("core", 100, { safetyReserveUnits: 0, recoveryReserveUnits: 0 })],
      costs: { core: 10 }
    };
    const primaryStub = stubFor(input);
    expect((await call(primaryStub, "reserve", input)).status).toBe("RESERVED");

    const response = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/reserve",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reserve", input: {
          ...input,
          reservationId: "reservation-cross-worker-secondary",
          workerId: "worker-cross-worker-secondary"
        } })
      }
    ));
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("RESERVED");
    const snapshot = await call(primaryStub, "snapshot", input);
    expect(snapshot.buckets.find(x => x.bucket_id === "core").reserved_units).toBe(20);
    expect(snapshot.reservations).toHaveLength(2);
  });

  it("enforces least-privilege action policy for the secondary caller", async () => {
    const input = {
      ...identity("least-privilege"),
      buckets: [bucket("core")],
      costs: { core: 10 }
    };
    const stub = stubFor(input);
    await call(stub, "reserve", input);
    const response = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/settle",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "settle",
          input: { ...input, actualByBucket: { core: 5 }, nowEpoch: 1020 }
        })
      }
    ));
    expect(response.status).toBe(403);
    expect((await response.json()).reason).toBe("CALLER_ACTION_FORBIDDEN");
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.reservations[0].status).toBe("RESERVED");
    expect(snapshot.buckets[0].reserved_units).toBe(10);
  });

  it("prevents one authenticated caller from settling another caller's reservation", async () => {
    const input = {
      ...identity("caller-ownership"),
      buckets: [bucket("core")],
      costs: { core: 10 }
    };
    const stub = stubFor(input);
    const secondaryInput = {
      ...input,
      reservationId: "reservation-secondary-owned",
      workerId: "worker-secondary-owned"
    };
    const response = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/reserve",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reserve", input: secondaryInput })
      }
    ));
    expect((await response.json()).status).toBe("RESERVED");

    const rejected = await call(stub, "settle", {
      ...secondaryInput,
      actualByBucket: { core: 5 },
      nowEpoch: 1020
    });
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.error.message).toMatch(/owner\/state mismatch/);
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.reservations[0].caller_id).toBe("secondary");
    expect(snapshot.reservations[0].status).toBe("RESERVED");
    expect(snapshot.buckets[0].reserved_units).toBe(10);
  });

  it("prevents oversubscription across authenticated primary and auxiliary Worker callers", async () => {
    const input = {
      ...identity("cross-worker-race"),
      buckets: [bucket("core", 100, { safetyReserveUnits: 0, recoveryReserveUnits: 0 })],
      costs: { core: 10 }
    };
    const primaryStub = stubFor(input);
    const attempts = Array.from({ length: 20 }, (_, i) => {
      const requestInput = {
        ...input,
        reservationId: "cross-race-" + i,
        workerId: "cross-race-worker-" + i
      };
      if (i % 2 === 0) return call(primaryStub, "reserve", requestInput);
      return env.SECOND_CALLER.fetch(new Request(
        "https://secondary-caller/reserve",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "reserve", input: requestInput })
        }
      )).then(response => response.json());
    });
    const results = await Promise.all(attempts);
    expect(results.filter(x => x.status === "RESERVED")).toHaveLength(10);
    expect(results.filter(x => x.status === "WAITING_FOR_QUOTA")).toHaveLength(10);
    const snapshot = await call(primaryStub, "snapshot", input);
    expect(snapshot.buckets.find(x => x.bucket_id === "core").reserved_units).toBe(100);
    expect(snapshot.reservations).toHaveLength(10);
  });

  it("rejects unauthenticated callers without mutating quota state", async () => {
    const input = {
      ...identity("unauthenticated"),
      buckets: [bucket("core")],
      costs: { core: 10 }
    };
    const stub = stubFor(input);
    const response = await stub.fetch(new Request("https://quota-ledger.internal/rpc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reserve", input })
    }));
    expect(response.status).toBe(401);
    expect((await response.json()).reason).toBe("UNAUTHENTICATED_CALLER");
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.buckets).toHaveLength(0);
    expect(snapshot.reservations).toHaveLength(0);
  });

  it("rejects unauthorized caller IDs and incorrect HMAC keys", async () => {
    const input = {
      ...identity("wrong-key"),
      buckets: [bucket("core")],
      costs: { core: 10 }
    };
    const stub = stubFor(input);
    const rogue = await createSignedRequest(env, "reserve", input, {
      callerId: "rogue",
      secret: "rogue-test-secret-0123456789abcdef"
    });
    expect((await stub.fetch(rogue)).status).toBe(401);
    const wrongKey = await createSignedRequest(env, "reserve", input, {
      callerId: "primary",
      secret: "wrong-test-secret-0123456789abcdef"
    });
    const response = await stub.fetch(wrongKey);
    expect(response.status).toBe(401);
    expect((await response.json()).reason).toBe("SIGNATURE_INVALID");
    expect((await call(stub, "snapshot", input)).buckets).toHaveLength(0);
  });

  it("rejects expired signed requests before quota mutation", async () => {
    const input = {
      ...identity("expired"),
      buckets: [bucket("core")],
      costs: { core: 10 }
    };
    const stub = stubFor(input);
    const expired = await createSignedRequest(env, "reserve", input, {
      timestamp: Math.floor(Date.now() / 1000) - 60
    });
    const response = await stub.fetch(expired);
    expect(response.status).toBe(401);
    expect((await response.json()).reason).toBe("AUTH_TIMESTAMP_EXPIRED");
    expect((await call(stub, "snapshot", input)).buckets).toHaveLength(0);
  });

  it("rejects a replayed nonce even when the caller re-signs the same operation", async () => {
    const input = {
      ...identity("replay"),
      buckets: [bucket("core")],
      costs: { core: 10 }
    };
    const stub = stubFor(input);
    const options = { nonce: "nonce-replay-0123456789" };
    const first = await createSignedRequest(env, "reserve", input, options);
    const second = await createSignedRequest(env, "reserve", input, options);
    expect((await stub.fetch(first)).status).toBe(200);
    const replay = await stub.fetch(second);
    expect(replay.status).toBe(409);
    expect((await replay.json()).reason).toBe("REPLAYED_NONCE");
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.reservations).toHaveLength(1);
  });

  it("rejects body tampering because the HMAC covers the exact request body", async () => {
    const input = {
      ...identity("tamper"),
      buckets: [bucket("core")],
      costs: { core: 5 }
    };
    const stub = stubFor(input);
    const signed = await createSignedRequest(env, "reserve", input);
    const tampered = {
      ...input,
      costs: { core: 500 }
    };
    const request = new Request("https://quota-ledger.internal/rpc", {
      method: "POST",
      headers: signed.headers,
      body: JSON.stringify({ action: "reserve", input: tampered })
    });
    const response = await stub.fetch(request);
    expect(response.status).toBe(401);
    expect((await response.json()).reason).toBe("SIGNATURE_INVALID");
    expect((await call(stub, "snapshot", input)).buckets).toHaveLength(0);
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
