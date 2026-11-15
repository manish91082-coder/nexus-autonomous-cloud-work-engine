"""B4 durable task journal, atomic leases/fencing and allowlisted process isolation.

Standalone stdlib prototype. Not wired into the production mission worker. Payloads
are untrusted data; this module never evaluates payloads or model-generated code.
"""
from __future__ import annotations
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import hashlib, json, os, signal, sqlite3, subprocess, time, uuid
from pathlib import Path
from typing import Mapping, Sequence

MIN_LEASE, MAX_LEASE, MAX_ATTEMPTS = 15, 3600, 10
SAFE_ENV = {"PATH", "LANG", "LC_ALL", "TZ", "PYTHONIOENCODING", "PYTHONUNBUFFERED", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"}

class DurableExecutionError(RuntimeError):
    pass

def _dump(value):
    try: return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError) as exc: raise DurableExecutionError("value must be finite JSON data") from exc

def _now(value=None):
    value = value or datetime.now(timezone.utc)
    if value.tzinfo is None: raise DurableExecutionError("timestamps must be timezone-aware")
    return value.astimezone(timezone.utc)

def _iso(value=None): return _now(value).isoformat(timespec="microseconds").replace("+00:00", "Z")

def _date(value):
    try: result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (AttributeError, ValueError) as exc: raise DurableExecutionError("invalid timestamp") from exc
    if result.tzinfo is None: raise DurableExecutionError("timestamp must include timezone")
    return result.astimezone(timezone.utc)

def _id(value, label):
    if not isinstance(value, str) or not value or len(value) > 200 or "\x00" in value:
        raise DurableExecutionError(f"invalid {label}")
    return value

def _backoff(attempt): return min(60 * (2 ** max(0, attempt - 1)), 3600)

