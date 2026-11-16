/**
 * Phase 59.41 — fail-closed provider request lifecycle client.
 *
 * This client is deliberately single-attempt: it reserves before a GitHub
 * request, links response-header telemetry to that reservation, and settles
 * conservatively. It never retries a provider request automatically.
 */
import { quotaLedgerObjectName } from "./quota-ledger-contract.mjs";
import { parseGitHubRateLimitHeaders } from "./github-quota-telemetry.mjs";
import { resolveGitHubOperation } from "./github-operation-registry.mjs";
import { classifyGitHubRateLimitResponse } from "./github-secondary-rate-limit.mjs";

const encoder = new TextEncoder();

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const value of new Uint8Array(bytes)) binary += String.fromCharCode(value);
  return btoa(binary);
}

function requireText(value, field, max = 256) {
  if (typeof value !== "string" || value.length < 1 || value.length > max) {
    throw new TypeError(`invalid ${field}`);
  }
  return value;
}

function makeRequestId(value) {
  // A caller-supplied durable id is mandatory: generating a new UUID per retry
  // would defeat duplicate suppression after a worker crash.
  const id = requireText(value, "requestId", 128);
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(id)) throw new TypeError("requestId contains unsafe characters");
  return id;
}

async function signedRpcRequest({ callerId, secret, action, input, nowEpoch, nonce }) {
  const body = JSON.stringify({ action, input });
  const bodyBytes = encoder.encode(body);
  const digest = await crypto.subtle.digest("SHA-256", bodyBytes);
  const bodyHash = bytesToHex(digest);
  const timestamp = String(nowEpoch);
  const method = "POST";
  const path = "/rpc";
  const canonical = [callerId, timestamp, nonce, method, path, bodyHash].join("\n");
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(canonical));
  return new Request("https://quota-ledger.internal/rpc", {
    method,
    headers: {
      "content-type": "application/json",
      "x-nexus-caller-id": callerId,
      "x-nexus-timestamp": timestamp,
      "x-nexus-nonce": nonce,
      "x-nexus-signature": bytesToBase64(signature)
    },
    body
  });
}

async function ledgerCall(env, action, input, options = {}) {
  if (env?.NEXUS_QUOTA_STORE_ENABLED !== "true") {
    return { httpStatus: 503, body: { status: "WAITING_FOR_QUOTA", reason: "QUOTA_STORE_DISABLED" } };
  }
  const binding = env?.QUOTA_LEDGER;
  if (!binding || typeof binding.idFromName !== "function" || typeof binding.get !== "function") {
    return { httpStatus: 503, body: { status: "WAITING_FOR_QUOTA", reason: "QUOTA_LEDGER_BINDING_MISSING" } };
  }
  const callerId = requireText(env.NEXUS_QUOTA_CALLER_ID, "NEXUS_QUOTA_CALLER_ID", 64);
  const secret = requireText(env.NEXUS_QUOTA_CALLER_SECRET, "NEXUS_QUOTA_CALLER_SECRET", 512);
  if (secret.length < 32) throw new TypeError("NEXUS_QUOTA_CALLER_SECRET must contain at least 32 characters");
  const nowEpoch = options.nowEpoch ?? Math.floor(Date.now() / 1000);
  const nonce = options.nonceFactory ? options.nonceFactory() : crypto.randomUUID();
  requireText(nonce, "nonce", 128);
  const request = await signedRpcRequest({ callerId, secret, action, input, nowEpoch, nonce });
  const name = quotaLedgerObjectName(input.provider, input.credentialScope, input.windowId);
  const stub = binding.get(binding.idFromName(name));
  const response = await stub.fetch(request);
  let body;
  try {
    body = await response.json();
  } catch {
    body = { status: "REJECTED", reason: "QUOTA_LEDGER_INVALID_RESPONSE" };
  }
  return { httpStatus: response.status, body };
}

/**
 * Execute exactly one GitHub API request under a durable quota reservation.
 *
 * requestId must remain stable across caller retries. If the reservation was
 * already created, the duplicate is not re-issued to GitHub. Provider request
 * outcomes that cannot be conclusively accounted are moved to uncertain
 * budget, never released.
 */
