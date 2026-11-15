#!/usr/bin/env python3
"""Live, bounded GitHub branch-CAS race probe for the dedicated lock branch."""
from __future__ import annotations

import json
import os
import threading
from concurrent.futures import ThreadPoolExecutor

from scripts.federation_git_ref_store import GitHubGitRefStore, LockBusy


def main():
    repository = os.environ["GITHUB_REPOSITORY"]
    run_id = os.environ["GITHUB_RUN_ID"]
    attempt = os.environ.get("GITHUB_RUN_ATTEMPT", "1")
    store = GitHubGitRefStore(repository, branch="federation-locks", max_retries=8)
    task_id = f"CAS-PROBE-{run_id}-{attempt}"
    idempotency = f"cas-probe-{run_id}-{attempt}"
    barrier = threading.Barrier(20)
    outcomes = []
    lock = threading.Lock()

    def contender(index):
        barrier.wait(timeout=10)
        try:
            lease, commit_sha = store.claim(
                "P10CR-CAS-PROBE", repository, task_id, idempotency, f"probe-worker-{index}"
            )
            result = ("WON", lease, commit_sha)
        except LockBusy:
            result = ("BUSY", None, None)
        with lock:
            outcomes.append(result)

    with ThreadPoolExecutor(max_workers=20) as pool:
        list(pool.map(contender, range(20)))

    winners = [x for x in outcomes if x[0] == "WON"]
    busy = [x for x in outcomes if x[0] == "BUSY"]
    if len(winners) != 1 or len(busy) != 19:
        raise SystemExit(f"CAS invariant failed: winners={len(winners)} busy={len(busy)}")

    lease = winners[0][1]
    store.assert_fence(lease["scope"], lease["worker_id"], lease["fencing_token"])
    store.release(lease["scope"], lease["worker_id"], lease["fencing_token"])
    final = store.snapshot()["state"]
    if any(item["scope"] == lease["scope"] for item in final["leases"]):
        raise SystemExit("probe lease cleanup failed")

    print(json.dumps({
        "result": "PASS",
        "contenders": 20,
        "winners": len(winners),
        "busy": len(busy),
        "fencing_token": lease["fencing_token"],
        "release_committed": True,
        "remaining_active_leases": len(final["leases"]),
        "branch": "federation-locks",
    }, indent=2))


if __name__ == "__main__":
    main()
