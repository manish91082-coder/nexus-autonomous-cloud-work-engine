import copy
import threading
import time
import unittest
from datetime import datetime, timedelta, timezone

from scripts.federation_git_ref_store import (
    CASConflict, LockBusy, StaleFence, claim_transition, heartbeat_batch_transition,
    heartbeat_transition, release_transition, verify_event_chain,
)

T0 = datetime(2026, 11, 15, 9, 0, tzinfo=timezone.utc)


def initial_state():
    return {
        "schema_version": "1.0",
        "federation_id": "P10CR-PHASE59-24-TEST",
        "status": "TEST_ONLY_NOT_PRODUCTION_ENABLED",
        "backend": "IN_MEMORY_CAS_TEST_HARNESS",
        "generation": 0,
        "next_fencing_token": 0,
        "max_active_leases": 8,
        "lease_seconds": 900,
        "heartbeat_seconds": 300,
        "leases": [],
        "quota_reservations": [],
        "idempotency_records": [],
        "event_sequence": 0,
        "last_event_hash": "0" * 64,
        "updated_at_utc": "2026-11-15T09:00:00Z",
    }


class AtomicCasHarness:
    """Test-only atomic compare-and-swap harness; it performs no network writes."""
    def __init__(self, state):
        self.state = copy.deepcopy(state)
        self.generation = state["generation"]
        self.lock = threading.Lock()

    def snapshot(self):
        with self.lock:
            return self.generation, copy.deepcopy(self.state)

    def commit(self, expected_generation, candidate):
        with self.lock:
            if self.generation != expected_generation:
                raise CASConflict("simulated compare-and-swap conflict")
            self.state = copy.deepcopy(candidate)
            self.generation += 1
            return self.generation


class FederationWorkerContentionTests(unittest.TestCase):
    def test_eight_workers_recover_from_cas_contention(self):
        harness = AtomicCasHarness(initial_state())
        first_read_barrier = threading.Barrier(8)
        first_read = set()
        first_read_lock = threading.Lock()
        outcomes = []
        outcome_lock = threading.Lock()

        def worker(i):
            for attempt in range(20):
                generation, snapshot = harness.snapshot()
                first = False
                with first_read_lock:
                    if i not in first_read:
                        first_read.add(i)
                        first = True
                if first:
                    first_read_barrier.wait(timeout=10)
                candidate, lease, _ = claim_transition(
                    snapshot, "P10CR", f"owner/repo-{i}", f"T-{i}", f"idem-{i}",
                    f"worker-{i}", now=T0,
                )
                try:
                    harness.commit(generation, candidate)
                    with outcome_lock:
                        outcomes.append((i, lease["fencing_token"]))
                    return
                except CASConflict:
                    time.sleep((i + attempt + 1) * 0.001)
            with outcome_lock:
                outcomes.append(("FAILED", i))

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(8)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(15)

        self.assertTrue(all(not thread.is_alive() for thread in threads))
        self.assertEqual(len(outcomes), 8)
        self.assertFalse(any(item[0] == "FAILED" for item in outcomes))
        self.assertEqual(len(harness.state["leases"]), 8)
        self.assertEqual(len({lease["fencing_token"] for lease in harness.state["leases"]}), 8)
        self.assertEqual(harness.state["generation"], 8)

    def test_duplicate_delivery_has_one_winner_and_no_second_event(self):
        harness = AtomicCasHarness(initial_state())
        barrier = threading.Barrier(8)
        results = []
        result_lock = threading.Lock()

        def deliver(i):
            barrier.wait(timeout=10)
            generation, snapshot = harness.snapshot()
            try:
                candidate, lease, event = claim_transition(
                    snapshot, "P10CR", "owner/repo", "same-task", "same-idempotency-key",
                    f"delivery-{i}", now=T0,
                )
                harness.commit(generation, candidate)
                result = ("WON", lease["worker_id"], event["event_hash"])
            except (LockBusy, CASConflict):
                result = ("REJECTED", i)
            with result_lock:
                results.append(result)

        threads = [threading.Thread(target=deliver, args=(i,)) for i in range(8)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(15)

        self.assertTrue(all(not thread.is_alive() for thread in threads))
        self.assertEqual(sum(x[0] == "WON" for x in results), 1)
        self.assertEqual(len(harness.state["leases"]), 1)
        self.assertEqual(harness.state["event_sequence"], 1)

    def test_crashed_worker_is_reclaimed_with_new_fence_and_old_worker_rejected(self):
        state, old_lease, claim_event = claim_transition(
            initial_state(), "P10CR", "owner/repo", "crash-task", "crash-idem",
            "worker-old", now=T0,
        )
        # Simulate process death after durable claim: state survives, no release is sent.
        recovered, new_lease, reclaim_event = claim_transition(
            state, "P10CR", "owner/repo", "crash-task", "crash-idem",
            "worker-recovery", now=T0 + timedelta(seconds=901),
        )
        self.assertEqual(reclaim_event["kind"], "LEASE_RECLAIMED")
        self.assertGreater(new_lease["fencing_token"], old_lease["fencing_token"])
        with self.assertRaises(StaleFence):
            heartbeat_transition(
                recovered, old_lease["scope"], "worker-old", old_lease["fencing_token"],
                now=T0 + timedelta(seconds=902),
            )
        with self.assertRaises(StaleFence):
            release_transition(
                recovered, old_lease["scope"], "worker-old", old_lease["fencing_token"],
                now=T0 + timedelta(seconds=902),
            )
        self.assertTrue(verify_event_chain(
            [claim_event, reclaim_event], start_sequence=1
        ))

    def test_crash_after_batch_heartbeat_keeps_atomic_checkpoint_and_rejects_stale_fence(self):
        state = initial_state()
        renewals = []
        events = []
        for i in range(8):
            state, lease, event = claim_transition(
                state, "P10CR", f"owner/repo-{i}", f"batch-{i}", f"batch-idem-{i}",
                f"worker-{i}", now=T0,
            )
            renewals.append((lease["scope"], lease["worker_id"], lease["fencing_token"]))
            events.append(event)
        checkpoint, renewed, batch_event = heartbeat_batch_transition(
            state, renewals, now=T0 + timedelta(seconds=300)
        )
        # Simulate crash immediately after durable batch commit and before acknowledgement.
        self.assertEqual(checkpoint["event_sequence"], state["event_sequence"] + 1)
        self.assertEqual(len(renewed), 8)
        self.assertEqual(batch_event["kind"], "LEASE_HEARTBEAT_BATCH")
        self.assertTrue(verify_event_chain(
            events + [batch_event], start_sequence=1
        ))
        with self.assertRaises(StaleFence):
            heartbeat_transition(
                checkpoint, renewals[0][0], "wrong-worker", renewals[0][2],
                now=T0 + timedelta(seconds=301),
            )


if __name__ == "__main__":
    unittest.main()