class DurableStore:
    """SQLite BEGIN IMMEDIATE serializes task claims across threads and processes."""
    def __init__(self, path, busy_timeout_ms=10000):
        self.path = str(path)
        if self.path == ":memory:": raise DurableExecutionError("file-backed database required")
        if not 100 <= busy_timeout_ms <= 60000: raise DurableExecutionError("invalid busy timeout")
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.busy_timeout_ms = busy_timeout_ms
        self._init()

    def _connect(self):
        db = sqlite3.connect(self.path, timeout=self.busy_timeout_ms / 1000, isolation_level=None)
        db.row_factory = sqlite3.Row
        db.execute(f"PRAGMA busy_timeout={self.busy_timeout_ms}")
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA synchronous=FULL")
        return db

    @contextmanager
    def _read(self):
        db = self._connect()
        try: yield db
        finally: db.close()

    @contextmanager
    def _tx(self):
        db = self._connect()
        try:
            db.execute("BEGIN IMMEDIATE"); yield db; db.execute("COMMIT")
        except Exception:
            try: db.execute("ROLLBACK")
            except sqlite3.Error: pass
            raise
        finally: db.close()

    def _init(self):
        db = self._connect()
        try:
            db.execute("PRAGMA journal_mode=WAL")
            version = db.execute("PRAGMA user_version").fetchone()[0]
            if version not in (0, 1): raise DurableExecutionError("unsupported DB schema")
            db.executescript("""
            CREATE TABLE IF NOT EXISTS tasks(
              task_id TEXT PRIMARY KEY, idem TEXT NOT NULL UNIQUE, payload TEXT NOT NULL,
              checkpoint TEXT NOT NULL DEFAULT '{}', result TEXT NOT NULL DEFAULT '{}',
              status TEXT NOT NULL CHECK(status IN ('READY','LEASED','IN_PROGRESS','COMPLETED','DEAD_LETTER','PAUSED','BLOCKED')),
              attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0), max_attempts INTEGER NOT NULL CHECK(max_attempts BETWEEN 1 AND 10),
              owner_gate INTEGER NOT NULL CHECK(owner_gate IN (0,1)), available_at TEXT, updated_at TEXT NOT NULL, error_code TEXT);
            CREATE TABLE IF NOT EXISTS leases(
              scope TEXT PRIMARY KEY, task_id TEXT, worker TEXT NOT NULL, token INTEGER NOT NULL,
              expires_at TEXT NOT NULL, heartbeat_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS fences(scope TEXT PRIMARY KEY, token INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS events(
              seq INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT UNIQUE NOT NULL, task_id TEXT, scope TEXT NOT NULL,
              kind TEXT NOT NULL, at TEXT NOT NULL, worker TEXT, token INTEGER, payload TEXT NOT NULL,
              prev_hash TEXT NOT NULL, event_hash TEXT UNIQUE NOT NULL);
            CREATE INDEX IF NOT EXISTS events_task_idx ON events(task_id,seq);
            CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'append-only journal'); END;
            CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'append-only journal'); END;
            """)
            db.execute("PRAGMA user_version=1")
        finally: db.close()

    def _event(self, db, scope, kind, stamp, task_id=None, worker=None, token=None, payload=None):
        row = db.execute("SELECT event_hash FROM events ORDER BY seq DESC LIMIT 1").fetchone()
        body = {"event_id": str(uuid.uuid4()), "task_id": task_id, "scope": scope, "kind": kind,
                "at": _iso(stamp), "worker": worker, "token": token, "payload": payload or {},
                "prev_hash": row[0] if row else "0" * 64}
        digest = hashlib.sha256(_dump(body).encode()).hexdigest()
        db.execute("INSERT INTO events(event_id,task_id,scope,kind,at,worker,token,payload,prev_hash,event_hash) VALUES(?,?,?,?,?,?,?,?,?,?)",
                   (body["event_id"], task_id, scope, kind, body["at"], worker, token, _dump(body["payload"]), body["prev_hash"], digest))
        return {**body, "event_hash": digest}

    def _fence(self, db, scope):
        row = db.execute("SELECT token FROM fences WHERE scope=?", (scope,)).fetchone()
        token = (row[0] if row else 0) + 1
        db.execute("INSERT INTO fences(scope,token) VALUES(?,?) ON CONFLICT(scope) DO UPDATE SET token=excluded.token", (scope, token))
        return token

    @staticmethod
    def _task(row):
        return {"task_id": row["task_id"], "idempotency_key": row["idem"], "payload": json.loads(row["payload"]),
                "checkpoint": json.loads(row["checkpoint"]), "result": json.loads(row["result"]),
                "status": row["status"], "attempts": row["attempts"], "max_attempts": row["max_attempts"],
                "owner_gate": bool(row["owner_gate"]), "available_at_utc": row["available_at"],
                "last_error_code": row["error_code"], "updated_at_utc": row["updated_at"]}

    def register_task(self, task_id, idempotency_key, payload, *, max_attempts=3, owner_gate=False, now=None):
        task_id, idempotency_key = _id(task_id, "task_id"), _id(idempotency_key, "idempotency_key")
        if not isinstance(payload, dict) or not isinstance(owner_gate, bool): raise DurableExecutionError("invalid task payload or owner_gate")
        if not isinstance(max_attempts, int) or isinstance(max_attempts, bool) or not 1 <= max_attempts <= MAX_ATTEMPTS:
            raise DurableExecutionError("max_attempts must be 1..10")
        stamp, data = _now(now), _dump(payload)
        with self._tx() as db:
            old = db.execute("SELECT * FROM tasks WHERE task_id=?", (task_id,)).fetchone()
            if old:
                if (old["idem"], old["payload"], old["max_attempts"], bool(old["owner_gate"])) != (idempotency_key, data, max_attempts, owner_gate):
                    raise DurableExecutionError("task identity/policy conflict")
                return self._task(old)
            try:
                db.execute("INSERT INTO tasks(task_id,idem,payload,status,max_attempts,owner_gate,updated_at) VALUES(?,?,?,'READY',?,?,?)",
                           (task_id, idempotency_key, data, max_attempts, int(owner_gate), _iso(stamp)))
            except sqlite3.IntegrityError as exc: raise DurableExecutionError("duplicate idempotency key") from exc
            self._event(db, f"task:{task_id}", "TASK_REGISTERED", stamp, task_id, payload={"owner_gate": owner_gate})
            return self._task(db.execute("SELECT * FROM tasks WHERE task_id=?", (task_id,)).fetchone())

    def get_task(self, task_id):
        with self._read() as db:
            row = db.execute("SELECT * FROM tasks WHERE task_id=?", (_id(task_id, "task_id"),)).fetchone()
            return self._task(row) if row else None

    def _lease(self, db, scope, worker, token, stamp):
        row = db.execute("SELECT * FROM leases WHERE scope=?", (scope,)).fetchone()
        if not row or row["worker"] != worker or row["token"] != token: raise DurableExecutionError("stale fencing token or non-owner")
        if _date(row["expires_at"]) <= stamp: raise DurableExecutionError("lease expired; stale worker fenced out")
        return row

    def claim_task(self, task_id, worker, *, now=None, lease_seconds=900, max_active=1):
        task_id, worker, stamp = _id(task_id,"task_id"), _id(worker,"worker"), _now(now)
        if not isinstance(lease_seconds,int) or isinstance(lease_seconds,bool) or not MIN_LEASE <= lease_seconds <= MAX_LEASE: raise DurableExecutionError("invalid lease duration")
        if not isinstance(max_active,int) or isinstance(max_active,bool) or not 1 <= max_active <= 32: raise DurableExecutionError("invalid concurrency cap")
        scope = f"task:{task_id}"
        with self._tx() as db:
            task = db.execute("SELECT * FROM tasks WHERE task_id=?",(task_id,)).fetchone()
            if not task: raise DurableExecutionError("unknown task")
            if task["owner_gate"]: raise DurableExecutionError("owner-gated task cannot be claimed")
            if task["status"] != "READY": raise DurableExecutionError("task is not READY")
            if task["available_at"] and _date(task["available_at"]) > stamp: raise DurableExecutionError("retry backoff active")
            active = db.execute("SELECT COUNT(*) FROM leases WHERE scope LIKE 'task:%' AND expires_at>?",(_iso(stamp),)).fetchone()[0]
            if active >= max_active: raise DurableExecutionError("active concurrency limit reached")
            old = db.execute("SELECT * FROM leases WHERE scope=?",(scope,)).fetchone()
            if old:
                if _date(old["expires_at"]) > stamp: raise DurableExecutionError("task already leased")
                raise DurableExecutionError("recover expired lease before reclaim")
            token, expiry = self._fence(db,scope), stamp + timedelta(seconds=lease_seconds)
            db.execute("INSERT INTO leases VALUES(?,?,?,?,?,?)",(scope,task_id,worker,token,_iso(expiry),_iso(stamp)))
            db.execute("UPDATE tasks SET status='LEASED',attempts=attempts+1,updated_at=? WHERE task_id=?",(_iso(stamp),task_id))
            self._event(db,scope,"TASK_CLAIMED",stamp,task_id,worker,token,{"expires_at_utc":_iso(expiry)})
            return {"task_id":task_id,"worker_id":worker,"fencing_token":token,"expires_at_utc":_iso(expiry)}

    def heartbeat(self, task_id, worker, token, *, now=None, lease_seconds=900):
        stamp, scope = _now(now), f"task:{_id(task_id,'task_id')}"
        if not isinstance(lease_seconds,int) or isinstance(lease_seconds,bool) or not MIN_LEASE <= lease_seconds <= MAX_LEASE: raise DurableExecutionError("invalid lease duration")
        with self._tx() as db:
            old = self._lease(db,scope,_id(worker,"worker"),token,stamp); expiry = stamp + timedelta(seconds=lease_seconds)
            db.execute("UPDATE leases SET expires_at=?,heartbeat_at=? WHERE scope=?",(_iso(expiry),_iso(stamp),scope))
            db.execute("UPDATE tasks SET status='IN_PROGRESS',updated_at=? WHERE task_id=?",(_iso(stamp),task_id))
            self._event(db,scope,"TASK_HEARTBEAT",stamp,task_id,worker,token,{"previous_expiry":old["expires_at"],"new_expiry":_iso(expiry)})
            return {"task_id":task_id,"fencing_token":token,"expires_at_utc":_iso(expiry)}

    def checkpoint(self, task_id, worker, token, checkpoint, *, now=None):
        if not isinstance(checkpoint,dict): raise DurableExecutionError("checkpoint must be an object")
        data, stamp, scope = _dump(checkpoint), _now(now), f"task:{_id(task_id,'task_id')}"
        with self._tx() as db:
            self._lease(db,scope,_id(worker,"worker"),token,stamp)
            db.execute("UPDATE tasks SET checkpoint=?,updated_at=? WHERE task_id=?",(data,_iso(stamp),task_id))
            self._event(db,scope,"CHECKPOINT_SAVED",stamp,task_id,worker,token,{"sha256":hashlib.sha256(data.encode()).hexdigest()})
        return json.loads(data)

    def finish_task(self, task_id, worker, token, *, success, result=None, error_code=None, now=None):
        if not isinstance(success,bool) or not isinstance(result or {},dict): raise DurableExecutionError("invalid completion result")
        data, stamp, scope = _dump(result or {}), _now(now), f"task:{_id(task_id,'task_id')}"
        with self._tx() as db:
            self._lease(db,scope,_id(worker,"worker"),token,stamp)
            task = db.execute("SELECT * FROM tasks WHERE task_id=?",(task_id,)).fetchone()
            error = None if success else (error_code or "UNSPECIFIED")[:80]
            dead = not success and task["attempts"] >= task["max_attempts"]
            status = "COMPLETED" if success else ("DEAD_LETTER" if dead else "READY")
            available = None if success or dead else _iso(stamp + timedelta(seconds=_backoff(task["attempts"])))
            db.execute("UPDATE tasks SET status=?,result=?,available_at=?,error_code=?,updated_at=? WHERE task_id=?",
                       (status,data,available,error,_iso(stamp),task_id))
            db.execute("DELETE FROM leases WHERE scope=? AND worker=? AND token=?",(scope,worker,token))
            self._event(db,scope,"TASK_FINISHED",stamp,task_id,worker,token,{"status":status,"error_code":error})
            if dead: self._event(db,scope,"TASK_DEAD_LETTERED",stamp,task_id,worker,token,{"error_code":error})
            return self._task(db.execute("SELECT * FROM tasks WHERE task_id=?",(task_id,)).fetchone())

    def recover_expired_leases(self, *, now=None):
        stamp, recovered = _now(now), []
        with self._tx() as db:
            rows = db.execute("SELECT * FROM leases WHERE scope LIKE 'task:%' AND expires_at<=? ORDER BY scope",(_iso(stamp),)).fetchall()
            for lease in rows:
                task = db.execute("SELECT * FROM tasks WHERE task_id=?",(lease["task_id"],)).fetchone()
                if not task: db.execute("DELETE FROM leases WHERE scope=?",(lease["scope"],)); continue
                dead = task["attempts"] >= task["max_attempts"]
                status = "DEAD_LETTER" if dead else "READY"
                available = None if dead else _iso(stamp + timedelta(seconds=_backoff(task["attempts"])))
                db.execute("UPDATE tasks SET status=?,available_at=?,error_code='LEASE_EXPIRED',updated_at=? WHERE task_id=?",
                           (status,available,_iso(stamp),lease["task_id"]))
                db.execute("DELETE FROM leases WHERE scope=?",(lease["scope"],))
                self._event(db,lease["scope"],"LEASE_EXPIRED",stamp,lease["task_id"],lease["worker"],lease["token"],{"status":status})
                if dead: self._event(db,lease["scope"],"TASK_DEAD_LETTERED",stamp,lease["task_id"],lease["worker"],lease["token"],{"error_code":"LEASE_EXPIRED_RETRY_EXHAUSTED"})
                recovered.append(lease["task_id"])
        return recovered

    def acquire_lock(self, scope_key, worker, *, now=None, lease_seconds=900):
        scope_key, worker, stamp = _id(scope_key,"scope_key"), _id(worker,"worker"), _now(now)
        if not isinstance(lease_seconds,int) or isinstance(lease_seconds,bool) or not MIN_LEASE <= lease_seconds <= MAX_LEASE: raise DurableExecutionError("invalid lease duration")
        scope = f"lock:{scope_key}"
        with self._tx() as db:
            old = db.execute("SELECT * FROM leases WHERE scope=?",(scope,)).fetchone()
            if old and _date(old["expires_at"]) > stamp: raise DurableExecutionError("lock already held")
            if old:
                self._event(db,scope,"LOCK_EXPIRED_RECLAIMED",stamp,worker=old["worker"],token=old["token"])
                db.execute("DELETE FROM leases WHERE scope=?",(scope,))
            token, expiry = self._fence(db,scope), stamp + timedelta(seconds=lease_seconds)
            db.execute("INSERT INTO leases VALUES(?,NULL,?,?,?,?)",(scope,worker,token,_iso(expiry),_iso(stamp)))
            self._event(db,scope,"LOCK_ACQUIRED",stamp,worker=worker,token=token,payload={"expires_at_utc":_iso(expiry)})
            return {"scope_key":scope_key,"worker_id":worker,"fencing_token":token,"expires_at_utc":_iso(expiry)}

    def heartbeat_lock(self, scope_key, worker, token, *, now=None, lease_seconds=900):
        stamp, scope = _now(now), f"lock:{_id(scope_key,'scope_key')}"
        if not isinstance(lease_seconds,int) or isinstance(lease_seconds,bool) or not MIN_LEASE <= lease_seconds <= MAX_LEASE:
            raise DurableExecutionError("invalid lease duration")
        with self._tx() as db:
            old = self._lease(db,scope,_id(worker,"worker"),token,stamp)
            expiry = stamp + timedelta(seconds=lease_seconds)
            db.execute("UPDATE leases SET expires_at=?,heartbeat_at=? WHERE scope=?",(_iso(expiry),_iso(stamp),scope))
            self._event(db,scope,"LOCK_HEARTBEAT",stamp,worker=worker,token=token,
                        payload={"previous_expiry":old["expires_at"],"new_expiry":_iso(expiry)})
            return {"scope_key":scope_key,"worker_id":worker,"fencing_token":token,"expires_at_utc":_iso(expiry)}

    def assert_fence(self, scope_key, worker, token, *, now=None):
        stamp, scope = _now(now), f"lock:{_id(scope_key,'scope_key')}"
        with self._read() as db: self._lease(db,scope,_id(worker,"worker"),token,stamp)
        return True

    def release_lock(self, scope_key, worker, token, *, now=None):
        stamp, scope = _now(now), f"lock:{_id(scope_key,'scope_key')}"
        with self._tx() as db:
            self._lease(db,scope,_id(worker,"worker"),token,stamp)
            db.execute("DELETE FROM leases WHERE scope=? AND worker=? AND token=?",(scope,worker,token))
            self._event(db,scope,"LOCK_RELEASED",stamp,worker=worker,token=token)
        return True

    def events(self, task_id=None):
        with self._read() as db:
            rows = db.execute("SELECT * FROM events ORDER BY seq").fetchall() if task_id is None else db.execute("SELECT * FROM events WHERE task_id=? ORDER BY seq",(task_id,)).fetchall()
            return [{"seq":r["seq"],"event_id":r["event_id"],"task_id":r["task_id"],"scope":r["scope"],"kind":r["kind"],
                     "at":r["at"],"worker":r["worker"],"token":r["token"],"payload":json.loads(r["payload"]),
                     "prev_hash":r["prev_hash"],"event_hash":r["event_hash"]} for r in rows]

    def verify_event_chain(self):
        previous = "0" * 64
        for row in self.events():
            body = {"event_id":row["event_id"],"task_id":row["task_id"],"scope":row["scope"],"kind":row["kind"],
                    "at":row["at"],"worker":row["worker"],"token":row["token"],"payload":row["payload"],"prev_hash":previous}
            if row["prev_hash"] != previous or hashlib.sha256(_dump(body).encode()).hexdigest() != row["event_hash"]: return False
            previous = row["event_hash"]
        return True

