/**
 * Phase 59.53 — P10CR project-cell durable task/run ledger.
 * Separate from provider quota state. No task payload is executed here.
 */
import { DurableObject } from "cloudflare:workers";

const encoder = new TextEncoder();
const MAX_CLOCK_SKEW_SECONDS = 30;
const NONCE_TTL_SECONDS = 120;
const MAX_RPC_BYTES = 16384;
const MAX_PAYLOAD_BYTES = 8192;
const ZERO_HASH = "0".repeat(64);
const SHA256_K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
];

function rotr(value, amount) {
  return (value >>> amount) | (value << (32 - amount));
}

export function swarmRunSha256(text) {
  const input = encoder.encode(text);
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  const state = [
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
    0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
  ];
  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = new Uint32Array(64);
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const x = words[i - 15], y = words[i - 2];
      const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
      const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = state;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choose + SHA256_K[i] + words[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h=g; g=f; f=e; e=(d + temp1) >>> 0;
      d=c; c=b; b=a; a=(temp1 + temp2) >>> 0;
    }
    state[0]=(state[0]+a)>>>0; state[1]=(state[1]+b)>>>0;
    state[2]=(state[2]+c)>>>0; state[3]=(state[3]+d)>>>0;
    state[4]=(state[4]+e)>>>0; state[5]=(state[5]+f)>>>0;
    state[6]=(state[6]+g)>>>0; state[7]=(state[7]+h)>>>0;
  }
  return state.map(value => value.toString(16).padStart(8, "0")).join("");
}

function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("JSON numbers must be finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError("value must be plain JSON data");
  }
  const keys = Object.keys(value).sort();
  return "{" + keys.map(key => JSON.stringify(key) + ":" + canonicalJson(value[key])).join(",") + "}";
}

function assertNoSecretFields(value, path = "payload") {
  if (Array.isArray(value)) { value.forEach((item,index)=>assertNoSecretFields(item,path+"["+index+"]")); return; }
  if (!value || typeof value!=="object") return;
  const blocked=new Set(["secret","password","authorization","apikey","privatekey","accesstoken","refreshtoken","bearertoken","cookie","credential","clientsecret"]);
  for (const [key,child] of Object.entries(value)) {
    const normalized=key.replace(/[_-]/g,"").toLowerCase();
    if (blocked.has(normalized)) throw new TypeError("credential-like field is forbidden in durable task data: "+path+"."+key);
    assertNoSecretFields(child,path+"."+key);
  }
}

function jsonObject(value, label, maxBytes = MAX_PAYLOAD_BYTES) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(label + " must be a JSON object");
  assertNoSecretFields(value,label);
  const encoded = canonicalJson(value);
  if (encoder.encode(encoded).byteLength > maxBytes) throw new TypeError(label + " exceeds size limit");
  return { encoded, value: JSON.parse(encoded) };
}

function safeId(value, label, max = 160) {
  if (typeof value !== "string" || value.length < 1 || value.length > max
    || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) throw new TypeError("invalid " + label);
  return value;
}

function integer(value, label, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError("invalid " + label);
  return value;
}

function backoffSeconds(attempt) {
  return Math.min(60 * (2 ** Math.max(0, attempt - 1)), 3600);
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}

