/**
 * Phase 59.41 — quota-bound provider request lifecycle.
 *
 * This module is deliberately transport-injected and has no provider secrets,
 * default endpoints, or guessed operation costs. Only reviewed registry entries
 * can execute. Unknown/unreviewed operations fail closed before reservation.
 */
const ID = /^[A-Za-z0-9._:-]{1,128}$/;
const METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]);

export async function requestFingerprint(method, url) {
  const parsed = new URL(url);
  const normalizedMethod = String(method).toUpperCase();
  if (!METHODS.has(normalizedMethod)) throw new TypeError("unsupported HTTP method");
  const params = [...parsed.searchParams.entries()]
    .sort(([ak,av],[bk,bv]) => ak.localeCompare(bk) || av.localeCompare(bv));
  const query = new URLSearchParams(params).toString();
  const canonical = [normalizedMethod, parsed.pathname, query].join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

export async function resolveReviewedOperation(registry, operation, method, url) {
  const entry = registry?.[operation];
  if (!entry || entry.status !== "REVIEWED" || entry.costEvidence?.verified !== true) {
    throw new Error("NO_GO_UNKNOWN_OR_UNREVIEWED_OPERATION_COST");
  }
  const fingerprint = await requestFingerprint(method, url);
  if (entry.method !== String(method).toUpperCase()
    || entry.path !== new URL(url).pathname
    || entry.queryFingerprint !== fingerprint
    || !Array.isArray(entry.sources) || entry.sources.length === 0
    || !entry.sources.every(source => typeof source === "string" && source.startsWith("https://"))
    || !Number.isSafeInteger(entry.costEvidence.measuredUnits)
    || entry.costEvidence.measuredUnits < 1) {
    throw new Error("NO_GO_OPERATION_REGISTRY_MISMATCH");
  }
  return Object.freeze({ ...entry, fingerprint });
}

export async function signedLedgerRequest({ secret, callerId, action, input, now = Date.now(), nonce = crypto.randomUUID() }) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("CALLER_SECRET_NOT_CONFIGURED");
  if (!ID.test(callerId) || !ID.test(nonce)) throw new Error("INVALID_CALLER_OR_NONCE");
  const body = JSON.stringify({ action, input });
  const timestamp = String(Math.floor(now / 1000));
  const bodyDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const bodyHash = [...new Uint8Array(bodyDigest)].map(value => value.toString(16).padStart(2, "0")).join("");
  const canonical = [callerId, timestamp, nonce, "POST", "/rpc", bodyHash].join("\n");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical)));
  let binary = "";
  for (const byte of signatureBytes) binary += String.fromCharCode(byte);
  const signature = btoa(binary);
  return new Request("https://quota-ledger.internal/rpc", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nexus-caller-id": callerId,
      "x-nexus-timestamp": timestamp,
      "x-nexus-nonce": nonce,
      "x-nexus-signature": signature
    },
    body
  });
}

/**
 * Execute one reviewed request. Dependencies are explicit so callers cannot
 * silently bypass reserve/settle/uncertain transitions in tests or production.
 */
export async function runQuotaBoundRequest({
  registry, operation, providerRequest, ledger, reservation, captureTelemetry,
  actualUsageFromResponse
}) {
  if (typeof providerRequest !== "function" || typeof ledger?.reserve !== "function"
    || typeof ledger?.settle !== "function" || typeof ledger?.markUncertain !== "function"
    || typeof ledger?.recordTelemetry !== "function"
    || typeof captureTelemetry !== "function" || typeof actualUsageFromResponse !== "function") {
    throw new TypeError("complete lifecycle dependencies required");
  }
  const reviewed = await resolveReviewedOperation(
    registry, operation, reservation.method, reservation.url
  );
  const requestId = reservation.requestId || crypto.randomUUID();
  const reserveInput = {
    ...reservation.quotaIdentity,
    reservationId: reservation.reservationId || requestId,
    workerId: reservation.workerId,
    operation
  };
  const admission = await ledger.reserve(reserveInput);
  if (admission?.status !== "RESERVED") {
    return { status: admission?.status || "WAITING_FOR_QUOTA", requestId, admission };
  }

  let response;
  try {
    response = await providerRequest({ requestId, fingerprint: reviewed.fingerprint });
  } catch (error) {
    await ledger.markUncertain({ reservationId: reserveInput.reservationId, workerId: reserveInput.workerId });
    return { status: "UNCERTAIN_BUDGET_RETAINED", requestId, transportError: String(error?.message || error) };
  }

  try {
    const observations = await captureTelemetry(response, { requestId, reservationId: reserveInput.reservationId });
    for (const telemetry of observations || []) {
      await ledger.recordTelemetry({
        ...reservation.quotaIdentity,
        reservationId: reserveInput.reservationId,
        telemetry
      });
    }
    const actualByBucket = await actualUsageFromResponse(response, reviewed);
    const settlement = await ledger.settle({
      reservationId: reserveInput.reservationId,
      workerId: reserveInput.workerId,
      actualByBucket
    });
    if (settlement?.status !== "SETTLED") {
      await ledger.markUncertain({ reservationId: reserveInput.reservationId, workerId: reserveInput.workerId });
      return { status: "UNCERTAIN_BUDGET_RETAINED", requestId, httpStatus: response.status };
    }
    return { status: "COMPLETED", requestId, httpStatus: response.status, settlement };
  } catch (error) {
    await ledger.markUncertain({ reservationId: reserveInput.reservationId, workerId: reserveInput.workerId });
    return { status: "UNCERTAIN_BUDGET_RETAINED", requestId, httpStatus: response.status,
      reconciliationError: String(error?.message || error) };
  }
}
