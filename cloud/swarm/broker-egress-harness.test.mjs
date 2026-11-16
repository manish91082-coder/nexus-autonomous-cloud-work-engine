import test from "node:test";
import assert from "node:assert/strict";
import { verifyGitHubCredentialProvenance } from "./credential-provenance.mjs";
import { computeGitHubRequestFingerprint } from "./request-fingerprint.mjs";
import { verifyEgressDispatchReceipt } from "./egress-receipt.mjs";
import { computeGitHubResponseHeadersEvidence } from "./github-response-evidence.mjs";

const now = 1900000000;
const b64u = value => Buffer.from(value).toString("base64url");
const json = value => b64u(JSON.stringify(value));
const hex = value => Buffer.from(value).toString("hex");
const sha256 = async value => hex(await crypto.subtle.digest("SHA-256", value));

async function keyPair() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { pair, jwk: await crypto.subtle.exportKey("jwk", pair.publicKey) };
}
async function signJws(pair, kid, claims) {
  const input = `${json({ alg: "ES256", kid, typ: "JWT" })}.${json(claims)}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, new TextEncoder().encode(input));
  return `${input}.${b64u(signature)}`;
}

async function createHarness() {
  const brokerKey = await keyPair();
  const gatewayKey = await keyPair();
  const syntheticToken = "SYNTHETIC-ONLY-NOT-A-GITHUB-CREDENTIAL";
  const installationId = "42113";
  const repositoryId = "1454085952";
  const lane = "compute_readonly";
  const leaseId = "synthetic-lease-harness-0001";
  const tokenSha256 = await sha256(new TextEncoder().encode(syntheticToken));
  const claClaims = {
    iss: "https://broker.test.invalid", aud: "nexus-quota-ledger", sub: "12345",
    installation_id: installationId, repository_ids: [repositoryId],
    permissions: { metadata: "read", contents: "read" },
    token_sha256: tokenSha256, issued_at: now - 1, expires_at: now + 120,
    jti: "synthetic-cla-harness-000001", credential_lane: lane,
    lease_id: leaseId, key_version: "broker-test-v1"
  };
  const cla = await signJws(brokerKey.pair, "broker-test-key", claClaims);
  // The token exists only in this broker/gateway closure. No worker-facing API returns it.
  const brokerVault = new Map([[leaseId, syntheticToken]]);
  const usedDispatches = new Set();
  const publicBrokerKeys = { "broker-test-key": brokerKey.jwk };
  const publicGatewayKeys = { "gateway-test-key": gatewayKey.jwk };

  async function gatewayDispatch({ lease, intent, outcome = "response_received" }) {
    const token = brokerVault.get(lease.leaseId);
    assert.ok(token, "unknown lease");
    const verifiedCla = await verifyGitHubCredentialProvenance({
      assertion: lease.cla, bearerToken: token, publicKeys: publicBrokerKeys, nowEpoch: now,
      issuer: "https://broker.test.invalid", audience: "nexus-quota-ledger",
      appId: "12345", repositoryId: intent.repositoryId, credentialLane: lane, leaseId: lease.leaseId,
      requiredPermissions: { metadata: "read" }
    });
    const fingerprint = await computeGitHubRequestFingerprint(intent);
    const canonical = JSON.parse(fingerprint.canonical);
    assert.equal(canonical.repositoryId, repositoryId);
    assert.equal(canonical.credentialLane, lane);
    const dispatchId = "synthetic-dispatch-harness-0001";
    const responseHeaders = new Headers({
      "x-ratelimit-limit": "5000", "x-ratelimit-remaining": "4999",
      "x-ratelimit-used": "1", "x-ratelimit-reset": String(now + 300),
      "x-ratelimit-resource": "core", "x-github-request-id": "SYNTHETIC-REQUEST-ID"
    });
    const responseEvidence = await computeGitHubResponseHeadersEvidence(responseHeaders);
    // Simulates Authorization attachment inside the trusted gateway boundary.
    // The token is never returned, logged, or included in the EDR.
    const authorizationAttached = token.length > 0;
    assert.equal(authorizationAttached, true);
    const claims = {
      iss: "https://egress.test.invalid", aud: "nexus-quota-ledger",
      cla_jti: verifiedCla.assertionId, lease_id: lease.leaseId,
      installation_id: verifiedCla.installationId, repository_id: repositoryId,
      operation_id: intent.operationId, method: intent.method,
      canonical_url_sha256: await sha256(new TextEncoder().encode(canonical.url)),
      request_body_sha256: fingerprint.requestBodySha256,
      request_fingerprint: fingerprint.fingerprint, token_sha256: verifiedCla.tokenSha256,
      response_headers_sha256: outcome === "response_received" ? responseEvidence.sha256 : null,
      dispatch_id: dispatchId, started_at: now - 1, completed_at: now,
      response_status: outcome === "response_received" ? 200 : null, outcome
    };
    return { receipt: await signJws(gatewayKey.pair, "gateway-test-key", claims), fingerprint, dispatchId, responseEvidence, outcome };
  }

  async function ledgerSettle({ lease, dispatch }) {
    const claVerified = await verifyGitHubCredentialProvenance({
      assertion: lease.cla, verifyTokenBinding: false,
      publicKeys: publicBrokerKeys, nowEpoch: now,
      issuer: "https://broker.test.invalid", audience: "nexus-quota-ledger",
      appId: "12345", repositoryId, credentialLane: lane, leaseId: lease.leaseId
    });
    const receipt = await verifyEgressDispatchReceipt({
      receipt: dispatch.receipt, publicKeys: publicGatewayKeys,
      issuer: "https://egress.test.invalid", audience: "nexus-quota-ledger", nowEpoch: now,
      claJti: claVerified.assertionId, leaseId: lease.leaseId,
      installationId, repositoryId,
      canonicalUrlSha256: await sha256(new TextEncoder().encode(JSON.parse(dispatch.fingerprint.canonical).url)),
      requestFingerprint: dispatch.fingerprint.fingerprint,
      requestBodySha256: dispatch.fingerprint.requestBodySha256,
      tokenSha256: claVerified.tokenSha256,
      responseHeadersSha256: dispatch.outcome === "response_received" ? dispatch.responseEvidence.sha256 : null, dispatchId: dispatch.dispatchId
    });
    // The ledger verifies signed CLA claims without receiving the broker token.
  // Token-to-CLA binding is enforced by the gateway before dispatch.
  // Test-only atomic single-use dispatch consumption. Production QLDO still needs
    // transactional replay consumption before any reservation lookup or mutation.
    if (usedDispatches.has(receipt.dispatchId)) throw new TypeError("duplicate dispatch replay");
    usedDispatches.add(receipt.dispatchId);
    return receipt;
  }

  return {
    lease: Object.freeze({ leaseId, cla }),
    gatewayDispatch, ledgerSettle,
    // Expose only verifier public keys for explicit negative tests, never brokerVault/token.
    publicBrokerKeys, publicGatewayKeys
  };
}

const validIntent = () => ({
  provider: "github", repositoryId: "1454085952",
  operationId: "github.rest.repositories.get.v1", method: "GET",
  url: "https://api.github.com/repos/octocat/Hello-World",
  body: new Uint8Array(), credentialLane: "compute_readonly"
});

test("synthetic broker -> gateway -> ledger flow verifies CLA, request fingerprint and EDR", async () => {
  const h = await createHarness();
  const dispatch = await h.gatewayDispatch({ lease: h.lease, intent: validIntent() });
  const settled = await h.ledgerSettle({ lease: h.lease, dispatch });
  assert.equal(settled.outcome, "response_received");
  assert.equal(settled.responseStatus, 200);
  assert.equal(settled.installationId, "42113");
  assert.equal(Object.hasOwn(dispatch, "token"), false);
});

test("worker cannot choose a different installation scope or substitute token", async () => {
  const h = await createHarness();
  const dispatch = await h.gatewayDispatch({
    lease: { ...h.lease, credentialScope: "github-app-installation:99999" },
    intent: validIntent()
  });
  const settled = await h.ledgerSettle({ lease: h.lease, dispatch });
  assert.equal(settled.installationId, "42113", "caller-supplied scope is ignored; signed CLA controls identity");
  // No token-taking public API exists; token substitution is independently rejected by CLA verifier.
  await assert.rejects(() => verifyGitHubCredentialProvenance({
    assertion: h.lease.cla, bearerToken: "SUBSTITUTED-SYNTHETIC-TOKEN",
    publicKeys: h.publicBrokerKeys, nowEpoch: now,
    issuer: "https://broker.test.invalid", audience: "nexus-quota-ledger",
    appId: "12345", repositoryId: "1454085952"
  }), /token digest mismatch/);
});

test("gateway rejects repository/path/operation mismatch before emitting a receipt", async () => {
  const h = await createHarness();
  await assert.rejects(() => h.gatewayDispatch({
    lease: h.lease, intent: { ...validIntent(), repositoryId: "999" }
  }), /repository not authorized/);
  await assert.rejects(() => h.gatewayDispatch({
    lease: h.lease, intent: { ...validIntent(), url: "https://api.github.com/repos/octocat/Other" }
  }), /URL path does not match/);
  await assert.rejects(() => h.gatewayDispatch({
    lease: h.lease, intent: { ...validIntent(), operationId: "github.rest.unknown.v1" }
  }), /not in the reviewed registry/);
});

test("ledger rejects duplicate dispatch receipt replay", async () => {
  const h = await createHarness();
  const dispatch = await h.gatewayDispatch({ lease: h.lease, intent: validIntent() });
  await h.ledgerSettle({ lease: h.lease, dispatch });
  await assert.rejects(() => h.ledgerSettle({ lease: h.lease, dispatch }), /duplicate dispatch replay/);
});

test("uncertain egress outcome remains uncertain and is not treated as a successful response", async () => {
  const h = await createHarness();
  const dispatch = await h.gatewayDispatch({ lease: h.lease, intent: validIntent(), outcome: "outcome_uncertain" });
  const settled = await h.ledgerSettle({ lease: h.lease, dispatch });
  assert.equal(settled.outcome, "outcome_uncertain");
  assert.equal(settled.responseStatus, null);
});

test("ledger rejects EDR tampering and a receipt bound to a different request URL", async () => {
  const h = await createHarness();
  const dispatch = await h.gatewayDispatch({ lease: h.lease, intent: validIntent() });
  const parts = dispatch.receipt.split(".");
  parts[1] = b64u(JSON.stringify({
    ...JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")),
    installation_id: "99999"
  }));
  const tampered = { ...dispatch, receipt: parts.join(".") };
  await assert.rejects(() => h.ledgerSettle({ lease: h.lease, dispatch: tampered }), /signature invalid/);
  const normal = await h.gatewayDispatch({ lease: h.lease, intent: validIntent() });
  const changed = {
    ...normal,
    fingerprint: await computeGitHubRequestFingerprint({
      ...validIntent(), url: "https://api.github.com/repos/octocat/Other"
    })
  };
  await assert.rejects(() => h.ledgerSettle({ lease: h.lease, dispatch: changed }), /binding mismatch/);
});
