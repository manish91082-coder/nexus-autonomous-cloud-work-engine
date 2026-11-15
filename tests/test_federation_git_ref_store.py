import copy
import threading
import unittest
from datetime import datetime, timedelta, timezone

from scripts.federation_git_ref_store import (
    CASConflict, LockBusy, StaleFence, claim_transition, heartbeat_transition,
    release_transition, validate_state, verify_event_chain,
)

T0 = datetime(2026, 11, 15, 6, 0, tzinfo=timezone.utc)


def initial_state():
    return {
        "schema_version": "1.0",
        "federation_id": "MANISH-AI-PROJECT-FEDERATION-2026",
        "status": "PROTOTYPE_NOT_ENABLED_FOR_CROSS_PROJECT_WRITES",
        "backend": "GITHUB_GIT_REF_FAST_FORWARD_CAS",
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
        "updated_at_utc": "2026-11-15T00:00:00Z",
    }


class FederationGitRefStateTests(unittest.TestCase):
    def test_claim_heartbeat_release_and_hash_chain(self):
        state, lease, e1 = claim_transition(
            initial_state(), "P10CR", "owner/repo", "T-1", "idem-1", "worker-a", now=T0
        )
        self.assertEqual(lease["fencing_token"], 1)
        self.assertEqual(len(state["leases"]), 1)
        state, lease, e2 = heartbeat_transition(
            state, lease["scope"], "worker-a", 1, now=T0 + timedelta(seconds=300)
        )
        self.assertGreater(lease["expires_at_utc"], e1["timestamp_utc"])
        state, e3 = release_transition(state, lease["scope"], "worker-a", 1, now=T0 + timedelta(seconds=301))
        self.assertEqual(state["leases"], [])
        self.assertEqual(state["generation"], 3)
        self.assertTrue(verify_event_chain([e1, e2, e3], start_sequence=1))
        self.assertTrue(validate_state(state))

    def test_expired_lease_reclaim_increments_fencing_token(self):
        state, first, _ = claim_transition(
            initial_state(), "P10CR", "owner/repo", "T-2", "idem-2", "worker-a", now=T0
        )
        state, second, event = claim_transition(
            state, "P10CR", "owner/repo", "T-2", "idem-2", "worker-b",
            now=T0 + timedelta(seconds=901)
        )
        self.assertEqual(second["fencing_token"], first["fencing_token"] + 1)
        self.assertEqual(event["kind"], "LEASE_RECLAIMED")
        with self.assertRaises(StaleFence):
            heartbeat_transition(state, first["scope"], "worker-a", first["fencing_token"],
                                 now=T0 + timedelta(seconds=902))

    def test_active_duplicate_scope_is_rejected(self):
        state, lease, _ = claim_transition(
            initial_state(), "FLASHLOAN-RESEARCH", "owner/flash", "T-3", "idem-3", "worker-a", now=T0
        )
        with self.assertRaises(LockBusy):
            claim_transition(state, "FLASHLOAN-RESEARCH", "owner/flash", "T-3", "idem-3", "worker-b", now=T0)

    def test_global_active_lease_cap_is_enforced(self):
        state = initial_state()
        for i in range(8):
            state, _, _ = claim_transition(
                state, f"PROJECT-{i}", f"owner/repo-{i}", f"T-{i}", f"idem-{i}", f"worker-{i}", now=T0
            )
        with self.assertRaises(LockBusy):
            claim_transition(state, "NINTH", "owner/repo-9", "T-9", "idem-9", "worker-9", now=T0)

    def test_100_competing_claims_have_one_cas_winner(self):
        state = initial_state()
        snapshot_generation = state["generation"]
        barrier = threading.Barrier(100)
        commit_lock = threading.Lock()
        outcomes = []
        committed = {"state": state, "generation": snapshot_generation}

        def contender(i):
            snapshot = copy.deepcopy(state)
            candidate, lease, event = claim_transition(
                snapshot, "FLASHLOAN-RESEARCH", "owner/flash", "SAME-TASK", "same-idem", f"worker-{i}", now=T0
            )
            barrier.wait(timeout=10)
            with commit_lock:
                if committed["generation"] != snapshot_generation:
                    outcomes.append("CAS_CONFLICT")
                    return
                committed["state"] = candidate
                committed["generation"] = candidate["generation"]
                outcomes.append(("WON", lease["worker_id"], event["event_hash"]))

        workers = [threading.Thread(target=contender, args=(i,)) for i in range(100)]
        for worker in workers:
            worker.start()
        for worker in workers:
            worker.join(15)
        self.assertTrue(all(not worker.is_alive() for worker in workers))
        self.assertEqual(sum(1 for item in outcomes if isinstance(item, tuple) and item[0] == "WON"), 1)
        self.assertEqual(outcomes.count("CAS_CONFLICT"), 99)
        self.assertEqual(len(committed["state"]["leases"]), 1)
        self.assertEqual(committed["state"]["next_fencing_token"], 1)

    def test_event_chain_detects_tampering_and_wrong_sequence(self):
        state, _, event = claim_transition(
            initial_state(), "P10CR", "owner/repo", "T-4", "idem-4", "worker-a", now=T0
        )
        self.assertTrue(verify_event_chain([event], start_sequence=1))
        altered = dict(event)
        altered["actor"] = "attacker"
        self.assertFalse(verify_event_chain([altered], start_sequence=1))
        wrong_sequence = dict(event)
        wrong_sequence["sequence"] = 2
        self.assertFalse(verify_event_chain([wrong_sequence], start_sequence=1))

    def test_stale_worker_cannot_heartbeat_or_release(self):
        state, lease, _ = claim_transition(
            initial_state(), "P10CR", "owner/repo", "T-5", "idem-5", "worker-a", now=T0
        )
        with self.assertRaises(StaleFence):
            heartbeat_transition(state, lease["scope"], "worker-b", lease["fencing_token"], now=T0)
        with self.assertRaises(StaleFence):
            release_transition(state, lease["scope"], "worker-b", lease["fencing_token"], now=T0)


if __name__ == "__main__":
    unittest.main()
