import os
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

try:
    import psycopg
except ImportError:
    psycopg = None

from scripts.multibucket_quota_contract import QuotaBucket, MultiBucketExhausted, MultiBucketConfigurationError
from scripts.postgres_quota_store import (
    BucketKey, PostgresQuotaStore, QuotaStoreDisabled, QuotaStoreConflict
)


DSN = os.environ.get("P10CR_TEST_DATABASE_URL")


def make_bucket(name, remaining=500, observed=1000, max_age=300):
    return QuotaBucket(
        provider="github-rest", credential_scope="app-7/repo-p10cr",
        window_id="2026-11-15T16Z", bucket_id=name, limit_units=1000,
        observed_remaining_units=remaining, safety_reserve_units=50,
        recovery_reserve_units=50, control_plane_provider="cloudflare-postgres",
        observed_at_epoch=observed, max_telemetry_age_seconds=max_age, now_epoch=observed + 10,
    )


@unittest.skipUnless(psycopg is not None and DSN, "PostgreSQL integration DSN is provided by CI service")
class PostgresQuotaStoreIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["P10CR_QUOTA_STORE_ENABLED"] = "true"
        cls.store = PostgresQuotaStore(DSN, enabled=True)
        cls.store.install_schema()

    def setUp(self):
        with psycopg.connect(DSN) as conn:
            conn.execute("TRUNCATE p10cr_quota_reservation_items,p10cr_quota_reservations,p10cr_quota_buckets CASCADE")
        self.core = make_bucket("core")
        self.search = make_bucket("search")
        self.core_key = BucketKey(self.core.provider,self.core.credential_scope,self.core.window_id,self.core.bucket_id)
        self.search_key = BucketKey(self.search.provider,self.search.credential_scope,self.search.window_id,self.search.bucket_id)
        self.store.register_bucket(self.core)
        self.store.register_bucket(self.search)

    def test_feature_flag_is_disabled_by_default(self):
        disabled = PostgresQuotaStore(DSN, enabled=False)
        with self.assertRaises(QuotaStoreDisabled):
            disabled.reserve("r","w","op",{self.core_key:1},now_epoch=1010)

    def test_multi_bucket_reserve_and_settle(self):
        record = self.store.reserve("r1","w1","search+core",
                                    {self.core_key:20,self.search_key:5},now_epoch=1010)
        self.assertEqual(record["status"],"RESERVED")
        self.store.settle("r1","w1",{"core":12,"search":3})
        self.assertEqual(self.store.snapshot(self.core_key)["committed_since_observation_units"],12)
        self.assertEqual(self.store.snapshot(self.search_key)["committed_since_observation_units"],3)

    def test_one_exhausted_bucket_rolls_back_all_reservations(self):
        tight = make_bucket("search",remaining=101)
        self.store.register_bucket(tight)
        with self.assertRaises(MultiBucketExhausted):
            self.store.reserve("r2","w2","atomic",{self.core_key:20,self.search_key:2},now_epoch=1010)
        self.assertEqual(self.store.snapshot(self.core_key)["reserved_units"],0)

    def test_unknown_outcome_retains_every_bucket_reservation(self):
        self.store.reserve("r3","w3","uncertain",{self.core_key:20,self.search_key:5},now_epoch=1010)
        self.store.mark_uncertain("r3","w3")
        self.assertEqual(self.store.snapshot(self.core_key)["uncertain_units"],20)
        self.assertEqual(self.store.snapshot(self.search_key)["uncertain_units"],5)

    def test_stale_telemetry_fails_closed(self):
        stale = make_bucket("stale",observed=100,max_age=10)
        self.store.register_bucket(stale)
        key = BucketKey(stale.provider,stale.credential_scope,stale.window_id,stale.bucket_id)
        with self.assertRaises(MultiBucketConfigurationError):
            self.store.reserve("r4","w4","stale",{key:1},now_epoch=120)

    def test_duplicate_reservation_and_wrong_owner_rejected(self):
        self.store.reserve("r5","w5","once",{self.core_key:10},now_epoch=1010)
        with self.assertRaises(QuotaStoreConflict):
            self.store.reserve("r5","w5","duplicate",{self.core_key:10},now_epoch=1010)
        with self.assertRaises(QuotaStoreConflict):
            self.store.settle("r5","intruder",{"core":1})

    def test_settlement_above_reservation_is_atomic_failure(self):
        self.store.reserve("r6","w6","over",{self.core_key:10,self.search_key:5},now_epoch=1010)
        with self.assertRaises(MultiBucketExhausted):
            self.store.settle("r6","w6",{"core":11,"search":2})
        self.assertEqual(self.store.snapshot(self.core_key)["reserved_units"],10)
        self.assertEqual(self.store.snapshot(self.search_key)["reserved_units"],5)

    def test_telemetry_refresh_rebases_committed_usage_without_double_count(self):
        self.store.reserve("r7","w7","refresh",{self.core_key:10},now_epoch=1010)
        self.store.settle("r7","w7",{"core":10})
        refreshed = make_bucket("core",remaining=470,observed=1020)
        self.store.register_bucket(refreshed)
        snap = self.store.snapshot(self.core_key)
        self.assertEqual(snap["committed_since_observation_units"],0)
        self.assertEqual(snap["observed_remaining_units"],470)

    def test_32_concurrent_clients_cannot_oversubscribe_shared_bucket(self):
        # Each worker opens an independent PostgreSQL connection. This validates
        # database transaction serialization, not a multi-region deployment/SLA.
        contenders = 32
        barrier = threading.Barrier(contenders)
        accepted, rejected, failures = [], [], []
        def contender(i):
            barrier.wait(timeout=10)
            try:
                self.store.reserve(f"race-{i}",f"worker-{i}","race",{self.core_key:20},now_epoch=1010)
                accepted.append(i)
            except MultiBucketExhausted:
                rejected.append(i)
            except Exception as exc:
                failures.append(repr(exc))
        with ThreadPoolExecutor(max_workers=contenders) as pool:
            futures = [pool.submit(contender,i) for i in range(contenders)]
            for future in futures:
                future.result(timeout=30)
        self.assertEqual(len(accepted),20)
        self.assertEqual(len(rejected),12)
        self.assertEqual(failures,[])
        self.assertEqual(self.store.snapshot(self.core_key)["reserved_units"],400)


if __name__ == "__main__":
    unittest.main()
