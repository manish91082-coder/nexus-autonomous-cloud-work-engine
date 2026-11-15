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
  if (input.buckets !== undefined || input.costs !== undefined) {
    throw new QuotaLedgerError("caller-supplied telemetry and costs are forbidden; use server-side operation registry");
  }
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