def run_isolated_process(argv: Sequence[str], *, allowed_executables: set[str], allowed_script_paths: set[str],
                         timeout_seconds=30.0, cwd=None, env: Mapping[str,str] | None=None):
    """Execute only an allowlisted script; shell is disabled and output discarded."""
    if not isinstance(argv,(list,tuple)) or len(argv)<2 or any(not isinstance(x,str) for x in argv): raise DurableExecutionError("invalid argv")
    exe, script = os.path.realpath(argv[0]), os.path.realpath(argv[1])
    if exe not in {os.path.realpath(x) for x in allowed_executables} or script not in {os.path.realpath(x) for x in allowed_script_paths}:
        raise DurableExecutionError("executable/script is not allowlisted")
    if not isinstance(timeout_seconds,(int,float)) or isinstance(timeout_seconds,bool) or not 0.1 <= timeout_seconds <= 300:
        raise DurableExecutionError("timeout must be 0.1..300 seconds")
    child_env = {k:os.environ[k] for k in SAFE_ENV if k in os.environ}
    for key,value in (env or {}).items():
        if key not in SAFE_ENV or not isinstance(value,str): raise DurableExecutionError("child environment key is not allowlisted")
        child_env[key] = value
    kwargs = {"stdin":subprocess.DEVNULL,"stdout":subprocess.DEVNULL,"stderr":subprocess.DEVNULL,
              "cwd":cwd,"env":child_env,"shell":False,"close_fds":True}
    if os.name == "nt": kwargs["creationflags"] = getattr(subprocess,"CREATE_NEW_PROCESS_GROUP",0)
    else: kwargs["start_new_session"] = True
    started, proc = time.monotonic(), subprocess.Popen(list(argv),**kwargs)
    timed_out = False
    try: proc.wait(timeout=float(timeout_seconds))
    except subprocess.TimeoutExpired:
        timed_out = True
        try:
            if os.name == "nt": proc.kill()
            else: os.killpg(proc.pid,signal.SIGKILL)
        except ProcessLookupError: pass
        proc.wait()
    return {"status":"TIMED_OUT" if timed_out else ("SUCCEEDED" if proc.returncode==0 else "FAILED"),
            "returncode":proc.returncode,"duration_ms":max(0,int((time.monotonic()-started)*1000)),
            "timed_out":timed_out,"output_captured":False}
