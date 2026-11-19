/**
 * Phase 59.60 — account-scope platform budget Durable Object.
 *
 * One fixed DO identity is shared by all P10CR workers/runs/repositories
 * deployed against this namespace. Costs are server-side conservative
 * reservations, never caller-supplied telemetry. No provider/network access.
 */
import { DurableObject } from "cloudflare:workers";

const encoder = new TextEncoder();
const ZERO_HASH = "0".repeat(64);
const CANONICAL_REPOSITORY = "manish91082-coder/nexus-autonomous-cloud-work-engine";
const OPERATION_ID = "p10cr.shadow.dispatch.v1";
const CONTROL_COST = Object.freeze({
  budget_rpc_requests: 1,
  budget_duration_milli_gb_seconds: 10,
  budget_sqlite_rows_read: 5,
  budget_sqlite_rows_written: 3,
  budget_storage_bytes: 1024
});
const TASK_COST = Object.freeze({
  worker_requests: 1,
  do_requests: 8,
  do_duration_milli_gb_seconds: 500,
  sqlite_rows_read: 45,
  sqlite_rows_written: 18,
  storage_bytes: 16384,
  dispatches: 1
});
const DEFAULT_CAPS = Object.freeze({
  worker_requests: 5000,
  do_requests: 4500,
  do_duration_milli_gb_seconds: 585000,
  sqlite_rows_read: 225000,
  sqlite_rows_written: 3500,
  storage_bytes: 235929600,
  dispatches: 100,
  budget_rpc_requests: 500,
  budget_duration_milli_gb_seconds: 65000,
  budget_sqlite_rows_read: 25000,
  budget_sqlite_rows_written: 1500,
  budget_storage_bytes: 26214400
});
const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const HASH = /^[a-f0-9]{64}$/;

function json(value) { return JSON.stringify(value); }
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return json(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("NON_FINITE_NUMBER");
    return json(value);
  }
  if (Array.isArray(value)) return "[" + value.map(item => canonical(item)).join(",") + "]";
  if (!value || typeof value !== "object" ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new TypeError("UNSUPPORTED_JSON_VALUE");
  }
  const keys = Object.keys(value).sort();
  return "{" + keys.map(key => {
    if (["__proto__", "prototype", "constructor"].includes(key)) throw new TypeError("UNSAFE_JSON_KEY");
    return json(key) + ":" + canonical(value[key]);
  }).join(",") + "}";
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function response(status, body) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
function empty() {
  return {
    worker_requests: 0, do_requests: 0, do_duration_milli_gb_seconds: 0,
    sqlite_rows_read: 0, sqlite_rows_written: 0, storage_bytes: 0, dispatches: 0
  };
}
function decode(value) {
  try { return JSON.parse(value || "{}"); } catch { throw new Error("BUDGET_LEDGER_JSON_CORRUPT"); }
}
function safeInteger(value, field, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError("INVALID_" + field.toUpperCase());
  return value;
}
function validId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) throw new TypeError("INVALID_" + field.toUpperCase());
  return value;
}
function add(target, delta) {
  const next = { ...target };
  for (const [key, value] of Object.entries(delta)) next[key] = (next[key] || 0) + value;
  return next;
}
function move(target, delta) {
  const next = { ...target };
  for (const [key, value] of Object.entries(delta)) {
    if ((next[key] || 0) < value) throw new Error("BUDGET_COUNTER_UNDERFLOW:" + key);
    next[key] = (next[key] || 0) - value;
  }
  return next;
}

