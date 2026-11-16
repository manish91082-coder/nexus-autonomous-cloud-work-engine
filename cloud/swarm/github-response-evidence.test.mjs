import test from "node:test";
import assert from "node:assert/strict";
import { computeGitHubResponseHeadersEvidence } from "./github-response-evidence.mjs";

test("hashes only the fixed GitHub rate-limit response header allowlist", async () => {
  const a = await computeGitHubResponseHeadersEvidence(new Headers({
    "x-ratelimit-limit":"5000",
    "x-ratelimit-remaining":"4999",
    "x-ratelimit-used":"1",
    "x-ratelimit-reset":"1900000300",
    "x-ratelimit-resource":"core",
    "x-github-request-id":"ABC123",
    "retry-after":"30",
    "set-cookie":"secret=not-included"
  }));
  const b = await computeGitHubResponseHeadersEvidence(new Headers({
    "x-ratelimit-limit":"5000",
    "x-ratelimit-remaining":"4999",
    "x-ratelimit-used":"1",
    "x-ratelimit-reset":"1900000300",
    "x-ratelimit-resource":"core",
    "x-github-request-id":"ABC123",
    "retry-after":"30",
    "set-cookie":"different-secret"
  }));
  assert.equal(a.sha256,b.sha256);
  assert.equal(Object.hasOwn(a.headers,"set-cookie"),false);
  assert.equal(a.headers["x-ratelimit-remaining"],"4999");
});

test("detects changes to any telemetry-relevant response header", async () => {
  const a = await computeGitHubResponseHeadersEvidence(new Headers({"x-ratelimit-remaining":"4999"}));
  const b = await computeGitHubResponseHeadersEvidence(new Headers({"x-ratelimit-remaining":"4998"}));
  assert.notEqual(a.sha256,b.sha256);
});

test("rejects non-Headers input rather than hashing caller-shaped objects", async () => {
  await assert.rejects(()=>computeGitHubResponseHeadersEvidence({ "x-ratelimit-remaining":"1" }),/Headers.get/);
});
