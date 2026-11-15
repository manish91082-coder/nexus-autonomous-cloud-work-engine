import test from "node:test";
import assert from "node:assert/strict";
import {
  requestFingerprint, resolveReviewedOperation, signedLedgerRequest, runQuotaBoundRequest
} from "./quota-worker-client.mjs";

const url = "https://api.example.test/v1/items?b=2&a=1";
const fingerprint = await requestFingerprint("GET", url);
const registry = {
  readItems: {
    status: "REVIEWED", method: "GET", path: "/v1/items",
    queryFingerprint: fingerprint, sources: ["https://docs.example.test/rate-limits"],
    costEvidence: { verified: true, measuredUnits: 1 }
  }
};
const reservation = {
  method: "GET", url, workerId: "worker-a", reservationId: "reservation-a",
  quotaIdentity: { provider: "github", credentialScope: "test-scope", windowId: "partition-a" }
};

function harness(overrides = {}) {
  const calls = [];
  const ledger = {
    reserve: async input => { calls.push(["reserve", input]); return { status: "RESERVED" }; },
    recordTelemetry: async input => { calls.push(["telemetry", input]); return { status: "RECORDED" }; },
    settle: async input => { calls.push(["settle", input]); return { status: "SETTLED" }; },
    markUncertain: async input => { calls.push(["uncertain", input]); return { status: "UNCERTAIN_BUDGET_RETAINED" }; },
    ...overrides.ledger
  };
  return {
    calls, ledger,
    args: {
      registry, operation: "readItems", reservation, ledger,
      providerRequest: async () => { calls.push(["request"]); return new Response("ok", { status: 200 }); },
      captureTelemetry: async () => [{ telemetry_source: "response_header" }],
      actualUsageFromResponse: async () => ({ core: 1 }),
      ...overrides.args
    }
  };
}

test("fingerprint is stable across query parameter order", async () => {
  assert.equal(fingerprint, await requestFingerprint("GET", "https://api.example.test/v1/items?a=1&b=2"));
});

test("unknown or unreviewed endpoint cost fails closed before reserve", async () => {
  const h = harness();
  await assert.rejects(() => runQuotaBoundRequest({ ...h.args, operation: "unknown" }), /NO_GO/);
  assert.equal(h.calls.length, 0);
});

test("registry rejects endpoint/query drift", async () => {
  await assert.rejects(() => resolveReviewedOperation(registry, "readItems", "GET",
    "https://api.example.test/v1/items?different=1"), /NO_GO_OPERATION_REGISTRY_MISMATCH/);
});

test("signed ledger request binds body, caller, timestamp and path", async () => {
  const request = await signedLedgerRequest({
    secret: "x".repeat(40), callerId: "worker-a", action: "reserve",
    input: { reservationId: "r1" }, now: 1_800_000_000_000,
    nonce: "123e4567-e89b-42d3-a456-426614174000"
  });
  assert.equal(request.method, "POST");
  assert.equal(new URL(request.url).pathname, "/rpc");
  assert.ok(request.headers.get("x-nexus-signature"));
  assert.equal(await request.text(), JSON.stringify({ action: "reserve", input: { reservationId: "r1" } }));
});

test("success path orders reserve, request, response telemetry, settlement", async () => {
  const h = harness();
  const result = await runQuotaBoundRequest(h.args);
  assert.equal(result.status, "COMPLETED");
  assert.deepEqual(h.calls.map(call => call[0]), ["reserve", "request", "telemetry", "settle"]);
});

test("provider transport failure retains reservation as uncertain", async () => {
  const h = harness({ args: { providerRequest: async () => { throw new Error("socket reset"); } } });
  const result = await runQuotaBoundRequest(h.args);
  assert.equal(result.status, "UNCERTAIN_BUDGET_RETAINED");
  assert.deepEqual(h.calls.map(call => call[0]), ["reserve", "uncertain"]);
});

test("telemetry failure never releases quota and marks uncertain", async () => {
  const h = harness({ args: { captureTelemetry: async () => { throw new Error("bad headers"); } } });
  const result = await runQuotaBoundRequest(h.args);
  assert.equal(result.status, "UNCERTAIN_BUDGET_RETAINED");
  assert.deepEqual(h.calls.map(call => call[0]), ["reserve", "request", "uncertain"]);
});

test("denied reservation never invokes provider", async () => {
  const h = harness({ ledger: { reserve: async () => ({ status: "WAITING_FOR_QUOTA" }) } });
  const result = await runQuotaBoundRequest(h.args);
  assert.equal(result.status, "WAITING_FOR_QUOTA");
  assert.deepEqual(h.calls.map(call => call[0]), ["reserve"]);
});
