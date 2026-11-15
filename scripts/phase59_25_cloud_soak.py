#!/usr/bin/env python3
"""Bounded real-GitHub-API cloud soak against an isolated disposable test branch."""
from __future__ import annotations

import json
import os
import platform
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.federation_git_ref_store import (
    GitHubGitRefStore, LockBusy, StaleFence, LockStoreUnavailable,
)
from scripts.github_api_quota_guard import GitHubApiQuotaGuard

REPORT = ROOT / "phase59_25_cloud_soak_report.json"
STATE_PATH = "federation/phase59-25-cloud-soak/state.json"
EVENTS_DIR = "federation/phase59-25-cloud-soak/events"
WORKER_COUNT = 8
SOAK_SECONDS = int(os.getenv("PHASE59_25_SOAK_SECONDS", "180"))
HEARTBEAT_INTERVAL_SECONDS = int(os.getenv("PHASE59_25_HEARTBEAT_INTERVAL_SECONDS", "30"))
RUN_REQUEST_CEILING = int(os.getenv("PHASE59_25_RUN_REQUEST_CEILING", "480"))
SAFETY_RESERVE = int(os.getenv("NEXUS_GITHUB_API_SAFETY_RESERVE", "100"))


def utc_stamp():
    return datetime.now(timezone.utc).isoformat()


def make_store(repository, token, branch, shared_guard, *, local_ceiling=48, retries=5):
    return GitHubGitRefStore(
        repository, token, branch=branch, state_path=STATE_PATH,
        events_dir=EVENTS_DIR, max_retries=retries,
        request_ceiling=local_ceiling, safety_reserve=SAFETY_RESERVE,
        shared_quota_guard=shared_guard,
    )


def run_parallel_claims(repository, token, branch, shared_guard):
    barrier = threading.Barrier(WORKER_COUNT)
    results = []
    failures = []
    result_lock = threading.Lock()

    def worker(index):
        worker_id = f"gha-{os.getenv('GITHUB_RUN_ID', 'local')}-worker-{index}"
        store = make_store(repository, token, branch, shared_guard)
        barrier.wait(timeout=20)
        try:
            lease, commit_sha = store.claim(
                "P10CR", repository, f"cloud-soak-task-{index}",
                f"phase59-25-idempotency-{index}", worker_id,
            )
            result = {
                "worker_id": worker_id,
                "status": "CLAIMED",
                "fencing_token": lease["fencing_token"],
                "scope": lease["scope"],
                "commit_sha": commit_sha,
                "local_api_requests": store.quota_telemetry()["requests_attempted"],
            }
            with result_lock:
                results.append(result)
        except Exception as exc:
            with result_lock:
                failures.append({
                    "worker_id": worker_id,
                    "error_type": type(exc).__name__,
                    "error": str(exc)[:240],
                })

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(WORKER_COUNT)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(90)
    if any(thread.is_alive() for thread in threads):
        raise RuntimeError("cloud worker thread exceeded 90-second join bound")
    if failures or len(results) != WORKER_COUNT:
        diagnostics = {
            "successful_workers": results,
            "worker_failures": failures,
            "shared_quota": shared_guard.snapshot(),
        }
        print(json.dumps({"stage": "unique_claims", **diagnostics}, ensure_ascii=False, indent=2))
        raise RuntimeError("cloud worker claim stage failed: " + json.dumps(diagnostics, ensure_ascii=False))
    return sorted(results, key=lambda x: x["worker_id"])


