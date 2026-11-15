import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { quotaLedgerObjectName } from "../quota-ledger-contract.mjs";
import {
  parseGitHubRateLimitHeaders,
  parseGitHubRateLimitOverview,
  parseGitHubGraphqlRateLimit
} from "../github-quota-telemetry.mjs";
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

  it("persists authenticated response-header telemetry with provenance", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:telemetry-initial";
    const telemetry = parseGitHubRateLimitHeaders({
      headers: {
        "x-ratelimit-limit": "5000",
        "x-ratelimit-remaining": "4200",
        "x-ratelimit-used": "800",
        "x-ratelimit-reset": String(now + 3600),
        "x-ratelimit-resource": "core"
      },
      credentialScope,
      observedAtEpoch: now,
      endpoint: "GET /repos/acme/demo",
      method: "GET",
      status: 200,
      requestId: "telemetry-initial-1"
    });
    const input = {
      provider: "github",
      credentialScope,
      windowId: "github-rate-limit-ledger",
      telemetry
    };
    const stub = stubFor(input);
    const result = await call(stub, "recordTelemetry", input);
    expect(result.status).toBe("RECORDED");
    expect(result.decision).toBe("ACCEPT_INITIAL");
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.telemetryCurrent).toHaveLength(1);
    expect(snapshot.telemetryObservations).toHaveLength(1);
    expect(snapshot.telemetryCurrent[0].authority_rank).toBe(100);
    expect(JSON.parse(snapshot.telemetryCurrent[0].provenance_json).endpoint).toBe("GET /repos/acme/demo");
  });

  it("stores multiple GitHub resource buckets under one credential ledger partition", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:multi-resource";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(base);
    for (const resource of ["core", "search", "code_search"]) {
      const telemetry = parseGitHubRateLimitHeaders({
        headers: {
          "x-ratelimit-limit":"5000","x-ratelimit-remaining":"4200",
          "x-ratelimit-used":"800","x-ratelimit-reset":String(now + 3600),
          "x-ratelimit-resource":resource
        },
        credentialScope,observedAtEpoch:now,
        endpoint:"GET /repos/acme/demo",method:"GET",status:200
      });
      expect((await call(stub,"recordTelemetry",{...base,telemetry})).status).toBe("RECORDED");
    }
    const snapshot = await call(stub,"snapshot",base);
    expect(snapshot.telemetryCurrent.map(x => x.bucket_id).sort()).toEqual([
      "code_search","core","search"
    ]);
  });

  it("enforces GraphQL rateLimit authority between periodic overview and response headers", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:graphql-authority";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(base);
    const resetAt = new Date((now + 3600) * 1000).toISOString();
    const graphql = parseGitHubGraphqlRateLimit({
      credentialScope,observedAtEpoch:now - 2,
      payload:{data:{rateLimit:{
        limit:5000,cost:13,remaining:4200,used:800,resetAt
      }}}
    });
    expect((await call(stub,"recordTelemetry",{...base,telemetry:graphql})).decision).toBe("ACCEPT_INITIAL");
    const reset = Math.floor(Date.parse(resetAt) / 1000);
    const overview = parseGitHubRateLimitOverview({
      credentialScope,observedAtEpoch:now - 1,
      payload:{resources:{graphql:{limit:5000,used:900,remaining:4100,reset}}}
    }).buckets[0];
    expect((await call(stub,"recordTelemetry",{...base,telemetry:overview})).decision)
      .toBe("KEEP_HIGHER_AUTHORITY_SOURCE");
    const header = parseGitHubRateLimitHeaders({
      headers:{
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":"4300",
        "x-ratelimit-used":"700","x-ratelimit-reset":String(reset),
        "x-ratelimit-resource":"graphql"
      },
      credentialScope,observedAtEpoch:now,
      endpoint:"POST /graphql",method:"POST",status:200
    });
    expect((await call(stub,"recordTelemetry",{...base,telemetry:header})).decision)
      .toBe("ACCEPT_HIGHER_AUTHORITY_SOURCE");
    const snapshot = await call(stub,"snapshot",base);
    expect(snapshot.telemetryCurrent[0].authority_rank).toBe(100);
    expect(snapshot.telemetryCurrent[0].observed_remaining_units).toBe(4300);
  });

  it("rejects telemetry provenance whose endpoint method does not match its method field", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:provenance-mismatch";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(base);
    const telemetry = parseGitHubRateLimitHeaders({
      headers:{
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":"4200",
        "x-ratelimit-used":"800","x-ratelimit-reset":String(now + 3600),
        "x-ratelimit-resource":"core"
      },
      credentialScope,observedAtEpoch:now,
      endpoint:"GET /repos/acme/demo",method:"POST",status:200
    });
    const result = await call(stub,"recordTelemetry",{...base,telemetry});
    expect(result.status).toBe("REJECTED");
    expect(result.error.message).toBe("unsafe telemetry provenance fields");
  });

  it("does not let a newer periodic overview overwrite response-header authority", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:telemetry-authority";
    const inputBase = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(inputBase);
    const header = parseGitHubRateLimitHeaders({
      headers: {
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":"4200",
        "x-ratelimit-used":"800","x-ratelimit-reset":String(now + 3600),
        "x-ratelimit-resource":"core"
      },
      credentialScope,observedAtEpoch:now - 2,
      endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    await call(stub,"recordTelemetry",{...inputBase,telemetry:header});
    const overview = parseGitHubRateLimitOverview({
      credentialScope,observedAtEpoch:now - 1,
      payload:{resources:{core:{
        limit:5000,used:1000,remaining:4000,reset:now + 3600
      }}}
    }).buckets[0];
    const result = await call(stub,"recordTelemetry",{...inputBase,telemetry:overview});
    expect(result.decision).toBe("KEEP_HIGHER_AUTHORITY_SOURCE");
    const snapshot = await call(stub,"snapshot",inputBase);
    expect(snapshot.telemetryCurrent[0].observed_remaining_units).toBe(4200);
    expect(snapshot.telemetryObservations).toHaveLength(2);
  });

  it("accepts a newer authoritative regional observation when remaining rises", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:regional";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(base);
    const make = (remaining, observed) => parseGitHubRateLimitHeaders({
      headers: {
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":String(remaining),
        "x-ratelimit-used":String(5000 - remaining),
        "x-ratelimit-reset":String(now + 3600),"x-ratelimit-resource":"core"
      },
      credentialScope,observedAtEpoch:observed,
      endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    await call(stub,"recordTelemetry",{...base,telemetry:make(4000,now - 2)});
    const result = await call(stub,"recordTelemetry",{...base,telemetry:make(4300,now - 1)});
    expect(result.decision).toBe("ACCEPT_NEWER_OBSERVATION");
    const snapshot = await call(stub,"snapshot",base);
    expect(snapshot.telemetryCurrent[0].observed_remaining_units).toBe(4300);
  });

  it("uses conservative remaining and maximum used for same-second observations", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:same-second";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(base);
    const make = (remaining) => parseGitHubRateLimitHeaders({
      headers: {
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":String(remaining),
        "x-ratelimit-used":String(5000 - remaining),
        "x-ratelimit-reset":String(now + 3600),"x-ratelimit-resource":"core"
      },
      credentialScope,observedAtEpoch:now - 1,
      endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    await call(stub,"recordTelemetry",{...base,telemetry:make(4200)});
    const result = await call(stub,"recordTelemetry",{...base,telemetry:make(4300)});
    expect(result.decision).toBe("SAME_SECOND_CONSERVATIVE_MIN");
    const snapshot = await call(stub,"snapshot",base);
    expect(snapshot.telemetryCurrent[0].observed_remaining_units).toBe(4200);
    expect(snapshot.telemetryCurrent[0].used_units).toBe(800);
  });

  it("keeps out-of-order older observations in the audit trail without replacing current", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:out-of-order";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(base);
    const make = (remaining, observed) => parseGitHubRateLimitHeaders({
      headers: {
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":String(remaining),
        "x-ratelimit-used":String(5000 - remaining),
        "x-ratelimit-reset":String(now + 3600),"x-ratelimit-resource":"core"
      },
      credentialScope,observedAtEpoch:observed,
      endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    await call(stub,"recordTelemetry",{...base,telemetry:make(4200,now - 1)});
    const result = await call(stub,"recordTelemetry",{...base,telemetry:make(3900,now - 2)});
    expect(result.decision).toBe("KEEP_NEWER_OBSERVATION");
    const snapshot = await call(stub,"snapshot",base);
    expect(snapshot.telemetryCurrent[0].observed_remaining_units).toBe(4200);
    expect(snapshot.telemetryObservations).toHaveLength(2);
  });

  it("accepts a new provider reset window only after the old reset has elapsed", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:window-rollover";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(base);
    const make = (remaining, observed, reset) => parseGitHubRateLimitHeaders({
      headers: {
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":String(remaining),
        "x-ratelimit-used":String(5000 - remaining),
        "x-ratelimit-reset":String(reset),"x-ratelimit-resource":"core"
      },
      credentialScope,observedAtEpoch:observed,
      endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    await call(stub,"recordTelemetry",{...base,telemetry:make(0,now - 100,now - 10)});
    const result = await call(stub,"recordTelemetry",{...base,telemetry:make(5000,now - 5,now + 3600)});
    expect(result.decision).toBe("ACCEPT_NEW_WINDOW_AFTER_RESET");
    const snapshot = await call(stub,"snapshot",base);
    expect(snapshot.telemetryCurrent[0].window_id).toBe("core:" + (now + 3600));
  });

  it("does not roll forward to a future window before the current reset", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:premature-window";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(base);
    const make = (remaining, reset) => parseGitHubRateLimitHeaders({
      headers: {
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":String(remaining),
        "x-ratelimit-used":String(5000 - remaining),
        "x-ratelimit-reset":String(reset),"x-ratelimit-resource":"core"
      },
      credentialScope,observedAtEpoch:now - 1,
      endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    await call(stub,"recordTelemetry",{...base,telemetry:make(0,now + 100)});
    const result = await call(stub,"recordTelemetry",{...base,telemetry:make(5000,now + 3600)});
    expect(result.decision).toBe("KEEP_CURRENT_WINDOW_UNTIL_RESET");
    const snapshot = await call(stub,"snapshot",base);
    expect(snapshot.telemetryCurrent[0].window_id).toBe("core:" + (now + 100));
  });

  it("rejects stale and future telemetry before storing observations", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:stale-future";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(base);
    const make = observed => parseGitHubRateLimitHeaders({
      headers: {
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":"4200",
        "x-ratelimit-used":"800","x-ratelimit-reset":String(now + 3600),
        "x-ratelimit-resource":"core"
      },
      credentialScope,observedAtEpoch:observed,
      endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    const stale = await call(stub,"recordTelemetry",{...base,telemetry:make(now - 600)});
    expect(stale.status).toBe("REJECTED");
    expect(stale.error.message).toBe("STALE_TELEMETRY");
    const future = await call(stub,"recordTelemetry",{...base,telemetry:make(now + 60)});
    expect(future.status).toBe("REJECTED");
    expect(future.error.message).toBe("FUTURE_TELEMETRY");
    const snapshot = await call(stub,"snapshot",base);
    expect(snapshot.telemetryCurrent).toHaveLength(0);
    expect(snapshot.telemetryObservations).toHaveLength(0);
  });

  it("rejects mismatched credential scope and forged telemetry authority", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:scope-a";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const stub = stubFor(base);
    const telemetry = parseGitHubRateLimitHeaders({
      headers: {
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":"4200",
        "x-ratelimit-used":"800","x-ratelimit-reset":String(now + 3600),
        "x-ratelimit-resource":"core"
      },
      credentialScope:"github-app-installation:scope-b",
      observedAtEpoch:now,endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    const wrongScope = await call(stub,"recordTelemetry",{...base,telemetry});
    expect(wrongScope.status).toBe("REJECTED");
    const forged = {...telemetry,credential_scope:credentialScope,authority_rank:50};
    const badRank = await call(stub,"recordTelemetry",{...base,telemetry:forged});
    expect(badRank.status).toBe("REJECTED");
    const snapshot = await call(stub,"snapshot",base);
    expect(snapshot.telemetryCurrent).toHaveLength(0);
  });

  it("restricts telemetry ingestion to the primary caller", async () => {
    const now = Math.floor(Date.now() / 1000);
    const credentialScope = "github-app-installation:secondary-denied";
    const base = {provider:"github",credentialScope,windowId:"github-rate-limit-ledger"};
    const telemetry = parseGitHubRateLimitHeaders({
      headers: {
        "x-ratelimit-limit":"5000","x-ratelimit-remaining":"4200",
        "x-ratelimit-used":"800","x-ratelimit-reset":String(now + 3600),
        "x-ratelimit-resource":"core"
      },
      credentialScope,observedAtEpoch:now,
      endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    const response = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/record-telemetry",
      {
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({action:"recordTelemetry",input:{...base,telemetry}})
      }
    ));
    expect(response.status).toBe(403);
    expect((await response.json()).reason).toBe("CALLER_ACTION_FORBIDDEN");
    const stub = stubFor(base);
    const snapshot = await call(stub,"snapshot",base);
    expect(snapshot.telemetryCurrent).toHaveLength(0);
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
