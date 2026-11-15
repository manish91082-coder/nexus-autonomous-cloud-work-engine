/**
 * Phase 59.34/59.37 — SQLite-backed Durable Object quota ledger with
 * authenticated, replay-protected internal Worker RPC.
 *
 * Public surface: fetch() only. All quota mutation/snapshot methods are private.
 */
import { DurableObject } from "cloudflare:workers";
import {
  QuotaLedgerError, QuotaLedgerExhausted, validateQuotaRequest,
  requireQuotaStoreEnabled, nonEmpty, integer, availableUnits
} from "./quota-ledger-contract.mjs";
export { QuotaLedgerError, QuotaLedgerExhausted, validateQuotaRequest, requireQuotaStoreEnabled };

const encoder = new TextEncoder();
const MAX_CLOCK_SKEW_SECONDS = 30;
const NONCE_TTL_SECONDS = 120;

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}

function base64ToBytes(value) {
  if (typeof value !== "string" || value.length < 16 || value.length > 256) {
    throw new QuotaLedgerError("invalid signature encoding");
  }
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export class QuotaLedgerDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
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
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_auth_nonces (
      caller_id TEXT NOT NULL,
      nonce TEXT NOT NULL,
      expires_at_epoch INTEGER NOT NULL,
      PRIMARY KEY (caller_id, nonce)
    )`);
  }

  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json({ status: "REJECTED", error: "POST required" }, { status: 405 });
    }
    if (new URL(request.url).pathname !== "/rpc") {
      return Response.json({ status: "REJECTED", error: "unknown internal path" }, { status: 404 });
    }
    let bodyBytes;
    try {
      bodyBytes = new Uint8Array(await request.arrayBuffer());
    } catch {
      return Response.json({ status: "REJECTED", error: "request body unavailable" }, { status: 400 });
    }

    const auth = await this.#authenticate(request, bodyBytes);
    if (!auth.ok) {
      return Response.json({ status: "REJECTED", reason: auth.reason }, { status: auth.status });
    }
    if (this.env?.NEXUS_QUOTA_STORE_ENABLED !== "true") {
      return Response.json({ status: "WAITING_FOR_QUOTA", reason: "QUOTA_STORE_DISABLED" }, { status: 503 });
    }

    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(bodyBytes));
    } catch {
      return Response.json({ status: "REJECTED", error: "invalid JSON" }, { status: 400 });
    }
    const input = body?.input;
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return Response.json({ status: "REJECTED", error: "input object required" }, { status: 400 });
    }

    try {
      this.#assertIdentity(input, body.action === "reserve" || body.action === "snapshot");
      let result;
      switch (body.action) {
        case "reserve":
          result = this.#reserve(input);
          break;
        case "settle":
          result = this.#settle(input);
          break;
        case "markUncertain":
          result = this.#markUncertain(input);
          break;
        case "snapshot":
          result = this.#snapshot();
          break;
        default:
          return Response.json({ status: "REJECTED", error: "unknown action" }, { status: 400 });
      }
      return Response.json(result);
    } catch (error) {
      return Response.json({ status: "REJECTED", error: {
        name: error?.name || "Error",
        message: String(error?.message || error)
      }}, { status: 400 });
    }
  }

  async #authenticate(request, bodyBytes) {
    const callerId = request.headers.get("x-nexus-caller-id") || "";
    const timestampText = request.headers.get("x-nexus-timestamp") || "";
    const nonce = request.headers.get("x-nexus-nonce") || "";
    const signatureText = request.headers.get("x-nexus-signature") || "";
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(callerId)) {
      return { ok: false, status: 401, reason: "UNAUTHENTICATED_CALLER" };
    }
    if (!/^\d{1,12}$/.test(timestampText)
      || !/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) {
      return { ok: false, status: 401, reason: "INVALID_AUTH_ENVELOPE" };
    }
    const timestamp = Number(timestampText);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > MAX_CLOCK_SKEW_SECONDS) {
      return { ok: false, status: 401, reason: "AUTH_TIMESTAMP_EXPIRED" };
    }

    let keys;
    try {
      keys = JSON.parse(this.env?.NEXUS_QUOTA_CALLER_KEYS || "{}");
    } catch {
      return { ok: false, status: 503, reason: "CALLER_KEY_REGISTRY_INVALID" };
    }
    const secret = keys && typeof keys === "object" && !Array.isArray(keys)
      ? keys[callerId] : undefined;
    if (typeof secret !== "string" || secret.length < 32) {
      return { ok: false, status: 401, reason: "CALLER_NOT_AUTHORIZED" };
    }

    try {
      const digest = await crypto.subtle.digest("SHA-256", bodyBytes);
      const bodyHash = bytesToHex(digest);
      const method = request.method.toUpperCase();
      const path = new URL(request.url).pathname;
      const canonical = [callerId, timestampText, nonce, method, path, bodyHash].join("\n");
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
      );
      const signature = base64ToBytes(signatureText);
      const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(canonical));
      if (!valid) return { ok: false, status: 401, reason: "SIGNATURE_INVALID" };
    } catch {
      return { ok: false, status: 401, reason: "SIGNATURE_INVALID" };
    }

    // Consume the nonce only after the HMAC and clock checks pass. The unique
    // key is per caller; expired entries are pruned in the same SQLite transaction.
    try {
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec(
          "DELETE FROM quota_auth_nonces WHERE expires_at_epoch <= ?", now
        );
        this.ctx.storage.sql.exec(
          "INSERT INTO quota_auth_nonces(caller_id,nonce,expires_at_epoch) VALUES(?,?,?)",
          callerId, nonce, now + NONCE_TTL_SECONDS
        );
      });
    } catch (error) {
      if (String(error?.message || error).includes("UNIQUE constraint failed")) {
        return { ok: false, status: 409, reason: "REPLAYED_NONCE" };
      }
      return { ok: false, status: 503, reason: "AUTH_NONCE_STORE_UNAVAILABLE" };
    }
    return { ok: true, callerId };
  }

  #assertIdentity(input, allowUninitialized) {
    nonEmpty(input.provider, "provider");
    nonEmpty(input.credentialScope, "credentialScope");
    nonEmpty(input.windowId, "windowId");
    const identity = this.ctx.storage.sql.exec(
      "SELECT provider,credential_scope,window_id FROM quota_meta WHERE singleton=1"
    ).toArray()[0];
    if (!identity && allowUninitialized) return true;
    if (!identity) throw new QuotaLedgerError("quota ledger identity not initialized");
    if (identity.provider !== input.provider
      || identity.credential_scope !== input.credentialScope
      || identity.window_id !== input.windowId) {
      throw new QuotaLedgerError("Durable Object identity mismatch");
    }
    return true;
  }

  #reserve(input) {
    validateQuotaRequest(input);
    const sql = this.ctx.storage.sql;
    try {
      const prior = sql.exec(
        "SELECT reservation_id FROM quota_reservations WHERE reservation_id = ?",
        input.reservationId
      ).toArray()[0];
      if (prior) return { reservationId: input.reservationId, status: "DUPLICATE_RESERVATION" };

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
          const existing = sql.exec("SELECT * FROM quota_buckets WHERE bucket_id = ?", b.bucketId).toArray()[0];
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
            sql.exec(`UPDATE quota_buckets SET limit_units=?,observed_remaining_units=?,
              observed_at_epoch=?,safety_reserve_units=?,recovery_reserve_units=?,
              committed_since_observation_units=0 WHERE bucket_id=?`,
              b.limitUnits,b.observedRemainingUnits,b.observedAtEpoch,b.safetyReserveUnits,
              b.recoveryReserveUnits,b.bucketId);
          } else if (b.observedAtEpoch === existing.observed_at_epoch) {
            sql.exec(`UPDATE quota_buckets SET observed_remaining_units=MIN(observed_remaining_units,?),
              safety_reserve_units=MAX(safety_reserve_units,?),
              recovery_reserve_units=MAX(recovery_reserve_units,?) WHERE bucket_id=?`,
              b.observedRemainingUnits,b.safetyReserveUnits,b.recoveryReserveUnits,b.bucketId);
          }
        }
      });

      return this.ctx.storage.transactionSync(() => {
        for (const [bucketId, units] of Object.entries(input.costs)) {
          const row = sql.exec("SELECT * FROM quota_buckets WHERE bucket_id=?", bucketId).toArray()[0];
          if (!row) throw new QuotaLedgerError("quota bucket missing after telemetry refresh");
          const b = input.buckets.find(x => x.bucketId === bucketId);
          if (b.nowEpoch - row.observed_at_epoch > b.maxTelemetryAgeSeconds) {
            return { reservationId: input.reservationId, status: "WAITING_FOR_QUOTA",
              reason: "stored telemetry is stale", bucketId };
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
            return { reservationId: input.reservationId, status: "WAITING_FOR_QUOTA",
              reason: "bucket capacity or protected reserve exhausted", bucketId };
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
        return { reservationId: input.reservationId, status: "RESERVED", reservedByBucket: input.costs };
      });
    } catch (error) {
      return { status: "REJECTED", error: {
        name: error?.name || "Error",
        message: String(error?.message || error)
      }};
    }
  }

  #settle(input) {
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

  #markUncertain(input) {
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

  #snapshot() {
    const sql = this.ctx.storage.sql;
    return {
      identity: sql.exec("SELECT * FROM quota_meta WHERE singleton=1").toArray()[0] ?? null,
      buckets: sql.exec("SELECT * FROM quota_buckets ORDER BY bucket_id").toArray(),
      reservations: sql.exec("SELECT * FROM quota_reservations ORDER BY created_at_epoch").toArray()
    };
  }
}
