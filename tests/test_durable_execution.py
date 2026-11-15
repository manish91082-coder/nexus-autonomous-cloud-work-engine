import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from scripts.durable_execution import DurableExecutionError, DurableStore, run_isolated_process

T0 = datetime(2026, 11, 15, 3, 0, tzinfo=timezone.utc)


class DurableExecutionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "mission.sqlite3"
        self.store = DurableStore(self.db)

    def tearDown(self):
        self.tmp.cleanup()

    def test_register_is_idempotent_and_payload_bound(self):
        first = self.store.register_task("T1", "idem-1", {"q": "public evidence"}, now=T0)
        second = self.store.register_task("T1", "idem-1", {"q": "public evidence"}, now=T0)
        self.assertEqual(first["task_id"], second["task_id"])
        with self.assertRaises(DurableExecutionError):
            self.store.register_task("T1", "idem-1", {"q": "changed"}, now=T0)

    def test_duplicate_idempotency_key_cannot_create_second_task(self):
        self.store.register_task("T1", "idem-1", {}, now=T0)
        with self.assertRaises(DurableExecutionError):
            self.store.register_task("T2", "idem-1", {}, now=T0)

    def test_owner_gate_is_not_claimable(self):
        self.store.register_task("T1", "idem-1", {}, owner_gate=True, now=T0)
        with self.assertRaises(DurableExecutionError):
            self.store.claim_task("T1", "worker", now=T0)

    def test_concurrent_claim_has_exactly_one_winner(self):
        self.store.register_task("T1", "idem-1", {}, now=T0)
        barrier = threading.Barrier(12)
        def claim(i):
            barrier.wait(timeout=3)
            try:
                return self.store.claim_task("T1", f"worker-{i}", now=T0)
            except DurableExecutionError:
                return None
        with ThreadPoolExecutor(max_workers=12) as pool:
            results = list(pool.map(claim, range(12)))
        winners = [x for x in results if x]
        self.assertEqual(len(winners), 1)
        self.assertEqual(winners[0]["fencing_token"], 1)

    def test_fencing_token_increases_after_expiry_recovery(self):
        self.store.register_task("T1", "idem-1", {}, max_attempts=3, now=T0)
        first = self.store.claim_task("T1", "worker-a", now=T0, lease_seconds=15)
        recovered = self.store.recover_expired_leases(now=T0 + timedelta(seconds=16))
        self.assertEqual(recovered, ["T1"])
        second_time = T0 + timedelta(seconds=76)
        second = self.store.claim_task("T1", "worker-b", now=second_time, lease_seconds=30)
        self.assertGreater(second["fencing_token"], first["fencing_token"])
        with self.assertRaises(DurableExecutionError):
            self.store.heartbeat("T1", "worker-a", first["fencing_token"], now=second_time)

    def test_checkpoint_survives_reopen_and_is_hash_journaled(self):
        self.store.register_task("T1", "idem-1", {}, now=T0)
        lease = self.store.claim_task("T1", "worker-a", now=T0)
        self.store.checkpoint("T1", "worker-a", lease["fencing_token"], {"cursor": 7}, now=T0)
        reopened = DurableStore(self.db)
        self.assertEqual(reopened.get_task("T1")["checkpoint"], {"cursor": 7})
        self.assertTrue(reopened.verify_event_chain())
        self.assertIn("CHECKPOINT_SAVED", [e["kind"] for e in reopened.events("T1")])

    def test_event_journal_rejects_update_and_delete(self):
        self.store.register_task("T1", "idem-1", {}, now=T0)
        with sqlite3.connect(self.db) as conn:
            with self.assertRaises(sqlite3.IntegrityError):
                conn.execute("UPDATE events SET kind='MUTATED' WHERE seq=1")
            with self.assertRaises(sqlite3.IntegrityError):
                conn.execute("DELETE FROM events WHERE seq=1")

    def test_retry_backoff_then_dead_letter(self):
        self.store.register_task("T1", "idem-1", {}, max_attempts=2, now=T0)
        first = self.store.claim_task("T1", "worker-a", now=T0)
        after_first = self.store.finish_task("T1", "worker-a", first["fencing_token"], success=False,
                                             error_code="TEMPORARY", now=T0)
        self.assertEqual(after_first["status"], "READY")
        with self.assertRaises(DurableExecutionError):
            self.store.claim_task("T1", "worker-b", now=T0 + timedelta(seconds=30))
        second_time = T0 + timedelta(seconds=61)
        second = self.store.claim_task("T1", "worker-b", now=second_time)
        final = self.store.finish_task("T1", "worker-b", second["fencing_token"], success=False,
                                       error_code="FAILED", now=second_time)
        self.assertEqual(final["status"], "DEAD_LETTER")

    def test_global_lock_has_single_writer_and_monotonic_fence(self):
        first = self.store.acquire_lock("canonical/control", "writer-a", now=T0, lease_seconds=15)
        with self.assertRaises(DurableExecutionError):
            self.store.acquire_lock("canonical/control", "writer-b", now=T0)
        self.assertTrue(self.store.assert_fence("canonical/control", "writer-a", first["fencing_token"], now=T0))
        second = self.store.acquire_lock("canonical/control", "writer-b", now=T0 + timedelta(seconds=16))
        self.assertGreater(second["fencing_token"], first["fencing_token"])
        with self.assertRaises(DurableExecutionError):
            self.store.assert_fence("canonical/control", "writer-a", first["fencing_token"], now=T0 + timedelta(seconds=17))

    def test_process_timeout_kills_allowlisted_child(self):
        script = Path(self.tmp.name) / "slow_worker.py"
        script.write_text("import time\ntime.sleep(3)\n", encoding="utf-8")
        result = run_isolated_process([sys.executable, str(script)],
                                      allowed_executables={sys.executable},
                                      allowed_script_paths={str(script)},
                                      timeout_seconds=0.2)
        self.assertEqual(result["status"], "TIMED_OUT")
        self.assertTrue(result["timed_out"])
        self.assertFalse(result["output_captured"])

    def test_process_runner_rejects_unapproved_script_and_secret_env(self):
        script = Path(self.tmp.name) / "ok.py"
        script.write_text("pass\n", encoding="utf-8")
        with self.assertRaises(DurableExecutionError):
            run_isolated_process([sys.executable, str(script)], allowed_executables={sys.executable},
                                 allowed_script_paths=set())
        with self.assertRaises(DurableExecutionError):
            run_isolated_process([sys.executable, str(script)], allowed_executables={sys.executable},
                                 allowed_script_paths={str(script)}, env={"API_TOKEN": "never"})

    def test_expired_lease_after_final_attempt_goes_to_dead_letter(self):
        self.store.register_task("T1", "idem-1", {}, max_attempts=1, now=T0)
        self.store.claim_task("T1", "worker-a", now=T0, lease_seconds=15)
        recovered = self.store.recover_expired_leases(now=T0 + timedelta(seconds=16))
        self.assertEqual(recovered, ["T1"])
        self.assertEqual(self.store.get_task("T1")["status"], "DEAD_LETTER")

    def test_lock_claim_race_has_exactly_one_writer(self):
        barrier = threading.Barrier(10)
        def acquire(i):
            barrier.wait(timeout=3)
            try:
                return self.store.acquire_lock("single-writer", f"writer-{i}", now=T0)
            except DurableExecutionError:
                return None
        with ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(acquire, range(10)))
        self.assertEqual(sum(1 for item in results if item), 1)

    def test_failed_event_append_rolls_back_task_transition(self):
        self.store.register_task("T1", "idem-1", {}, now=T0)
        lease = self.store.claim_task("T1", "worker-a", now=T0)
        original = self.store._event
        def fail(*args, **kwargs):
            raise RuntimeError("injected journal failure")
        self.store._event = fail
        try:
            with self.assertRaises(RuntimeError):
                self.store.finish_task("T1", "worker-a", lease["fencing_token"], success=True, now=T0)
        finally:
            self.store._event = original
        self.assertEqual(self.store.get_task("T1")["status"], "LEASED")
        self.assertTrue(self.store.heartbeat("T1", "worker-a", lease["fencing_token"], now=T0)["expires_at_utc"])

    def test_event_hash_chain_detects_out_of_band_mutation(self):
        self.store.register_task("T1", "idem-1", {}, now=T0)
        self.assertTrue(self.store.verify_event_chain())
        with sqlite3.connect(self.db) as conn:
            conn.execute("DROP TRIGGER events_no_update")
            conn.execute("UPDATE events SET kind='TAMPERED' WHERE seq=1")
        self.assertFalse(self.store.verify_event_chain())


if __name__ == "__main__":
    unittest.main()
