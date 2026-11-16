/**
 * Phase 59.45C — strict signed GitHub credential provenance verifier.
 *
 * This module verifies broker assertions only. It does not create credentials,
 * contact GitHub, or establish broker/key custody. Production key provisioning
 * remains a separate owner-approved operation.
 */
const encoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });
const MAX_ASSERTION_LENGTH = 8192;
const MAX_TTL_SECONDS = 900;

function fail(message) {
  throw new TypeError(`credential provenance rejected: ${message}`);
}

function decodeBase64Url(segment, maxBytes) {
  if (typeof segment !== "string" || !/^[A-Za-z0-9_-]+$/.test(segment)
    || segment.length % 4 === 1) fail("invalid base64url");
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - segment.length % 4) % 4);
  let binary;
  try { binary = atob(padded); } catch { fail("invalid base64url"); }
  if (binary.length > maxBytes) fail("segment too large");
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  let canonical = "";
  for (const byte of bytes) canonical += String.fromCharCode(byte);
  let encoded = btoa(canonical).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (encoded !== segment) fail("non-canonical base64url");
  return bytes;
}

function parseJson(bytes, label) {
  try {
    const value = JSON.parse(textDecoder.decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
    return value;
  } catch (error) {
    if (error instanceof TypeError && error.message.startsWith("credential provenance")) throw error;
    fail(`invalid ${label} JSON`);
  }
}

function exactKeys(value, required, optional = []) {
  const allowed = new Set([...required, ...optional]);
  if (required.some(key => !Object.hasOwn(value, key))
    || Object.keys(value).some(key => !allowed.has(key))) fail("unexpected claim/header shape");
}

function positiveId(value, field) {
  if (!(typeof value === "string" || Number.isSafeInteger(value))
    || !/^[1-9][0-9]{0,19}$/.test(String(value))) fail(`invalid ${field}`);
  return String(value);
}

function validateClaims(claims, nowEpoch, expected) {
  exactKeys(claims, [
    "iss", "aud", "sub", "installation_id", "repository_ids", "permissions",
    "token_sha256", "issued_at", "expires_at", "jti", "credential_lane"
  ]);
  if (claims.iss !== expected.issuer || claims.aud !== expected.audience) fail("issuer or audience mismatch");
  if (claims.sub !== expected.appId) fail("GitHub App subject mismatch");
  const installationId = positiveId(claims.installation_id, "installation_id");
  if (!Array.isArray(claims.repository_ids) || claims.repository_ids.length < 1
    || claims.repository_ids.length > 100) fail("invalid repository_ids");
  const repositoryIds = claims.repository_ids.map((id, i) => positiveId(id, `repository_ids[${i}]`));
  if (new Set(repositoryIds).size !== repositoryIds.length
    || repositoryIds.some((id, i) => i && repositoryIds[i - 1] >= id)) fail("repository_ids must be sorted and unique");
  if (!claims.permissions || typeof claims.permissions !== "object" || Array.isArray(claims.permissions)) {
    fail("invalid permissions");
  }
  for (const [name, permission] of Object.entries(claims.permissions)) {
    if (!/^[a-z_]{1,64}$/.test(name) || !["read", "write"].includes(permission)) fail("invalid permission");
  }
  if (!/^[a-f0-9]{64}$/.test(claims.token_sha256)) fail("invalid token digest");
  if (!Number.isSafeInteger(claims.issued_at) || !Number.isSafeInteger(claims.expires_at)
    || claims.issued_at > nowEpoch + 5 || claims.expires_at <= nowEpoch
    || claims.expires_at <= claims.issued_at
    || claims.expires_at - claims.issued_at > MAX_TTL_SECONDS) fail("assertion time window invalid");
  if (typeof claims.jti !== "string" || !/^[A-Za-z0-9._:-]{16,128}$/.test(claims.jti)) fail("invalid jti");
  if (!["compute_readonly", "publisher_restricted"].includes(claims.credential_lane)) fail("invalid credential lane");
  if (expected.credentialLane && claims.credential_lane !== expected.credentialLane) fail("credential lane mismatch");
  if (expected.repositoryId && !repositoryIds.includes(positiveId(expected.repositoryId, "expected repositoryId"))) {
    fail("repository not authorized by assertion");
  }
  if (expected.requiredPermissions) {
    for (const [name, level] of Object.entries(expected.requiredPermissions)) {
      const actual = claims.permissions[name];
      if (actual !== level && !(level === "read" && actual === "write")) fail("required permission missing");
    }
  }
  return { installationId, repositoryIds };
}

/**
 * Verify a compact JWS ES256 assertion and bind it to the exact bearer token.
 * publicKeys is a server-controlled map of kid -> imported CryptoKey or public JWK.
 */
export async function verifyGitHubCredentialProvenance({
  assertion, bearerToken, publicKeys, nowEpoch = Math.floor(Date.now() / 1000),
  issuer, audience, appId, repositoryId, credentialLane, requiredPermissions,
  verifyTokenBinding = true
}) {
  if (typeof assertion !== "string" || assertion.length > MAX_ASSERTION_LENGTH) fail("assertion missing or too large");
  if (typeof bearerToken !== "string" || bearerToken.length < 1 || bearerToken.length > 4096
    || /[\r\n]/.test(bearerToken)) fail("bearer token missing or malformed");
  if (!Number.isSafeInteger(nowEpoch) || nowEpoch < 0) fail("invalid clock");
  const parts = assertion.split(".");
  if (parts.length !== 3 || parts.some(part => !part)) fail("compact JWS required");
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  const header = parseJson(decodeBase64Url(encodedHeader, 1024), "protected header");
  exactKeys(header, ["alg", "kid", "typ"]);
  if (header.alg !== "ES256" || header.typ !== "JWT"
    || typeof header.kid !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(header.kid)) {
    fail("unsupported protected header");
  }
  const keySource = publicKeys?.[header.kid];
  if (!keySource) fail("unknown signing key");
  const claims = parseJson(decodeBase64Url(encodedClaims, 6144), "claims");
  const { installationId, repositoryIds } = validateClaims(claims, nowEpoch, {
    issuer, audience, appId, repositoryId, credentialLane, requiredPermissions
  });
  const signature = decodeBase64Url(encodedSignature, 64);
  if (signature.byteLength !== 64) fail("invalid ES256 signature length");
  let key = keySource;
  try {
    if (!(typeof CryptoKey !== "undefined" && keySource instanceof CryptoKey)) {
      key = await crypto.subtle.importKey("jwk", keySource, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    }
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" }, key, signature,
      encoder.encode(`${encodedHeader}.${encodedClaims}`)
    );
    if (!valid) fail("signature invalid");
  } catch (error) {
    if (error instanceof TypeError && error.message.startsWith("credential provenance")) throw error;
    fail("signature verification failed");
  }
  let tokenHex = claims.token_sha256;
  if (verifyTokenBinding) {
    const tokenDigest = await crypto.subtle.digest("SHA-256", encoder.encode(bearerToken));
    tokenHex = Array.from(new Uint8Array(tokenDigest), b => b.toString(16).padStart(2, "0")).join("");
    if (tokenHex !== claims.token_sha256) fail("bearer token digest mismatch");
  }
  return Object.freeze({
    provider: "github",
    credentialScope: `github-app-installation:${installationId}`,
    installationId,
    repositoryIds: Object.freeze(repositoryIds),
    permissions: Object.freeze({ ...claims.permissions }),
    credentialLane: claims.credential_lane,
    assertionId: claims.jti,
    expiresAt: claims.expires_at,
    tokenSha256: tokenHex
  });
}