export async function executeQuotaGuardedGitHubRequest({
  env,
  credentialScope,
  operation,
  request,
  requestId,
  workerId,
  fetchImpl = fetch,
  nowEpoch,
  nonceFactory
}) {
  requireText(credentialScope, "credentialScope");
  requireText(operation, "operation");
  requireText(workerId, "workerId");
  if (!(request instanceof Request)) throw new TypeError("request must be a Request");
  const url = new URL(request.url);
  if (url.protocol !== "https:" || url.hostname !== "api.github.com"
    || url.port !== "" || url.username !== "" || url.password !== "") {
    throw new TypeError("quota-guarded requests must target https://api.github.com");
  }
  const reviewed = await resolveGitHubOperation(request);
  if (!reviewed.allowed) {
    throw new TypeError(`GitHub operation NO-GO: ${reviewed.reason}`);
  }
  if (operation !== reviewed.operation) {
    throw new TypeError("operation ID does not match the reviewed endpoint registry");
  }

  const stableRequestId = makeRequestId(requestId);
  const reservationId = `p10cr:${stableRequestId}`;
  const base = {
    provider: "github",
    credentialScope,
    windowId: "github-rate-limit-ledger",
    controlPlaneProvider: "cloudflare",
    reservationId,
    workerId,
    operation: reviewed.operation,
    requestFingerprint: reviewed.requestFingerprint
  };
  const rpcOptions = { nowEpoch, nonceFactory };
  const admission = await ledgerCall(env, "reserve", base, rpcOptions);
  if (admission.body?.status === "DUPLICATE_RESERVATION") {
    return {
      status: "DUPLICATE_REQUEST_NOT_REPLAYED",
      reservationId,
      admission: admission.body,
      response: null
    };
  }
  if (admission.httpStatus !== 200 || admission.body?.status !== "RESERVED") {
    return {
      status: "NOT_SENT",
      reservationId,
      admission: admission.body,
      response: null
    };
  }

  let response;
  try {
    response = await fetchImpl(request, { redirect: "manual" });
  } catch (error) {
    const uncertain = await ledgerCall(env, "markUncertain", {
      ...base
    }, rpcOptions);
    return {
      status: "PROVIDER_OUTCOME_UNCERTAIN",
      reservationId,
      error: String(error?.message || error),
      accounting: uncertain.body,
      response: null
    };
  }

  let rateLimitMessage = "";
  try {
    const responseBody = await response.clone().json();
    if (typeof responseBody?.message === "string") rateLimitMessage = responseBody.message;
  } catch {
    // A non-JSON response body is not itself rate-limit evidence.
  }
  const rateLimit = classifyGitHubRateLimitResponse({
    status: response.status,
    headers: response.headers,
    message: rateLimitMessage,
    nowEpoch: nowEpoch ?? Math.floor(Date.now() / 1000)
  });
  if (rateLimit.rateLimited) {
    const recordedLimit = await ledgerCall(env, "recordSecondaryLimit", {
      ...base,
      status: rateLimit.status,
      kind: rateLimit.kind,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      resetAtEpoch: rateLimit.resetAtEpoch,
      minimumWaitSeconds: rateLimit.minimumWaitSeconds,
      reason: rateLimit.reason
    }, rpcOptions);
    if (recordedLimit.httpStatus !== 200
      || recordedLimit.body?.status !== "SECONDARY_COOLDOWN_RECORDED") {
      const uncertain = await ledgerCall(env, "markUncertain", base, rpcOptions);
      return {
        status: "RESPONSE_RECEIVED_ACCOUNTING_UNCERTAIN",
        reservationId,
        error: recordedLimit.body?.reason || recordedLimit.body?.error?.message || "rate-limit cooldown was not persisted",
        accounting: uncertain.body,
        response
      };
    }
  }

  let telemetryResult = null;
  try {
    const telemetry = parseGitHubRateLimitHeaders({
      headers: response.headers,
      credentialScope,
      observedAtEpoch: nowEpoch ?? Math.floor(Date.now() / 1000),
      endpoint: `${request.method.toUpperCase()} ${url.pathname}`,
      method: request.method,
      status: response.status,
      requestId: response.headers.get("x-github-request-id")
    });
    telemetryResult = await ledgerCall(env, "recordTelemetry", {
      provider: "github",
      credentialScope,
      windowId: base.windowId,
      reservationId,
      telemetry
    }, rpcOptions);
    if (telemetryResult.httpStatus !== 200 || telemetryResult.body?.status !== "RECORDED") {
      throw new Error(telemetryResult.body?.reason || telemetryResult.body?.error?.message || "telemetry was not persisted");
    }
  } catch (error) {
    const uncertain = await ledgerCall(env, "markUncertain", base, rpcOptions);
    return {
      status: "RESPONSE_RECEIVED_ACCOUNTING_UNCERTAIN",
      reservationId,
      error: String(error?.message || error),
      telemetry: telemetryResult?.body ?? null,
      accounting: uncertain.body,
      response
    };
  }

  // Until per-endpoint actual cost measurements are independently verified,
  // charge the full server-authorized reservation. Linked telemetry prevents
  // double subtraction for the bucket measured by this response.
  const actualByBucket = admission.body.reservedByBucket;
  let settled;
  try {
    settled = await ledgerCall(env, "settle", {
      ...base,
      actualByBucket
    }, rpcOptions);
  } catch (error) {
    // The provider response is already received. A lost ledger acknowledgement
    // is not permission to replay the provider request or release its budget.
    // Attempt an explicit uncertain transition; lease expiry remains the
    // durable fallback if this Worker is terminated before that write commits.
    const uncertain = await ledgerCall(env, "markUncertain", base, rpcOptions);
    return {
      status: "RESPONSE_RECEIVED_ACCOUNTING_UNCERTAIN",
      reservationId,
      error: String(error?.message || error),
      telemetry: telemetryResult.body,
      accounting: { settlement: null, uncertainty: uncertain.body },
      response
    };
  }
  if (settled.httpStatus !== 200 || settled.body?.status !== "SETTLED") {
    const uncertain = await ledgerCall(env, "markUncertain", base, rpcOptions);
    return {
      status: "RESPONSE_RECEIVED_ACCOUNTING_UNCERTAIN",
      reservationId,
      telemetry: telemetryResult.body,
      accounting: { settlement: settled.body, uncertainty: uncertain.body },
      response
    };
  }

  return {
    status: "COMPLETED",
    reservationId,
    telemetry: telemetryResult.body,
    settlement: settled.body,
    response
  };
}

