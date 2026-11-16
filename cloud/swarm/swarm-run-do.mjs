/**
 * Phase 59.53 — project-cell durable swarm task/run ledger.
 *
 * This ledger is intentionally separate from QuotaLedgerDO. It stores task
 * identity, ownership approvals, worker leases, fencing tokens, checkpoints,
 * terminal outcomes and an append-only SHA-256 event chain. It never executes
 * task payloads or calls external providers.
 */
import { DurableObject } from "cloudflare:workers";

const encoder = new TextEncoder();
const MAX_BODY_BYTES = 65536;
const MAX_CHECKPOINT_BYTES = 16384;
const MAX_RESULT_BYTES = 16384;
const MAX_CLOCK_SKEW_SECONDS = 30;

function json(status, body) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
function text(value, field, max = 128) {
  if (typeof value !== "string" || value.length < 1 || value.length > max) throw new TypeError(`invalid ${field}`);
  return value;
}
function safeId(value, field, max = 128) {
  text(value, field, max);
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) throw new TypeError(`unsafe ${field}`);
  return value;
}
function hashText(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new TypeError("invalid SHA-256 digest");
  return value;
}
function canonical(value) { return JSON.stringify(value); }
function hex(bytes) { return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, "0")).join(""); }
function fromBase64(value) {
  if (typeof value !== "string" || value.length < 16 || value.length > 256) throw new TypeError("invalid signature encoding");
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
async function sha256(value) { return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value))); }
function parseJsonObject(value, field, maxBytes) {
  const serialized = canonical(value);
  if (encoder.encode(serialized).byteLength > maxBytes) throw new TypeError(`${field} exceeds size limit`);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} must be an object`);
  return serialized;
}

export class SwarmRunDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    const sql = ctx.storage.sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS swarm_run_meta (singleton INTEGER PRIMARY KEY CHECK(singleton=1), last_seq INTEGER NOT NULL, last_hash TEXT NOT NULL)`);
    sql.exec("INSERT OR IGNORE INTO swarm_run_meta(singleton,last_seq,last_hash) VALUES(1,0,'GENESIS')");
    sql.exec(`CREATE TABLE IF NOT EXISTS swarm_tasks (
      task_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_type TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL, policy_hash TEXT NOT NULL,
      owner_gate INTEGER NOT NULL, owner_approved_at INTEGER, owner_approved_by TEXT,
      status TEXT NOT NULL, attempts INTEGER NOT NULL, max_attempts INTEGER NOT NULL,
      next_attempt_at INTEGER NOT NULL, last_fencing_token INTEGER NOT NULL DEFAULT 0, result_json TEXT, result_hash TEXT, result_run_id TEXT, last_error TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    )`);
    const taskColumns = sql.exec("PRAGMA table_info(swarm_tasks)").toArray();
    if (!taskColumns.some(column => column.name === "last_fencing_token")) {
      sql.exec("ALTER TABLE swarm_tasks ADD COLUMN last_fencing_token INTEGER NOT NULL DEFAULT 0");
    }
    if (!taskColumns.some(column => column.name === "result_run_id")) {
      sql.exec("ALTER TABLE swarm_tasks ADD COLUMN result_run_id TEXT");
    }
    sql.exec(`CREATE TABLE IF NOT EXISTS swarm_leases (
      task_id TEXT PRIMARY KEY, run_id TEXT NOT NULL UNIQUE, worker_id TEXT NOT NULL, fencing_token INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, heartbeat_at INTEGER NOT NULL
    )`);
    const leaseColumns = sql.exec("PRAGMA table_info(swarm_leases)").toArray();
    if (!leaseColumns.some(column => column.name === "run_id")) {
      sql.exec("ALTER TABLE swarm_leases ADD COLUMN run_id TEXT NOT NULL DEFAULT ''");
      sql.exec("UPDATE swarm_leases SET run_id='legacy:' || task_id || ':' || fencing_token WHERE run_id=''");
    }
    sql.exec("CREATE UNIQUE INDEX IF NOT EXISTS swarm_leases_run_id_unique ON swarm_leases(run_id)");
    sql.exec(`CREATE TABLE IF NOT EXISTS swarm_checkpoints (
      task_id TEXT PRIMARY KEY, checkpoint_seq INTEGER NOT NULL, checkpoint_json TEXT NOT NULL,
      checkpoint_hash TEXT NOT NULL, run_id TEXT NOT NULL, fencing_token INTEGER NOT NULL, updated_at INTEGER NOT NULL
    )`);
    const checkpointColumns = sql.exec("PRAGMA table_info(swarm_checkpoints)").toArray();
    if (!checkpointColumns.some(column => column.name === "run_id")) {
      sql.exec("ALTER TABLE swarm_checkpoints ADD COLUMN run_id TEXT NOT NULL DEFAULT 'LEGACY'");
    }
    sql.exec(`CREATE TABLE IF NOT EXISTS swarm_events (
      seq INTEGER PRIMARY KEY, event_id TEXT NOT NULL UNIQUE, task_id TEXT NOT NULL,
      event_type TEXT NOT NULL, payload_json TEXT NOT NULL, prev_hash TEXT NOT NULL,
      event_hash TEXT NOT NULL, created_at INTEGER NOT NULL
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS swarm_auth_nonces (caller_id TEXT NOT NULL, nonce TEXT NOT NULL, expires_at INTEGER NOT NULL, PRIMARY KEY(caller_id,nonce))`);
  }

  async fetch(request) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/rpc") return json(404, { status: "NOT_FOUND" });
    let bytes;
    try { bytes = new Uint8Array(await request.arrayBuffer()); } catch { return json(400, { status: "REJECTED", reason: "BODY_UNAVAILABLE" }); }
    if (bytes.byteLength < 1 || bytes.byteLength > MAX_BODY_BYTES) return json(413, { status: "REJECTED", reason: "BODY_SIZE_INVALID" });
    const auth = await this.#authenticate(request, bytes);
    if (!auth.ok) return json(auth.status, { status: "REJECTED", reason: auth.reason });
    if (this.env?.NEXUS_SWARM_RUN_ENABLED !== "true") return json(503, { status: "WAITING_FOR_OWNER_CONFIGURATION", reason: "SWARM_RUN_LEDGER_DISABLED" });
    let body;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return json(400, { status: "REJECTED", reason: "INVALID_JSON" }); }
    const input = body?.input;
    if (!input || typeof input !== "object" || Array.isArray(input)) return json(400, { status: "REJECTED", reason: "INPUT_OBJECT_REQUIRED" });
    let policies;
    try { policies = JSON.parse(this.env?.NEXUS_SWARM_RUN_CALLER_POLICIES || "{}"); } catch { return json(503, { status: "REJECTED", reason: "CALLER_POLICY_REGISTRY_INVALID" }); }
    if (!Array.isArray(policies?.[auth.callerId]) || !policies[auth.callerId].includes(body.action)) return json(403, { status: "REJECTED", reason: "CALLER_ACTION_FORBIDDEN" });
    try {
      let result;
      switch (body.action) {
        case "register": result = await this.#register(input, auth.callerId); break;
        case "approve":
          if (auth.callerId !== "primary") throw new Error("only primary caller may approve owner-gated tasks");
          result = await this.#approve(input, auth.callerId); break;
        case "claim": result = await this.#claim(input, auth.callerId); break;
        case "heartbeat": result = await this.#heartbeat(input, auth.callerId); break;
        case "checkpoint": result = await this.#checkpoint(input, auth.callerId); break;
        case "complete": result = await this.#complete(input, auth.callerId); break;
        case "fail": result = await this.#fail(input, auth.callerId); break;
        case "recover":
          if (auth.callerId !== "primary") throw new Error("only primary caller may recover expired leases");
          result = await this.#recover(); break;
        case "snapshot": result = await this.#snapshot(input); break;
        default: return json(400, { status: "REJECTED", reason: "UNKNOWN_ACTION" });
      }
      return json(200, result);
    } catch (error) {
      return json(400, { status: "REJECTED", error: { name: error?.name || "Error", message: String(error?.message || error) } });
    }
  }

  async #authenticate(request, bytes) {
    const callerId = request.headers.get("x-nexus-caller-id") || "";
    const timestampText = request.headers.get("x-nexus-timestamp") || "";
    const nonce = request.headers.get("x-nexus-nonce") || "";
    const signatureText = request.headers.get("x-nexus-signature") || "";
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(callerId)) return { ok: false, status: 401, reason: "UNAUTHENTICATED_CALLER" };
    if (!/^\d{1,12}$/.test(timestampText) || !/^[A-Za-z0-9._:-]{16,128}$/.test(nonce)) return { ok: false, status: 401, reason: "AUTH_HEADERS_INVALID" };
    const timestamp = Number(timestampText), now = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > MAX_CLOCK_SKEW_SECONDS) return { ok: false, status: 401, reason: "AUTH_TIMESTAMP_OUT_OF_RANGE" };
    let keys;
    try { keys = JSON.parse(this.env?.NEXUS_SWARM_RUN_CALLER_KEYS || "{}"); } catch { return { ok: false, status: 503, reason: "CALLER_KEY_REGISTRY_INVALID" }; }
    const secret = keys?.[callerId];
    if (typeof secret !== "string" || secret.length < 32 || secret.length > 512) return { ok: false, status: 401, reason: "CALLER_NOT_CONFIGURED" };
    let supplied;
    try { supplied = fromBase64(signatureText); } catch { return { ok: false, status: 401, reason: "SIGNATURE_INVALID" }; }
    const digest = hex(await crypto.subtle.digest("SHA-256", bytes));
    const canonicalText = [callerId, timestampText, nonce, "POST", "/rpc", digest].join("\n");
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("HMAC", key, supplied, encoder.encode(canonicalText))) return { ok: false, status: 401, reason: "SIGNATURE_MISMATCH" };
    const inserted = this.ctx.storage.transactionSync(() => {
      const existing = this.ctx.storage.sql.exec("SELECT expires_at FROM swarm_auth_nonces WHERE caller_id=? AND nonce=?", callerId, nonce).toArray()[0];
      if (existing) return false;
      this.ctx.storage.sql.exec("DELETE FROM swarm_auth_nonces WHERE expires_at < ?", now);
      this.ctx.storage.sql.exec("INSERT INTO swarm_auth_nonces(caller_id,nonce,expires_at) VALUES(?,?,?)", callerId, nonce, now + 120);
      return true;
    });
    return inserted ? { ok: true, callerId } : { ok: false, status: 409, reason: "AUTH_REPLAY_DETECTED" };
  }

  #head() { return this.ctx.storage.sql.exec("SELECT last_seq,last_hash FROM swarm_run_meta WHERE singleton=1").toArray()[0]; }
  async #commitEvent(taskId, eventType, payload, mutate) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const head = this.#head();
      const seq = head.last_seq + 1;
      const createdAt = Math.floor(Date.now() / 1000);
      const eventId = crypto.randomUUID();
      const payloadJson = canonical(payload);
      const material = canonical({ seq, eventId, taskId, eventType, payload: JSON.parse(payloadJson), prevHash: head.last_hash, createdAt });
      const eventHash = await sha256(material);
      const committed = this.ctx.storage.transactionSync(() => {
        const current = this.#head();
        if (current.last_seq !== head.last_seq || current.last_hash !== head.last_hash) return { retry: true };
        const result = mutate();
        if (result?.skipEvent === true) return { retry: false, result: result.value };
        this.ctx.storage.sql.exec("INSERT INTO swarm_events(seq,event_id,task_id,event_type,payload_json,prev_hash,event_hash,created_at) VALUES(?,?,?,?,?,?,?,?)", seq, eventId, taskId, eventType, payloadJson, head.last_hash, eventHash, createdAt);
        this.ctx.storage.sql.exec("UPDATE swarm_run_meta SET last_seq=?,last_hash=? WHERE singleton=1", seq, eventHash);
        return { retry: false, result };
      });
      if (!committed.retry) return committed.result;
    }
    throw new Error("SWARM_EVENT_HEAD_CONTENTION_RETRY_EXHAUSTED");
  }

  async #register(input) {
    const taskId = safeId(input.taskId, "taskId");
    const projectId = safeId(input.projectId, "projectId", 64);
    if (projectId !== "P10CR") throw new Error("PROJECT_CELL_IDENTITY_MISMATCH");
    const taskType = safeId(input.taskType, "taskType", 96);
    const idempotencyKey = safeId(input.idempotencyKey, "idempotencyKey");
    const payloadHash = hashText(input.payloadHash);
    const policyHash = hashText(input.policyHash);
    if (typeof input.ownerGate !== "boolean") throw new TypeError("ownerGate must be boolean");
    const maxAttempts = input.maxAttempts ?? 3;
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new TypeError("maxAttempts must be 1..10");
    const now = Math.floor(Date.now() / 1000);
    const existing = this.ctx.storage.sql.exec("SELECT * FROM swarm_tasks WHERE task_id=? OR idempotency_key=?", taskId, idempotencyKey).toArray()[0];
    if (existing) {
      const same = existing.task_id === taskId && existing.project_id === projectId && existing.task_type === taskType && existing.idempotency_key === idempotencyKey && existing.payload_hash === payloadHash && existing.policy_hash === policyHash && Boolean(existing.owner_gate) === input.ownerGate && existing.max_attempts === maxAttempts;
      if (!same) throw new Error("TASK_IDEMPOTENCY_CONFLICT");
      return { status: "DUPLICATE_TASK", taskId, taskStatus: existing.status };
    }
    return this.#commitEvent(taskId, "TASK_REGISTERED", { projectId, taskType, idempotencyKey, payloadHash, policyHash, ownerGate: input.ownerGate, maxAttempts }, () => {
      const collision = this.ctx.storage.sql.exec("SELECT task_id FROM swarm_tasks WHERE task_id=? OR idempotency_key=?", taskId, idempotencyKey).toArray()[0];
      if (collision) throw new Error("TASK_IDEMPOTENCY_CONFLICT");
      this.ctx.storage.sql.exec(`INSERT INTO swarm_tasks(task_id,project_id,task_type,idempotency_key,payload_hash,policy_hash,owner_gate,status,attempts,max_attempts,next_attempt_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'READY',0,?,?,?,?)`, taskId, projectId, taskType, idempotencyKey, payloadHash, policyHash, input.ownerGate ? 1 : 0, maxAttempts, now, now, now);
      return { status: "REGISTERED", taskId, taskStatus: "READY" };
    });
  }

  async #approve(input, callerId) {
    const taskId = safeId(input.taskId, "taskId");
    const task = this.#task(taskId);
    if (!task) throw new Error("TASK_NOT_FOUND");
    if (!task.owner_gate) return { status: "NOT_REQUIRED", taskId };
    if (task.owner_approved_at !== null) return { status: "ALREADY_APPROVED", taskId, approvedBy: task.owner_approved_by };
    const now = Math.floor(Date.now() / 1000);
    return this.#commitEvent(taskId, "OWNER_APPROVAL_RECORDED", { taskId, approvedBy: callerId }, () => {
      const current = this.#task(taskId);
      if (current.owner_approved_at !== null) return { skipEvent: true, value: { status: "ALREADY_APPROVED", taskId, approvedBy: current.owner_approved_by } };
      this.ctx.storage.sql.exec("UPDATE swarm_tasks SET owner_approved_at=?,owner_approved_by=?,updated_at=? WHERE task_id=?", now, callerId, now, taskId);
      return { status: "APPROVED", taskId, approvedBy: callerId };
    });
  }

  async #claim(input) {
    const taskId = safeId(input.taskId, "taskId");
    const workerId = safeId(input.workerId, "workerId");
    const leaseSeconds = input.leaseSeconds ?? 30;
    if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 300) throw new TypeError("leaseSeconds must be 1..300");
    const task = this.#task(taskId);
    if (!task) return { status: "TASK_NOT_FOUND", taskId };
    if (task.owner_gate && task.owner_approved_at === null) return { status: "OWNER_APPROVAL_REQUIRED", taskId };
    if (task.status === "COMPLETED" || task.status === "DEAD_LETTER") return { status: task.status, taskId };
    const now = Math.floor(Date.now() / 1000);
    const oldLease = this.#lease(taskId);
    if (task.status === "LEASED" && oldLease && oldLease.expires_at > now) return { status: "BUSY", taskId, leaseExpiresAt: oldLease.expires_at };
    if (task.status === "READY" && task.next_attempt_at > now) return { status: "BACKOFF", taskId, nextAttemptAt: task.next_attempt_at };
    if (task.status === "LEASED" && task.attempts >= task.max_attempts) {
      return this.#commitEvent(taskId, "TASK_DEAD_LETTERED", { reason: "LEASE_EXPIRED_RETRY_BUDGET_EXHAUSTED", attempts: task.attempts }, () => {
        this.ctx.storage.sql.exec("UPDATE swarm_tasks SET status='DEAD_LETTER',last_error=?,updated_at=? WHERE task_id=?", "LEASE_EXPIRED_RETRY_BUDGET_EXHAUSTED", now, taskId);
        this.ctx.storage.sql.exec("DELETE FROM swarm_leases WHERE task_id=?", taskId);
        return { status: "DEAD_LETTER", taskId };
      });
    }
    const runId = crypto.randomUUID();
    return this.#commitEvent(taskId, "TASK_CLAIMED", { workerId, runId, leaseSeconds, attempt: task.attempts + 1 }, () => {
      const current = this.#task(taskId), lease = this.#lease(taskId);
      const commitNow = Math.floor(Date.now() / 1000);
      if (current.status === "COMPLETED" || current.status === "DEAD_LETTER") return { skipEvent: true, value: { status: current.status, taskId } };
      if (current.owner_gate && current.owner_approved_at === null) return { skipEvent: true, value: { status: "OWNER_APPROVAL_REQUIRED", taskId } };
      if (current.status === "LEASED" && lease && lease.expires_at > commitNow) return { skipEvent: true, value: { status: "BUSY", taskId, leaseExpiresAt: lease.expires_at } };
      if (current.status === "READY" && current.next_attempt_at > commitNow) return { skipEvent: true, value: { status: "BACKOFF", taskId, nextAttemptAt: current.next_attempt_at } };
      const fence = (current.last_fencing_token ?? 0) + 1;
      const expiresAt = commitNow + leaseSeconds;
      this.ctx.storage.sql.exec("UPDATE swarm_tasks SET status='LEASED',attempts=attempts+1,last_fencing_token=?,updated_at=? WHERE task_id=?", fence, commitNow, taskId);
      this.ctx.storage.sql.exec(`INSERT INTO swarm_leases(task_id,run_id,worker_id,fencing_token,expires_at,heartbeat_at) VALUES(?,?,?,?,?,?) ON CONFLICT(task_id) DO UPDATE SET run_id=excluded.run_id,worker_id=excluded.worker_id,fencing_token=excluded.fencing_token,expires_at=excluded.expires_at,heartbeat_at=excluded.heartbeat_at`, taskId, runId, workerId, fence, expiresAt, commitNow);
      return { status: "CLAIMED", taskId, runId, workerId, fencingToken: fence, leaseExpiresAt: expiresAt, attempt: current.attempts + 1 };
    });
  }

  async #heartbeat(input) {
    const taskId = safeId(input.taskId, "taskId"), workerId = safeId(input.workerId, "workerId");
    const fencingToken = input.fencingToken, runId = safeId(input.runId, "runId");
    if (!Number.isSafeInteger(fencingToken) || fencingToken < 1) throw new TypeError("invalid fencingToken");
    const leaseSeconds = input.leaseSeconds ?? 30;
    if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 300) throw new TypeError("leaseSeconds must be 1..300");
    const now = Math.floor(Date.now() / 1000), lease = this.#lease(taskId);
    this.#assertLease(taskId, workerId, fencingToken, runId, now, lease);
    return this.#commitEvent(taskId, "LEASE_HEARTBEAT", { workerId, runId, fencingToken, leaseSeconds }, () => {
      const commitNow = Math.floor(Date.now() / 1000);
      this.#assertLease(taskId, workerId, fencingToken, runId, commitNow, this.#lease(taskId));
      const expiresAt = commitNow + leaseSeconds;
      this.ctx.storage.sql.exec("UPDATE swarm_leases SET expires_at=?,heartbeat_at=? WHERE task_id=?", expiresAt, commitNow, taskId);
      this.ctx.storage.sql.exec("UPDATE swarm_tasks SET updated_at=? WHERE task_id=?", commitNow, taskId);
      return { status: "HEARTBEAT_RECORDED", taskId, fencingToken, leaseExpiresAt: expiresAt };
    });
  }

  async #checkpoint(input) {
    const taskId = safeId(input.taskId, "taskId"), workerId = safeId(input.workerId, "workerId");
    const fencingToken = input.fencingToken, checkpointSeq = input.checkpointSeq, runId = safeId(input.runId, "runId");
    if (!Number.isSafeInteger(fencingToken) || fencingToken < 1 || !Number.isSafeInteger(checkpointSeq) || checkpointSeq < 1) throw new TypeError("invalid checkpoint sequence or fencing token");
    const checkpointJson = parseJsonObject(input.checkpoint, "checkpoint", MAX_CHECKPOINT_BYTES);
    const checkpointHash = await sha256(checkpointJson);
    const now = Math.floor(Date.now() / 1000);
    this.#assertLease(taskId, workerId, fencingToken, runId, now, this.#lease(taskId));
    const current = this.#checkpointRow(taskId);
    if (current && checkpointSeq === current.checkpoint_seq && checkpointHash === current.checkpoint_hash && current.fencing_token === fencingToken && current.run_id === runId) return { status: "DUPLICATE_CHECKPOINT", taskId, checkpointSeq, checkpointHash };
    if (checkpointSeq !== (current?.checkpoint_seq ?? 0) + 1) throw new Error("CHECKPOINT_SEQUENCE_CONFLICT");
    return this.#commitEvent(taskId, "TASK_CHECKPOINTED", { workerId, runId, fencingToken, checkpointSeq, checkpointHash }, () => {
      this.#assertLease(taskId, workerId, fencingToken, runId, Math.floor(Date.now() / 1000), this.#lease(taskId));
      const latest = this.#checkpointRow(taskId);
      if (checkpointSeq !== (latest?.checkpoint_seq ?? 0) + 1) throw new Error("CHECKPOINT_SEQUENCE_CONFLICT");
      this.ctx.storage.sql.exec(`INSERT INTO swarm_checkpoints(task_id,checkpoint_seq,checkpoint_json,checkpoint_hash,run_id,fencing_token,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(task_id) DO UPDATE SET checkpoint_seq=excluded.checkpoint_seq,checkpoint_json=excluded.checkpoint_json,checkpoint_hash=excluded.checkpoint_hash,run_id=excluded.run_id,fencing_token=excluded.fencing_token,updated_at=excluded.updated_at`, taskId, checkpointSeq, checkpointJson, checkpointHash, runId, fencingToken, now);
      this.ctx.storage.sql.exec("UPDATE swarm_tasks SET updated_at=? WHERE task_id=?", Math.floor(Date.now() / 1000), taskId);
      return { status: "CHECKPOINT_SAVED", taskId, checkpointSeq, checkpointHash, fencingToken };
    });
  }

  async #complete(input) {
    const taskId = safeId(input.taskId, "taskId"), workerId = safeId(input.workerId, "workerId");
    const fencingToken = input.fencingToken;
    if (!Number.isSafeInteger(fencingToken) || fencingToken < 1) throw new TypeError("invalid fencingToken");
    const runId = safeId(input.runId, "runId");
    const resultJson = parseJsonObject(input.result, "result", MAX_RESULT_BYTES), resultHash = await sha256(resultJson);
    const task = this.#task(taskId);
    if (task?.status === "COMPLETED") return task.result_hash === resultHash && task.result_run_id === runId ? { status: "DUPLICATE_COMPLETION", taskId, resultHash } : (() => { throw new Error("TERMINAL_RESULT_CONFLICT"); })();
    const now = Math.floor(Date.now() / 1000);
    this.#assertLease(taskId, workerId, fencingToken, runId, now, this.#lease(taskId));
    return this.#commitEvent(taskId, "TASK_COMPLETED", { workerId, runId, fencingToken, resultHash }, () => {
      const current = this.#task(taskId);
      if (current.status === "COMPLETED") return current.result_hash === resultHash && current.result_run_id === runId ? { skipEvent: true, value: { status: "DUPLICATE_COMPLETION", taskId, resultHash } } : (() => { throw new Error("TERMINAL_RESULT_CONFLICT"); })();
      const commitNow = Math.floor(Date.now() / 1000);
      this.#assertLease(taskId, workerId, fencingToken, runId, commitNow, this.#lease(taskId));
      this.ctx.storage.sql.exec("UPDATE swarm_tasks SET status='COMPLETED',result_json=?,result_hash=?,result_run_id=?,updated_at=? WHERE task_id=?", resultJson, resultHash, runId, commitNow, taskId);
      this.ctx.storage.sql.exec("DELETE FROM swarm_leases WHERE task_id=?", taskId);
      return { status: "COMPLETED", taskId, resultHash };
    });
  }

  async #fail(input) {
    const taskId = safeId(input.taskId, "taskId"), workerId = safeId(input.workerId, "workerId");
    const fencingToken = input.fencingToken;
    if (!Number.isSafeInteger(fencingToken) || fencingToken < 1) throw new TypeError("invalid fencingToken");
    const runId = safeId(input.runId, "runId");
    const errorCode = safeId(input.errorCode, "errorCode", 96);
    const task = this.#task(taskId), now = Math.floor(Date.now() / 1000);
    this.#assertLease(taskId, workerId, fencingToken, runId, now, this.#lease(taskId));
    const dead = task.attempts >= task.max_attempts;
    const delay = Math.min(5 * (2 ** Math.max(0, task.attempts - 1)), 300);
    return this.#commitEvent(taskId, dead ? "TASK_DEAD_LETTERED" : "TASK_RETRY_SCHEDULED", { workerId, runId, fencingToken, errorCode, retryDelaySeconds: dead ? 0 : delay }, () => {
      const commitNow = Math.floor(Date.now() / 1000);
      this.#assertLease(taskId, workerId, fencingToken, runId, commitNow, this.#lease(taskId));
      this.ctx.storage.sql.exec("UPDATE swarm_tasks SET status=?,next_attempt_at=?,last_error=?,updated_at=? WHERE task_id=?", dead ? "DEAD_LETTER" : "READY", dead ? commitNow : commitNow + delay, errorCode, commitNow, taskId);
      this.ctx.storage.sql.exec("DELETE FROM swarm_leases WHERE task_id=?", taskId);
      return { status: dead ? "DEAD_LETTER" : "RETRY_SCHEDULED", taskId, nextAttemptAt: dead ? null : commitNow + delay, retryDelaySeconds: dead ? 0 : delay };
    });
  }

  async #recover() {
    const now = Math.floor(Date.now() / 1000);
    const expired = this.ctx.storage.sql.exec("SELECT t.task_id,t.attempts,t.max_attempts FROM swarm_tasks t JOIN swarm_leases l ON l.task_id=t.task_id WHERE t.status='LEASED' AND l.expires_at<=? ORDER BY l.expires_at LIMIT 50", now).toArray();
    let recovered = 0, deadLettered = 0;
    for (const row of expired) {
      const outcome = await this.#commitEvent(row.task_id, row.attempts >= row.max_attempts ? "TASK_DEAD_LETTERED" : "LEASE_EXPIRED_RECOVERED", { attempts: row.attempts }, () => {
        const task = this.#task(row.task_id), lease = this.#lease(row.task_id);
        const commitNow = Math.floor(Date.now() / 1000);
        if (!lease || lease.expires_at > commitNow || task.status !== "LEASED") {
          return { skipEvent: true, value: "UNCHANGED" };
        }
        const terminal = task.attempts >= task.max_attempts;
        this.ctx.storage.sql.exec("UPDATE swarm_tasks SET status=?,last_error=?,updated_at=? WHERE task_id=?", terminal ? "DEAD_LETTER" : "READY", "LEASE_EXPIRED", commitNow, row.task_id);
        this.ctx.storage.sql.exec("DELETE FROM swarm_leases WHERE task_id=?", row.task_id);
        return terminal ? "DEAD_LETTER" : "READY";
      });
      if (outcome === "READY") recovered += 1;
      else if (outcome === "DEAD_LETTER") deadLettered += 1;
    }
    return { status: "RECOVERY_COMPLETE", recovered, deadLettered, examined: expired.length };
  }

  async #snapshot(input) {
    const taskId = input.taskId === undefined ? null : safeId(input.taskId, "taskId");
    const sql = this.ctx.storage.sql;
    const taskRows = taskId ? sql.exec("SELECT * FROM swarm_tasks WHERE task_id=?", taskId).toArray() : sql.exec("SELECT * FROM swarm_tasks ORDER BY created_at,task_id").toArray();
    const ids = taskRows.map(row => row.task_id);
    const leases = ids.length ? sql.exec(`SELECT * FROM swarm_leases WHERE task_id IN (${ids.map(() => "?").join(",")})`, ...ids).toArray() : [];
    const checkpoints = ids.length ? sql.exec(`SELECT * FROM swarm_checkpoints WHERE task_id IN (${ids.map(() => "?").join(",")})`, ...ids).toArray() : [];
    const events = sql.exec("SELECT seq,event_id,task_id,event_type,payload_json,prev_hash,event_hash,created_at FROM swarm_events ORDER BY seq").toArray();
    const chain = await this.#verifyChain(events);
    const head = this.#head();
    return { status: "SNAPSHOT", tasks: taskRows, leases, checkpoints, events, eventHead: head, eventChainValid: chain.valid, eventChainError: chain.error };
  }

  async #verifyChain(events) {
    let previous = "GENESIS", expectedSeq = 1;
    for (const event of events) {
      if (event.seq !== expectedSeq || event.prev_hash !== previous) return { valid: false, error: `CHAIN_LINK_INVALID_AT_${expectedSeq}` };
      let payload;
      try { payload = JSON.parse(event.payload_json); } catch { return { valid: false, error: `EVENT_PAYLOAD_INVALID_AT_${expectedSeq}` }; }
      const material = canonical({ seq: event.seq, eventId: event.event_id, taskId: event.task_id, eventType: event.event_type, payload, prevHash: event.prev_hash, createdAt: event.created_at });
      const actual = await sha256(material);
      if (actual !== event.event_hash) return { valid: false, error: `EVENT_HASH_INVALID_AT_${expectedSeq}` };
      previous = actual; expectedSeq += 1;
    }
    const head = this.#head();
    if (head.last_seq !== events.length || head.last_hash !== previous) return { valid: false, error: "EVENT_HEAD_MISMATCH" };
    return { valid: true, error: null };
  }

  #task(taskId) { return this.ctx.storage.sql.exec("SELECT * FROM swarm_tasks WHERE task_id=?", taskId).toArray()[0] ?? null; }
  #lease(taskId) { return this.ctx.storage.sql.exec("SELECT * FROM swarm_leases WHERE task_id=?", taskId).toArray()[0] ?? null; }
  #checkpointRow(taskId) { return this.ctx.storage.sql.exec("SELECT * FROM swarm_checkpoints WHERE task_id=?", taskId).toArray()[0] ?? null; }
  #assertLease(taskId, workerId, fencingToken, runId, now, lease) {
    const task = this.#task(taskId);
    if (!task) throw new Error("TASK_NOT_FOUND");
    if (task.status !== "LEASED" || !lease || lease.worker_id !== workerId || lease.run_id !== runId || lease.fencing_token !== fencingToken || lease.expires_at <= now) throw new Error("STALE_OR_INVALID_FENCING_TOKEN");
  }
}
