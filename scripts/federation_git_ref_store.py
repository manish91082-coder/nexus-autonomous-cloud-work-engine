"""GitHub Git-ref CAS federation lease prototype.

Uses a dedicated branch as a durable shared state journal. Every transition is
an immutable Git commit and the branch is advanced without force-push. This is
a low-volume coordination prototype, not a high-throughput database.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone


class FederationLockError(RuntimeError):
    pass


class LockBusy(FederationLockError):
    pass


class StaleFence(FederationLockError):
    pass


class CASConflict(FederationLockError):
    pass


class LockStoreUnavailable(FederationLockError):
    pass


class ResourceNotFound(FederationLockError):
    pass


EVENT_CHUNK_SIZE = 256


def utc_now():
    return datetime.now(timezone.utc)


def iso_utc(value=None):
    value = value or utc_now()
    if value.tzinfo is None:
        raise FederationLockError("timestamp must be timezone-aware")
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_utc(value):
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (AttributeError, ValueError) as exc:
        raise FederationLockError("invalid UTC timestamp") from exc
    if parsed.tzinfo is None:
        raise FederationLockError("timestamp must include timezone")
    return parsed.astimezone(timezone.utc)


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)



def event_partition_path(events_dir, event, chunk_size=EVENT_CHUNK_SIZE):
    """Return a bounded monthly/sequence-chunk path for one immutable event batch."""
    if not isinstance(chunk_size, int) or chunk_size < 1 or chunk_size > 1024:
        raise FederationLockError("event chunk size must be 1..1024")
    sequence = event.get("sequence")
    stamp = parse_utc(event.get("timestamp_utc", ""))
    if not isinstance(sequence, int) or sequence < 1:
        raise FederationLockError("event sequence must be a positive integer")
    chunk = (sequence - 1) // chunk_size
    return f"{events_dir}/v2/{stamp:%Y}/{stamp:%m}/chunk-{chunk:08d}.json"


def append_event_to_chunk(existing, event, chunk_size=EVENT_CHUNK_SIZE):
    """Append without exceeding the fixed chunk bound or accepting duplicate sequences."""
    if not isinstance(existing, list) or len(existing) >= chunk_size:
        raise FederationLockError("event chunk is malformed or full")
    path = event_partition_path("events", event, chunk_size)
    if existing:
        previous = existing[-1]
        if not isinstance(previous, dict) or previous.get("sequence") >= event["sequence"]:
            raise FederationLockError("event chunk sequence is not strictly increasing")
        if event_partition_path("events", previous, chunk_size) != path:
            raise FederationLockError("event does not belong to this chunk")
    return [*existing, event]


def verify_event_chain(events, initial_hash="0" * 64, start_sequence=0):
    previous = initial_hash
    expected_sequence = start_sequence
    for event in events:
        if not isinstance(event, dict) or event.get("sequence") != expected_sequence:
            return False
        body = {key: value for key, value in event.items() if key != "event_hash"}
        if body.get("previous_event_hash") != previous:
            return False
        digest = hashlib.sha256(canonical_json(body).encode("utf-8")).hexdigest()
        if event.get("event_hash") != digest:
            return False
        previous = digest
        expected_sequence += 1
    return True


def validate_state(state):
    if not isinstance(state, dict) or state.get("schema_version") != "1.0":
        raise FederationLockError("unsupported lock state schema")
    for key in ("generation", "next_fencing_token", "max_active_leases", "lease_seconds", "heartbeat_seconds", "event_sequence"):
        if not isinstance(state.get(key), int) or isinstance(state.get(key), bool) or state[key] < 0:
            raise FederationLockError(f"invalid state field: {key}")
    if state["max_active_leases"] < 1 or state["max_active_leases"] > 32:
        raise FederationLockError("max_active_leases must be 1..32")
    if state["lease_seconds"] < 60 or state["lease_seconds"] > 3600:
        raise FederationLockError("lease_seconds must be 60..3600")
    if state["heartbeat_seconds"] < 30 or state["heartbeat_seconds"] >= state["lease_seconds"]:
        raise FederationLockError("invalid heartbeat interval")
    if not isinstance(state.get("leases"), list) or not isinstance(state.get("idempotency_records"), list):
        raise FederationLockError("leases and idempotency_records must be arrays")
    if not isinstance(state.get("last_event_hash"), str) or len(state["last_event_hash"]) != 64:
        raise FederationLockError("invalid event chain checkpoint")
    scopes = set()
    tokens = set()
    for lease in state["leases"]:
        if not isinstance(lease, dict):
            raise FederationLockError("malformed lease")
        scope = lease.get("scope")
        token = lease.get("fencing_token")
        if not isinstance(scope, str) or not scope or scope in scopes:
            raise FederationLockError("duplicate or invalid lease scope")
        if not isinstance(token, int) or token < 1 or token in tokens:
            raise FederationLockError("duplicate or invalid fencing token")
        parse_utc(lease.get("expires_at_utc", ""))
        scopes.add(scope)
        tokens.add(token)
    if len(state["leases"]) > state["max_active_leases"]:
        raise FederationLockError("active lease count exceeds cap")
    return True


def _event_for(state, kind, actor, payload, now=None, scope=None, token=None):
    body = {
        "sequence": state["event_sequence"] + 1,
        "event_id": str(uuid.uuid4()),
        "kind": kind,
        "timestamp_utc": iso_utc(now),
        "actor": actor,
        "scope": scope,
        "fencing_token": token,
        "previous_event_hash": state["last_event_hash"],
        "payload": payload or {},
    }
    digest = hashlib.sha256(canonical_json(body).encode("utf-8")).hexdigest()
    return {**body, "event_hash": digest}


def _apply_event(state, event):
    state["generation"] += 1
    state["event_sequence"] = event["sequence"]
    state["last_event_hash"] = event["event_hash"]
    state["updated_at_utc"] = event["timestamp_utc"]


def claim_transition(state, project_id, repository, task_id, idempotency_key, worker_id, *, now=None):
    validate_state(state)
    values = (project_id, repository, task_id, idempotency_key, worker_id)
    if any(not isinstance(v, str) or not v or len(v) > 256 for v in values):
        raise FederationLockError("invalid lease identity field")
    stamp = now or utc_now()
    scope = f"{project_id}/{repository}/{task_id}"
    new_state = copy.deepcopy(state)
    existing = next((x for x in new_state["leases"] if x["scope"] == scope), None)
    if existing and parse_utc(existing["expires_at_utc"]) > stamp:
        raise LockBusy("scope already has an active lease")
    if existing:
        new_state["leases"].remove(existing)
    if len(new_state["leases"]) >= new_state["max_active_leases"]:
        raise LockBusy("global active lease cap reached")
    token = new_state["next_fencing_token"] + 1
    lease = {
        "scope": scope,
        "project_id": project_id,
        "repository": repository,
        "task_id": task_id,
        "idempotency_key": idempotency_key,
        "worker_id": worker_id,
        "fencing_token": token,
        "issued_at_utc": iso_utc(stamp),
        "heartbeat_at_utc": iso_utc(stamp),
        "expires_at_utc": iso_utc(stamp + timedelta(seconds=new_state["lease_seconds"])),
    }
    new_state["next_fencing_token"] = token
    new_state["leases"].append(lease)
    kind = "LEASE_RECLAIMED" if existing else "LEASE_CLAIMED"
    event = _event_for(new_state, kind, worker_id, {"idempotency_key": idempotency_key}, stamp, scope, token)
    _apply_event(new_state, event)
    validate_state(new_state)
    return new_state, lease, event


def heartbeat_transition(state, scope, worker_id, token, *, now=None):
    validate_state(state)
    stamp = now or utc_now()
    new_state = copy.deepcopy(state)
    lease = next((x for x in new_state["leases"] if x["scope"] == scope), None)
    if not lease or lease["worker_id"] != worker_id or lease["fencing_token"] != token:
        raise StaleFence("lease owner or fencing token mismatch")
    if parse_utc(lease["expires_at_utc"]) <= stamp:
        raise StaleFence("lease expired")
    previous_expiry = lease["expires_at_utc"]
    lease["heartbeat_at_utc"] = iso_utc(stamp)
    lease["expires_at_utc"] = iso_utc(stamp + timedelta(seconds=new_state["lease_seconds"]))
    event = _event_for(new_state, "LEASE_HEARTBEAT", worker_id,
                       {"previous_expiry_utc": previous_expiry, "new_expiry_utc": lease["expires_at_utc"]},
                       stamp, scope, token)
    _apply_event(new_state, event)
    validate_state(new_state)
    return new_state, lease, event


def release_transition(state, scope, worker_id, token, *, now=None):
    validate_state(state)
    stamp = now or utc_now()
    new_state = copy.deepcopy(state)
    lease = next((x for x in new_state["leases"] if x["scope"] == scope), None)
    if not lease or lease["worker_id"] != worker_id or lease["fencing_token"] != token:
        raise StaleFence("lease owner or fencing token mismatch")
    new_state["leases"] = [x for x in new_state["leases"] if x["scope"] != scope]
    event = _event_for(new_state, "LEASE_RELEASED", worker_id, {}, stamp, scope, token)
    _apply_event(new_state, event)
    validate_state(new_state)
    return new_state, event


class GitHubGitRefStore:
    """Atomic-by-fast-forward state writer for one dedicated Git branch."""

    def __init__(self, repository, token=None, *, branch="federation-locks",
                 state_path="federation/locks/state.json", events_dir="federation/locks/events",
                 api_base="https://api.github.com", max_retries=5, opener=None):
        self.repository = repository or os.getenv("GITHUB_REPOSITORY", "")
        self.token = token or os.getenv("GITHUB_TOKEN", "")
        self.branch = branch
        self.state_path = state_path
        self.events_dir = events_dir
        self.api_base = api_base.rstrip("/")
        self.max_retries = max_retries
        self.opener = opener or urllib.request.urlopen
        if not self.repository or "/" not in self.repository:
            raise FederationLockError("GITHUB_REPOSITORY must be owner/repo")
        if not self.token:
            raise FederationLockError("GITHUB_TOKEN is required")
        if not 1 <= self.max_retries <= 10:
            raise FederationLockError("max_retries must be 1..10")

    def _request(self, method, path, payload=None):
        url = self.api_base + path
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            url, data=data, method=method,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "nexus-federation-lock-store",
                "Content-Type": "application/json",
            },
        )
        try:
            with self.opener(request, timeout=20) as response:
                raw = response.read()
                return json.loads(raw.decode("utf-8")) if raw else {}
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:1000]
            if exc.code == 404:
                raise ResourceNotFound(detail or "GitHub resource not found") from exc
            if exc.code in (409, 422) and method == "PATCH" and "/git/refs/" in path:
                raise CASConflict(detail or "branch ref compare-and-swap conflict") from exc
            if exc.code in (403, 429):
                raise LockStoreUnavailable(f"GitHub quota/permission gate HTTP {exc.code}: {detail}") from exc
            raise LockStoreUnavailable(f"GitHub API HTTP {exc.code}: {detail}") from exc
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            raise LockStoreUnavailable(f"GitHub API unavailable: {type(exc).__name__}") from exc

    def _ref_get_path(self):
        return "/repos/" + self.repository + "/git/ref/heads/" + urllib.parse.quote(self.branch, safe="/")

    def _ref_update_path(self):
        return "/repos/" + self.repository + "/git/refs/heads/" + urllib.parse.quote(self.branch, safe="/")

    def _read_snapshot(self):
        ref = self._request("GET", self._ref_get_path())
        head = ref.get("object", {}).get("sha")
        if not isinstance(head, str) or len(head) != 40:
            raise FederationLockError("branch ref returned invalid commit SHA")
        commit = self._request("GET", f"/repos/{self.repository}/git/commits/{head}")
        tree_sha = commit.get("tree", {}).get("sha")
        if not isinstance(tree_sha, str) or len(tree_sha) != 40:
            raise FederationLockError("branch commit returned invalid tree SHA")
        encoded_path = urllib.parse.quote(self.state_path, safe="/")
        content = self._request("GET", f"/repos/{self.repository}/contents/{encoded_path}?ref={urllib.parse.quote(self.branch)}")
        try:
            raw = __import__("base64").b64decode(content["content"]).decode("utf-8")
            state = json.loads(raw)
        except Exception as exc:
            raise FederationLockError("lock state file is missing or malformed") from exc
        validate_state(state)
        return head, tree_sha, state

    def _commit(self, parent_sha, tree_sha, new_state, event):
        state_blob = self._request("POST", f"/repos/{self.repository}/git/blobs",
                                   {"content": json.dumps(new_state, ensure_ascii=False, indent=2) + "\n", "encoding": "utf-8"})
        event_path = event_partition_path(self.events_dir, event)
        encoded_event_path = urllib.parse.quote(event_path, safe="/")
        try:
            existing_payload = self._request(
                "GET", f"/repos/{self.repository}/contents/{encoded_event_path}?ref={urllib.parse.quote(parent_sha)}"
            )
            existing_raw = __import__("base64").b64decode(existing_payload["content"]).decode("utf-8")
            existing_events = json.loads(existing_raw)
        except ResourceNotFound:
            existing_events = []
        except Exception as exc:
            if isinstance(exc, FederationLockError):
                raise
            raise FederationLockError("existing event chunk is malformed or unreadable") from exc
        chunk_events = append_event_to_chunk(existing_events, event)
        event_blob = self._request("POST", f"/repos/{self.repository}/git/blobs",
                                   {"content": json.dumps(chunk_events, ensure_ascii=False, indent=2) + "\n", "encoding": "utf-8"})
        tree = self._request("POST", f"/repos/{self.repository}/git/trees", {
            "base_tree": tree_sha,
            "tree": [
                {"path": self.state_path, "mode": "100644", "type": "blob", "sha": state_blob["sha"]},
                {"path": event_path, "mode": "100644", "type": "blob", "sha": event_blob["sha"]},
            ],
        })
        commit = self._request("POST", f"/repos/{self.repository}/git/commits", {
            "message": f"federation-lock: {event['kind']} {event['scope'] or 'global'} fence={event['fencing_token'] or 0}",
            "tree": tree["sha"],
            "parents": [parent_sha],
        })
        self._request("PATCH", self._ref_update_path(), {"sha": commit["sha"], "force": False})
        return commit["sha"]

    def _mutate(self, transition):
        last_conflict = None
        for attempt in range(self.max_retries):
            head, tree, state = self._read_snapshot()
            new_state, result, event = transition(state)
            try:
                commit_sha = self._commit(head, tree, new_state, event)
                return result, commit_sha
            except CASConflict as exc:
                last_conflict = exc
                if attempt + 1 < self.max_retries:
                    time.sleep(min(0.1 * (2 ** attempt), 1.0))
                    continue
                break
        raise CASConflict(f"CAS retry budget exhausted: {last_conflict}")

    def claim(self, project_id, repository, task_id, idempotency_key, worker_id, *, now=None):
        def transition(state):
            return claim_transition(state, project_id, repository, task_id, idempotency_key, worker_id, now=now)
        return self._mutate(transition)

    def heartbeat(self, scope, worker_id, fencing_token, *, now=None):
        def transition(state):
            return heartbeat_transition(state, scope, worker_id, fencing_token, now=now)
        return self._mutate(transition)

    def release(self, scope, worker_id, fencing_token, *, now=None):
        def transition(state):
            new_state, event = release_transition(state, scope, worker_id, fencing_token, now=now)
            return new_state, True, event
        return self._mutate(transition)

    def assert_fence(self, scope, worker_id, fencing_token, *, now=None):
        _, _, state = self._read_snapshot()
        stamp = now or utc_now()
        lease = next((x for x in state["leases"] if x["scope"] == scope), None)
        if not lease or lease["worker_id"] != worker_id or lease["fencing_token"] != fencing_token:
            raise StaleFence("lease owner or fencing token mismatch")
        if parse_utc(lease["expires_at_utc"]) <= stamp:
            raise StaleFence("lease expired")
        return True


    def verify_journal(self):
        _, _, state = self._read_snapshot()
        ref_query = urllib.parse.quote(self.branch)
        root = self._request(
            "GET", f"/repos/{self.repository}/contents/{urllib.parse.quote(self.events_dir, safe='/')}?ref={ref_query}"
        )
        if not isinstance(root, list) or len(root) > 1000:
            raise FederationLockError("legacy event root listing invalid or exceeds 1000 entries")
        events = []

        # Backward compatibility: original prototype stored one JSON file per event.
        for item in root:
            if not isinstance(item, dict):
                raise FederationLockError("malformed event root entry")
            if item.get("type") == "file" and item.get("name", "").endswith(".json"):
                path = item.get("path", "")
                payload = self._request(
                    "GET", f"/repos/{self.repository}/contents/{urllib.parse.quote(path, safe='/')}?ref={ref_query}"
                )
                try:
                    raw = __import__("base64").b64decode(payload["content"]).decode("utf-8")
                    parsed = json.loads(raw)
                except Exception as exc:
                    raise FederationLockError("legacy event file is missing or malformed") from exc
                if not isinstance(parsed, dict):
                    raise FederationLockError("legacy event file must contain one object")
                events.append(parsed)

        # New layout: events/v2/YYYY/MM/chunk-NNNNNNNN.json. Each chunk is
        # bounded to EVENT_CHUNK_SIZE events; directory listings are partition-local.
        v2 = next((x for x in root if isinstance(x, dict) and x.get("type") == "dir" and x.get("name") == "v2"), None)
        if v2:
            years = self._request(
                "GET", f"/repos/{self.repository}/contents/{urllib.parse.quote(v2['path'], safe='/')}?ref={ref_query}"
            )
            if not isinstance(years, list) or len(years) > 1000:
                raise FederationLockError("event year partition listing invalid")
            for year in years:
                if not isinstance(year, dict) or year.get("type") != "dir":
                    raise FederationLockError("malformed event year partition")
                months = self._request(
                    "GET", f"/repos/{self.repository}/contents/{urllib.parse.quote(year['path'], safe='/')}?ref={ref_query}"
                )
                if not isinstance(months, list) or len(months) > 1000:
                    raise FederationLockError("event month partition listing invalid")
                for month in months:
                    if not isinstance(month, dict) or month.get("type") != "dir":
                        raise FederationLockError("malformed event month partition")
                    chunks = self._request(
                        "GET", f"/repos/{self.repository}/contents/{urllib.parse.quote(month['path'], safe='/')}?ref={ref_query}"
                    )
                    if not isinstance(chunks, list) or len(chunks) > 1000:
                        raise FederationLockError("event chunk listing invalid")
                    for chunk in chunks:
                        if not isinstance(chunk, dict) or chunk.get("type") != "file" or not chunk.get("name", "").endswith(".json"):
                            raise FederationLockError("malformed event chunk entry")
                        payload = self._request(
                            "GET", f"/repos/{self.repository}/contents/{urllib.parse.quote(chunk['path'], safe='/')}?ref={ref_query}"
                        )
                        try:
                            raw = __import__("base64").b64decode(payload["content"]).decode("utf-8")
                            parsed = json.loads(raw)
                        except Exception as exc:
                            raise FederationLockError("event chunk is missing or malformed") from exc
                        if not isinstance(parsed, list) or not 1 <= len(parsed) <= EVENT_CHUNK_SIZE:
                            raise FederationLockError("event chunk must contain 1..256 events")
                        events.extend(parsed)

        events.sort(key=lambda event: event.get("sequence", -1) if isinstance(event, dict) else -1)
        if len(events) != state["event_sequence"] + 1:
            raise FederationLockError("event count does not match state checkpoint")
        if not verify_event_chain(events):
            raise FederationLockError("append-only event hash chain verification failed")
        if not events or events[-1].get("event_hash") != state["last_event_hash"]:
            raise FederationLockError("state last_event_hash does not match journal tail")
        return {
            "event_count": len(events),
            "legacy_event_count": sum(1 for x in root if isinstance(x, dict) and x.get("type") == "file" and x.get("name", "").endswith(".json")),
            "last_event_hash": state["last_event_hash"],
            "verified": True,
        }

    def snapshot(self):
        head, _, state = self._read_snapshot()
        return {"head_sha": head, "state": state}
