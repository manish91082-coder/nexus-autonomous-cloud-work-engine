"""Bounded parallel specialist coordinator prototype (deterministic, provider-neutral).

B3 deliberately accepts injected worker callables and untrusted JSON payloads only.
It does not invoke models, execute generated code, mutate mission state, or perform
external side effects. Worker functions must be bounded and side-effect-free.
"""
from __future__ import annotations

from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from copy import deepcopy
from dataclasses import dataclass
import hashlib
import json
import re
import time
from typing import Callable, Mapping


class CoordinatorError(ValueError):
    """Raised when a coordinator contract or invocation is invalid."""


@dataclass(frozen=True)
class Specialist:
    worker_id: str
    run: Callable[[dict], dict]


def _json_object(value: object, label: str) -> dict:
    if not isinstance(value, dict):
        raise CoordinatorError(f"{label} must be a JSON object")
    try:
        # Round-trip rejects non-JSON values and detaches caller-owned objects.
        cloned = json.loads(json.dumps(value, sort_keys=True, allow_nan=False))
    except (TypeError, ValueError) as exc:
        raise CoordinatorError(f"{label} must contain finite JSON data") from exc
    return cloned


def validate_envelope(envelope: object) -> dict:
    data = _json_object(envelope, "task envelope")
    required = ("schema_version", "run_id", "task_id", "payload")
    if any(not isinstance(data.get(k), str) or not data[k] for k in required[:3]):
        raise CoordinatorError("envelope requires schema_version, run_id and task_id")
    if data["schema_version"] != "1.0":
        raise CoordinatorError("unsupported envelope schema")
    if not isinstance(data["payload"], dict):
        raise CoordinatorError("envelope payload must be an object")
    return data


def _worker_record(worker_id: str, status: str, result: dict | None,
                   error_code: str | None, duration_ms: int) -> dict:
    return {
        "worker_id": worker_id,
        "status": status,
        "result": result if result is not None else {},
        "error_code": error_code,
        "duration_ms": max(0, int(duration_ms)),
    }


def run_specialists(
    envelope: object,
    specialists: list[Specialist],
    *,
    timeout_seconds: float = 10.0,
    max_workers: int = 5,
) -> dict:
    """Run up to five specialists concurrently and return a hash-sealed audit.

    A timeout isolates the coordinator result and attempts to cancel the Future.
    Python threads cannot be forcibly terminated; therefore this prototype is
    only for pure, bounded workers. Process isolation belongs to a later phase.
    """
    task = validate_envelope(envelope)
    if not isinstance(specialists, list) or not specialists:
        raise CoordinatorError("at least one specialist is required")
    if not isinstance(max_workers, int) or isinstance(max_workers, bool) or not 1 <= max_workers <= 5:
        raise CoordinatorError("max_workers must be an integer in 1..5")
    if not isinstance(timeout_seconds, (int, float)) or isinstance(timeout_seconds, bool) or not 0 < timeout_seconds <= 300:
        raise CoordinatorError("timeout_seconds must be in (0, 300]")
    ids = [s.worker_id for s in specialists if isinstance(s, Specialist)]
    if len(ids) != len(specialists) or any(not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}", x or "") for x in ids):
        raise CoordinatorError("each specialist needs a valid worker_id and callable")
    if len(set(ids)) != len(ids):
        raise CoordinatorError("specialist worker_id values must be unique")
    if any(not callable(s.run) for s in specialists):
        raise CoordinatorError("specialist run must be callable")
    if len(specialists) > max_workers:
        raise CoordinatorError("specialist count exceeds max_workers")

    started = time.monotonic()
    executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="mission-specialist")
    pending = {}
    records = {}
    try:
        for specialist in specialists:
            worker_start = time.monotonic()
            future = executor.submit(specialist.run, deepcopy(task["payload"]))
            pending[future] = (specialist.worker_id, worker_start, worker_start + timeout_seconds)

        while pending:
            now = time.monotonic()
            next_deadline = min(item[2] for item in pending.values())
            completed, _ = wait(
                tuple(pending),
                timeout=max(0.0, next_deadline - now),
                return_when=FIRST_COMPLETED,
            )
            now = time.monotonic()
            for future in completed:
                worker_id, worker_start, _ = pending.pop(future)
                try:
                    result = _json_object(future.result(), "worker result")
                    records[worker_id] = _worker_record(
                        worker_id, "SUCCEEDED", result, None,
                        (now - worker_start) * 1000,
                    )
                except Exception as exc:  # isolate each worker; never expose exception text
                    records[worker_id] = _worker_record(
                        worker_id, "FAILED", {}, type(exc).__name__,
                        (now - worker_start) * 1000,
                    )
            for future, (worker_id, worker_start, deadline) in list(pending.items()):
                if deadline <= now:
                    future.cancel()
                    records[worker_id] = _worker_record(
                        worker_id, "TIMED_OUT", {}, "TIMEOUT",
                        (now - worker_start) * 1000,
                    )
                    pending.pop(future)

        ordered = [records[key] for key in sorted(records)]
        statuses = [item["status"] for item in ordered]
        if all(status == "SUCCEEDED" for status in statuses):
            run_status = "SUCCEEDED"
        elif any(status == "SUCCEEDED" for status in statuses):
            run_status = "PARTIAL"
        else:
            run_status = "FAILED"
        audit = {
            "schema_version": "1.0",
            "run_id": task["run_id"],
            "task_id": task["task_id"],
            "status": run_status,
            "worker_count": len(ordered),
            "succeeded": statuses.count("SUCCEEDED"),
            "failed": statuses.count("FAILED"),
            "timed_out": statuses.count("TIMED_OUT"),
            "worker_results": ordered,
            "duration_ms": max(0, int((time.monotonic() - started) * 1000)),
        }
        canonical = json.dumps(audit, sort_keys=True, separators=(",", ":"), allow_nan=False)
        audit["audit_sha256"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        return audit
    finally:
        # Non-blocking: a timed-out pure worker may finish later, but cannot alter
        # the already sealed audit or coordinator state.
        executor.shutdown(wait=False, cancel_futures=True)


def verify_audit(audit: object) -> bool:
    data = _json_object(audit, "audit")
    supplied = data.pop("audit_sha256", None)
    if not isinstance(supplied, str) or not re.fullmatch(r"[a-f0-9]{64}", supplied):
        return False
    canonical = json.dumps(data, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest() == supplied