def run_duplicate_delivery_probe(repository, token, branch, shared_guard, winning_lease):
    barrier = threading.Barrier(WORKER_COUNT)
    rejected = []
    unexpected = []
    lock = threading.Lock()

    def duplicate(index):
        store = make_store(repository, token, branch, shared_guard)
        barrier.wait(timeout=20)
        try:
            store.claim(
                "P10CR", repository, winning_lease["task_id"],
                winning_lease["idempotency_key"], f"duplicate-{index}",
            )
            outcome = "UNEXPECTED_CLAIM"
        except LockBusy:
            outcome = "REJECTED_LOCK_BUSY"
        except Exception as exc:
            outcome = f"ERROR_{type(exc).__name__}:{str(exc)[:160]}"
        with lock:
            (rejected if outcome == "REJECTED_LOCK_BUSY" else unexpected).append(outcome)

    threads = [threading.Thread(target=duplicate, args=(i,)) for i in range(WORKER_COUNT)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(60)
    if any(thread.is_alive() for thread in threads):
        raise RuntimeError("duplicate delivery probe exceeded 60-second join bound")
    if len(rejected) != WORKER_COUNT or unexpected:
        raise RuntimeError("duplicate delivery was not rejected consistently")
    return len(rejected)


def main():
    started = time.monotonic()
    started_utc = utc_stamp()
    repository = os.getenv("GITHUB_REPOSITORY", "")
    token = os.getenv("GITHUB_TOKEN", "")
    branch = os.getenv("PHASE59_25_STATE_BRANCH", "phase59-25-cloud-soak-state")
    if not repository or "/" not in repository or not token:
        raise RuntimeError("GITHUB_REPOSITORY and GITHUB_TOKEN are required")
    if not 60 <= SOAK_SECONDS <= 600:
        raise ValueError("PHASE59_25_SOAK_SECONDS must be 60..600")
    if not 15 <= HEARTBEAT_INTERVAL_SECONDS <= 60:
        raise ValueError("heartbeat interval must be 15..60 seconds")
    if RUN_REQUEST_CEILING > 480 or RUN_REQUEST_CEILING < 120:
        raise ValueError("run request ceiling must be 120..480")
    if SAFETY_RESERVE < 100:
        raise ValueError("safety reserve cannot be lower than 100")

    shared_guard = GitHubApiQuotaGuard(
        request_ceiling=RUN_REQUEST_CEILING,
        safety_reserve=SAFETY_RESERVE,
    )
    store = make_store(repository, token, branch, shared_guard)
    initial = store.snapshot()["state"]
    if initial.get("federation_id") != "P10CR-PHASE59-25-ISOLATED-CLOUD-SOAK":
        raise RuntimeError("refusing to touch a branch without the Phase 59.25 isolated federation ID")
    if initial.get("status") != "ISOLATED_TEST_ONLY_NOT_PRODUCTION_ENABLED":
        raise RuntimeError("isolated test branch status mismatch")
    if initial.get("leases") or initial.get("event_sequence") != 0:
        raise RuntimeError("isolated test branch is not in its pristine seeded state")

    # Eight independent Python workers perform actual GitHub Git-ref CAS writes.
    workers = run_parallel_claims(repository, token, branch, shared_guard)
    state_after_claims = make_store(repository, token, branch, shared_guard).snapshot()["state"]
    if len(state_after_claims["leases"]) != WORKER_COUNT:
        raise RuntimeError("durable lease count does not equal eight")
    if len({x["fencing_token"] for x in state_after_claims["leases"]}) != WORKER_COUNT:
        raise RuntimeError("fencing tokens are not unique")

    # Real backend duplicate delivery: eight attempts against an already-held scope.
    winning_lease = state_after_claims["leases"][0]
    duplicate_rejections = run_duplicate_delivery_probe(
        repository, token, branch, shared_guard, winning_lease
    )

    # Wrong-owner heartbeat must be rejected without a write.
    fence_store = make_store(repository, token, branch, shared_guard)
    stale_fence_rejected = False
    try:
        fence_store.heartbeat(
            winning_lease["scope"], "unauthorized-stale-worker",
            winning_lease["fencing_token"],
        )
    except StaleFence:
        stale_fence_rejected = True
    if not stale_fence_rejected:
        raise RuntimeError("stale worker identity was not rejected")

    renewals = [
        (lease["scope"], lease["worker_id"], lease["fencing_token"])
        for lease in state_after_claims["leases"]
    ]
    cycles = max(1, SOAK_SECONDS // HEARTBEAT_INTERVAL_SECONDS)
    heartbeat_events = []
    soak_started = time.monotonic()
    for cycle in range(cycles):
        time.sleep(HEARTBEAT_INTERVAL_SECONDS)
        controller = make_store(repository, token, branch, shared_guard)
        renewed, commit_sha = controller.heartbeat_batch(renewals)
        if len(renewed) != WORKER_COUNT:
            raise RuntimeError("heartbeat batch did not renew all eight cloud leases")
        heartbeat_events.append({
            "cycle": cycle + 1,
            "renewed_count": len(renewed),
            "commit_sha": commit_sha,
            "at_utc": utc_stamp(),
        })
    soak_elapsed = round(time.monotonic() - soak_started, 3)

    verifier = make_store(repository, token, branch, shared_guard)
    journal = verifier.verify_journal()
    final_snapshot = verifier.snapshot()
    final_state = final_snapshot["state"]
    telemetry = shared_guard.snapshot()
    expected_events = 1 + WORKER_COUNT + cycles
    if journal["event_count"] != expected_events:
        raise RuntimeError(f"journal event count mismatch: expected {expected_events}, got {journal['event_count']}")
    if len(final_state["leases"]) != WORKER_COUNT:
        raise RuntimeError("final durable state lost one or more leases")
    if telemetry["telemetry_missing"] or telemetry["transport_failures"]:
        raise RuntimeError("API quota telemetry was incomplete during cloud soak")
    if telemetry["rate_remaining"] is None or telemetry["rate_remaining"] <= SAFETY_RESERVE:
        raise RuntimeError("GitHub API safety reserve reached during cloud soak")
    if telemetry["requests_attempted"] > RUN_REQUEST_CEILING:
        raise RuntimeError("shared run-wide API request ceiling exceeded")

    report = {
        "schema_version": "1.0",
        "phase": "59.25",
        "result": "PASS",
        "started_at_utc": started_utc,
        "completed_at_utc": utc_stamp(),
        "duration_seconds": round(time.monotonic() - started, 3),
        "cloud_environment": "GitHub Actions ubuntu-latest",
        "repository": repository,
        "workflow_run_id": os.getenv("GITHUB_RUN_ID"),
        "workflow_run_attempt": os.getenv("GITHUB_RUN_ATTEMPT"),
        "workflow_sha": os.getenv("GITHUB_SHA"),
        "runner_os": platform.platform(),
        "isolated_state_branch": branch,
        "isolated_state_path": STATE_PATH,
        "worker_count": WORKER_COUNT,
        "unique_durable_claims": len(workers),
        "unique_fencing_tokens": len({x["fencing_token"] for x in workers}),
        "duplicate_delivery_attempts": WORKER_COUNT,
        "duplicate_delivery_rejections": duplicate_rejections,
        "stale_fence_rejected": stale_fence_rejected,
        "soak_target_seconds": SOAK_SECONDS,
        "soak_elapsed_seconds": soak_elapsed,
        "heartbeat_interval_seconds": HEARTBEAT_INTERVAL_SECONDS,
        "heartbeat_cycles": len(heartbeat_events),
        "heartbeat_events": heartbeat_events,
        "final_active_leases": len(final_state["leases"]),
        "final_generation": final_state["generation"],
        "journal": journal,
        "api_quota_telemetry": telemetry,
        "workers": workers,
        "production_federation_branch_touched": False,
        "production_clients_enabled": False,
        "ai_provider_inference_enabled": False,
        "new_spend_inr": 0,
        "verified_pcne_inr": 0,
        "limitations": [
            "This run exercises actual GitHub Git-ref REST CAS writes on a dedicated disposable test branch.",
            "All eight worker threads execute inside one GitHub-hosted runner; this is not an eight-host distributed deployment.",
            "The run is a bounded short operational soak, not the required 7-day/30-day production soak.",
            "The shared request ceiling is process/run-local; cross-run and cross-repository global quota arbitration remains a separate P59-003 gate.",
            "No production lock branch, product account, customer data, paid provider, or inference API is used."
        ],
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        failure = {
            "schema_version": "1.0",
            "phase": "59.25",
            "result": "FAIL",
            "completed_at_utc": utc_stamp(),
            "workflow_run_id": os.getenv("GITHUB_RUN_ID"),
            "workflow_sha": os.getenv("GITHUB_SHA"),
            "error_type": type(exc).__name__,
            "error": str(exc)[:500],
            "new_spend_inr": 0,
            "verified_pcne_inr": 0,
            "production_federation_branch_touched": False,
            "production_clients_enabled": False,
        }
        REPORT.write_text(json.dumps(failure, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(failure, ensure_ascii=False, indent=2))
        raise
