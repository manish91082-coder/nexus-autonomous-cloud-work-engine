import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { quotaLedgerObjectName } from "../quota-ledger-contract.mjs";
import {
  parseGitHubRateLimitHeaders,
  parseGitHubRateLimitOverview,
  parseGitHubGraphqlRateLimit
} from "../github-quota-telemetry.mjs";
import { createSignedRequest, signedCall } from "./quota-auth-test-helper.mjs";
import { executeQuotaGuardedGitHubRequest } from "../quota-ledger-client.mjs";

const identity = (suffix, operation = "core10") => ({
  provider: "github",
  credentialScope: "installation-42/repository-99/" + suffix,
  windowId: "github-rate-limit-ledger",
  controlPlaneProvider: "cloudflare",
  reservationId: "reservation-" + suffix,
  workerId: "worker-" + suffix,
  operation
});

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

async function seedBucket(stub, input, bucketId, remaining = 100, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const observedAtEpoch = options.observedAtEpoch ?? now;
  const resetAtEpoch = options.resetAtEpoch ?? now + 3600;
  const limit = options.limitUnits ?? 100;
  const telemetry = parseGitHubRateLimitHeaders({
    headers: {
      "x-ratelimit-limit": String(limit),
      "x-ratelimit-remaining": String(remaining),
      "x-ratelimit-used": String(limit - remaining),
      "x-ratelimit-reset": String(resetAtEpoch),
      "x-ratelimit-resource": bucketId
    },
    credentialScope: input.credentialScope,
    observedAtEpoch,
    endpoint: "GET /repos/acme/demo",
    method: "GET",
    status: 200
  });
  const result = await call(stub, "recordTelemetry", {
    provider: input.provider,
    credentialScope: input.credentialScope,
    windowId: input.windowId,
    telemetry
  });
  expect(result.status).toBe("RECORDED");
  return telemetry;
}

async function seedBuckets(stub, input, entries) {
  const result = {};
  for (const [bucketId, remaining] of Object.entries(entries)) {
    result[bucketId] = await seedBucket(stub, input, bucketId, remaining);
  }
  return result;
}

