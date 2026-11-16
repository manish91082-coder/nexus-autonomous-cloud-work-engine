/**
 * Phase 59.45C — deterministic, versioned GitHub request fingerprint.
 * Pure contract only. The egress gateway must recompute this from the
 * concrete outbound request before attaching Authorization.
 */
import { getGitHubOperationDefinition, resolveGitHubOperation } from "./github-operation-registry.mjs";

const encoder = new TextEncoder();
const LANES = new Set(["compute_readonly", "publisher_restricted"]);
const HEX_256 = /^[a-f0-9]{64}$/;
const REPO_ID = /^[1-9][0-9]{0,19}$/;
const OPERATION_ID = /^[a-z0-9.:-]{8,128}$/;

function reject(reason) {
  throw new TypeError(`request fingerprint rejected: ${reason}`);
}

function bytesOf(value) {
  if (value === undefined || value === null) return new Uint8Array();
  if (typeof value === "string") return encoder.encode(value);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  reject("body must be bytes or text");
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function canonicalUrl(value, expectedMethod, expectedOperation) {
  if (typeof value !== "string" || value.length > 2048) reject("URL missing or too large");
  // Inspect raw spelling before URL() normalizes dot segments.
  const rawPath = value.split(/[?#]/, 1)[0];
  if (/%2f|%5c|%2e/i.test(value) || value.includes("\\\\")
    || rawPath.split("/").some(segment => segment === "." || segment === "..")) {
    reject("encoded separators or dot segments forbidden");
  }
  const authority = value.match(/^https:\/\/([^/?#]*)/i)?.[1];
  if (authority !== "api.github.com") reject("URL authority must be exact canonical host without port");
  let url;
  try { url = new URL(value); } catch { reject("invalid URL"); }
  if (url.protocol !== "https:" || url.hostname !== "api.github.com" || url.port
    || url.username || url.password || url.hash) reject("URL origin or authority forbidden");
  if (url.search) reject("query parameters are not approved by the current operation registry");
  if (url.pathname !== decodeURI(url.pathname)) reject("non-canonical path encoding");
  if (expectedMethod !== "GET") reject("method not enabled in current read-only registry");
  const reviewed = await resolveGitHubOperation(new Request(url.toString(), { method: expectedMethod }));
  if (!reviewed.allowed || reviewed.operation !== expectedOperation) {
    reject("URL path does not match the reviewed operation registry");
  }
  return `https://api.github.com${url.pathname}`;
}

/**
 * Input: { provider, repositoryId, operationId, method, url, body, credentialLane }
 * Output: { version, canonical, requestBodySha256, fingerprint }
 */
export async function computeGitHubRequestFingerprint(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) reject("input must be an object");
  const allowed = new Set(["provider", "repositoryId", "operationId", "method", "url", "body", "credentialLane"]);
  if (Object.keys(input).some(key => !allowed.has(key))) reject("unknown input fields");
  if (input.provider !== "github") reject("provider must be github");
  if (typeof input.repositoryId !== "string" || !REPO_ID.test(input.repositoryId)) reject("invalid numeric repository ID");
  if (typeof input.operationId !== "string" || !OPERATION_ID.test(input.operationId)) reject("invalid operation ID");
  const operation = getGitHubOperationDefinition(input.operationId);
  if (!operation) reject("operation is not in the reviewed registry");
  if (typeof input.method !== "string" || input.method !== "GET") reject("method is not allowlisted");
  if (!LANES.has(input.credentialLane)) reject("credential lane is not allowlisted");
  const url = await canonicalUrl(input.url, input.method, operation.id);
  const bodyBytes = bytesOf(input.body);
  if (bodyBytes.byteLength !== 0) reject("GET request body must be empty");
  const requestBodySha256 = await sha256Hex(bodyBytes);
  const canonical = JSON.stringify({
    schema: "nexus.github.request-fingerprint.v1",
    provider: "github",
    repositoryId: input.repositoryId,
    operationId: operation.id,
    registryVersion: operation.registryVersion,
    method: "GET",
    url,
    requestBodySha256,
    credentialLane: input.credentialLane
  });
  const fingerprint = await sha256Hex(encoder.encode(canonical));
  if (!HEX_256.test(fingerprint)) reject("internal digest failure");
  return Object.freeze({ version: 1, canonical, requestBodySha256, fingerprint });
}