function base64ToBytes(value) {
  if (typeof value !== "string" || value.length < 16 || value.length > 256) throw new TypeError("invalid signature encoding");
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

function publicTask(row) {
  return {
    taskId:row.task_id, projectId:row.project_id, idempotencyKey:row.idempotency_key,
    taskType:row.task_type, payload:JSON.parse(row.payload_json),
    checkpoint:JSON.parse(row.checkpoint_json), result:JSON.parse(row.result_json),
    status:row.status, attempts:row.attempts, maxAttempts:row.max_attempts,
    ownerGate:row.owner_gate===1, availableAtEpoch:row.available_at_epoch,
    lastErrorCode:row.last_error_code, lastWorkerId:row.last_worker_id,
    createdAtEpoch:row.created_at_epoch, updatedAtEpoch:row.updated_at_epoch
  };
}

export class SwarmRunDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    const sql = ctx.storage.sql;
    sql.exec("CREATE TABLE IF NOT EXISTS swarm_run_meta (singleton INTEGER PRIMARY KEY CHECK(singleton=1), project_id TEXT NOT NULL)");
    sql.exec("CREATE TABLE IF NOT EXISTS swarm_run_tasks (task_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, task_type TEXT NOT NULL, payload_json TEXT NOT NULL, checkpoint_json TEXT NOT NULL DEFAULT '{}', result_json TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL CHECK(status IN ('READY','LEASED','IN_PROGRESS','COMPLETED','DEAD_LETTER','PAUSED','BLOCKED')), attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0), max_attempts INTEGER NOT NULL CHECK(max_attempts BETWEEN 1 AND 10), owner_gate INTEGER NOT NULL CHECK(owner_gate IN (0,1)), available_at_epoch INTEGER, last_error_code TEXT, last_worker_id TEXT, created_at_epoch INTEGER NOT NULL, updated_at_epoch INTEGER NOT NULL)");
    sql.exec("CREATE TABLE IF NOT EXISTS swarm_run_leases (task_id TEXT PRIMARY KEY, worker_id TEXT NOT NULL, fence_token INTEGER NOT NULL, expires_at_epoch INTEGER NOT NULL, heartbeat_at_epoch INTEGER NOT NULL)");
    sql.exec("CREATE TABLE IF NOT EXISTS swarm_run_fences (task_id TEXT PRIMARY KEY, last_token INTEGER NOT NULL)");
    sql.exec("CREATE TABLE IF NOT EXISTS swarm_run_auth_nonces (caller_id TEXT NOT NULL, nonce TEXT NOT NULL, expires_at_epoch INTEGER NOT NULL, PRIMARY KEY(caller_id,nonce))");
    sql.exec("CREATE TABLE IF NOT EXISTS swarm_run_events (seq INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL UNIQUE, project_id TEXT NOT NULL, task_id TEXT, kind TEXT NOT NULL, at_epoch INTEGER NOT NULL, worker_id TEXT, fence_token INTEGER, payload_json TEXT NOT NULL, prev_hash TEXT NOT NULL, event_hash TEXT NOT NULL UNIQUE)");
    sql.exec("CREATE INDEX IF NOT EXISTS swarm_run_events_task_idx ON swarm_run_events(task_id,seq)");
    sql.exec("CREATE TRIGGER IF NOT EXISTS swarm_run_events_no_update BEFORE UPDATE ON swarm_run_events BEGIN SELECT RAISE(ABORT,'append-only run journal'); END");
    sql.exec("CREATE TRIGGER IF NOT EXISTS swarm_run_events_no_delete BEFORE DELETE ON swarm_run_events BEGIN SELECT RAISE(ABORT,'append-only run journal'); END");
  }

  async fetch(request) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/rpc") {
      return Response.json({status:"REJECTED",reason:"INTERNAL_RPC_ONLY"},{status:404});
    }
    let bytes;
    try { bytes = new Uint8Array(await request.arrayBuffer()); }
    catch { return Response.json({status:"REJECTED",reason:"BODY_UNAVAILABLE"},{status:400}); }
    if (bytes.byteLength < 1 || bytes.byteLength > MAX_RPC_BYTES) return Response.json({status:"REJECTED",reason:"BODY_SIZE_INVALID"},{status:413});
    const auth = await this.#authenticate(request, bytes);
    if (!auth.ok) return Response.json({status:"REJECTED",reason:auth.reason},{status:auth.status});
    let body;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return Response.json({status:"REJECTED",reason:"INVALID_JSON"},{status:400}); }
    if (!body || typeof body !== "object" || Array.isArray(body)
      || !body.input || typeof body.input !== "object" || Array.isArray(body.input)
      || typeof body.action !== "string") return Response.json({status:"REJECTED",reason:"INVALID_RPC_ENVELOPE"},{status:400});
    let policies;
    try { policies = JSON.parse(this.env?.NEXUS_SWARM_RUN_CALLER_POLICIES || "{}"); }
    catch { return Response.json({status:"REJECTED",reason:"CALLER_POLICY_REGISTRY_INVALID"},{status:503}); }
    const allowed = policies?.[auth.callerId];
    if (!Array.isArray(allowed) || !allowed.includes(body.action)) return Response.json({status:"REJECTED",reason:"CALLER_ACTION_FORBIDDEN"},{status:403});
    if (this.env?.NEXUS_SWARM_RUN_LEDGER_ENABLED !== "true") return Response.json({status:"WAITING_FOR_CONFIGURATION",reason:"RUN_LEDGER_DISABLED"},{status:503});
    try {
      let result;
      switch (body.action) {
        case "registerTask": if (auth.callerId!=="primary") throw new TypeError("primary caller required"); result=this.#registerTask(body.input); break;
        case "claimTask": result=this.#claimTask(body.input,auth.callerId); break;
        case "heartbeat": result=this.#heartbeat(body.input,auth.callerId); break;
        case "checkpoint": result=this.#checkpoint(body.input,auth.callerId); break;
        case "finishTask": result=this.#finishTask(body.input,auth.callerId); break;
        case "recoverExpiredLeases": if (auth.callerId!=="primary") throw new TypeError("primary caller required"); result=this.#recoverExpiredLeases(body.input); break;
        case "snapshot": if (auth.callerId!=="primary") throw new TypeError("primary caller required"); result=this.#snapshot(body.input); break;
        case "verifyEventChain": if (auth.callerId!=="primary") throw new TypeError("primary caller required"); result=this.#verifyEventChain(body.input); break;
        default: return Response.json({status:"REJECTED",reason:"UNKNOWN_ACTION"},{status:400});
      }
      return Response.json(result);
    } catch (error) {
      return Response.json({status:"REJECTED",error:{name:error?.name||"Error",message:String(error?.message||error)}},{status:400});
    }
  }

  async #authenticate(request, bytes) {
    const callerId=request.headers.get("x-nexus-caller-id")||"";
    const timestampText=request.headers.get("x-nexus-timestamp")||"";
    const nonce=request.headers.get("x-nexus-nonce")||"";
    const signatureText=request.headers.get("x-nexus-signature")||"";
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(callerId) || !/^\d{1,12}$/.test(timestampText)
      || !/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) return {ok:false,status:401,reason:"INVALID_AUTH_ENVELOPE"};
    const timestamp=Number(timestampText), now=Math.floor(Date.now()/1000);
    if (!Number.isSafeInteger(timestamp)||Math.abs(now-timestamp)>MAX_CLOCK_SKEW_SECONDS) return {ok:false,status:401,reason:"AUTH_TIMESTAMP_EXPIRED"};
    let keys;
    try { keys=JSON.parse(this.env?.NEXUS_SWARM_RUN_CALLER_KEYS||"{}"); }
    catch { return {ok:false,status:503,reason:"CALLER_KEY_REGISTRY_INVALID"}; }
    const secret=keys&&typeof keys==="object"&&!Array.isArray(keys)?keys[callerId]:undefined;
    if (typeof secret!=="string"||secret.length<32) return {ok:false,status:401,reason:"CALLER_NOT_AUTHORIZED"};
    try {
      const digest=await crypto.subtle.digest("SHA-256",bytes);
      const bodyHash=bytesToHex(digest);
      const canonical=[callerId,timestampText,nonce,request.method.toUpperCase(),new URL(request.url).pathname,bodyHash].join("\n");
      const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
      if (!await crypto.subtle.verify("HMAC",key,base64ToBytes(signatureText),encoder.encode(canonical))) return {ok:false,status:401,reason:"SIGNATURE_INVALID"};
    } catch { return {ok:false,status:401,reason:"SIGNATURE_INVALID"}; }
    try {
      this.ctx.storage.transactionSync(()=>{
        this.ctx.storage.sql.exec("DELETE FROM swarm_run_auth_nonces WHERE expires_at_epoch<=?",now);
        this.ctx.storage.sql.exec("INSERT INTO swarm_run_auth_nonces(caller_id,nonce,expires_at_epoch) VALUES(?,?,?)",callerId,nonce,now+NONCE_TTL_SECONDS);
      });
    } catch (error) {
      if (String(error?.message||error).includes("UNIQUE constraint failed")) return {ok:false,status:409,reason:"REPLAYED_NONCE"};
      return {ok:false,status:503,reason:"AUTH_NONCE_STORE_UNAVAILABLE"};
    }
    return {ok:true,callerId};
  }

  #now(input) {
    return this.env?.NEXUS_SWARM_RUN_TEST_MODE==="true"&&Number.isSafeInteger(input?.nowEpoch)
      ? input.nowEpoch : Math.floor(Date.now()/1000);
  }

  #assertProject(input, allowInitialize=false) {
    const projectId=safeId(input.projectId,"projectId",64);
    if (typeof this.env?.NEXUS_SWARM_PROJECT_ID!=="string"||projectId!==this.env.NEXUS_SWARM_PROJECT_ID) throw new TypeError("project cell identity mismatch");
    const sql=this.ctx.storage.sql;
    const row=sql.exec("SELECT project_id FROM swarm_run_meta WHERE singleton=1").toArray()[0];
    if (!row&&allowInitialize) {
      sql.exec("INSERT INTO swarm_run_meta(singleton,project_id) VALUES(1,?)",projectId);
      return projectId;
    }
    if (!row||row.project_id!==projectId) throw new TypeError("project cell is not initialized or mismatched");
    return projectId;
  }

  #event(projectId,taskId,kind,atEpoch,workerId,fenceToken,payload) {
    const sql=this.ctx.storage.sql;
    const previous=sql.exec("SELECT event_hash FROM swarm_run_events ORDER BY seq DESC LIMIT 1").toArray()[0];
    const prevHash=previous?.event_hash||ZERO_HASH;
    const event={
      event_id:crypto.randomUUID(),project_id:projectId,task_id:taskId??null,kind,
      at_epoch:atEpoch,worker_id:workerId??null,fence_token:fenceToken??null,payload:payload??{},prev_hash:prevHash
    };
    const eventHash=swarmRunSha256(canonicalJson(event));
    sql.exec("INSERT INTO swarm_run_events(event_id,project_id,task_id,kind,at_epoch,worker_id,fence_token,payload_json,prev_hash,event_hash) VALUES(?,?,?,?,?,?,?,?,?,?)",
      event.event_id,projectId,taskId??null,kind,atEpoch,workerId??null,fenceToken??null,canonicalJson(event.payload),prevHash,eventHash);
    return {eventId:event.event_id,eventHash,prevHash};
  }

  #taskRow(taskId) {
    return this.ctx.storage.sql.exec("SELECT * FROM swarm_run_tasks WHERE task_id=?",taskId).toArray()[0];
  }

  #recoverLeaseInTransaction(task,lease,now) {
    const sql=this.ctx.storage.sql;
    const terminal=task.attempts>=task.max_attempts;
    const nextStatus=terminal?"DEAD_LETTER":"READY";
    const availableAt=terminal?null:now+backoffSeconds(task.attempts);
    sql.exec("DELETE FROM swarm_run_leases WHERE task_id=?",task.task_id);
    sql.exec("UPDATE swarm_run_tasks SET status=?,available_at_epoch=?,last_error_code=?,updated_at_epoch=? WHERE task_id=?",
      nextStatus,availableAt,"LEASE_EXPIRED",now,task.task_id);
    this.#event(task.project_id,task.task_id,"LEASE_EXPIRED",now,lease.worker_id,lease.fence_token,{nextStatus,availableAtEpoch:availableAt});
    return nextStatus;
  }

  #assertCallerWorker(callerId,workerId) {
    let mapping;
    try { mapping=JSON.parse(this.env?.NEXUS_SWARM_RUN_CALLER_WORKERS||"{}"); }
    catch { throw new TypeError("caller worker registry invalid"); }
    if (!mapping || typeof mapping!=="object" || mapping[callerId]!==workerId) {
      throw new TypeError("caller is not bound to worker identity");
    }
  }

  #registerTask(input) {
    const projectId=safeId(input.projectId,"projectId",64);
    const taskId=safeId(input.taskId,"taskId",160);
    const idempotencyKey=safeId(input.idempotencyKey,"idempotencyKey",200);
    const taskType=safeId(input.taskType,"taskType",64);
    const payload=jsonObject(input.payload??{},"payload");
    const maxAttempts=integer(input.maxAttempts??3,"maxAttempts",1,10);
    if (typeof input.ownerGate!=="boolean") throw new TypeError("ownerGate must be boolean");
    const now=this.#now(input);
    return this.ctx.storage.transactionSync(()=>{
      this.#assertProject({projectId},true);
      const sql=this.ctx.storage.sql, old=this.#taskRow(taskId);
      if (old) {
        if (old.idempotency_key!==idempotencyKey||old.task_type!==taskType||old.payload_json!==payload.encoded
          ||old.max_attempts!==maxAttempts||old.owner_gate!==(input.ownerGate?1:0)) throw new TypeError("task identity or policy conflict");
        return {status:"EXISTING",task:publicTask(old)};
      }
      const keyOwner=sql.exec("SELECT task_id FROM swarm_run_tasks WHERE idempotency_key=?",idempotencyKey).toArray()[0];
      if (keyOwner) throw new TypeError("idempotency key already belongs to another task");
      sql.exec("INSERT INTO swarm_run_tasks(task_id,project_id,idempotency_key,task_type,payload_json,checkpoint_json,result_json,status,attempts,max_attempts,owner_gate,available_at_epoch,last_error_code,last_worker_id,created_at_epoch,updated_at_epoch) VALUES(?,?,?,?,?,'{}','{}','READY',0,?,?,NULL,NULL,NULL,?,?)",
        taskId,projectId,idempotencyKey,taskType,payload.encoded,maxAttempts,input.ownerGate?1:0,now,now);
      this.#event(projectId,taskId,"TASK_REGISTERED",now,null,null,{idempotencyKey,taskType,maxAttempts,ownerGate:input.ownerGate,payloadSha256:swarmRunSha256(payload.encoded)});
      return {status:"REGISTERED",task:publicTask(this.#taskRow(taskId))};
    });
  }

  #claimTask(input,callerId) {
    const projectId=safeId(input.projectId,"projectId",64);
    const taskId=safeId(input.taskId,"taskId",160);
    const workerId=safeId(input.workerId,"workerId",96);
    this.#assertCallerWorker(callerId,workerId);
    const maxLeaseSeconds=integer(Number(this.env?.NEXUS_SWARM_RUN_MAX_LEASE_SECONDS??900),"configured max lease seconds",15,3600);
    const leaseSeconds=integer(input.leaseSeconds??maxLeaseSeconds,"leaseSeconds",15,maxLeaseSeconds);
    const configuredConcurrency=integer(Number(this.env?.NEXUS_SWARM_RUN_MAX_CONCURRENCY??5),"configured max concurrency",1,32);
    if (input.maxConcurrency!==undefined&&input.maxConcurrency!==configuredConcurrency) throw new TypeError("maxConcurrency must match configured project policy");
    const maxConcurrency=configuredConcurrency;
    const now=this.#now(input);
    return this.ctx.storage.transactionSync(()=>{
      this.#assertProject({projectId});
      const sql=this.ctx.storage.sql;
      let task=this.#taskRow(taskId);
      if (!task) throw new TypeError("unknown task");
      if (task.owner_gate===1) return {status:"OWNER_APPROVAL_REQUIRED",taskId:taskId};
      if (task.status==="COMPLETED") return {status:"ALREADY_COMPLETED",task:publicTask(task)};
      if (["DEAD_LETTER","BLOCKED","PAUSED"].includes(task.status)) return {status:"NOT_CLAIMABLE",task:publicTask(task)};
      const oldLease=sql.exec("SELECT * FROM swarm_run_leases WHERE task_id=?",taskId).toArray()[0];
      if (oldLease&&oldLease.expires_at_epoch>now) return {status:"ALREADY_LEASED",workerId:oldLease.worker_id,expiresAtEpoch:oldLease.expires_at_epoch};
      if (oldLease&&oldLease.expires_at_epoch<=now) {
        this.#recoverLeaseInTransaction(task,oldLease,now);
        task=this.#taskRow(taskId);
      }
      if (task.status!=="READY") return {status:"NOT_CLAIMABLE",task:publicTask(task)};
      if (task.available_at_epoch!==null&&task.available_at_epoch!==undefined&&task.available_at_epoch>now) return {status:"WAITING_BACKOFF",availableAtEpoch:task.available_at_epoch};
      const active=sql.exec("SELECT COUNT(*) AS count FROM swarm_run_leases WHERE expires_at_epoch>?",now).toArray()[0]?.count??0;
      if (active>=maxConcurrency) return {status:"CONCURRENCY_LIMIT"};
      const oldFence=sql.exec("SELECT last_token FROM swarm_run_fences WHERE task_id=?",taskId).toArray()[0];
      const token=(oldFence?.last_token??0)+1, expiresAt=now+leaseSeconds;
      sql.exec("INSERT INTO swarm_run_fences(task_id,last_token) VALUES(?,?) ON CONFLICT(task_id) DO UPDATE SET last_token=excluded.last_token",taskId,token);
      sql.exec("INSERT INTO swarm_run_leases(task_id,worker_id,fence_token,expires_at_epoch,heartbeat_at_epoch) VALUES(?,?,?,?,?)",taskId,workerId,token,expiresAt,now);
      sql.exec("UPDATE swarm_run_tasks SET status='LEASED',attempts=attempts+1,last_worker_id=?,updated_at_epoch=? WHERE task_id=?",workerId,now,taskId);
      this.#event(projectId,taskId,"TASK_CLAIMED",now,workerId,token,{expiresAtEpoch:expiresAt,callerId});
      return {status:"CLAIMED",task:publicTask(this.#taskRow(taskId)),workerId,fenceToken:token,expiresAtEpoch:expiresAt};
    });
  }

  #assertLease(input,callerId,now) {
    const taskId=safeId(input.taskId,"taskId",160), workerId=safeId(input.workerId,"workerId",96);
    this.#assertCallerWorker(callerId,workerId);
    const token=integer(input.fenceToken,"fenceToken",1);
    const lease=this.ctx.storage.sql.exec("SELECT * FROM swarm_run_leases WHERE task_id=?",taskId).toArray()[0];
    if (!lease||lease.worker_id!==workerId||lease.fence_token!==token) throw new TypeError("stale fencing token or non-owner");
    if (lease.expires_at_epoch<=now) throw new TypeError("lease expired; worker fenced out");
    return lease;
  }

  #heartbeat(input,callerId) {
    const projectId=safeId(input.projectId,"projectId",64), now=this.#now(input);
    const maxLeaseSeconds=integer(Number(this.env?.NEXUS_SWARM_RUN_MAX_LEASE_SECONDS??900),"configured max lease seconds",15,3600);
    const leaseSeconds=integer(input.leaseSeconds??maxLeaseSeconds,"leaseSeconds",15,maxLeaseSeconds);
    return this.ctx.storage.transactionSync(()=>{
      this.#assertProject({projectId});
      const lease=this.#assertLease(input,callerId,now), expiresAt=Math.max(lease.expires_at_epoch,now+leaseSeconds);
      this.ctx.storage.sql.exec("UPDATE swarm_run_leases SET expires_at_epoch=?,heartbeat_at_epoch=? WHERE task_id=?",expiresAt,now,input.taskId);
      this.ctx.storage.sql.exec("UPDATE swarm_run_tasks SET updated_at_epoch=? WHERE task_id=?",now,input.taskId);
      this.#event(projectId,input.taskId,"LEASE_HEARTBEAT",now,input.workerId,input.fenceToken,{expiresAtEpoch:expiresAt,callerId});
      return {status:"HEARTBEAT_OK",expiresAtEpoch:expiresAt,workerId:lease.worker_id,fenceToken:lease.fence_token};
    });
  }

  #checkpoint(input,callerId) {
    const projectId=safeId(input.projectId,"projectId",64), checkpoint=jsonObject(input.checkpoint,"checkpoint",MAX_PAYLOAD_BYTES), now=this.#now(input);
    return this.ctx.storage.transactionSync(()=>{
      this.#assertProject({projectId});
      this.#assertLease(input,callerId,now);
      this.ctx.storage.sql.exec("UPDATE swarm_run_tasks SET checkpoint_json=?,status='IN_PROGRESS',updated_at_epoch=? WHERE task_id=?",checkpoint.encoded,now,input.taskId);
      const digest=swarmRunSha256(checkpoint.encoded);
      this.#event(projectId,input.taskId,"CHECKPOINT_SAVED",now,input.workerId,input.fenceToken,{checkpointSha256:digest,checkpointBytes:encoder.encode(checkpoint.encoded).byteLength,callerId});
      return {status:"CHECKPOINT_SAVED",checkpointSha256:digest};
    });
  }

  #finishTask(input,callerId) {
    const projectId=safeId(input.projectId,"projectId",64), taskId=safeId(input.taskId,"taskId",160);
    if (typeof input.success!=="boolean") throw new TypeError("success must be boolean");
    const result=input.success?jsonObject(input.result??{},"result",MAX_PAYLOAD_BYTES):{encoded:"{}",value:{}};
    const errorCode=input.success?null:safeId(input.errorCode??"TASK_FAILED","errorCode",96);
    const now=this.#now(input);
    return this.ctx.storage.transactionSync(()=>{
      this.#assertProject({projectId});
      const sql=this.ctx.storage.sql, task=this.#taskRow(taskId);
      if (!task) throw new TypeError("unknown task");
      this.#assertCallerWorker(callerId,safeId(input.workerId,"workerId",96));
      if (task.status==="COMPLETED") {
        if (input.success&&task.result_json===result.encoded&&task.last_worker_id===input.workerId) return {status:"ALREADY_COMPLETED",task:publicTask(task)};
        throw new TypeError("terminal task result conflict or non-owner");
      }
      if (task.status==="DEAD_LETTER") {
        if (task.last_worker_id!==input.workerId) throw new TypeError("terminal task non-owner");
        return {status:"ALREADY_TERMINAL",taskId};
      }
      this.#assertLease(input,callerId,now);
      let nextStatus,availableAt=null;
      if (input.success) nextStatus="COMPLETED";
      else if (task.attempts>=task.max_attempts) nextStatus="DEAD_LETTER";
      else { nextStatus="READY"; availableAt=now+backoffSeconds(task.attempts); }
      sql.exec("UPDATE swarm_run_tasks SET status=?,result_json=?,available_at_epoch=?,last_error_code=?,updated_at_epoch=? WHERE task_id=?",
        nextStatus,result.encoded,availableAt,errorCode,now,taskId);
      sql.exec("DELETE FROM swarm_run_leases WHERE task_id=?",taskId);
      this.#event(projectId,taskId,input.success?"TASK_COMPLETED":(nextStatus==="DEAD_LETTER"?"TASK_DEAD_LETTER":"TASK_RETRY_SCHEDULED"),
        now,input.workerId,input.fenceToken,{errorCode,availableAtEpoch:availableAt,resultSha256:input.success?swarmRunSha256(result.encoded):null,callerId});
      return {status:nextStatus,task:publicTask(this.#taskRow(taskId))};
    });
  }

  #recoverExpiredLeases(input) {
    const projectId=safeId(input.projectId,"projectId",64), now=this.#now(input);
    return this.ctx.storage.transactionSync(()=>{
      this.#assertProject({projectId});
      const sql=this.ctx.storage.sql, expired=sql.exec("SELECT * FROM swarm_run_leases WHERE expires_at_epoch<=? ORDER BY task_id",now).toArray();
      let recoveredCount=0;
      for (const lease of expired) {
        const task=this.#taskRow(lease.task_id);
        if (!task) { sql.exec("DELETE FROM swarm_run_leases WHERE task_id=?",lease.task_id); continue; }
        this.#recoverLeaseInTransaction(task,lease,now); recoveredCount+=1;
      }
      return {status:"LEASE_RECOVERY_COMPLETE",recoveredCount};
    });
  }

  #snapshot(input) {
    const projectId=safeId(input.projectId,"projectId",64);
    this.#assertProject({projectId},true);
    const sql=this.ctx.storage.sql;
    const tasks=sql.exec("SELECT * FROM swarm_run_tasks ORDER BY created_at_epoch,task_id").toArray().map(publicTask);
    const leases=sql.exec("SELECT * FROM swarm_run_leases ORDER BY task_id").toArray().map(row=>({
      taskId:row.task_id,workerId:row.worker_id,fenceToken:row.fence_token,expiresAtEpoch:row.expires_at_epoch,heartbeatAtEpoch:row.heartbeat_at_epoch
    }));
    const events=sql.exec("SELECT * FROM swarm_run_events ORDER BY seq").toArray().map(row=>({
      seq:row.seq,eventId:row.event_id,projectId:row.project_id,taskId:row.task_id,kind:row.kind,
      atEpoch:row.at_epoch,workerId:row.worker_id,fenceToken:row.fence_token,payload:JSON.parse(row.payload_json),
      prevHash:row.prev_hash,eventHash:row.event_hash
    }));
    return {status:"SNAPSHOT",projectId,tasks,leases,events};
  }

  #verifyEventChain(input) {
    const projectId=safeId(input.projectId,"projectId",64);
    this.#assertProject({projectId},true);
    const events=this.ctx.storage.sql.exec("SELECT * FROM swarm_run_events ORDER BY seq").toArray();
    let previous=ZERO_HASH;
    for (const row of events) {
      const body={event_id:row.event_id,project_id:row.project_id,task_id:row.task_id,kind:row.kind,
        at_epoch:row.at_epoch,worker_id:row.worker_id,fence_token:row.fence_token,
        payload:JSON.parse(row.payload_json),prev_hash:previous};
      if (row.prev_hash!==previous||swarmRunSha256(canonicalJson(body))!==row.event_hash) return {status:"INVALID",sequence:row.seq};
      previous=row.event_hash;
    }
    return {status:"VALID",eventCount:events.length,headHash:previous};
  }
}