export class PlatformBudgetDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS platform_budget_daily (
      utc_day TEXT PRIMARY KEY,
      reserved_json TEXT NOT NULL,
      committed_json TEXT NOT NULL,
      uncertain_json TEXT NOT NULL,
      control_json TEXT NOT NULL,
      next_fencing_token INTEGER NOT NULL DEFAULT 0,
      last_event_seq INTEGER NOT NULL DEFAULT 0,
      last_event_hash TEXT NOT NULL DEFAULT '${ZERO_HASH}',
      updated_at_epoch INTEGER NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS platform_budget_reservations (
      reservation_id TEXT PRIMARY KEY,
      utc_day TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      request_fingerprint TEXT NOT NULL,
      caller_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      repository TEXT NOT NULL,
      workflow_run_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      phase_id TEXT NOT NULL,
      execution_id TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      costs_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at_epoch INTEGER NOT NULL,
      expires_at_epoch INTEGER NOT NULL,
      hard_deadline_epoch INTEGER NOT NULL,
      fencing_token INTEGER NOT NULL,
      lease_version INTEGER NOT NULL,
      outcome TEXT,
      evidence_hash TEXT,
      settled_at_epoch INTEGER
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS platform_budget_reservations_day
      ON platform_budget_reservations(utc_day, created_at_epoch)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS platform_budget_events (
      utc_day TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      event_json TEXT NOT NULL,
      previous_hash TEXT NOT NULL,
      event_hash TEXT NOT NULL,
      created_at_epoch INTEGER NOT NULL,
      PRIMARY KEY (utc_day, sequence)
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS platform_budget_nonces (
      caller_id TEXT NOT NULL,
      nonce TEXT NOT NULL,
      expires_at_epoch INTEGER NOT NULL,
      PRIMARY KEY (caller_id, nonce)
    )`);
  }

  #testMode() { return this.env?.NEXUS_PLATFORM_BUDGET_TEST_MODE === "true"; }

  #caps() {
    if (!this.#testMode()) return { ...DEFAULT_CAPS };
    let override = {};
    try { override = JSON.parse(this.env?.NEXUS_PLATFORM_BUDGET_TEST_CAPS || "{}"); }
    catch { throw new Error("TEST_CAPS_INVALID"); }
    const result = { ...DEFAULT_CAPS, ...override };
    for (const [key, value] of Object.entries(result)) {
      safeInteger(value, "cap_" + key, 1);
    }
    return result;
  }

  #day(now) { return new Date(now * 1000).toISOString().slice(0, 10); }

  #ensureDay(day) {
    const zero = empty();
    const control = {
      budget_rpc_requests: 0, budget_duration_milli_gb_seconds: 0,
      budget_sqlite_rows_read: 0, budget_sqlite_rows_written: 0,
      budget_storage_bytes: 0
    };
    this.sql.exec(
      "INSERT OR IGNORE INTO platform_budget_daily (utc_day,reserved_json,committed_json,uncertain_json,control_json,next_fencing_token,last_event_seq,last_event_hash,updated_at_epoch) VALUES (?,?,?,?,?,0,0,?,?)",
      day, json(zero), json(zero), json(zero), json(control), ZERO_HASH, Math.floor(Date.now() / 1000)
    );
    return this.#readDay(day);
  }

  #readDay(day) {
    const row = this.sql.exec("SELECT * FROM platform_budget_daily WHERE utc_day=?", day).toArray()[0];
    if (!row) throw new Error("BUDGET_DAY_MISSING");
    return {
      ...row,
      reserved: decode(row.reserved_json),
      committed: decode(row.committed_json),
      uncertain: decode(row.uncertain_json),
      control: decode(row.control_json)
    };
  }

  async #commitEvent(day, eventType, payload, mutate) {
    const before = this.#ensureDay(day);
    const sequence = before.last_event_seq + 1;
    const event = { utcDay: day, sequence, eventType, payload };
    const eventJson = canonical(event);
    const previousHash = before.last_event_hash || ZERO_HASH;
    const eventHash = await sha256(previousHash + "\n" + eventJson);
    const now = Math.floor(Date.now() / 1000);
    return this.ctx.storage.transactionSync(() => {
      const current = this.#readDay(day);
      if (current.last_event_seq !== before.last_event_seq || current.last_event_hash !== previousHash) {
        throw new Error("BUDGET_EVENT_TAIL_CHANGED");
      }
      const result = mutate(current);
      this.sql.exec(
        "INSERT INTO platform_budget_events (utc_day,sequence,event_type,event_json,previous_hash,event_hash,created_at_epoch) VALUES (?,?,?,?,?,?,?)",
        day, sequence, eventType, eventJson, previousHash, eventHash, now
      );
      this.sql.exec(
        "UPDATE platform_budget_daily SET last_event_seq=?,last_event_hash=?,updated_at_epoch=? WHERE utc_day=?",
        sequence, eventHash, now, day
      );
      return result;
    });
  }

  async #chargeControl(day, callerId, action) {
    const caps = this.#caps();
    const before = this.#ensureDay(day);
    const next = add(before.control, CONTROL_COST);
    for (const [key, value] of Object.entries(next)) {
      if (value > caps[key]) return false;
    }
    await this.#commitEvent(day, "CONTROL_RPC_ACCEPTED", { callerId, action, cost: CONTROL_COST }, current => {
      const control = add(current.control, CONTROL_COST);
      this.sql.exec("UPDATE platform_budget_daily SET control_json=? WHERE utc_day=?", json(control), day);
      return true;
    });
    return true;
  }

  async #authenticate(request, bytes) {
    const callerId = request.headers.get("x-nexus-budget-caller-id") || "";
    const timestampText = request.headers.get("x-nexus-budget-timestamp") || "";
    const nonce = request.headers.get("x-nexus-budget-nonce") || "";
    const signatureText = request.headers.get("x-nexus-budget-signature") || "";
    let keys, policies;
    try {
      keys = JSON.parse(this.env?.NEXUS_PLATFORM_BUDGET_CALLER_KEYS || "{}");
      policies = JSON.parse(this.env?.NEXUS_PLATFORM_BUDGET_CALLER_POLICIES || "{}");
    } catch { return { ok: false, status: 503, reason: "CALLER_REGISTRY_INVALID" }; }
    const secret = keys[callerId];
    if (typeof secret !== "string" || secret.length < 32) return { ok: false, status: 401, reason: "CALLER_UNKNOWN" };
    if (!/^\d{1,12}$/.test(timestampText) || !/^[A-Za-z0-9._:-]{16,128}$/.test(nonce)) {
      return { ok: false, status: 401, reason: "AUTH_HEADERS_INVALID" };
    }
    const timestamp = Number(timestampText);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 30) {
      return { ok: false, status: 401, reason: "AUTH_TIMESTAMP_OUT_OF_RANGE" };
    }
    let signature;
    try {
      if (signatureText.length < 16 || signatureText.length > 256) throw new Error("signature length");
      const binary = atob(signatureText);
      signature = Uint8Array.from(binary, char => char.charCodeAt(0));
    } catch { return { ok: false, status: 401, reason: "AUTH_SIGNATURE_ENCODING_INVALID" }; }
    const bodyDigest = await crypto.subtle.digest("SHA-256", bytes);
    const bodyHash = Array.from(new Uint8Array(bodyDigest), byte => byte.toString(16).padStart(2, "0")).join("");
    const canonicalMessage = [callerId, timestampText, nonce, "POST", "/rpc", bodyHash].join("\n");
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(canonicalMessage));
    if (!valid) return { ok: false, status: 401, reason: "AUTH_SIGNATURE_MISMATCH" };
    const allowed = policies[callerId];
    if (!Array.isArray(allowed)) return { ok: false, status: 403, reason: "CALLER_POLICY_MISSING" };
    return { ok: true, callerId, allowed };
  }

  #consumeNonce(callerId, nonce, now) {
    return this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM platform_budget_nonces WHERE expires_at_epoch < ?", now);
      try {
        this.sql.exec(
          "INSERT INTO platform_budget_nonces (caller_id,nonce,expires_at_epoch) VALUES (?,?,?)",
          callerId, nonce, now + 120
        );
        return true;
      } catch {
        return false;
      }
    });
  }

  #validateEnvelope(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("INPUT_OBJECT_REQUIRED");
    if (input.projectId !== "P10CR" || input.taskId !== "P59-003" || !["P59.60", "P59.61"].includes(input.phaseId)) {
      throw new TypeError("PROJECT_TASK_PHASE_NOT_AUTHORIZED");
    }
    validId(input.workflowRunId, "workflow_run_id");
    validId(input.executionId, "execution_id");
    if (input.operationId !== OPERATION_ID) throw new TypeError("OPERATION_NOT_REGISTERED");
    if (this.#testMode()) {
      if (input.repository !== CANONICAL_REPOSITORY &&
          !/^synthetic-org\/p10cr-shadow-repo-[ab]$/.test(input.repository || "")) {
        throw new TypeError("SYNTHETIC_REPOSITORY_NOT_AUTHORIZED");
      }
    } else if (input.repository !== CANONICAL_REPOSITORY) {
      throw new TypeError("REPOSITORY_NOT_AUTHORIZED");
    }
    const identity = {
      projectId: input.projectId, repository: input.repository,
      taskId: input.taskId, phaseId: input.phaseId,
      executionId: input.executionId, operationId: input.operationId
    };
    return {
      ...identity,
      workflowRunId: input.workflowRunId,
      idempotencyKey: [
        identity.projectId, identity.repository, identity.taskId,
        identity.phaseId, identity.executionId, identity.operationId
      ].join("|")
    };
  }

  async #reserve(input, callerId, day) {
    const identity = this.#validateEnvelope(input);
    const fingerprint = await sha256(canonical({
      projectId: identity.projectId,
      repository: identity.repository,
      taskId: identity.taskId,
      phaseId: identity.phaseId,
      executionId: identity.executionId,
      operationId: identity.operationId
    }));
    const existing = this.sql.exec(
      "SELECT * FROM platform_budget_reservations WHERE idempotency_key=?",
      identity.idempotencyKey
    ).toArray()[0];
    if (existing) {
      if (existing.request_fingerprint !== fingerprint) return { status: "IDEMPOTENCY_CONFLICT" };
      return {
        status: "DUPLICATE_RESERVATION", reservationId: existing.reservation_id,
        fencingToken: existing.fencing_token, leaseVersion: existing.lease_version,
        reservationStatus: existing.status, originalWorkflowRunId: existing.workflow_run_id
      };
    }

    const caps = this.#caps();
    const current = this.#ensureDay(day);
    for (const [resource, cost] of Object.entries(TASK_COST)) {
      const used = (current.reserved[resource] || 0) +
        (current.committed[resource] || 0) + (current.uncertain[resource] || 0);
      if (used + cost > caps[resource]) {
        return { status: "WAITING_FOR_BUDGET", resource, remaining: Math.max(0, caps[resource] - used) };
      }
    }
    const reservationId = crypto.randomUUID();
    const fencingToken = current.next_fencing_token + 1;
    const now = Math.floor(Date.now() / 1000);
    const leaseSeconds = this.#testMode()
      ? safeInteger(Number(this.env?.NEXUS_PLATFORM_BUDGET_TEST_LEASE_SECONDS || 60), "test_lease_seconds", 1, 60)
      : 60;
    const expiresAt = now + leaseSeconds;
    const hardDeadline = now + 300;

    return await this.#commitEvent(day, "RESERVATION_CREATED", {
      reservationId, idempotencyKey: identity.idempotencyKey,
      projectId: identity.projectId, repository: identity.repository,
      workflowRunId: identity.workflowRunId, taskId: identity.taskId,
      phaseId: identity.phaseId, executionId: identity.executionId,
      operationId: identity.operationId, costs: TASK_COST, fencingToken
    }, latest => {
      const reserved = add(latest.reserved, TASK_COST);
      this.sql.exec(
        "UPDATE platform_budget_daily SET reserved_json=?,next_fencing_token=? WHERE utc_day=?",
        json(reserved), fencingToken, day
      );
      this.sql.exec(
        `INSERT INTO platform_budget_reservations (
          reservation_id,utc_day,idempotency_key,request_fingerprint,caller_id,
          project_id,repository,workflow_run_id,task_id,phase_id,execution_id,
          operation_id,costs_json,status,created_at_epoch,expires_at_epoch,
          hard_deadline_epoch,fencing_token,lease_version
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        reservationId, day, identity.idempotencyKey, fingerprint, callerId,
        identity.projectId, identity.repository, identity.workflowRunId,
        identity.taskId, identity.phaseId, identity.executionId, identity.operationId,
        json(TASK_COST), "RESERVED", now, expiresAt, hardDeadline, fencingToken, 1
      );
      return {
        status: "RESERVED", reservationId, fencingToken, leaseVersion: 1,
        expiresAtEpoch: expiresAt, costs: TASK_COST, idempotencyKey: identity.idempotencyKey
      };
    });
  }

  async #markExpired(row, day, now) {
    const costs = decode(row.costs_json);
    return await this.#commitEvent(day, "RESERVATION_EXPIRED_UNCERTAIN", {
      reservationId: row.reservation_id, fencingToken: row.fencing_token,
      previousLeaseVersion: row.lease_version
    }, current => {
      const reserved = move(current.reserved, costs);
      const uncertain = add(current.uncertain, costs);
      this.sql.exec(
        "UPDATE platform_budget_daily SET reserved_json=?,uncertain_json=? WHERE utc_day=?",
        json(reserved), json(uncertain), day
      );
      this.sql.exec(
        "UPDATE platform_budget_reservations SET status='UNCERTAIN',outcome='LEASE_EXPIRED',settled_at_epoch=? WHERE reservation_id=?",
        now, row.reservation_id
      );
      return { status: "LEASE_EXPIRED_UNCERTAIN", reservationId: row.reservation_id };
    });
  }

  async #heartbeat(input, callerId, day, now) {
    const reservationId = validId(input?.reservationId, "reservation_id");
    const fencingToken = safeInteger(input?.fencingToken, "fencing_token", 1);
    const leaseVersion = safeInteger(input?.leaseVersion, "lease_version", 1);
    const row = this.sql.exec("SELECT * FROM platform_budget_reservations WHERE reservation_id=?", reservationId).toArray()[0];
    if (!row || row.caller_id !== callerId) return { status: "RESERVATION_NOT_FOUND" };
    if (row.utc_day !== day) {
      if (row.status === "RESERVED") return await this.#markExpired(row, row.utc_day, now);
      return { status: "RESERVATION_NOT_ACTIVE", reservationStatus: row.status };
    }
    if (row.status !== "RESERVED") return { status: "RESERVATION_NOT_ACTIVE", reservationStatus: row.status };
    if (row.fencing_token !== fencingToken || row.lease_version !== leaseVersion) return { status: "STALE_FENCE_REJECTED" };
    if (row.expires_at_epoch <= now) return await this.#markExpired(row, day, now);
    const nextExpiry = Math.min(now + 120, row.hard_deadline_epoch);
    if (nextExpiry <= row.expires_at_epoch) return { status: "LEASE_UNCHANGED", expiresAtEpoch: row.expires_at_epoch };
    const nextVersion = row.lease_version + 1;
    return await this.#commitEvent(day, "RESERVATION_HEARTBEAT", {
      reservationId, fencingToken, previousLeaseVersion: leaseVersion,
      nextLeaseVersion: nextVersion, expiresAtEpoch: nextExpiry
    }, () => {
      this.sql.exec(
        "UPDATE platform_budget_reservations SET expires_at_epoch=?,lease_version=? WHERE reservation_id=?",
        nextExpiry, nextVersion, reservationId
      );
      return { status: "LEASE_RENEWED", reservationId, fencingToken, leaseVersion: nextVersion, expiresAtEpoch: nextExpiry };
    });
  }

  async #settle(input, callerId, day, now) {
    const reservationId = validId(input?.reservationId, "reservation_id");
    const fencingToken = safeInteger(input?.fencingToken, "fencing_token", 1);
    const leaseVersion = safeInteger(input?.leaseVersion, "lease_version", 1);
    const outcome = input?.outcome;
    const evidenceHash = input?.evidenceHash;
    if (!["COMPLETED", "FAILED", "UNCERTAIN"].includes(outcome)) throw new TypeError("SETTLEMENT_OUTCOME_INVALID");
    if (typeof evidenceHash !== "string" || !HASH.test(evidenceHash)) throw new TypeError("SETTLEMENT_EVIDENCE_HASH_INVALID");
    const row = this.sql.exec("SELECT * FROM platform_budget_reservations WHERE reservation_id=?", reservationId).toArray()[0];
    if (!row || row.caller_id !== callerId) return { status: "RESERVATION_NOT_FOUND" };
    if (row.utc_day !== day) {
      if (row.status === "RESERVED") return await this.#markExpired(row, row.utc_day, now);
      return { status: "RESERVATION_NOT_ACTIVE", reservationStatus: row.status };
    }
    if (row.status === "SETTLED" || row.status === "UNCERTAIN") {
      if (row.outcome === outcome && row.evidence_hash === evidenceHash) {
        return { status: "SETTLEMENT_ALREADY_APPLIED", reservationId, reservationStatus: row.status };
      }
      return { status: "SETTLEMENT_CONFLICT" };
    }
    if (row.status !== "RESERVED") return { status: "RESERVATION_NOT_ACTIVE" };
    if (row.fencing_token !== fencingToken || row.lease_version !== leaseVersion) return { status: "STALE_FENCE_REJECTED" };
    if (row.expires_at_epoch <= now) return await this.#markExpired(row, day, now);
    const costs = decode(row.costs_json);
    const target = outcome === "UNCERTAIN" ? "uncertain" : "committed";
    return await this.#commitEvent(day, "RESERVATION_SETTLED", {
      reservationId, fencingToken, leaseVersion, outcome, evidenceHash, costs
    }, current => {
      const reserved = move(current.reserved, costs);
      const committed = target === "committed" ? add(current.committed, costs) : current.committed;
      const uncertain = target === "uncertain" ? add(current.uncertain, costs) : current.uncertain;
      this.sql.exec(
        "UPDATE platform_budget_daily SET reserved_json=?,committed_json=?,uncertain_json=? WHERE utc_day=?",
        json(reserved), json(committed), json(uncertain), day
      );
      this.sql.exec(
        "UPDATE platform_budget_reservations SET status=?,outcome=?,evidence_hash=?,settled_at_epoch=? WHERE reservation_id=?",
        target === "committed" ? "SETTLED" : "UNCERTAIN",
        outcome, evidenceHash, now, reservationId
      );
      return {
        status: target === "committed" ? "SETTLED" : "UNCERTAIN",
        reservationId, outcome, fencingToken, leaseVersion, costsRetained: true
      };
    });
  }

  async #testAction(input, day, now) {
    if (!this.#testMode()) return { status: "REJECTED", reason: "TEST_ACTION_DISABLED" };
    if (input?.action === "reset") {
      this.ctx.storage.transactionSync(() => {
        this.sql.exec("DELETE FROM platform_budget_reservations");
        this.sql.exec("DELETE FROM platform_budget_events");
        this.sql.exec("DELETE FROM platform_budget_nonces");
        this.sql.exec("DELETE FROM platform_budget_daily");
      });
      this.#ensureDay(day);
      return { status: "TEST_RESET" };
    }
    if (input?.action === "expire") {
      const reservationId = validId(input.reservationId, "reservation_id");
      const row = this.sql.exec(
        "SELECT * FROM platform_budget_reservations WHERE reservation_id=? AND utc_day=? AND status='RESERVED'",
        reservationId, day
      ).toArray()[0];
      if (!row) return { status: "TEST_RESERVATION_NOT_FOUND" };
      return await this.#commitEvent(day, "TEST_RESERVATION_EXPIRED", { reservationId }, () => {
        this.sql.exec(
          "UPDATE platform_budget_reservations SET expires_at_epoch=? WHERE reservation_id=? AND utc_day=? AND status='RESERVED'",
          now - 1, reservationId, day
        );
        return { status: "TEST_EXPIRED", reservationId };
      });
    }
    return { status: "REJECTED", reason: "TEST_ACTION_UNKNOWN" };
  }

  async #snapshot(day) {
    const current = this.#ensureDay(day);
    const rows = this.sql.exec(
      "SELECT * FROM platform_budget_reservations WHERE utc_day=? ORDER BY created_at_epoch,reservation_id",
      day
    ).toArray();
    const events = this.sql.exec(
      "SELECT * FROM platform_budget_events WHERE utc_day=? ORDER BY sequence",
      day
    ).toArray();
    let previous = ZERO_HASH;
    let valid = true;
    for (const event of events) {
      if (event.previous_hash !== previous || await sha256(previous + "\n" + event.event_json) !== event.event_hash) {
        valid = false;
        break;
      }
      previous = event.event_hash;
    }
    if (previous !== current.last_event_hash || events.length !== current.last_event_seq) valid = false;
    return {
      status: valid ? "SNAPSHOT" : "EVENT_CHAIN_INVALID",
      utcDay: day,
      caps: this.#caps(),
      reserved: current.reserved,
      committed: current.committed,
      uncertain: current.uncertain,
      control: current.control,
      reservations: rows.map(row => ({
        reservationId: row.reservation_id, repository: row.repository,
        workflowRunId: row.workflow_run_id, executionId: row.execution_id,
        status: row.status, outcome: row.outcome, fencingToken: row.fencing_token,
        leaseVersion: row.lease_version, expiresAtEpoch: row.expires_at_epoch,
        costs: decode(row.costs_json)
      })),
      eventCount: events.length,
      lastEventHash: current.last_event_hash,
      eventChainValid: valid
    };
  }

  async fetch(request) {
    if (request.method !== "POST") return response(405, { status: "REJECTED", reason: "POST_REQUIRED" });
    if (new URL(request.url).pathname !== "/rpc") return response(404, { status: "NOT_FOUND" });
    if (this.env?.NEXUS_PLATFORM_BUDGET_ENABLED !== "true") {
      return response(503, { status: "WAITING_FOR_BUDGET", reason: "PLATFORM_BUDGET_DISABLED" });
    }
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > 8192) return response(413, { status: "REJECTED", reason: "BODY_TOO_LARGE" });
    let bytes;
    try {
      const reader = request.body?.getReader();
      if (!reader) return response(400, { status: "REJECTED", reason: "BODY_UNAVAILABLE" });
      const chunks = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 8192) {
          try { await reader.cancel(); } catch {}
          return response(413, { status: "REJECTED", reason: "BODY_TOO_LARGE" });
        }
        chunks.push(part.value);
      }
      bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    } catch { return response(400, { status: "REJECTED", reason: "BODY_READ_FAILED" }); }

    const auth = await this.#authenticate(request, bytes);
    if (!auth.ok) return response(auth.status, { status: "REJECTED", reason: auth.reason });
    let body;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return response(400, { status: "REJECTED", reason: "INVALID_JSON" }); }
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        typeof body.action !== "string" || !body.input || typeof body.input !== "object" || Array.isArray(body.input)) {
      return response(400, { status: "REJECTED", reason: "ACTION_AND_INPUT_REQUIRED" });
    }
    if (!auth.allowed.includes(body.action)) return response(403, { status: "REJECTED", reason: "CALLER_ACTION_FORBIDDEN" });

    return await this.ctx.blockConcurrencyWhile(async () => {
      const now = Math.floor(Date.now() / 1000);
      if (!this.#consumeNonce(auth.callerId, request.headers.get("x-nexus-budget-nonce"), now)) {
        return response(401, { status: "REJECTED", reason: "AUTH_NONCE_REPLAYED" });
      }
      const day = this.#day(now);
      if (body.action === "testReset" || body.action === "testExpire") {
        const result = await this.#testAction({
          action: body.action === "testReset" ? "reset" : "expire",
          reservationId: body.input.reservationId
        }, day, now);
        return response(200, result);
      }
      if (!(await this.#chargeControl(day, auth.callerId, body.action))) {
        return response(429, { status: "WAITING_FOR_BUDGET", reason: "CONTROL_PLANE_BUDGET_EXHAUSTED" });
      }
      try {
        let result;
        switch (body.action) {
          case "reserve": result = await this.#reserve(body.input, auth.callerId, day); break;
          case "heartbeat": result = await this.#heartbeat(body.input, auth.callerId, day, now); break;
          case "settle": result = await this.#settle(body.input, auth.callerId, day, now); break;
          case "snapshot": result = await this.#snapshot(day); break;
          default: result = { status: "REJECTED", reason: "ACTION_NOT_SUPPORTED" };
        }
        const status = result.status === "WAITING_FOR_BUDGET" ? 429 :
          result.status === "REJECTED" || result.status === "IDEMPOTENCY_CONFLICT" ||
          result.status === "SETTLEMENT_CONFLICT" ? 409 : 200;
        return response(status, result);
      } catch (error) {
        const reason = String(error?.message || "PLATFORM_BUDGET_FAILURE").slice(0, 128);
        return response(400, { status: "REJECTED", reason });
      }
    });
  }
}