/** Renew a live reservation lease with a replay-safe heartbeat ID. */
export async function renewQuotaReservation({
  env, credentialScope, reservationId, workerId, heartbeatId,
  expectedLeaseVersion, extensionSeconds = 120, nowEpoch, nonceFactory
}) {
  requireText(credentialScope, "credentialScope");
  requireText(reservationId, "reservationId");
  requireText(workerId, "workerId");
  requireText(heartbeatId, "heartbeatId", 128);
  const result = await ledgerCall(env, "renewReservation", {
    provider: "github",
    credentialScope,
    windowId: "github-rate-limit-ledger",
    reservationId,
    workerId,
    heartbeatId,
    expectedLeaseVersion,
    extensionSeconds
  }, {nowEpoch,nonceFactory});
  return result.body;
}

/**
 * Reconcile only from authoritative response-header observations already
 * persisted and linked to the uncertain reservation. No caller-supplied
 * remaining/usage values can release uncertain quota.
 */
export async function reconcileUncertainQuotaReservation({
  env, credentialScope, reservationId, workerId, nowEpoch, nonceFactory
}) {
  requireText(credentialScope, "credentialScope");
  requireText(reservationId, "reservationId");
  requireText(workerId, "workerId");
  const result = await ledgerCall(env, "reconcileUncertain", {
    provider: "github",
    credentialScope,
    windowId: "github-rate-limit-ledger",
    reservationId,
    workerId
  }, {nowEpoch,nonceFactory});
  return result.body;
}
