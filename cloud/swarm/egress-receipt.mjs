/**
 * Phase 59.45C — strict Egress Dispatch Receipt (EDR) verifier.
 * EDR keys are independent from Credential Lease Assertion (CLA) keys.
 * This verifies evidence claims; it does not itself prove gateway key custody.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const MAX_LENGTH = 8192;
const MAX_WINDOW_SECONDS = 300;
const DIGEST = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9._:-]{8,128}$/;
const POSITIVE_ID = /^[1-9][0-9]{0,19}$/;
const OUTCOMES = new Set(["response_received", "connect_failed_before_send", "outcome_uncertain"]);

function fail(reason) {
  throw new TypeError(`egress receipt rejected: ${reason}`);
}
function exactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length
    || keys.some(key => !Object.hasOwn(value, key))) fail("claim/header schema mismatch");
}
function decode(segment, maxBytes) {
  if (typeof segment !== "string" || !/^[A-Za-z0-9_-]+$/.test(segment) || segment.length % 4 === 1) fail("invalid base64url");
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - segment.length % 4) % 4);
  let binary;
  try { binary = atob(padded); } catch { fail("invalid base64url"); }
  if (binary.length > maxBytes) fail("segment too large");
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  let canonical = "";
  for (const byte of bytes) canonical += String.fromCharCode(byte);
  if (btoa(canonical).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_") !== segment) fail("non-canonical base64url");
  return bytes;
}
function parse(segment, label) {
  try {
    const value = JSON.parse(decoder.decode(segment));
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be object`);
    return value;
  } catch (error) {
    if (error instanceof TypeError && error.message.startsWith("egress receipt")) throw error;
    fail(`invalid ${label} JSON`);
  }
}
function positive(value, label) {
  if (typeof value !== "string" || !POSITIVE_ID.test(value)) fail(`invalid ${label}`);
  return value;
}
function validateClaims(c, now, expected) {
  exactKeys(c, ["iss","aud","cla_jti","lease_id","installation_id","repository_id",
    "operation_id","method","canonical_url_sha256","request_body_sha256",
    "request_fingerprint","token_sha256","dispatch_id","started_at",
    "completed_at","response_status","outcome"]);
  if (c.iss !== expected.issuer || c.aud !== expected.audience) fail("issuer or audience mismatch");
  if (typeof c.cla_jti !== "string" || !ID.test(c.cla_jti)
    || typeof c.lease_id !== "string" || !ID.test(c.lease_id)
    || typeof c.dispatch_id !== "string" || !ID.test(c.dispatch_id)) fail("invalid receipt identity");
  positive(c.installation_id, "installation_id");
  positive(c.repository_id, "repository_id");
  if (typeof c.operation_id !== "string" || !/^[a-z0-9.:-]{8,128}$/.test(c.operation_id)) fail("invalid operation_id");
  if (c.method !== "GET") fail("method not enabled by read-only gateway profile");
  for (const key of ["canonical_url_sha256","request_body_sha256","request_fingerprint","token_sha256"]) {
    if (typeof c[key] !== "string" || !DIGEST.test(c[key])) fail(`invalid ${key}`);
  }
  if (!Number.isSafeInteger(c.started_at) || !Number.isSafeInteger(c.completed_at)
    || c.started_at > now + 5 || c.completed_at < c.started_at
    || c.completed_at - c.started_at > MAX_WINDOW_SECONDS) fail("receipt time window invalid");
  if (typeof c.outcome !== "string" || !OUTCOMES.has(c.outcome)) fail("invalid outcome");
  if (c.outcome === "response_received") {
    if (!Number.isInteger(c.response_status) || c.response_status < 100 || c.response_status > 599) fail("response status required");
  } else if (c.response_status !== null) fail("non-response outcome must have null response status");
  const bindings = ["claJti","leaseId","installationId","repositoryId","operationId","method",
    "canonicalUrlSha256","requestBodySha256","requestFingerprint","tokenSha256","dispatchId"];
  const map = {
    claJti:"cla_jti",leaseId:"lease_id",installationId:"installation_id",repositoryId:"repository_id",
    operationId:"operation_id",method:"method",canonicalUrlSha256:"canonical_url_sha256",
    requestBodySha256:"request_body_sha256",requestFingerprint:"request_fingerprint",
    tokenSha256:"token_sha256",dispatchId:"dispatch_id"
  };
  for (const key of bindings) {
    if (expected[key] !== undefined && c[map[key]] !== String(expected[key])) fail(`${map[key]} binding mismatch`);
  }
  return c;
}

/**
 * expected: pinned issuer/audience and optional exact CLA/request bindings.
 * publicKeys: gateway-only pinned map kid -> CryptoKey or public JWK.
 */
export async function verifyEgressDispatchReceipt({
  receipt, publicKeys, issuer, audience, nowEpoch = Math.floor(Date.now()/1000), ...expected
}) {
  if (typeof receipt !== "string" || receipt.length > MAX_LENGTH) fail("receipt missing or too large");
  if (!Number.isSafeInteger(nowEpoch) || nowEpoch < 0) fail("invalid clock");
  const parts = receipt.split(".");
  if (parts.length !== 3 || parts.some(part => !part)) fail("compact JWS required");
  const [h,p,s] = parts;
  const header = parse(decode(h, 1024), "header");
  exactKeys(header, ["alg","kid","typ"]);
  if (header.alg !== "ES256" || header.typ !== "JWT"
    || typeof header.kid !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(header.kid)) fail("unsupported protected header");
  const keySource = publicKeys?.[header.kid];
  if (!keySource) fail("unknown egress signing key");
  const claims = parse(decode(p, 6144), "claims");
  validateClaims(claims, nowEpoch, {issuer,audience,...expected});
  const signature = decode(s, 64);
  if (signature.byteLength !== 64) fail("invalid ES256 signature length");
  try {
    const key = typeof CryptoKey !== "undefined" && keySource instanceof CryptoKey
      ? keySource
      : await crypto.subtle.importKey("jwk", keySource, {name:"ECDSA",namedCurve:"P-256"}, false, ["verify"]);
    const valid = await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"}, key, signature, encoder.encode(`${h}.${p}`));
    if (!valid) fail("signature invalid");
  } catch (error) {
    if (error instanceof TypeError && error.message.startsWith("egress receipt")) throw error;
    fail("signature verification failed");
  }
  return Object.freeze({
    issuer: claims.iss, audience: claims.aud, claJti: claims.cla_jti,
    leaseId: claims.lease_id, installationId: claims.installation_id,
    repositoryId: claims.repository_id, operationId: claims.operation_id,
    method: claims.method, canonicalUrlSha256: claims.canonical_url_sha256,
    requestBodySha256: claims.request_body_sha256, requestFingerprint: claims.request_fingerprint,
    tokenSha256: claims.token_sha256, dispatchId: claims.dispatch_id,
    startedAt: claims.started_at, completedAt: claims.completed_at,
    responseStatus: claims.response_status, outcome: claims.outcome
  });
}
