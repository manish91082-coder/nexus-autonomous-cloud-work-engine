/**
 * Canonical allowlisted GitHub response-header evidence for EDR binding.
 * Only rate-limit and request-correlation headers consumed by the quota
 * telemetry/rate-limit parser are included. Authorization/cookies are excluded.
 */
const HEADER_NAMES = Object.freeze([
  "retry-after",
  "x-github-request-id",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "x-ratelimit-resource",
  "x-ratelimit-used"
]);
const encoder = new TextEncoder();

export async function computeGitHubResponseHeadersEvidence(headers) {
  if (!headers || typeof headers.get !== "function") {
    throw new TypeError("GitHub response headers must implement Headers.get()");
  }
  const canonicalHeaders = {};
  for (const name of HEADER_NAMES) {
    const value = headers.get(name);
    canonicalHeaders[name] = value === null ? null : value.trim();
  }
  const canonical = JSON.stringify({
    version: "nexus.github.response-headers.v1",
    headers: canonicalHeaders
  });
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(canonical));
  const sha256 = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
  return Object.freeze({
    version: "nexus.github.response-headers.v1",
    canonical,
    headers: Object.freeze(canonicalHeaders),
    sha256
  });
}
