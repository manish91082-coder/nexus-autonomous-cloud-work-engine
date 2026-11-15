import copy
import unittest
from datetime import datetime, timezone

from scripts.federation_git_ref_store import LockBusy, FederationLockError
from scripts.federation_quota_arbiter import (
    EMERGENCY_CAP_PER_HOUR, GLOBAL_RESERVATIONS_PER_UTC_HOUR,
    PROJECT_CAPS, REQUESTS_PER_RESERVATION,
    reserve_quota_transition, release_quota_transition,
)

T0 = datetime(2026, 11, 15, 6, 12, tzinfo=timezone.utc)


def state():
    return {
        "schema_version": "1.0", "federation_id": "TEST",
        "status": "PROTOTYPE_NOT_ENABLED_FOR_CROSS_PROJECT_WRITES",
        "backend": "GITHUB_GIT_REF_FAST_FORWARD_CAS",
        "generation": 0, "next_fencing_token": 0,
        "max_active_leases": 8, "lease_seconds": 900, "heartbeat_seconds": 300,
        "leases": [], "quota_reservations": [], "idempotency_records": [],
        "event_sequence": 0, "last_event_hash": "0" * 64,
        "updated_at_utc": "2026-11-15T00:00:00Z",
    }


class QuotaArbiterTests(unittest.TestCase):
    def test_reservation_is_durable_event_and_conservative_cost(self):
        new, rec, event = reserve_quota_transition(
            state(), "P10CR", "r-1", "worker-a", now=T0
        )
        self.assertEqual(rec["reserved_requests"], REQUESTS_PER_RESERVATION)
        self.assertEqual(event["kind"], "QUOTA_RESERVED")
        self.assertEqual(new["generation"], 1)
        self.assertEqual(new["quota_reservations"][0]["status"], "RESERVED")

    def test_project_caps_enforce_fairness(self):
        current = state()
        for i in range(PROJECT_CAPS["FLASHLOAN-RESEARCH"]):
            current, _, _ = reserve_quota_transition(
                current, "FLASHLOAN-RESEARCH", f"f-{i}", "flash-worker", now=T0
            )
        with self.assertRaises(LockBusy):
            reserve_quota_transition(current, "FLASHLOAN-RESEARCH", "f-over", "flash-worker", now=T0)
        current, _, _ = reserve_quota_transition(current, "ZCIRA", "z-1", "zcira-worker", now=T0)
        self.assertEqual(len(current["quota_reservations"]), 9)

    def test_global_cap_and_emergency_reserve(self):
        current = state()
        for i in range(GLOBAL_RESERVATIONS_PER_UTC_HOUR - EMERGENCY_CAP_PER_HOUR):
            project = "P10CR" if i < 12 else "FLASHLOAN-RESEARCH" if i < 20 else "ZCIRA" if i < 26 else "DAILY1000" if i < 30 else "OTHER"
            current, _, _ = reserve_quota_transition(current, project, f"n-{i}", "normal", now=T0)
        with self.assertRaises(LockBusy):
            reserve_quota_transition(current, "P10CR", "normal-over", "normal", now=T0)
        for i in range(EMERGENCY_CAP_PER_HOUR):
            current, _, _ = reserve_quota_transition(
                current, "P10CR", f"e-{i}", "recovery", emergency=True, now=T0
            )
        self.assertEqual(len(current["quota_reservations"]), GLOBAL_RESERVATIONS_PER_UTC_HOUR)

    def test_emergency_lane_rejects_other_projects(self):
        with self.assertRaises(FederationLockError):
            reserve_quota_transition(state(), "ZCIRA", "e-1", "w", emergency=True, now=T0)

    def test_release_does_not_refund_budget(self):
        current, rec, _ = reserve_quota_transition(state(), "P10CR", "r-1", "w", now=T0)
        current, released, event = release_quota_transition(current, "r-1", "w", now=T0)
        self.assertEqual(released["status"], "RELEASED_BUDGET_RETAINED")
        self.assertEqual(event["kind"], "QUOTA_RELEASED_BUDGET_RETAINED")
        with self.assertRaises(LockBusy):
            reserve_quota_transition(current, "P10CR", "r-1", "w", now=T0)

    def test_utc_hour_rollover_resets_window(self):
        current, _, _ = reserve_quota_transition(state(), "P10CR", "r-1", "w", now=T0)
        next_hour = datetime(2026, 11, 15, 7, 0, tzinfo=timezone.utc)
        current, _, _ = reserve_quota_transition(current, "P10CR", "r-2", "w", now=next_hour)
        self.assertEqual(len(current["quota_reservations"]), 2)
        self.assertNotEqual(current["quota_reservations"][0]["window_start_utc"],
                            current["quota_reservations"][1]["window_start_utc"])

    def test_duplicate_reservation_id_is_rejected(self):
        current, _, _ = reserve_quota_transition(state(), "P10CR", "same", "w", now=T0)
        with self.assertRaises(LockBusy):
            reserve_quota_transition(current, "P10CR", "same", "w", now=T0)

    def test_invalid_state_reservation_ledger_fails_closed(self):
        broken = state()
        broken["quota_reservations"] = None
        with self.assertRaises(FederationLockError):
            reserve_quota_transition(broken, "P10CR", "r", "w", now=T0)


if __name__ == "__main__":
    unittest.main()
