import threading
import unittest

from scripts.quota_budget_model import (
    QuotaWindow, QuotaExhausted, QuotaConfigurationError, QuotaAdmissionError,
    empty_ledger, reserve_transition, settle_transition,
    mark_uncertain_transition, remaining_admissible_units,
)


def window(**overrides):
    values = dict(provider="github-rest", credential_scope="installation-123/repo-abc",
                  window_id="2026-11-15T09Z", limit_units=5000,
                  observed_remaining_units=1000, safety_reserve_units=100,
                  recovery_reserve_units=100, control_plane_provider="cloudflare-do")
    values.update(overrides)
    return QuotaWindow(**values)


class QuotaBudgetModelTests(unittest.TestCase):
    def test_admission_charges_control_plane_overhead_and_work(self):
        w = window()
        ledger = empty_ledger(w)
        ledger, record = reserve_transition(ledger, w, "r1", "P10CR", "w1", 100, 5)
        self.assertEqual(record["reserved_units"], 105)
        self.assertEqual(remaining_admissible_units(ledger, w), 695)

    def test_reserve_safety_and_recovery_capacity(self):
        w = window(observed_remaining_units=200, safety_reserve_units=50, recovery_reserve_units=50)
        ledger = empty_ledger(w)
        with self.assertRaises(QuotaExhausted):
            reserve_transition(ledger, w, "r", "P10CR", "w", 101, 0)

    def test_duplicate_reservation_is_rejected(self):
        w = window()
        ledger = empty_ledger(w)
        ledger, _ = reserve_transition(ledger, w, "r", "P10CR", "w", 10, 1)
        with self.assertRaises(QuotaAdmissionError):
            reserve_transition(ledger, w, "r", "P10CR", "w", 10, 1)

    def test_settlement_commits_actual_usage_and_releases_unused_estimate(self):
        w = window()
        ledger = empty_ledger(w)
        ledger, _ = reserve_transition(ledger, w, "r", "P10CR", "w", 100, 5)
        ledger, record = settle_transition(ledger, "r", "w", 62)
        self.assertEqual(record["status"], "SETTLED")
        self.assertEqual(ledger["reserved_units"], 0)
        self.assertEqual(ledger["committed_units"], 62)

    def test_unknown_outcome_retains_full_budget(self):
        w = window()
        ledger = empty_ledger(w)
        ledger, _ = reserve_transition(ledger, w, "r", "P10CR", "w", 100, 5)
        ledger, record = mark_uncertain_transition(ledger, "r", "w")
        self.assertEqual(record["status"], "UNCERTAIN_BUDGET_RETAINED")
        self.assertEqual(ledger["uncertain_units"], 105)
        self.assertEqual(remaining_admissible_units(ledger, w), 695)

    def test_underestimated_actual_usage_freezes_instead_of_oversubscribing(self):
        w = window()
        ledger = empty_ledger(w)
        ledger, _ = reserve_transition(ledger, w, "r", "P10CR", "w", 10, 1)
        with self.assertRaises(QuotaExhausted):
            settle_transition(ledger, "r", "w", 12)

    def test_same_provider_control_plane_is_rejected(self):
        with self.assertRaises(QuotaConfigurationError):
            empty_ledger(window(control_plane_provider="github-rest"))

    def test_ledger_window_mismatch_fails_closed(self):
        w = window()
        ledger = empty_ledger(w)
        with self.assertRaises(QuotaConfigurationError):
            reserve_transition(ledger, window(window_id="next-hour"), "r", "P10CR", "w", 1, 0)

    def test_concurrent_admission_never_oversubscribes_shared_transaction_snapshot(self):
        # Simulates a serializable transaction. The production store must provide
        # equivalent atomicity across all independent hosts and repositories.
        w = window(observed_remaining_units=300, safety_reserve_units=50, recovery_reserve_units=50)
        ledger = empty_ledger(w)
        lock = threading.Lock()
        accepted, rejected = [], []
        barrier = threading.Barrier(40)
        def contender(i):
            barrier.wait(timeout=5)
            with lock:
                nonlocal ledger
                try:
                    ledger, _ = reserve_transition(ledger, w, f"r{i}", "P10CR", f"w{i}", 10, 1)
                    accepted.append(i)
                except QuotaExhausted:
                    rejected.append(i)
        threads = [threading.Thread(target=contender, args=(i,)) for i in range(40)]
        for t in threads: t.start()
        for t in threads: t.join(10)
        self.assertTrue(all(not t.is_alive() for t in threads))
        self.assertEqual(len(accepted), 18)
        self.assertEqual(len(rejected), 22)
        self.assertLessEqual(ledger["reserved_units"], 200)


if __name__ == "__main__":
    unittest.main()
