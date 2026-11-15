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
import { reconcileGitHubQuotaTelemetry } from "./github-quota-telemetry.mjs";
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
      caller_id TEXT NOT NULL,
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
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_telemetry_current (
      bucket_id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      credential_scope TEXT NOT NULL,
      partition_window_id TEXT NOT NULL,
      window_id TEXT NOT NULL,
      limit_units INTEGER NOT NULL,
      observed_remaining_units INTEGER NOT NULL,
      used_units INTEGER NOT NULL,
      reset_at_epoch INTEGER NOT NULL,
      observed_at_epoch INTEGER NOT NULL,
      telemetry_source TEXT NOT NULL,
      authority_rank INTEGER NOT NULL,
      is_authoritative INTEGER NOT NULL,
      freshness TEXT NOT NULL,
      provenance_json TEXT NOT NULL
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_telemetry_observations (
      observation_id TEXT PRIMARY KEY,
      bucket_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      credential_scope TEXT NOT NULL,
      partition_window_id TEXT NOT NULL,
      window_id TEXT NOT NULL,
      limit_units INTEGER NOT NULL,
      observed_remaining_units INTEGER NOT NULL,
      used_units INTEGER NOT NULL,
      reset_at_epoch INTEGER NOT NULL,
      observed_at_epoch INTEGER NOT NULL,
      telemetry_source TEXT NOT NULL,
      authority_rank INTEGER NOT NULL,
      is_authoritative INTEGER NOT NULL,
      freshness TEXT NOT NULL,
      provenance_json TEXT NOT NULL
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
    let callerPolicies;
    try {
      callerPolicies = JSON.parse(this.env?.NEXUS_QUOTA_CALLER_POLICIES || "{}");
    } catch {
      return Response.json({ status: "REJECTED", reason: "CALLER_POLICY_REGISTRY_INVALID" }, { status: 503 });
    }
    const allowedActions = callerPolicies?.[auth.callerId];
    if (!Array.isArray(allowedActions) || !allowedActions.includes(body.action)) {
      return Response.json({ status: "REJECTED", reason: "CALLER_ACTION_FORBIDDEN" }, { status: 403 });
    }

    try {
      this.#assertIdentity(input, body.action === "reserve" || body.action === "snapshot" || body.action === "recordTelemetry");
      let result;
      switch (body.action) {
        case "reserve":
          result = this.#reserve(input, auth.callerId);
          break;
        case "settle":
          result = this.#settle(input, auth.callerId);
          break;
        case "markUncertain":
          result = this.#markUncertain(input, auth.callerId);
          break;
        case "recordTelemetry":
          result = this.#recordTelemetry(input);
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

  #reserve(input, callerId) {
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
          (reservation_id,worker_id,caller_id,operation,reserved_by_bucket_json,status,created_at_epoch)
          VALUES (?,?,?,?,?, 'RESERVED', ?)`,
          input.reservationId,input.workerId,callerId,input.operation,JSON.stringify(input.costs),
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

  #settle(input, callerId) {
    nonEmpty(input?.reservationId, "reservationId");
    nonEmpty(input?.workerId, "workerId");
    if (!input.actualByBucket || typeof input.actualByBucket !== "object"
      || Array.isArray(input.actualByBucket)) throw new QuotaLedgerError("actualByBucket required");
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync(() => {
      const rec = sql.exec("SELECT * FROM quota_reservations WHERE reservation_id=?",
        input.reservationId).toArray()[0];
      if (!rec || rec.worker_id !== input.workerId || rec.caller_id !== callerId || rec.status !== "RESERVED") {
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

  #markUncertain(input, callerId) {
    nonEmpty(input?.reservationId, "reservationId");
    nonEmpty(input?.workerId, "workerId");
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync(() => {
      const rec = sql.exec("SELECT * FROM quota_reservations WHERE reservation_id=?",
        input.reservationId).toArray()[0];
      if (!rec || rec.worker_id !== input.workerId || rec.caller_id !== callerId || rec.status !== "RESERVED") {
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

  #recordTelemetry(input) {
    const telemetry = input.telemetry;
    if (!telemetry || typeof telemetry !== "object" || Array.isArray(telemetry)) {
      throw new QuotaLedgerError("telemetry record required");
    }
    if (input.provider !== "github" || telemetry.provider !== input.provider
      || telemetry.credential_scope !== input.credentialScope) {
      throw new QuotaLedgerError("telemetry provider/credential identity mismatch");
    }
    const sourceRanks = {
      response_header: 100,
      graphql_rateLimit_field: 80,
      rate_limit_endpoint: 50
    };
    const expectedRank = sourceRanks[telemetry.telemetry_source];
    if (!expectedRank || telemetry.authority_rank !== expectedRank
      || telemetry.is_authoritative !== (expectedRank >= 100)) {
      throw new QuotaLedgerError("unknown telemetry source or authority rank");
    }
    if (!["OBSERVED", "PERIODIC_OVERVIEW"].includes(telemetry.freshness)) {
      throw new QuotaLedgerError("invalid telemetry freshness label");
    }
    nonEmpty(telemetry.bucket_id, "telemetry.bucket_id");
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(telemetry.bucket_id)) {
      throw new QuotaLedgerError("invalid telemetry bucket_id");
    }
    const limit = integer(telemetry.limit_units, "telemetry.limit_units");
    const remaining = integer(telemetry.observed_remaining_units, "telemetry.observed_remaining_units");
    const used = integer(telemetry.used_units, "telemetry.used_units");
    const reset = integer(telemetry.reset_at_epoch, "telemetry.reset_at_epoch");
    const observed = integer(telemetry.observed_at_epoch, "telemetry.observed_at_epoch");
    if (limit < 1 || remaining > limit || used > limit || reset <= observed) {
      throw new QuotaLedgerError("invalid telemetry counters or reset window");
    }
    if (telemetry.window_id !== `${telemetry.bucket_id}:${reset}`) {
      throw new QuotaLedgerError("telemetry window identity mismatch");
    }
    const now = Math.floor(Date.now() / 1000);
    const age = now - observed;
    if (age < -5) throw new QuotaLedgerError("FUTURE_TELEMETRY");
    if (age > 300) throw new QuotaLedgerError("STALE_TELEMETRY");
    if (!telemetry.provenance || typeof telemetry.provenance !== "object"
      || Array.isArray(telemetry.provenance)) {
      throw new QuotaLedgerError("telemetry provenance required");
    }
    const endpoint = nonEmpty(telemetry.provenance.endpoint, "provenance.endpoint");
    const method = nonEmpty(telemetry.provenance.method, "provenance.method").toUpperCase();
    const status = integer(telemetry.provenance.status, "provenance.status", 100);
    if (!/^[A-Z]+ \/[A-Za-z0-9._/-]{1,220}$/.test(endpoint) || endpoint.includes("?")
      || !["GET", "HEAD", "OPTIONS", "POST", "PATCH", "PUT", "DELETE"].includes(method)
      || status > 599) {
      throw new QuotaLedgerError("unsafe telemetry provenance fields");
    }
    const requestId = typeof telemetry.provenance.request_id === "string"
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(telemetry.provenance.request_id)
      ? telemetry.provenance.request_id : null;
    const provenance = {
      endpoint,
      method,
      status,
      request_id: requestId,
      source: telemetry.provenance.source
    };
    if (provenance.source !== telemetry.telemetry_source) {
      throw new QuotaLedgerError("telemetry provenance/source mismatch");
    }
    const provenanceJson = JSON.stringify(provenance);
    if (provenanceJson.length > 2048) throw new QuotaLedgerError("telemetry provenance too large");

    const incoming = {
      provider: telemetry.provider,
      credential_scope: telemetry.credential_scope,
      bucket_id: telemetry.bucket_id,
      window_id: telemetry.window_id,
      limit_units: limit,
      observed_remaining_units: remaining,
      used_units: used,
      reset_at_epoch: reset,
      observed_at_epoch: observed,
      telemetry_source: telemetry.telemetry_source,
      authority_rank: expectedRank,
      is_authoritative: expectedRank >= 100,
      freshness: telemetry.freshness || "OBSERVED",
      provenance
    };
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync(() => {
      const identity = sql.exec("SELECT * FROM quota_meta WHERE singleton=1").toArray()[0];
      if (identity && (identity.provider !== input.provider
        || identity.credential_scope !== input.credentialScope
        || identity.window_id !== input.windowId)) {
        throw new QuotaLedgerError("Durable Object identity mismatch");
      }
      if (!identity) {
        sql.exec("INSERT INTO quota_meta(singleton,provider,credential_scope,window_id) VALUES(1,?,?,?)",
          input.provider, input.credentialScope, input.windowId);
      }

      const currentRow = sql.exec(
        "SELECT * FROM quota_telemetry_current WHERE bucket_id=?", incoming.bucket_id
      ).toArray()[0];
      const current = currentRow ? {
        provider: currentRow.provider,
        credential_scope: currentRow.credential_scope,
        bucket_id: currentRow.bucket_id,
        window_id: currentRow.window_id,
        limit_units: currentRow.limit_units,
        observed_remaining_units: currentRow.observed_remaining_units,
        used_units: currentRow.used_units,
        reset_at_epoch: currentRow.reset_at_epoch,
        observed_at_epoch: currentRow.observed_at_epoch,
        telemetry_source: currentRow.telemetry_source,
        authority_rank: currentRow.authority_rank,
        is_authoritative: Boolean(currentRow.is_authoritative),
        freshness: currentRow.freshness,
        provenance: JSON.parse(currentRow.provenance_json)
      } : null;
      const reconciled = reconcileGitHubQuotaTelemetry(current, incoming);
      const observationId = crypto.randomUUID();
      const values = [
        incoming.bucket_id, incoming.provider, incoming.credential_scope, input.windowId,
        incoming.window_id, incoming.limit_units, incoming.observed_remaining_units,
        incoming.used_units, incoming.reset_at_epoch, incoming.observed_at_epoch,
        incoming.telemetry_source, incoming.authority_rank, incoming.is_authoritative ? 1 : 0,
        incoming.freshness, provenanceJson
      ];
      sql.exec(`INSERT INTO quota_telemetry_observations
        (observation_id,bucket_id,provider,credential_scope,partition_window_id,window_id,
         limit_units,observed_remaining_units,used_units,reset_at_epoch,observed_at_epoch,
         telemetry_source,authority_rank,is_authoritative,freshness,provenance_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        observationId, ...values);

      const accepted = reconciled.decision.startsWith("ACCEPT")
        || reconciled.decision === "SAME_SECOND_CONSERVATIVE_MIN";
      if (accepted) {
        const row = reconciled.record;
        const rowProvenance = JSON.stringify(row.provenance);
        sql.exec(`INSERT INTO quota_telemetry_current
          (bucket_id,provider,credential_scope,partition_window_id,window_id,limit_units,
           observed_remaining_units,used_units,reset_at_epoch,observed_at_epoch,
           telemetry_source,authority_rank,is_authoritative,freshness,provenance_json)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(bucket_id) DO UPDATE SET
            provider=excluded.provider,credential_scope=excluded.credential_scope,
            partition_window_id=excluded.partition_window_id,window_id=excluded.window_id,
            limit_units=excluded.limit_units,
            observed_remaining_units=excluded.observed_remaining_units,
            used_units=excluded.used_units,reset_at_epoch=excluded.reset_at_epoch,
            observed_at_epoch=excluded.observed_at_epoch,
            telemetry_source=excluded.telemetry_source,authority_rank=excluded.authority_rank,
            is_authoritative=excluded.is_authoritative,freshness=excluded.freshness,
            provenance_json=excluded.provenance_json`,
          row.bucket_id,row.provider,row.credential_scope,input.windowId,row.window_id,
          row.limit_units,row.observed_remaining_units,row.used_units,row.reset_at_epoch,
          row.observed_at_epoch,row.telemetry_source,row.authority_rank,
          row.is_authoritative ? 1 : 0,row.freshness,rowProvenance);
      }
      return {
        status: "RECORDED",
        decision: reconciled.decision,
        bucketId: incoming.bucket_id,
        current: reconciled.record
      };
    });
  }

  #snapshot() {
    const sql = this.ctx.storage.sql;
    return {
      identity: sql.exec("SELECT * FROM quota_meta WHERE singleton=1").toArray()[0] ?? null,
      buckets: sql.exec("SELECT * FROM quota_buckets ORDER BY bucket_id").toArray(),
      reservations: sql.exec("SELECT * FROM quota_reservations ORDER BY created_at_epoch").toArray(),
      telemetryCurrent: sql.exec("SELECT * FROM quota_telemetry_current ORDER BY bucket_id").toArray(),
      telemetryObservations: sql.exec("SELECT * FROM quota_telemetry_observations ORDER BY observed_at_epoch").toArray()
    };
  }
}
