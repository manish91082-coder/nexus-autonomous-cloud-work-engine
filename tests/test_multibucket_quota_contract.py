import unittest

from scripts.multibucket_quota_contract import (
    QuotaBucket, MultiBucketConfigurationError, MultiBucketExhausted,
    empty_multibucket_ledger, reserve_multibucket_transition,
    settle_multibucket_transition, mark_multibucket_uncertain_transition,
)


def contract(**overrides):
    common = dict(provider="github", credential_scope="installation-7/repo-10",
                  window_id="hour-2026-11-15T16", limit_units=1000,
                  observed_remaining_units=500, safety_reserve_units=50,
                  recovery_reserve_units=50, control_plane_provider="cloudflare",
                  observed_at_epoch=1000, max_telemetry_age_seconds=60, now_epoch=1020)
    buckets = {}
    for name in ("core", "search", "graphql", "actions"):
        values = dict(common)
        values.update(overrides.get(name, {}))
        buckets[name] = QuotaBucket(bucket_id=name, **values)
    return buckets


class MultiBucketQuotaContractTests(unittest.TestCase):
    def test_contract_keeps_provider_buckets_separate(self):
        ledger = empty_multibucket_ledger(contract())
        self.assertEqual(set(ledger["buckets"]), {"core", "search", "graphql", "actions"})

    def test_admission_requires_all_buckets_and_is_all_or_nothing(self):
        buckets = contract(search={"observed_remaining_units": 101,
                                   "safety_reserve_units": 50,
                                   "recovery_reserve_units": 50})
        ledger = empty_multibucket_ledger(buckets)
        with self.assertRaises(MultiBucketExhausted):
            reserve_multibucket_transition(
                ledger, buckets, "r1", "w1", "search+core", {"core": 20, "search": 2}
            )
        self.assertEqual(ledger["buckets"]["core"]["reserved_units"], 0)

    def test_reserve_and_settle_each_bucket_independently(self):
        buckets = contract()
        ledger = empty_multibucket_ledger(buckets)
        ledger, _ = reserve_multibucket_transition(
            ledger, buckets, "r1", "w1", "search+core", {"core": 20, "search": 5}
        )
        ledger, record = settle_multibucket_transition(
            ledger, "r1", "w1", {"core": 12, "search": 3}
        )
        self.assertEqual(record["status"], "SETTLED")
        self.assertEqual(ledger["buckets"]["core"]["committed_units"], 12)
        self.assertEqual(ledger["buckets"]["search"]["committed_units"], 3)
        self.assertEqual(ledger["buckets"]["core"]["reserved_units"], 0)

    def test_unknown_outcome_retains_each_bucket_reservation(self):
        buckets = contract()
        ledger = empty_multibucket_ledger(buckets)
        ledger, _ = reserve_multibucket_transition(
            ledger, buckets, "r1", "w1", "search+core", {"core": 20, "search": 5}
        )
        ledger, record = mark_multibucket_uncertain_transition(ledger, "r1", "w1")
        self.assertEqual(record["status"], "UNCERTAIN_BUDGET_RETAINED")
        self.assertEqual(ledger["buckets"]["core"]["uncertain_units"], 20)
        self.assertEqual(ledger["buckets"]["search"]["uncertain_units"], 5)

    def test_stale_telemetry_fails_closed(self):
        buckets = contract(core={"observed_at_epoch": 900})
        with self.assertRaises(MultiBucketConfigurationError):
            empty_multibucket_ledger(buckets)

    def test_same_provider_control_plane_fails_closed(self):
        buckets = contract(core={"control_plane_provider": "github"})
        with self.assertRaises(MultiBucketConfigurationError):
            empty_multibucket_ledger(buckets)

    def test_unknown_bucket_or_partial_settlement_fails_closed(self):
        buckets = contract()
        ledger = empty_multibucket_ledger(buckets)
        with self.assertRaises(MultiBucketConfigurationError):
            reserve_multibucket_transition(
                ledger, buckets, "r1", "w1", "bad", {"unknown": 1}
            )
        ledger, _ = reserve_multibucket_transition(
            ledger, buckets, "r2", "w1", "search+core", {"core": 20, "search": 5}
        )
        with self.assertRaises(MultiBucketConfigurationError):
            settle_multibucket_transition(ledger, "r2", "w1", {"core": 10})

    def test_actual_usage_above_any_bucket_reservation_fails_closed(self):
        buckets = contract()
        ledger = empty_multibucket_ledger(buckets)
        ledger, _ = reserve_multibucket_transition(
            ledger, buckets, "r1", "w1", "search+core", {"core": 20, "search": 5}
        )
        with self.assertRaises(MultiBucketExhausted):
            settle_multibucket_transition(ledger, "r1", "w1", {"core": 21, "search": 5})


if __name__ == "__main__":
    unittest.main()
