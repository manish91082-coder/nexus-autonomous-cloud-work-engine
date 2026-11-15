/**
 * Phase 59.34 — Cloudflare SQLite-backed Durable Object quota ledger.
 * Production routes and caller feature flag remain disabled pending acceptance.
 */
import { DurableObject } from "cloudflare:workers";
import {
  QuotaLedgerError, QuotaLedgerExhausted, validateQuotaRequest
} from "./quota-ledger-contract.mjs";
export { QuotaLedgerError, QuotaLedgerExhausted, validateQuotaRequest };
export class QuotaLedgerDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_buckets (
      bucket_id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      credential_scope TEXT NOT NULL,
      window_id TEXT NOT NULL,
      limit_units INTEGER NOT NULL,
      observed_remaining_units INTEGER NOT NULL,
      observed_at_epoch INTEGER NOT NULL,
      safety_reserve_units INTEGER NOT NULL,
      recovery_reserve_units INTEGER NOT NULL,
      reserved_units INTEGER NOT NULL DEFAULT 0,
      committed_units INTEGER NOT NULL DEFAULT 0,
      uncertain_units INTEGER NOT NULL DEFAULT 0
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_reservations (
      reservation_id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      reserved_by_bucket_json TEXT NOT NULL,
      actual_by_bucket_json TEXT,
      status TEXT NOT NULL,
      created_at_epoch INTEGER NOT NULL,
      settled_at_epoch INTEGER
    )`);
  }

  reserve(input) {
    validateQuotaRequest(input);
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync(() => {
      const prior = sql.exec(
        "SELECT reservation_id FROM quota_reservations WHERE reservation_id = ?",
        input.reservationId
      ).toArray()[0];
      if (prior) throw new QuotaLedgerError("duplicate reservation id");

      // Refresh each bucket only from newer telemetry. Same-timestamp readings
      // can only reduce observed remaining; stale observations cannot replenish it.
      for (const b of input.buckets) {
        const existing = sql.exec(
          "SELECT * FROM quota_buckets WHERE bucket_id = ?", b.bucketId
        ).toArray()[0];
        if (existing && (existing.provider !== input.provider
          || existing.credential_scope !== input.credentialScope
          || existing.window_id !== input.windowId)) {
          throw new QuotaLedgerError("bucket identity/window collision");
        }
        if (!existing) {
          sql.exec(`INSERT INTO quota_buckets
            (bucket_id,provider,credential_scope,window_id,limit_units,
             observed_remaining_units,observed_at_epoch,safety_reserve_units,
             recovery_reserve_units,reserved_units,committed_units,uncertain_units)
            VALUES (?,?,?,?,?,?,?,?,?,0,0,0)`,
            b.bucketId,input.provider,input.credentialScope,input.windowId,b.limitUnits,
            b.observedRemainingUnits,b.observedAtEpoch,b.safetyReserveUnits,b.recoveryReserveUnits);
        } else if (b.observedAtEpoch > existing.observed_at_epoch) {
          sql.exec(`UPDATE quota_buckets SET limit_units=?,observed_remaining_units=?,
            observed_at_epoch=?,safety_reserve_units=?,recovery_reserve_units=? WHERE bucket_id=?`,
            b.limitUnits,b.observedRemainingUnits,b.observedAtEpoch,b.safetyReserveUnits,
            b.recoveryReserveUnits,b.bucketId);
        } else if (b.observedAtEpoch === existing.observed_at_epoch) {
          sql.exec(`UPDATE quota_buckets SET observed_remaining_units=MIN(observed_remaining_units,?),
            safety_reserve_units=MAX(safety_reserve_units,?),
            recovery_reserve_units=MAX(recovery_reserve_units,?) WHERE bucket_id=?`,
            b.observedRemainingUnits,b.safetyReserveUnits,b.recoveryReserveUnits,b.bucketId);
        }
      }

      // Check every required bucket before changing any counters.
      for (const [bucketId, units] of Object.entries(input.costs)) {
        const row = sql.exec("SELECT * FROM quota_buckets WHERE bucket_id=?", bucketId).toArray()[0];
        if (!row) throw new QuotaLedgerError("quota bucket missing after initialization");
        const b = input.buckets.find(x => x.bucketId === bucketId);
        const remaining = row.observed_remaining_units - row.safety_reserve_units
          - row.recovery_reserve_units - row.reserved_units
          - row.committed_units - row.uncertain_units;
        if (units > remaining) throw new QuotaLedgerExhausted(`${bucketId} exhausted; WAITING_FOR_QUOTA`);
        if (b.nowEpoch - row.observed_at_epoch > b.maxTelemetryAgeSeconds) {
          throw new QuotaLedgerError("stored telemetry is stale; WAITING_FOR_QUOTA");
        }
      }

      for (const [bucketId, units] of Object.entries(input.costs)) {
        sql.exec("UPDATE quota_buckets SET reserved_units=reserved_units+? WHERE bucket_id=?",
          units,bucketId);
      }
      sql.exec(`INSERT INTO quota_reservations
        (reservation_id,worker_id,operation,reserved_by_bucket_json,status,created_at_epoch)
        VALUES (?,?,?,?, 'RESERVED', ?)`,
        input.reservationId,input.workerId,input.operation,JSON.stringify(input.costs),
        Math.min(...input.buckets.map(b=>b.nowEpoch)));
      return {reservationId:input.reservationId,status:"RESERVED",reservedByBucket:input.costs};
    });
  }

  settle(input) {
    nonEmpty(input?.reservationId, "reservationId");
    nonEmpty(input?.workerId, "workerId");
    if (!input.actualByBucket || typeof input.actualByBucket !== "object"
      || Array.isArray(input.actualByBucket)) throw new QuotaLedgerError("actualByBucket required");
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync(() => {
      const rec = sql.exec("SELECT * FROM quota_reservations WHERE reservation_id=?",
        input.reservationId).toArray()[0];
      if (!rec || rec.worker_id !== input.workerId || rec.status !== "RESERVED") {
        throw new QuotaLedgerError("reservation owner/state mismatch");
      }
      const reserved = JSON.parse(rec.reserved_by_bucket_json);
      if (Object.keys(reserved).sort().join("|") !== Object.keys(input.actualByBucket).sort().join("|")) {
        throw new QuotaLedgerError("settlement must report every reserved bucket");
      }
      for (const [bucketId, units] of Object.entries(input.actualByBucket)) {
        integer(units, `actual.${bucketId}`);
        if (units > reserved[bucketId]) throw new QuotaLedgerExhausted(`${bucketId} exceeded reservation`);
      }
      for (const [bucketId, units] of Object.entries(input.actualByBucket)) {
        sql.exec(`UPDATE quota_buckets SET reserved_units=reserved_units-?,
          committed_units=committed_units+? WHERE bucket_id=?`,reserved[bucketId],units,bucketId);
      }
      sql.exec(`UPDATE quota_reservations SET actual_by_bucket_json=?,status='SETTLED',
        settled_at_epoch=? WHERE reservation_id=?`,
        JSON.stringify(input.actualByBucket),integer(input.nowEpoch,"nowEpoch"),input.reservationId);
      return {reservationId:input.reservationId,status:"SETTLED",actualByBucket:input.actualByBucket};
    });
  }

  markUncertain(input) {
    nonEmpty(input?.reservationId, "reservationId");
    nonEmpty(input?.workerId, "workerId");
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync(() => {
      const rec = sql.exec("SELECT * FROM quota_reservations WHERE reservation_id=?",
        input.reservationId).toArray()[0];
      if (!rec || rec.worker_id !== input.workerId || rec.status !== "RESERVED") {
        throw new QuotaLedgerError("reservation owner/state mismatch");
      }
      const reserved = JSON.parse(rec.reserved_by_bucket_json);
      for (const [bucketId, units] of Object.entries(reserved)) {
        sql.exec(`UPDATE quota_buckets SET reserved_units=reserved_units-?,
          uncertain_units=uncertain_units+? WHERE bucket_id=?`,units,units,bucketId);
      }
      sql.exec("UPDATE quota_reservations SET status='UNCERTAIN_BUDGET_RETAINED' WHERE reservation_id=?",
        input.reservationId);
      return {reservationId:input.reservationId,status:"UNCERTAIN_BUDGET_RETAINED"};
    });
  }

  snapshot() {
    const sql = this.ctx.storage.sql;
    return {
      buckets: sql.exec("SELECT * FROM quota_buckets ORDER BY bucket_id").toArray(),
      reservations: sql.exec("SELECT * FROM quota_reservations ORDER BY created_at_epoch").toArray()
    };
  }
}

/** Disabled-by-default caller guard; no provider worker should bypass this. */
export function requireQuotaStoreEnabled(env) {
  if (env?.NEXUS_QUOTA_STORE_ENABLED !== "true") {
    throw new QuotaLedgerError("WAITING_FOR_QUOTA: transactional quota store disabled");
  }
  if (!env?.QUOTA_LEDGER) throw new QuotaLedgerError("WAITING_FOR_QUOTA: QUOTA_LEDGER binding missing");
  return env.QUOTA_LEDGER;
}
