/**
 * Phase 59.34/59.37 — SQLite-backed Durable Object quota ledger with
 * authenticated, replay-protected internal Worker RPC.
 *
 * Public surface: fetch() only. All quota mutation/snapshot methods are private.
 */
import { DurableObject } from "cloudflare:workers";
import {
  QuotaLedgerError, QuotaLedgerExhausted, validateQuotaRequest,
  requireQuotaStoreEnabled, nonEmpty, integer, computeReservationLease
} from "./quota-ledger-contract.mjs";
import { reconcileGitHubQuotaTelemetry } from "./github-quota-telemetry.mjs";
import { getGitHubOperationDefinition } from "./github-operation-registry.mjs";
import { secondaryBackoffSeconds } from "./github-secondary-rate-limit.mjs";
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
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_bucket_counters (
      bucket_id TEXT NOT NULL,
      provider_window_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      credential_scope TEXT NOT NULL,
      partition_window_id TEXT NOT NULL,
      safety_reserve_units INTEGER NOT NULL,
      recovery_reserve_units INTEGER NOT NULL,
      reserved_units INTEGER NOT NULL DEFAULT 0,
      committed_units INTEGER NOT NULL DEFAULT 0,
      committed_since_observation_units INTEGER NOT NULL DEFAULT 0,
      uncertain_units INTEGER NOT NULL DEFAULT 0,
      last_observed_at_epoch INTEGER NOT NULL,
      PRIMARY KEY (bucket_id, provider_window_id)
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_reservations (
      reservation_id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      caller_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      request_fingerprint TEXT NOT NULL DEFAULT '',
      expires_at_epoch INTEGER NOT NULL DEFAULT 0,
      lease_version INTEGER NOT NULL DEFAULT 0,
      last_heartbeat_id TEXT,
      last_heartbeat_epoch INTEGER,
      reconciled_by_bucket_json TEXT NOT NULL DEFAULT '{}',
      reconciled_at_epoch INTEGER,
      reserved_by_bucket_json TEXT NOT NULL,
      actual_by_bucket_json TEXT,
      status TEXT NOT NULL,
      created_at_epoch INTEGER NOT NULL,
      settled_at_epoch INTEGER
    )`);
    const reservationColumns = sql.exec("PRAGMA table_info(quota_reservations)").toArray();
    if (!reservationColumns.some(column => column.name === "request_fingerprint")) {
      sql.exec("ALTER TABLE quota_reservations ADD COLUMN request_fingerprint TEXT NOT NULL DEFAULT ''");
    }
    if (!reservationColumns.some(column => column.name === "expires_at_epoch")) {
      sql.exec("ALTER TABLE quota_reservations ADD COLUMN expires_at_epoch INTEGER NOT NULL DEFAULT 0");
      sql.exec("UPDATE quota_reservations SET expires_at_epoch=created_at_epoch+300 WHERE expires_at_epoch=0");
    }
    if (!reservationColumns.some(column => column.name === "lease_version")) {
      sql.exec("ALTER TABLE quota_reservations ADD COLUMN lease_version INTEGER NOT NULL DEFAULT 0");
    }
    if (!reservationColumns.some(column => column.name === "last_heartbeat_id")) {
      sql.exec("ALTER TABLE quota_reservations ADD COLUMN last_heartbeat_id TEXT");
    }
    if (!reservationColumns.some(column => column.name === "last_heartbeat_epoch")) {
      sql.exec("ALTER TABLE quota_reservations ADD COLUMN last_heartbeat_epoch INTEGER");
    }
    if (!reservationColumns.some(column => column.name === "reconciled_by_bucket_json")) {
      sql.exec("ALTER TABLE quota_reservations ADD COLUMN reconciled_by_bucket_json TEXT NOT NULL DEFAULT '{}'");
    }
    if (!reservationColumns.some(column => column.name === "reconciled_at_epoch")) {
      sql.exec("ALTER TABLE quota_reservations ADD COLUMN reconciled_at_epoch INTEGER");
    }
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_auth_nonces (
      caller_id TEXT NOT NULL,
      nonce TEXT NOT NULL,
      expires_at_epoch INTEGER NOT NULL,
      PRIMARY KEY (caller_id, nonce)
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_reconciliation_audit (
      audit_id TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL,
      caller_id TEXT NOT NULL,
      result_status TEXT NOT NULL,
      evidence_observation_ids_json TEXT NOT NULL,
      reconciled_buckets_json TEXT NOT NULL,
      created_at_epoch INTEGER NOT NULL
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_secondary_control (
      credential_scope TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      cooldown_until_epoch INTEGER NOT NULL DEFAULT 0,
      consecutive_secondary_hits INTEGER NOT NULL DEFAULT 0,
      last_kind TEXT,
      last_status INTEGER,
      last_reason TEXT,
      updated_at_epoch INTEGER NOT NULL
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_secondary_inflight (
      reservation_id TEXT PRIMARY KEY,
      credential_scope TEXT NOT NULL,
      endpoint_key TEXT NOT NULL,
      expires_at_epoch INTEGER NOT NULL
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS quota_secondary_endpoint_points (
      reservation_id TEXT PRIMARY KEY,
      credential_scope TEXT NOT NULL,
      endpoint_key TEXT NOT NULL,
      points INTEGER NOT NULL,
      occurred_at_epoch INTEGER NOT NULL
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
      reservation_id TEXT,
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
        case "expireReservations":
          if (auth.callerId !== "primary") {
            throw new QuotaLedgerError("only primary caller may expire reservations");
          }
          result = this.ctx.storage.transactionSync(() => ({
            status: "EXPIRY_SWEEP_COMPLETE",
            expiredCount: this.#expireReservations()
          }));
          break;
        case "renewReservation":
          result = this.#renewReservation(input, auth.callerId);
          break;
        case "reconcileUncertain":
          if (auth.callerId !== "primary") {
            throw new QuotaLedgerError("only primary caller may reconcile uncertain reservations");
          }
          result = this.#reconcileUncertain(input, auth.callerId);
          break;
        case "recordTelemetry":
          result = this.#recordTelemetry(input, auth.callerId);
          break;
        case "recordSecondaryLimit":
          result = this.#recordSecondaryLimit(input, auth.callerId);
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
    let operationCosts;
    let bucketPolicies;
    try {
      operationCosts = JSON.parse(this.env?.NEXUS_QUOTA_OPERATION_COSTS || "{}");
      bucketPolicies = JSON.parse(this.env?.NEXUS_QUOTA_BUCKET_POLICIES || "{}");
    } catch {
      throw new QuotaLedgerError("server-side quota policy registry invalid");
    }
    const costs = operationCosts?.[input.operation];
    if (!costs || typeof costs !== "object" || Array.isArray(costs)
      || Object.keys(costs).length === 0) {
      throw new QuotaLedgerError("operation cost is not verified; WAITING_FOR_QUOTA");
    }
    if (input.requestFingerprint !== undefined) {
      const reviewedOperation = getGitHubOperationDefinition(input.operation);
      if (!reviewedOperation) {
        throw new QuotaLedgerError("request fingerprint supplied for an unregistered operation");
      }
      const registeredEntries = Object.entries(costs);
      if (registeredEntries.length !== 1
        || registeredEntries[0][0] !== reviewedOperation.resource
        || registeredEntries[0][1] !== reviewedOperation.primaryUnits) {
        throw new QuotaLedgerError("server-side operation cost does not match reviewed registry");
      }
    }
    const entries = Object.entries(costs);
    for (const [bucketId, units] of entries) {
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(bucketId)) {
        throw new QuotaLedgerError("invalid operation bucket id");
      }
      integer(units, `operationCosts.${input.operation}.${bucketId}`, 1);
      const policy = bucketPolicies[bucketId];
      if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
        throw new QuotaLedgerError(`local bucket policy missing: ${bucketId}`);
      }
      integer(policy.safetyReserveUnits, `policy.${bucketId}.safetyReserveUnits`);
      integer(policy.recoveryReserveUnits, `policy.${bucketId}.recoveryReserveUnits`);
      integer(policy.maxTelemetryAgeSeconds, `policy.${bucketId}.maxTelemetryAgeSeconds`, 1);
      if (policy.maxTelemetryAgeSeconds > 300) {
        throw new QuotaLedgerError("local telemetry age policy exceeds hard 300-second ceiling");
      }
    }

    const sql = this.ctx.storage.sql;
    const now = Math.floor(Date.now() / 1000);
    try {
      const ttlSeconds = Number(this.env?.NEXUS_QUOTA_RESERVATION_TTL_SECONDS ?? 300);
      if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 900) {
        throw new QuotaLedgerError("reservation TTL must be an integer from 30 to 900 seconds");
      }
      return this.ctx.storage.transactionSync(() => {
        const identity = sql.exec("SELECT * FROM quota_meta WHERE singleton=1").toArray()[0];
        if (!identity) {
          return {reservationId:input.reservationId,status:"WAITING_FOR_QUOTA",
            reason:"authoritative telemetry not initialized"};
        }
        if (identity.provider !== input.provider
          || identity.credential_scope !== input.credentialScope
          || identity.window_id !== input.windowId) {
          throw new QuotaLedgerError("Durable Object identity mismatch");
        }
        this.#expireReservations(now);
        const prior = sql.exec(
          "SELECT reservation_id FROM quota_reservations WHERE reservation_id = ?",
          input.reservationId
        ).toArray()[0];
        if (prior) return { reservationId: input.reservationId, status: "DUPLICATE_RESERVATION" };

        const secondaryControl = sql.exec(
          "SELECT * FROM quota_secondary_control WHERE credential_scope=?",
          input.credentialScope
        ).toArray()[0];
        if (secondaryControl && secondaryControl.cooldown_until_epoch > now) {
          return {
            reservationId:input.reservationId,
            status:"WAITING_FOR_QUOTA",
            reason:"SECONDARY_RATE_LIMIT_COOLDOWN",
            retryAtEpoch:secondaryControl.cooldown_until_epoch
          };
        }

        const reviewedOperation = input.requestFingerprint
          ? getGitHubOperationDefinition(input.operation) : null;
        let secondaryEndpoint = null;
        let secondaryPoints = 0;
        let maxInFlight = 20;
        let maxEndpointPoints = 600;
        if (reviewedOperation) {
          maxInFlight = Number(this.env?.NEXUS_GITHUB_SECONDARY_MAX_IN_FLIGHT ?? 20);
          maxEndpointPoints = Number(this.env?.NEXUS_GITHUB_REST_ENDPOINT_POINTS_PER_MINUTE ?? 600);
          if (!Number.isSafeInteger(maxInFlight) || maxInFlight < 1 || maxInFlight > 80
            || !Number.isSafeInteger(maxEndpointPoints) || maxEndpointPoints < 1 || maxEndpointPoints > 800) {
            throw new QuotaLedgerError("secondary rate-limit local policy is outside safe bounds");
          }
          secondaryEndpoint = reviewedOperation.endpointKey;
          secondaryPoints = reviewedOperation.secondaryPoints;
          sql.exec("DELETE FROM quota_secondary_inflight WHERE expires_at_epoch <= ?", now);
          sql.exec("DELETE FROM quota_secondary_endpoint_points WHERE occurred_at_epoch <= ?", now-120);
          const active = sql.exec(
            "SELECT COUNT(*) AS count FROM quota_secondary_inflight WHERE credential_scope=?",
            input.credentialScope
          ).toArray()[0].count;
          if (active >= maxInFlight) {
            const oldest = sql.exec(
              "SELECT MIN(expires_at_epoch) AS retry_at FROM quota_secondary_inflight WHERE credential_scope=?",
              input.credentialScope
            ).toArray()[0].retry_at;
            return {reservationId:input.reservationId,status:"WAITING_FOR_QUOTA",
              reason:"SECONDARY_CONCURRENCY_LIMIT",retryAtEpoch:oldest};
          }
          const recent = sql.exec(
            "SELECT COALESCE(SUM(points),0) AS total FROM quota_secondary_endpoint_points WHERE credential_scope=? AND endpoint_key=? AND occurred_at_epoch>?",
            input.credentialScope,secondaryEndpoint,now-60
          ).toArray()[0].total;
          if (recent + secondaryPoints > maxEndpointPoints) {
            const oldest = sql.exec(
              "SELECT MIN(occurred_at_epoch) AS oldest FROM quota_secondary_endpoint_points WHERE credential_scope=? AND endpoint_key=? AND occurred_at_epoch>?",
              input.credentialScope,secondaryEndpoint,now-60
            ).toArray()[0].oldest;
            return {reservationId:input.reservationId,status:"WAITING_FOR_QUOTA",
              reason:"SECONDARY_ENDPOINT_POINT_BUDGET",retryAtEpoch:oldest+60};
          }
        }

        const plans = [];
        for (const [bucketId, units] of entries) {
          const telemetry = sql.exec(
            "SELECT * FROM quota_telemetry_current WHERE bucket_id=?", bucketId
          ).toArray()[0];
          if (!telemetry) {
            return {reservationId:input.reservationId,status:"WAITING_FOR_QUOTA",
              reason:"authoritative bucket telemetry missing",bucketId};
          }
          if (telemetry.provider !== input.provider
            || telemetry.credential_scope !== input.credentialScope
            || telemetry.partition_window_id !== input.windowId) {
            throw new QuotaLedgerError("telemetry credential/partition identity mismatch");
          }
          const policy = bucketPolicies[bucketId];
          const age = now - telemetry.observed_at_epoch;
          if (age < -5 || age > policy.maxTelemetryAgeSeconds) {
            return {reservationId:input.reservationId,status:"WAITING_FOR_QUOTA",
              reason:age < -5 ? "future telemetry rejected" : "stored telemetry is stale",bucketId};
          }
          if (telemetry.reset_at_epoch <= now) {
            return {reservationId:input.reservationId,status:"WAITING_FOR_QUOTA",
              reason:"provider reset window expired; awaiting fresh telemetry",bucketId};
          }
          if (telemetry.authority_rank < 80) {
            return {reservationId:input.reservationId,status:"WAITING_FOR_QUOTA",
              reason:"periodic overview is insufficient authority for admission",bucketId};
          }
          const providerWindowId = telemetry.window_id;
          const existing = sql.exec(
            "SELECT * FROM quota_bucket_counters WHERE bucket_id=? AND provider_window_id=?",
            bucketId, providerWindowId
          ).toArray()[0];
          if (existing && (existing.provider !== input.provider
            || existing.credential_scope !== input.credentialScope
            || existing.partition_window_id !== input.windowId)) {
            throw new QuotaLedgerError("bucket counter identity collision");
          }
          if (existing && telemetry.observed_at_epoch < existing.last_observed_at_epoch) {
            return {reservationId:input.reservationId,status:"WAITING_FOR_QUOTA",
              reason:"telemetry observation older than accounting checkpoint",bucketId};
          }
          const committedSince = existing
            ? (telemetry.observed_at_epoch > existing.last_observed_at_epoch
              ? 0 : existing.committed_since_observation_units)
            : 0;
          const safety = Math.max(existing?.safety_reserve_units ?? 0, policy.safetyReserveUnits);
          const recovery = Math.max(existing?.recovery_reserve_units ?? 0, policy.recoveryReserveUnits);
          const reserved = existing?.reserved_units ?? 0;
          const uncertain = existing?.uncertain_units ?? 0;
          const available = telemetry.observed_remaining_units
            - safety - recovery - reserved - committedSince - uncertain;
          if (units > available) {
            return {reservationId:input.reservationId,status:"WAITING_FOR_QUOTA",
              reason:"provider capacity or protected local reserve exhausted",bucketId};
          }
          plans.push({
            bucketId, units, providerWindowId, telemetryObservedAt:telemetry.observed_at_epoch,
            safety, recovery, existing, committedSince, reserved, uncertain
          });
        }

        const reservedByBucket = {};
        for (const plan of plans) {
          if (!plan.existing) {
            sql.exec(`INSERT INTO quota_bucket_counters
              (bucket_id,provider_window_id,provider,credential_scope,partition_window_id,
               safety_reserve_units,recovery_reserve_units,reserved_units,committed_units,
               committed_since_observation_units,uncertain_units,last_observed_at_epoch)
              VALUES (?,?,?,?,?,?,?, ?,0,0,0,?)`,
              plan.bucketId,plan.providerWindowId,input.provider,input.credentialScope,
              input.windowId,plan.safety,plan.recovery,plan.units,plan.telemetryObservedAt);
          } else {
            sql.exec(`UPDATE quota_bucket_counters SET
              safety_reserve_units=?,recovery_reserve_units=?,reserved_units=reserved_units+?,
              committed_since_observation_units=?,last_observed_at_epoch=?
              WHERE bucket_id=? AND provider_window_id=?`,
              plan.safety,plan.recovery,plan.units,plan.committedSince,
              plan.telemetryObservedAt,plan.bucketId,plan.providerWindowId);
          }
          reservedByBucket[plan.bucketId] = {
            units:plan.units,
            providerWindowId:plan.providerWindowId,
            telemetryObservedAt:plan.telemetryObservedAt
          };
        }
        sql.exec(`INSERT INTO quota_reservations
          (reservation_id,worker_id,caller_id,operation,request_fingerprint,expires_at_epoch,
           reserved_by_bucket_json,status,created_at_epoch)
          VALUES (?,?,?,?,?,?,?, 'RESERVED', ?)`,
          input.reservationId,input.workerId,callerId,input.operation,
          input.requestFingerprint ?? "",now+ttlSeconds,JSON.stringify(reservedByBucket),now);
        if (reviewedOperation) {
          sql.exec("INSERT INTO quota_secondary_inflight(reservation_id,credential_scope,endpoint_key,expires_at_epoch) VALUES(?,?,?,?)",
            input.reservationId,input.credentialScope,secondaryEndpoint,now+ttlSeconds);
          sql.exec("INSERT INTO quota_secondary_endpoint_points(reservation_id,credential_scope,endpoint_key,points,occurred_at_epoch) VALUES(?,?,?,?,?)",
            input.reservationId,input.credentialScope,secondaryEndpoint,secondaryPoints,now);
        }
        return {
          reservationId:input.reservationId,
          status:"RESERVED",
          reservedByBucket:Object.fromEntries(plans.map(p=>[p.bucketId,p.units])),
          providerWindows:Object.fromEntries(plans.map(p=>[p.bucketId,p.providerWindowId]))
        };
      });
    } catch (error) {
      return { status: "REJECTED", error: {
        name: error?.name || "Error",
        message: String(error?.message || error)
      }};
    }
  }

  #renewReservation(input, callerId) {
    nonEmpty(input?.reservationId, "reservationId");
    nonEmpty(input?.workerId, "workerId");
    const heartbeatId = nonEmpty(input?.heartbeatId, "heartbeatId");
    if (!/^[A-Za-z0-9._:-]{1,128}$/.test(heartbeatId)) throw new QuotaLedgerError("unsafe heartbeatId");
    const expectedVersion = integer(input.expectedLeaseVersion, "expectedLeaseVersion");
    const extensionSeconds = input.extensionSeconds === undefined
      ? 120 : integer(input.extensionSeconds, "extensionSeconds", 30);
    if (extensionSeconds > 300) throw new QuotaLedgerError("lease extension exceeds 300-second limit");
    const maxLifetimeSeconds = Number(this.env?.NEXUS_QUOTA_MAX_RESERVATION_LIFETIME_SECONDS ?? 1800);
    if (!Number.isSafeInteger(maxLifetimeSeconds) || maxLifetimeSeconds < 300 || maxLifetimeSeconds > 3600) {
      throw new QuotaLedgerError("maximum reservation lifetime must be 300–3600 seconds");
    }
    const now = Math.floor(Date.now() / 1000);
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync(() => {
      const row = sql.exec("SELECT * FROM quota_reservations WHERE reservation_id=?",
        input.reservationId).toArray()[0];
      if (!row || row.worker_id !== input.workerId || row.caller_id !== callerId
        || row.status !== "RESERVED") {
        throw new QuotaLedgerError("reservation owner/state mismatch");
      }
      if (row.expires_at_epoch <= now) throw new QuotaLedgerError("reservation lease already expired");
      if (row.last_heartbeat_id === heartbeatId) {
        return {status:"DUPLICATE_HEARTBEAT",reservationId:input.reservationId,
          leaseVersion:row.lease_version,expiresAtEpoch:row.expires_at_epoch};
      }
      if (row.lease_version !== expectedVersion) {
        throw new QuotaLedgerError("LEASE_VERSION_CONFLICT");
      }
      const lease = computeReservationLease({
        nowEpoch:now,createdAtEpoch:row.created_at_epoch,
        currentExpiresAtEpoch:row.expires_at_epoch,
        extensionSeconds,maxLifetimeSeconds
      });
      if (lease.status !== "LEASE_RENEWED") {
        return {status:lease.status,reservationId:input.reservationId,
          leaseVersion:row.lease_version,expiresAtEpoch:row.expires_at_epoch,
          hardDeadlineEpoch:lease.hardDeadlineEpoch};
      }
      const nextVersion = row.lease_version + 1;
      sql.exec("UPDATE quota_reservations SET expires_at_epoch=?,lease_version=?,last_heartbeat_id=?,last_heartbeat_epoch=? WHERE reservation_id=? AND status='RESERVED'",
        lease.expiresAtEpoch,nextVersion,heartbeatId,now,input.reservationId);
      sql.exec("UPDATE quota_secondary_inflight SET expires_at_epoch=? WHERE reservation_id=?",
        lease.expiresAtEpoch,input.reservationId);
      return {status:"LEASE_RENEWED",reservationId:input.reservationId,
        leaseVersion:nextVersion,expiresAtEpoch:lease.expiresAtEpoch,
        hardDeadlineEpoch:lease.hardDeadlineEpoch};
    });
  }
  #expireReservations(now = Math.floor(Date.now() / 1000)) {
    const sql = this.ctx.storage.sql;
    const expired = sql.exec(
      "SELECT * FROM quota_reservations WHERE status='RESERVED' AND expires_at_epoch <= ?",
      now
    ).toArray();
    for (const row of expired) {
      const reserved = JSON.parse(row.reserved_by_bucket_json);
      const updates = [];
      for (const [bucketId, reservation] of Object.entries(reserved)) {
        if (!reservation || typeof reservation !== "object"
          || !Number.isSafeInteger(reservation.units) || reservation.units < 1) {
          throw new QuotaLedgerError("expired reservation envelope malformed");
        }
        const counter = sql.exec(
          "SELECT * FROM quota_bucket_counters WHERE bucket_id=? AND provider_window_id=?",
          bucketId, reservation.providerWindowId
        ).toArray()[0];
        if (!counter || counter.reserved_units < reservation.units) {
          throw new QuotaLedgerError("expired reservation counter missing or inconsistent");
        }
        updates.push({bucketId,reservation});
      }
      for (const {bucketId,reservation} of updates) {
        sql.exec("UPDATE quota_bucket_counters SET reserved_units=reserved_units-?, uncertain_units=uncertain_units+? WHERE bucket_id=? AND provider_window_id=?",
          reservation.units,reservation.units,bucketId,reservation.providerWindowId);
      }
      sql.exec("UPDATE quota_reservations SET status='UNCERTAIN_BUDGET_RETAINED', settled_at_epoch=? WHERE reservation_id=? AND status='RESERVED'",
        now,row.reservation_id);
      sql.exec("DELETE FROM quota_secondary_inflight WHERE reservation_id=?", row.reservation_id);
    }
    return expired.length;
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
      const updates = [];
      for (const [bucketId, actualUnits] of Object.entries(input.actualByBucket)) {
        integer(actualUnits, `actual.${bucketId}`);
        const reservation = reserved[bucketId];
        if (!reservation || typeof reservation !== "object") {
          throw new QuotaLedgerError("reservation window envelope malformed");
        }
        if (actualUnits > reservation.units) {
          throw new QuotaLedgerExhausted(`${bucketId} exceeded reservation`);
        }
        const counter = sql.exec(
          "SELECT * FROM quota_bucket_counters WHERE bucket_id=? AND provider_window_id=?",
          bucketId,reservation.providerWindowId
        ).toArray()[0];
        if (!counter || counter.reserved_units < reservation.units) {
          throw new QuotaLedgerError("reserved bucket-window counter missing or inconsistent");
        }
        const linkedObservation = sql.exec(`SELECT observation_id
          FROM quota_telemetry_observations
          WHERE reservation_id=? AND bucket_id=? AND window_id=? AND authority_rank>=80
          LIMIT 1`,
          input.reservationId,bucketId,reservation.providerWindowId
        ).toArray()[0];
        updates.push({
          bucketId,actualUnits,reservation,
          committedSinceDelta:linkedObservation ? 0 : actualUnits
        });
      }
      for (const update of updates) {
        sql.exec(`UPDATE quota_bucket_counters SET
          reserved_units=reserved_units-?,
          committed_units=committed_units+?,
          committed_since_observation_units=committed_since_observation_units+?
          WHERE bucket_id=? AND provider_window_id=?`,
          update.reservation.units,update.actualUnits,update.committedSinceDelta,
          update.bucketId,update.reservation.providerWindowId);
      }
      sql.exec(`UPDATE quota_reservations SET actual_by_bucket_json=?,status='SETTLED',
        settled_at_epoch=? WHERE reservation_id=?`,
        JSON.stringify(input.actualByBucket),Math.floor(Date.now()/1000),input.reservationId);
      sql.exec("DELETE FROM quota_secondary_inflight WHERE reservation_id=?", input.reservationId);
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
      for (const [bucketId, reservation] of Object.entries(reserved)) {
        if (!reservation || typeof reservation !== "object") {
          throw new QuotaLedgerError("reservation window envelope malformed");
        }
        const counter = sql.exec(
          "SELECT * FROM quota_bucket_counters WHERE bucket_id=? AND provider_window_id=?",
          bucketId,reservation.providerWindowId
        ).toArray()[0];
        if (!counter || counter.reserved_units < reservation.units) {
          throw new QuotaLedgerError("reserved bucket-window counter missing or inconsistent");
        }
      }
      for (const [bucketId, reservation] of Object.entries(reserved)) {
        sql.exec(`UPDATE quota_bucket_counters SET
          reserved_units=reserved_units-?,uncertain_units=uncertain_units+?
          WHERE bucket_id=? AND provider_window_id=?`,
          reservation.units,reservation.units,bucketId,reservation.providerWindowId);
      }
      sql.exec("UPDATE quota_reservations SET status='UNCERTAIN_BUDGET_RETAINED' WHERE reservation_id=?",
        input.reservationId);
      sql.exec("DELETE FROM quota_secondary_inflight WHERE reservation_id=?", input.reservationId);
      return {reservationId:input.reservationId,status:"UNCERTAIN_BUDGET_RETAINED"};
    });
  }

  #recordSecondaryLimit(input, callerId) {
    if (input.provider !== "github") throw new QuotaLedgerError("secondary limit provider must be github");
    nonEmpty(input.credentialScope, "credentialScope");
    nonEmpty(input.windowId, "windowId");
    nonEmpty(input.reservationId, "reservationId");
    nonEmpty(input.workerId, "workerId");
    if (![403, 429].includes(input.status)) throw new QuotaLedgerError("secondary limit status must be 403 or 429");
    if (!["PRIMARY_LIMIT", "SECONDARY_LIMIT"].includes(input.kind)) throw new QuotaLedgerError("invalid rate-limit kind");
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = input.retryAfterSeconds === undefined || input.retryAfterSeconds === null
      ? null : integer(input.retryAfterSeconds, "retryAfterSeconds");
    if (retryAfter !== null && retryAfter > 86400) throw new QuotaLedgerError("Retry-After exceeds 24-hour safety ceiling");
    const resetAt = input.resetAtEpoch === undefined || input.resetAtEpoch === null
      ? null : integer(input.resetAtEpoch, "resetAtEpoch");
    const minimumWait = input.minimumWaitSeconds === undefined || input.minimumWaitSeconds === null
      ? (input.kind === "SECONDARY_LIMIT" ? 60 : 0)
      : integer(input.minimumWaitSeconds, "minimumWaitSeconds");
    if (minimumWait > 900) throw new QuotaLedgerError("minimum secondary wait exceeds 900-second safety ceiling");
    if (resetAt !== null && (resetAt <= now || resetAt > now + 86400)) {
      throw new QuotaLedgerError("rate-limit reset must be within the next 24 hours");
    }
    if (input.kind === "PRIMARY_LIMIT" && resetAt === null) {
      throw new QuotaLedgerError("primary limit cooldown requires provider reset timestamp");
    }
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync(() => {
      const identity = sql.exec("SELECT * FROM quota_meta WHERE singleton=1").toArray()[0];
      if (!identity || identity.provider !== input.provider
        || identity.credential_scope !== input.credentialScope || identity.window_id !== input.windowId) {
        throw new QuotaLedgerError("secondary limit credential/partition identity mismatch");
      }
      const reservation = sql.exec("SELECT * FROM quota_reservations WHERE reservation_id=?",
        input.reservationId).toArray()[0];
      if (!reservation || reservation.worker_id !== input.workerId
        || reservation.caller_id !== callerId || reservation.status !== "RESERVED") {
        throw new QuotaLedgerError("secondary limit reservation owner/state mismatch");
      }
      const prior = sql.exec("SELECT * FROM quota_secondary_control WHERE credential_scope=?",
        input.credentialScope).toArray()[0];
      let consecutive = prior?.consecutive_secondary_hits ?? 0;
      let backoff = 0;
      let proposed;
      if (input.kind === "PRIMARY_LIMIT") {
        proposed = resetAt;
        if (retryAfter !== null) proposed = Math.max(proposed, now + retryAfter);
        consecutive = 0;
      } else {
        consecutive = prior && now - prior.updated_at_epoch <= 3600
          ? consecutive + 1 : 1;
        backoff = secondaryBackoffSeconds(consecutive);
        proposed = now + Math.max(minimumWait, retryAfter ?? 0, backoff);
        if (resetAt !== null) proposed = Math.max(proposed, resetAt);
      }
      const cooldownUntil = Math.max(prior?.cooldown_until_epoch ?? 0, proposed);
      const reason = typeof input.reason === "string" && input.reason.length <= 128
        ? input.reason : input.kind;
      sql.exec(`INSERT INTO quota_secondary_control
        (credential_scope,provider,cooldown_until_epoch,consecutive_secondary_hits,
         last_kind,last_status,last_reason,updated_at_epoch)
        VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(credential_scope) DO UPDATE SET
          provider=excluded.provider,
          cooldown_until_epoch=MAX(quota_secondary_control.cooldown_until_epoch,excluded.cooldown_until_epoch),
          consecutive_secondary_hits=excluded.consecutive_secondary_hits,
          last_kind=excluded.last_kind,last_status=excluded.last_status,
          last_reason=excluded.last_reason,updated_at_epoch=excluded.updated_at_epoch`,
        input.credentialScope,input.provider,cooldownUntil,consecutive,
        input.kind,input.status,reason,now);
      return {status:"SECONDARY_COOLDOWN_RECORDED",kind:input.kind,
        cooldownUntilEpoch:cooldownUntil,consecutiveSecondaryHits:consecutive,backoffSeconds:backoff};
    });
  }
  #reconcileUncertain(input, callerId) {
    nonEmpty(input?.reservationId, "reservationId");
    nonEmpty(input?.workerId, "workerId");
    const now = Math.floor(Date.now() / 1000);
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync(() => {
      const row = sql.exec("SELECT * FROM quota_reservations WHERE reservation_id=?",
        input.reservationId).toArray()[0];
      if (!row || row.worker_id !== input.workerId) {
        throw new QuotaLedgerError("reconciliation reservation worker mismatch");
      }
      if (row.status === "RECONCILED_TELEMETRY_LINKED") {
        return {status:"ALREADY_RECONCILED",reservationId:input.reservationId};
      }
      if (!["UNCERTAIN_BUDGET_RETAINED","PARTIALLY_RECONCILED"].includes(row.status)) {
        throw new QuotaLedgerError("reservation is not in an uncertain state");
      }
      const reserved = JSON.parse(row.reserved_by_bucket_json);
      const reconciled = JSON.parse(row.reconciled_by_bucket_json || "{}");
      const newEvidence = {};
      for (const [bucketId,reservation] of Object.entries(reserved)) {
        if (reconciled[bucketId]) continue;
        const observation = sql.exec(`SELECT o.* FROM quota_telemetry_observations o
          JOIN quota_telemetry_current c ON c.bucket_id=o.bucket_id
          WHERE o.reservation_id=? AND o.bucket_id=? AND o.window_id=?
            AND o.telemetry_source='response_header' AND o.authority_rank>=100
            AND o.observed_at_epoch>=?
            AND c.window_id=o.window_id AND c.reset_at_epoch=o.reset_at_epoch
            AND c.observed_at_epoch>=o.observed_at_epoch
            AND c.observed_remaining_units<=o.observed_remaining_units
            AND c.used_units>=o.used_units
          ORDER BY o.observed_at_epoch DESC LIMIT 1`,
          input.reservationId,bucketId,reservation.providerWindowId,row.created_at_epoch
        ).toArray()[0];
        if (!observation) continue;
        const counter = sql.exec(
          "SELECT * FROM quota_bucket_counters WHERE bucket_id=? AND provider_window_id=?",
          bucketId,reservation.providerWindowId
        ).toArray()[0];
        if (!counter || counter.uncertain_units < reservation.units) {
          throw new QuotaLedgerError("uncertain counter missing or inconsistent during reconciliation");
        }
        sql.exec(`UPDATE quota_bucket_counters SET
          uncertain_units=uncertain_units-?,committed_units=committed_units+?
          WHERE bucket_id=? AND provider_window_id=?`,
          reservation.units,reservation.units,bucketId,reservation.providerWindowId);
        const evidence = {
          chargedUpperBoundUnits:reservation.units,
          observationId:observation.observation_id,
          observedAtEpoch:observation.observed_at_epoch,
          source:observation.telemetry_source,
          authorityRank:observation.authority_rank
        };
        reconciled[bucketId]=evidence;
        newEvidence[bucketId]=observation.observation_id;
      }
      const allReconciled = Object.keys(reconciled).length === Object.keys(reserved).length;
      const anyReconciled = Object.keys(reconciled).length > 0;
      const status = allReconciled ? "RECONCILED_TELEMETRY_LINKED"
        : anyReconciled ? "PARTIALLY_RECONCILED" : "UNCERTAIN_BUDGET_RETAINED";
      sql.exec(`UPDATE quota_reservations SET reconciled_by_bucket_json=?,status=?,
        reconciled_at_epoch=? WHERE reservation_id=?`,
        JSON.stringify(reconciled),status,allReconciled ? now : null,input.reservationId);
      const auditId = crypto.randomUUID();
      sql.exec(`INSERT INTO quota_reconciliation_audit
        (audit_id,reservation_id,caller_id,result_status,evidence_observation_ids_json,
         reconciled_buckets_json,created_at_epoch) VALUES(?,?,?,?,?,?,?)`,
        auditId,input.reservationId,callerId,status,JSON.stringify(newEvidence),
        JSON.stringify(reconciled),now);
      return {status,reservationId:input.reservationId,
        reconciledBuckets:Object.keys(reconciled),
        remainingUncertainBuckets:Object.keys(reserved).filter(key=>!reconciled[key]),
        newEvidenceObservationIds:newEvidence,auditId};
    });
  }
  #recordTelemetry(input, callerId) {
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
      || !endpoint.startsWith(method + " ")
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
    const reservationId = input.reservationId === undefined || input.reservationId === null
      ? null : nonEmpty(input.reservationId, "reservationId");
    if (callerId !== "primary" && !reservationId) {
      throw new QuotaLedgerError("secondary telemetry must be linked to its own reservation");
    }
    if (callerId !== "primary" && expectedRank < 80) {
      throw new QuotaLedgerError("secondary caller may submit only response-linked telemetry");
    }

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

      if (reservationId) {
        const reservationRow = sql.exec(
          "SELECT * FROM quota_reservations WHERE reservation_id=?", reservationId
        ).toArray()[0];
        if (!reservationRow || reservationRow.caller_id !== callerId
          || reservationRow.status !== "RESERVED") {
          throw new QuotaLedgerError("telemetry reservation owner/state mismatch");
        }
        const reservedByBucket = JSON.parse(reservationRow.reserved_by_bucket_json);
        const reservedBucket = reservedByBucket[incoming.bucket_id];
        if (!reservedBucket || reservedBucket.providerWindowId !== incoming.window_id) {
          throw new QuotaLedgerError("telemetry does not match reserved provider window");
        }
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
        (observation_id,reservation_id,bucket_id,provider,credential_scope,partition_window_id,window_id,
         limit_units,observed_remaining_units,used_units,reset_at_epoch,observed_at_epoch,
         telemetry_source,authority_rank,is_authoritative,freshness,provenance_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        observationId, reservationId, ...values);

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
        const counter = sql.exec(
          "SELECT * FROM quota_bucket_counters WHERE bucket_id=? AND provider_window_id=?",
          row.bucket_id,row.window_id
        ).toArray()[0];
        if (counter && row.observed_at_epoch > counter.last_observed_at_epoch) {
          sql.exec(`UPDATE quota_bucket_counters
            SET committed_since_observation_units=0,last_observed_at_epoch=?
            WHERE bucket_id=? AND provider_window_id=?`,
            row.observed_at_epoch,row.bucket_id,row.window_id);
        }
      }
      return {
        status: "RECORDED",
        decision: reconciled.decision,
        observationId,
        bucketId: incoming.bucket_id,
        current: reconciled.record
      };
    });
  }

  #snapshot() {
    const sql = this.ctx.storage.sql;
    return {
      identity: sql.exec("SELECT * FROM quota_meta WHERE singleton=1").toArray()[0] ?? null,
      buckets: sql.exec("SELECT * FROM quota_bucket_counters ORDER BY bucket_id,provider_window_id").toArray(),
      reservations: sql.exec("SELECT * FROM quota_reservations ORDER BY created_at_epoch").toArray(),
      telemetryCurrent: sql.exec("SELECT * FROM quota_telemetry_current ORDER BY bucket_id").toArray(),
      telemetryObservations: sql.exec("SELECT * FROM quota_telemetry_observations ORDER BY observed_at_epoch").toArray(),
      secondaryControl: sql.exec("SELECT * FROM quota_secondary_control ORDER BY credential_scope").toArray()[0] ?? null,
      secondaryInflight: sql.exec("SELECT * FROM quota_secondary_inflight ORDER BY expires_at_epoch").toArray(),
      secondaryEndpointPoints: sql.exec("SELECT * FROM quota_secondary_endpoint_points ORDER BY occurred_at_epoch").toArray(),
      reconciliationAudit: sql.exec("SELECT * FROM quota_reconciliation_audit ORDER BY created_at_epoch").toArray()
    };
  }
}
