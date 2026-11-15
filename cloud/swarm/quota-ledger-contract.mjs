/** Pure quota request contracts shared by Node and Workers runtime tests. */
export class QuotaLedgerError extends Error {}
export class QuotaLedgerExhausted extends QuotaLedgerError {}

const MAX_ID = 256;

export function nonEmpty(value, field) {
  if (typeof value !== "string" || value.length < 1 || value.length > MAX_ID) {
    throw new QuotaLedgerError(`invalid ${field}`);
  }
  return value;
}

export function integer(value, field, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new QuotaLedgerError(`${field} must be a safe integer >= ${min}`);
  }
  return value;
}

export function quotaLedgerObjectName(provider, credentialScope, windowId) {
  nonEmpty(provider, "provider");
  nonEmpty(credentialScope, "credentialScope");
  nonEmpty(windowId, "windowId");
  return JSON.stringify([provider, credentialScope, windowId]);
}

export function validateQuotaRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new QuotaLedgerError("request must be an object");
  }
  nonEmpty(input.provider, "provider");
  nonEmpty(input.credentialScope, "credentialScope");
  nonEmpty(input.windowId, "windowId");
  nonEmpty(input.controlPlaneProvider, "controlPlaneProvider");
  if (input.provider === input.controlPlaneProvider) {
    throw new QuotaLedgerError("quota ledger provider must differ from budgeted provider");
  }
  nonEmpty(input.reservationId, "reservationId");
  nonEmpty(input.workerId, "workerId");
  nonEmpty(input.operation, "operation");
  if (!Array.isArray(input.buckets) || input.buckets.length === 0) {
    throw new QuotaLedgerError("at least one bucket is required");
  }
  const seen = new Set();
  for (const b of input.buckets) {
    nonEmpty(b.bucketId, "bucketId");
    if (seen.has(b.bucketId)) throw new QuotaLedgerError("duplicate bucket id");
    seen.add(b.bucketId);
    integer(b.limitUnits, "limitUnits", 1);
    integer(b.observedRemainingUnits, "observedRemainingUnits");
    integer(b.safetyReserveUnits, "safetyReserveUnits");
    integer(b.recoveryReserveUnits, "recoveryReserveUnits");
    integer(b.observedAtEpoch, "observedAtEpoch");
    integer(b.nowEpoch, "nowEpoch");
    integer(b.maxTelemetryAgeSeconds, "maxTelemetryAgeSeconds");
    if (b.observedRemainingUnits > b.limitUnits) throw new QuotaLedgerError("remaining exceeds limit");
    const age = b.nowEpoch - b.observedAtEpoch;
    if (age < 0 || age > b.maxTelemetryAgeSeconds) throw new QuotaLedgerError("stale/future telemetry");
    // Exhausted telemetry is valid evidence; reserve() must persist it and return WAITING_FOR_QUOTA.
  }
  if (!input.costs || typeof input.costs !== "object" || Array.isArray(input.costs)) {
    throw new QuotaLedgerError("costs must be an object");
  }
  const costKeys = Object.keys(input.costs);
  if (!costKeys.length || costKeys.some(k => !seen.has(k))) {
    throw new QuotaLedgerError("costs must reference known buckets");
  }
  for (const [key, value] of Object.entries(input.costs)) integer(value, `costs.${key}`, 1);
  return true;
}

export function availableUnits(bucket, counters) {
  const committedSinceObservationUnits = counters.committedSinceObservationUnits
    ?? counters.committedUnits ?? 0;
  return bucket.observedRemainingUnits - bucket.safetyReserveUnits
    - bucket.recoveryReserveUnits - counters.reservedUnits
    - committedSinceObservationUnits - counters.uncertainUnits;
}

/** Disabled-by-default caller guard; no provider worker should bypass this. */
export function requireQuotaStoreEnabled(env) {
  if (env?.NEXUS_QUOTA_STORE_ENABLED !== "true") {
    throw new QuotaLedgerError("WAITING_FOR_QUOTA: transactional quota store disabled");
  }
  if (!env?.QUOTA_LEDGER) throw new QuotaLedgerError("WAITING_FOR_QUOTA: QUOTA_LEDGER binding missing");
  return env.QUOTA_LEDGER;
}