describe("Phase 59.40 telemetry-driven quota admission", () => {
  it("admits only from stored telemetry and returns provider-window reservations", async () => {
    const input = identity("first", "core10_search3");
    const stub = stubFor(input);
    await seedBuckets(stub, input, {core:100, search:100});
    const result = await call(stub, "reserve", input);
    expect(result.httpStatus).toBe(200);
    expect(result.status).toBe("RESERVED");
    expect(result.reservedByBucket).toEqual({core:10,search:3});
    expect(result.providerWindows.core).toMatch(/^core:/);
    expect(result.providerWindows.search).toMatch(/^search:/);
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.buckets).toHaveLength(2);
    expect(snapshot.telemetryCurrent).toHaveLength(2);
  });

  it("refuses admission from periodic overview alone", async () => {
    const now = Math.floor(Date.now()/1000);
    const input = identity("overview-only","core10");
    const stub = stubFor(input);
    const telemetry = parseGitHubRateLimitOverview({
      credentialScope:input.credentialScope,
      observedAtEpoch:now,
      payload:{resources:{core:{
        limit:100,used:0,remaining:100,reset:now+3600
      }}}
    }).buckets[0];
    await call(stub,"recordTelemetry",{
      provider:input.provider,credentialScope:input.credentialScope,
      windowId:input.windowId,telemetry
    });
    const result = await call(stub,"reserve",input);
    expect(result.status).toBe("WAITING_FOR_QUOTA");
    expect(result.reason).toMatch(/insufficient authority/);
    expect((await call(stub,"snapshot",input)).buckets).toHaveLength(0);
  });

  it("rejects an operation absent from the server-side verified cost registry", async () => {
    const input = identity("unknown-operation","unverified-operation");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100);
    const result = await call(stub,"reserve",input);
    expect(result.status).toBe("REJECTED");
    expect(result.error.message).toMatch(/operation cost is not verified/);
    expect((await call(stub,"snapshot",input)).buckets).toHaveLength(0);
  });

  it("fails closed when a provider reset window has expired", async () => {
    const now = Math.floor(Date.now()/1000);
    const input = identity("expired-window","core10");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100,{
      observedAtEpoch:now-10,
      resetAtEpoch:now-1
    });
    const result = await call(stub,"reserve",input);
    expect(result.status).toBe("WAITING_FOR_QUOTA");
    expect(result.reason).toMatch(/reset window expired/);
    expect((await call(stub,"snapshot",input)).buckets).toHaveLength(0);
  });

  it("settles every resource against its exact provider reset window", async () => {
    const input = identity("settle", "core20_search5");
    const stub = stubFor(input);
    await seedBuckets(stub, input, {core:100,search:100});
    await call(stub, "reserve", input);
    const result = await call(stub, "settle", {
      ...input,
      actualByBucket: {core:12,search:3}
    });
    expect(result.status).toBe("SETTLED");
    const snapshot = await call(stub, "snapshot", input);
    const core = snapshot.buckets.find(x => x.bucket_id === "core");
    expect(core.reserved_units).toBe(0);
    expect(core.committed_units).toBe(12);
    expect(core.committed_since_observation_units).toBe(12);
  });

  it("does not partially reserve when any required stored telemetry bucket is exhausted", async () => {
    const input = identity("exhausted", "core10_search2");
    const stub = stubFor(input);
    await seedBuckets(stub, input, {core:100,search:11});
    const rejected = await call(stub, "reserve", input);
    expect(rejected.status).toBe("WAITING_FOR_QUOTA");
    expect(rejected.reason).toMatch(/protected local reserve exhausted/);
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.buckets).toHaveLength(0);
    expect(snapshot.telemetryCurrent).toHaveLength(2);
    expect(snapshot.reservations).toHaveLength(0);
  });

  it("serializes concurrent admissions while preserving local safety and recovery reserves", async () => {
    const input = identity("contention", "core10");
    const stub = stubFor(input);
    await seedBucket(stub, input, "core", 100);
    const attempts = Array.from({length:20}, (_,i) =>
      call(stub,"reserve",{
        ...input,
        reservationId:"contend-"+i,
        workerId:"parallel-worker-"+i
      }).then(result=>result.status)
    );
    const outcomes = await Promise.all(attempts);
    expect(outcomes.filter(x=>x==="RESERVED")).toHaveLength(9);
    expect(outcomes.filter(x=>x==="WAITING_FOR_QUOTA")).toHaveLength(11);
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.buckets[0].reserved_units).toBe(90);
    expect(snapshot.buckets[0].safety_reserve_units).toBe(5);
    expect(snapshot.buckets[0].recovery_reserve_units).toBe(5);
    expect(snapshot.reservations).toHaveLength(9);
  });

  it("rejects duplicate reservation IDs without double counting", async () => {
    const input = identity("duplicate", "core7");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100);
    await call(stub,"reserve",input);
    const rejected = await call(stub,"reserve",input);
    expect(rejected.status).toBe("DUPLICATE_RESERVATION");
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.buckets[0].reserved_units).toBe(7);
  });

  it("retains uncertain usage in the original provider reset window", async () => {
    const input = identity("uncertain", "core9");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100);
    await call(stub,"reserve",input);
    const result = await call(stub,"markUncertain",input);
    expect(result.status).toBe("UNCERTAIN_BUDGET_RETAINED");
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.buckets[0].reserved_units).toBe(0);
    expect(snapshot.buckets[0].uncertain_units).toBe(9);
  });

  it("settles an old-window reservation without debiting the new provider window", async () => {
    const now = Math.floor(Date.now()/1000);
    const input = identity("old-window-settlement","core10");
    const stub = stubFor(input);
    const oldTelemetry = await seedBucket(stub,input,"core",100,{
      observedAtEpoch:now,
      resetAtEpoch:now+4
    });
    await call(stub,"reserve",input);

    const newTelemetry = parseGitHubRateLimitHeaders({
      headers:{
        "x-ratelimit-limit":"100","x-ratelimit-remaining":"100",
        "x-ratelimit-used":"0","x-ratelimit-reset":String(now+3600),
        "x-ratelimit-resource":"core"
      },
      credentialScope:input.credentialScope,
      observedAtEpoch:now+5,
      endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    const recorded = await call(stub,"recordTelemetry",{
      provider:input.provider,credentialScope:input.credentialScope,
      windowId:input.windowId,telemetry:newTelemetry
    });
    expect(recorded.decision).toBe("ACCEPT_NEW_WINDOW_AFTER_RESET");
    const newReservation = {
      ...input,
      reservationId:"reservation-new-window",
      workerId:"worker-new-window"
    };
    expect((await call(stub,"reserve",newReservation)).status).toBe("RESERVED");

    expect((await call(stub,"settle",{...input,actualByBucket:{core:10}})).status).toBe("SETTLED");
    const counters = (await call(stub,"snapshot",input)).buckets;
    const oldCounter = counters.find(x=>x.provider_window_id===oldTelemetry.window_id);
    const newCounter = counters.find(x=>x.provider_window_id===newTelemetry.window_id);
    expect(oldCounter.reserved_units).toBe(0);
    expect(oldCounter.committed_units).toBe(10);
    expect(newCounter.reserved_units).toBe(10);
    expect(newCounter.committed_units).toBe(0);
  });

  it("rebases committed usage only when newer authoritative telemetry arrives", async () => {
    const now = Math.floor(Date.now()/1000);
    const input = identity("telemetry-rebase","core10");
    const stub = stubFor(input);
    const first = await seedBucket(stub,input,"core",100,{observedAtEpoch:now-2,resetAtEpoch:now+3600});
    await call(stub,"reserve",input);
    await call(stub,"settle",{...input,actualByBucket:{core:8}});
    await seedBucket(stub,input,"core",70,{
      observedAtEpoch:now-1,
      resetAtEpoch:first.reset_at_epoch
    });
    const refreshed = {
      ...input,
      reservationId:"reservation-telemetry-rebase-next",
      workerId:"worker-telemetry-rebase-next",
      operation:"core1"
    };
    expect((await call(stub,"reserve",refreshed)).status).toBe("RESERVED");
    const core = (await call(stub,"snapshot",refreshed)).buckets.find(x=>x.bucket_id==="core");
    expect(core.committed_units).toBe(8);
    expect(core.committed_since_observation_units).toBe(0);
    expect(core.reserved_units).toBe(1);
  });

  it("rejects a different provider credential partition on an already-bound object", async () => {
    const input = identity("identity-bound","core5");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100);
    await call(stub,"reserve",input);
    const intruder = {
      ...input,
      credentialScope:"different-installation/repository",
      reservationId:"reservation-identity-intruder",
      workerId:"worker-identity-intruder"
    };
    const rejected = await call(stub,"reserve",intruder);
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.error.message).toMatch(/identity/);
  });

  it("routes an auxiliary Worker caller to the same stored telemetry and counter window", async () => {
    const input = identity("cross-worker-shared","core10");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100);
    expect((await call(stub,"reserve",input)).status).toBe("RESERVED");
    const secondaryInput = {
      ...input,
      reservationId:"reservation-cross-worker-secondary",
      workerId:"worker-cross-worker-secondary"
    };
    const response = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/reserve",
      {method:"POST",headers:{"content-type":"application/json"},
       body:JSON.stringify({action:"reserve",input:secondaryInput})}
    ));
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("RESERVED");
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.buckets[0].reserved_units).toBe(20);
    expect(snapshot.reservations).toHaveLength(2);
  });

  it("prevents a secondary caller from settling a primary-owned reservation", async () => {
    const input = identity("least-privilege","core10");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100);
    await call(stub,"reserve",input);
    const response = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/settle",
      {method:"POST",headers:{"content-type":"application/json"},
       body:JSON.stringify({action:"settle",input:{...input,actualByBucket:{core:5}}})}
    ));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toMatch(/owner\/state mismatch/);
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.reservations[0].status).toBe("RESERVED");
    expect(snapshot.buckets[0].reserved_units).toBe(10);
  });

  it("prevents the primary caller from settling a secondary-owned reservation", async () => {
    const input = identity("caller-ownership","core10");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100);
    const secondaryInput = {
      ...input,
      reservationId:"reservation-secondary-owned",
      workerId:"worker-secondary-owned"
    };
    const response = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/reserve",
      {method:"POST",headers:{"content-type":"application/json"},
       body:JSON.stringify({action:"reserve",input:secondaryInput})}
    ));
    expect((await response.json()).status).toBe("RESERVED");
    const rejected = await call(stub,"settle",{
      ...secondaryInput,actualByBucket:{core:5}
    });
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.error.message).toMatch(/owner\/state mismatch/);
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.reservations[0].caller_id).toBe("secondary");
    expect(snapshot.reservations[0].status).toBe("RESERVED");
    expect(snapshot.buckets[0].reserved_units).toBe(10);
  });

  it("prevents oversubscription across authenticated primary and auxiliary Worker callers", async () => {
    const input = identity("cross-worker-race","core10");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100);
    const attempts = Array.from({length:20},(_,i)=>{
      const requestInput = {
        ...input,
        reservationId:"cross-race-"+i,
        workerId:"cross-race-worker-"+i
      };
      if(i%2===0) return call(stub,"reserve",requestInput);
      return env.SECOND_CALLER.fetch(new Request(
        "https://secondary-caller/reserve",
        {method:"POST",headers:{"content-type":"application/json"},
         body:JSON.stringify({action:"reserve",input:requestInput})}
      )).then(response=>response.json());
    });
    const results = await Promise.all(attempts);
    expect(results.filter(x=>x.status==="RESERVED")).toHaveLength(9);
    expect(results.filter(x=>x.status==="WAITING_FOR_QUOTA")).toHaveLength(11);
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.buckets[0].reserved_units).toBe(90);
    expect(snapshot.reservations).toHaveLength(9);
  });

  it("rejects unauthenticated callers without mutating quota state", async () => {
    const input = identity("unauthenticated","core10");
    const stub = stubFor(input);
    const response = await stub.fetch(new Request("https://quota-ledger.internal/rpc",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({action:"reserve",input})
    }));
    expect(response.status).toBe(401);
    expect((await response.json()).reason).toBe("UNAUTHENTICATED_CALLER");
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.buckets).toHaveLength(0);
    expect(snapshot.reservations).toHaveLength(0);
  });

  it("rejects unauthorized caller IDs and incorrect HMAC keys", async () => {
    const input = identity("wrong-key","core10");
    const stub = stubFor(input);
    const rogue = await createSignedRequest(env,"reserve",input,{
      callerId:"rogue",secret:"rogue-test-secret-0123456789abcdef"
    });
    expect((await stub.fetch(rogue)).status).toBe(401);
    const wrongKey = await createSignedRequest(env,"reserve",input,{
      callerId:"primary",secret:"wrong-test-secret-0123456789abcdef"
    });
    const response = await stub.fetch(wrongKey);
    expect(response.status).toBe(401);
    expect((await response.json()).reason).toBe("SIGNATURE_INVALID");
    expect((await call(stub,"snapshot",input)).buckets).toHaveLength(0);
  });

  it("rejects expired signed requests before quota mutation", async () => {
    const input = identity("expired","core10");
    const stub = stubFor(input);
    const expired = await createSignedRequest(env,"reserve",input,{
      timestamp:Math.floor(Date.now()/1000)-60
    });
    const response = await stub.fetch(expired);
    expect(response.status).toBe(401);
    expect((await response.json()).reason).toBe("AUTH_TIMESTAMP_EXPIRED");
    expect((await call(stub,"snapshot",input)).buckets).toHaveLength(0);
  });

  it("rejects a replayed nonce even when the caller re-signs the same operation", async () => {
    const input = identity("replay","core10");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100);
    const options = {nonce:"nonce-replay-0123456789"};
    const first = await createSignedRequest(env,"reserve",input,options);
    const second = await createSignedRequest(env,"reserve",input,options);
    expect((await stub.fetch(first)).status).toBe(200);
    const replay = await stub.fetch(second);
    expect(replay.status).toBe(409);
    expect((await replay.json()).reason).toBe("REPLAYED_NONCE");
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.reservations).toHaveLength(1);
  });

  it("rejects body tampering because the HMAC covers the exact request body", async () => {
    const input = identity("tamper","core10");
    const stub = stubFor(input);
    const signed = await createSignedRequest(env,"reserve",input);
    const tampered = {...input,operation:"core20_search5"};
    const request = new Request("https://quota-ledger.internal/rpc",{
      method:"POST",headers:signed.headers,
      body:JSON.stringify({action:"reserve",input:tampered})
    });
    const response = await stub.fetch(request);
    expect(response.status).toBe(401);
    expect((await response.json()).reason).toBe("SIGNATURE_INVALID");
    expect((await call(stub,"snapshot",input)).buckets).toHaveLength(0);
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

  it("requires secondary telemetry to link to its own reservation and avoids double accounting", async () => {
    const input = identity("secondary-linked-telemetry","core10");
    const stub = stubFor(input);
    const initial = await seedBucket(stub,input,"core",100);
    const secondaryInput = {
      ...input,
      reservationId:"reservation-secondary-telemetry",
      workerId:"worker-secondary-telemetry"
    };
    const reservedResponse = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/reserve",
      {method:"POST",headers:{"content-type":"application/json"},
       body:JSON.stringify({action:"reserve",input:secondaryInput})}
    ));
    expect((await reservedResponse.json()).status).toBe("RESERVED");

    const now = Math.floor(Date.now()/1000);
    const responseTelemetry = parseGitHubRateLimitHeaders({
      headers:{
        "x-ratelimit-limit":"100","x-ratelimit-remaining":"90",
        "x-ratelimit-used":"10",
        "x-ratelimit-reset":String(initial.reset_at_epoch),
        "x-ratelimit-resource":"core"
      },
      credentialScope:input.credentialScope,
      observedAtEpoch:now,
      endpoint:"GET /repos/acme/demo",method:"GET",status:200
    });
    const unlinked = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/record-telemetry",
      {method:"POST",headers:{"content-type":"application/json"},
       body:JSON.stringify({action:"recordTelemetry",input:{
         provider:input.provider,credentialScope:input.credentialScope,
         windowId:input.windowId,telemetry:responseTelemetry
       }})}
    ));
    expect(unlinked.status).toBe(400);
    expect((await unlinked.json()).error.message)
      .toBe("secondary telemetry must be linked to its own reservation");

    const linked = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/record-telemetry",
      {method:"POST",headers:{"content-type":"application/json"},
       body:JSON.stringify({action:"recordTelemetry",input:{
         provider:input.provider,credentialScope:input.credentialScope,
         windowId:input.windowId,reservationId:secondaryInput.reservationId,
         telemetry:responseTelemetry
       }})}
    ));
    expect(linked.status).toBe(200);
    expect((await linked.json()).status).toBe("RECORDED");

    const settled = await env.SECOND_CALLER.fetch(new Request(
      "https://secondary-caller/settle",
      {method:"POST",headers:{"content-type":"application/json"},
       body:JSON.stringify({action:"settle",input:{
         ...secondaryInput,actualByBucket:{core:10}
       }})}
    ));
    expect(settled.status).toBe(200);
    expect((await settled.json()).status).toBe("SETTLED");
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.telemetryObservations.some(x=>x.reservation_id===secondaryInput.reservationId)).toBe(true);
    expect(snapshot.buckets[0].reserved_units).toBe(0);
    expect(snapshot.buckets[0].committed_units).toBe(10);
    expect(snapshot.buckets[0].committed_since_observation_units).toBe(0);
  });

  it("reserves, sends once, links response telemetry and settles conservatively", async () => {
    const input = identity("client-lifecycle", "core10");
    const stub = stubFor(input);
    const seeded = await seedBucket(stub, input, "core", 100);
    let providerCalls = 0;
    const result = await executeQuotaGuardedGitHubRequest({
      env,
      credentialScope: input.credentialScope,
      operation: input.operation,
      workerId: input.workerId,
      requestId: "lifecycle-001",
      request: new Request("https://api.github.com/repos/acme/demo"),
      fetchImpl: async () => {
        providerCalls += 1;
        return new Response(JSON.stringify({ok:true}), {
          status: 200,
          headers: {
            "content-type":"application/json",
            "x-ratelimit-limit":"100",
            "x-ratelimit-remaining":"90",
            "x-ratelimit-used":"10",
            "x-ratelimit-reset":String(seeded.reset_at_epoch),
            "x-ratelimit-resource":"core",
            "x-github-request-id":"12345678-1234-4123-8123-123456789abc"
          }
        });
      }
    });
    expect(result.status).toBe("COMPLETED");
    expect(providerCalls).toBe(1);
    expect(result.settlement.status).toBe("SETTLED");
    const snapshot = await call(stub, "snapshot", input);
    expect(snapshot.reservations.find(x => x.reservation_id === "p10cr:lifecycle-001").status)
      .toBe("SETTLED");
    expect(snapshot.telemetryObservations.some(x => x.reservation_id === "p10cr:lifecycle-001")).toBe(true);
    expect(snapshot.buckets[0].reserved_units).toBe(0);
    expect(snapshot.buckets[0].committed_units).toBe(10);
    expect(snapshot.buckets[0].committed_since_observation_units).toBe(0);
  });

  it("does not send a provider request when authoritative quota admission is unavailable", async () => {
    const input = identity("client-no-admission", "core10");
    const stub = stubFor(input);
    const now = Math.floor(Date.now()/1000);
    const overview = parseGitHubRateLimitOverview({
      credentialScope:input.credentialScope,
      observedAtEpoch:now,
      payload:{resources:{core:{limit:100,used:0,remaining:100,reset:now+3600}}}
    }).buckets[0];
    await call(stub, "recordTelemetry", {
      provider:input.provider,credentialScope:input.credentialScope,
      windowId:input.windowId,telemetry:overview
    });
    let providerCalls = 0;
    const result = await executeQuotaGuardedGitHubRequest({
      env,credentialScope:input.credentialScope,operation:input.operation,
      workerId:input.workerId,requestId:"no-admission-001",
      request:new Request("https://api.github.com/repos/acme/demo"),
      fetchImpl:async()=>{providerCalls+=1;return new Response("should-not-run");}
    });
    expect(result.status).toBe("NOT_SENT");
    expect(providerCalls).toBe(0);
    expect(result.admission.reason).toMatch(/insufficient authority/);
  });

  it("retains the full reservation as uncertain when the provider outcome is ambiguous", async () => {
    const input = identity("client-ambiguous", "core10");
    const stub = stubFor(input);
    await seedBucket(stub,input,"core",100);
    const result = await executeQuotaGuardedGitHubRequest({
      env,credentialScope:input.credentialScope,operation:input.operation,
      workerId:input.workerId,requestId:"ambiguous-001",
      request:new Request("https://api.github.com/repos/acme/demo"),
      fetchImpl:async()=>{throw new Error("connection reset after write");}
    });
    expect(result.status).toBe("PROVIDER_OUTCOME_UNCERTAIN");
    expect(result.accounting.status).toBe("UNCERTAIN_BUDGET_RETAINED");
    const snapshot = await call(stub,"snapshot",input);
    expect(snapshot.buckets[0].reserved_units).toBe(0);
    expect(snapshot.buckets[0].uncertain_units).toBe(10);
  });

  it("never replays a provider request for a duplicate stable request ID", async () => {
    const input = identity("client-idempotent", "core10");
    const stub = stubFor(input);
    const seeded = await seedBucket(stub,input,"core",100);
    let providerCalls = 0;
    const execute = () => executeQuotaGuardedGitHubRequest({
      env,credentialScope:input.credentialScope,operation:input.operation,
      workerId:input.workerId,requestId:"same-stable-request",
      request:new Request("https://api.github.com/repos/acme/demo"),
      fetchImpl:async()=>{
        providerCalls+=1;
        return new Response("ok",{status:200,headers:{
          "x-ratelimit-limit":"100","x-ratelimit-remaining":"90",
          "x-ratelimit-used":"10","x-ratelimit-reset":String(seeded.reset_at_epoch),
          "x-ratelimit-resource":"core"
        }});
      }
    });
    const first = await execute();
    const second = await execute();
    expect(first.status).toBe("COMPLETED");
    expect(second.status).toBe("DUPLICATE_REQUEST_NOT_REPLAYED");
    expect(providerCalls).toBe(1);
  });

  it("rejects non-GitHub destinations before reserving or making a network call", async () => {
    const input = identity("client-host-restriction", "core10");
    await seedBucket(stubFor(input),input,"core",100);
    await expect(executeQuotaGuardedGitHubRequest({
      env,credentialScope:input.credentialScope,operation:input.operation,
      workerId:input.workerId,requestId:"wrong-host",
      request:new Request("https://example.com/data"),
      fetchImpl:async()=>{throw new Error("must not run");}
    })).rejects.toThrow(/api.github.com/);
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
