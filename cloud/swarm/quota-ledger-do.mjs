/**
 * Phase 59.34 — Cloudflare SQLite-backed Durable Object quota ledger.
 * Production routes and caller feature flag remain disabled pending acceptance.
 */
import { DurableObject } from "cloudflare:workers";
import {
  QuotaLedgerError, QuotaLedgerExhausted, validateQuotaRequest,
  requireQuotaStoreEnabled, nonEmpty, integer, availableUnits
} from "./quota-ledger-contract.mjs";
export { QuotaLedgerError, QuotaLedgerExhausted, validateQuotaRequest, requireQuotaStoreEnabled };

export class QuotaLedgerDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_meta (
      singleton INTEGER PRIMARY KEY CHECK(singleton=1),
      provider TEXT NOT NULL,
      credential_scope TEXT NOT NULL,
      window_id TEXT NOT NULL
    )`);
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
      committed_since_observation_units INTEGER NOT NULL DEFAULT 0,
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
    try {
      // Durable idempotency check. The method contains no await between this
      // check and the following transactions, so one DO serializes the caller.
      const prior = sql.exec(
        "SELECT reservation_id FROM quota_reservations WHERE reservation_id = ?",
        input.reservationId
      ).toArray()[0];
      if (prior) {
        return { reservationId: input.reservationId, status: "DUPLICATE_RESERVATION" };
      }

      // Phase A: persist the newest trusted telemetry independently. If the
      // subsequent admission is rejected, fresh exhausted telemetry must remain
      // recorded rather than being rolled back with the reservation attempt.
      this.ctx.storage.transactionSync(() => {
        const identity = sql.exec("SELECT * FROM quota_meta WHERE singleton=1").toArray()[0];
        if (identity && (identity.provider !== input.provider
          || identity.credential_scope !== input.credentialScope
          || identity.window_id !== input.windowId)) {
          throw new QuotaLedgerError("Durable Object identity mismatch");
        }
        if (!identity) {
          sql.exec("INSERT INTO quota_meta(singleton,provider,credential_scope,window_id) VALUES(1,?,?,?)",
            input.provider,input.credentialScope,input.windowId);
        }

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
               recovery_reserve_units,reserved_units,committed_units,
               committed_since_observation_units,uncertain_units)
              VALUES (?,?,?,?,?,?,?,?,?,0,0,0,0)`,
              b.bucketId,input.provider,input.credentialScope,input.windowId,b.limitUnits,
              b.observedRemainingUnits,b.observedAtEpoch,b.safetyReserveUnits,b.recoveryReserveUnits);
          } else if (b.observedAtEpoch > existing.observed_at_epoch) {
            // Provider remaining telemetry already includes prior provider calls.
            // Reset only the since-observation counter; preserve reservations and
            // uncertain usage because those calls may still be in flight/unknown.
            sql.exec(`UPDATE quota_buckets SET limit_units=?,observed_remaining_units=?,
              observed_at_epoch=?,safety_reserve_units=?,recovery_reserve_units=?,
              committed_since_observation_units=0 WHERE bucket_id=?`,
              b.limitUnits,b.observedRemainingUnits,b.observedAtEpoch,b.safetyReserveUnits,
              b.recoveryReserveUnits,b.bucketId);
          } else if (b.observedAtEpoch === existing.observed_at_epoch) {
            // Same timestamp may tighten capacity but must never replenish it.
            sql.exec(`UPDATE quota_buckets SET observed_remaining_units=MIN(observed_remaining_units,?),
              safety_reserve_units=MAX(safety_reserve_units,?),
              recovery_reserve_units=MAX(recovery_reserve_units,?) WHERE bucket_id=?`,
              b.observedRemainingUnits,b.safetyReserveUnits,b.recoveryReserveUnits,b.bucketId);
          }
        }
      });

      // Phase B: one all-or-nothing admission transaction across every costed
      // bucket. Returning WAITING commits no reservation rows/counters.
      return this.ctx.storage.transactionSync(() => {
        for (const [bucketId, units] of Object.entries(input.costs)) {
          const row = sql.exec("SELECT * FROM quota_buckets WHERE bucket_id=?", bucketId).toArray()[0];
          if (!row) throw new QuotaLedgerError("quota bucket missing after telemetry refresh");
          const b = input.buckets.find(x => x.bucketId === bucketId);
          if (b.nowEpoch - row.observed_at_epoch > b.maxTelemetryAgeSeconds) {
            return {
              reservationId: input.reservationId,
              status: "WAITING_FOR_QUOTA",
              reason: "stored telemetry is stale",
              bucketId
            };
          }
          const remaining = availableUnits(
            { observedRemainingUnits: row.observed_remaining_units,
              safetyReserveUnits: row.safety_reserve_units,
              recoveryReserveUnits: row.recovery_reserve_units },
            { reservedUnits: row.reserved_units,
              committedSinceObservationUnits: row.committed_since_observation_units,
              uncertainUnits: row.uncertain_units }
          );
          if (units > remaining) {
            return {
              reservationId: input.reservationId,
              status: "WAITING_FOR_QUOTA",
              reason: "bucket capacity or protected reserve exhausted",
              bucketId
            };
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
        return { reservationId: input.reservationId, status: "RESERVED",
          reservedByBucket: input.costs };
      });
    } catch (error) {
      // Invalid requests and storage failures cross RPC as structured data.
      return { status: "REJECTED", error: {
        name: error?.name || "Error",
        message: String(error?.message || error)
      }};
    }
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
          committed_units=committed_units+?,
          committed_since_observation_units=committed_since_observation_units+?
          WHERE bucket_id=?`,reserved[bucketId],units,units,bucketId);
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
      identity: sql.exec("SELECT * FROM quota_meta WHERE singleton=1").toArray()[0] ?? null,
      buckets: sql.exec("SELECT * FROM quota_buckets ORDER BY bucket_id").toArray(),
      reservations: sql.exec("SELECT * FROM quota_reservations ORDER BY created_at_epoch").toArray()
    };
  }
}
