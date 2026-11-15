import json
import multiprocessing
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


def _claim_in_process(db_path, worker, barrier, output):
    store = DurableStore(db_path)
    barrier.wait(timeout=5)
    try:
        store.claim_task("T1", worker, now=T0)
        output.put("WON")
    except DurableExecutionError:
        output.put("LOST")


def _crash_after_checkpoint(db_path, marker):
    store = DurableStore(db_path)
    lease = store.claim_task("CRASH-TASK", "crash-worker", now=T0, lease_seconds=15)
    store.checkpoint("CRASH-TASK", "crash-worker", lease["fencing_token"], {"cursor": 41}, now=T0)
    Path(marker).write_text(str(lease["fencing_token"]), encoding="utf-8")
    os._exit(23)

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

    def test_multiprocess_claim_has_exactly_one_winner(self):
        if "spawn" not in multiprocessing.get_all_start_methods():
            self.skipTest("spawn process context is unavailable")
        self.store.register_task("T1", "idem-1", {}, now=T0)
        ctx = multiprocessing.get_context("spawn")
        barrier, output = ctx.Barrier(6), ctx.Queue()
        workers = [ctx.Process(target=_claim_in_process, args=(str(self.db), f"p{i}", barrier, output)) for i in range(6)]
        for worker in workers: worker.start()
        for worker in workers: worker.join(10)
        self.assertTrue(all(worker.exitcode == 0 for worker in workers))
        results = [output.get(timeout=2) for _ in workers]
        self.assertEqual(results.count("WON"), 1)
        self.assertEqual(results.count("LOST"), 5)

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
        conn.close()

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
        extended = self.store.heartbeat_lock("canonical/control", "writer-a", first["fencing_token"], now=T0 + timedelta(seconds=5), lease_seconds=60)
        self.assertGreater(extended["expires_at_utc"], first["expires_at_utc"])
        second = self.store.acquire_lock("canonical/control", "writer-b", now=T0 + timedelta(seconds=66))
        self.assertGreater(second["fencing_token"], first["fencing_token"])
        with self.assertRaises(DurableExecutionError):
            self.store.assert_fence("canonical/control", "writer-a", first["fencing_token"], now=T0 + timedelta(seconds=67))

    def test_process_timeout_kills_allowlisted_child(self):
        script = Path(self.tmp.name) / "slow_worker.py"
        script.write_text("import time\ntime.sleep(3)\n", encoding="utf-8")
        result = run_isolated_process([sys.executable, str(script)],
                                      allowed_executables={sys.executable},
                                      allowed_script_paths={str(script)},
                                      timeout_seconds=0.2)
        self.assertEqual(result["status"], "TIMED_OUT", msg=str(result))
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
        conn.close()
        self.assertFalse(self.store.verify_event_chain())



    def test_process_crash_recovers_checkpoint_and_fences_old_worker(self):
        self.store.register_task("CRASH-TASK", "crash-idem", {}, max_attempts=3, now=T0)
        marker = Path(self.tmp.name) / "crash.marker"
        ctx = multiprocessing.get_context("spawn")
        child = ctx.Process(target=_crash_after_checkpoint, args=(str(self.db), str(marker)))
        child.start()
        child.join(10)
        self.assertEqual(child.exitcode, 23)
        self.assertTrue(marker.exists())
        old_token = int(marker.read_text(encoding="utf-8"))
        reopened = DurableStore(self.db)
        self.assertEqual(reopened.get_task("CRASH-TASK")["checkpoint"], {"cursor": 41})
        recovered = reopened.recover_expired_leases(now=T0 + timedelta(seconds=16))
        self.assertEqual(recovered, ["CRASH-TASK"])
        task = reopened.get_task("CRASH-TASK")
        self.assertEqual(task["status"], "READY")
        self.assertEqual(task["last_error_code"], "LEASE_EXPIRED")
        self.assertEqual(task["checkpoint"], {"cursor": 41})
        with self.assertRaises(DurableExecutionError):
            reopened.heartbeat("CRASH-TASK", "crash-worker", old_token, now=T0 + timedelta(seconds=17))
        self.assertTrue(reopened.verify_event_chain())
        resumed = reopened.claim_task("CRASH-TASK", "recovery-worker", now=T0 + timedelta(seconds=76))
        self.assertGreater(resumed["fencing_token"], old_token)

    @unittest.skipUnless(os.name == "posix" and Path("/proc").exists(), "Linux /proc process-tree assertion")
    def test_linux_timeout_kills_entire_child_process_group(self):
        child_script = Path(self.tmp.name) / "tree_child.py"
        parent_script = Path(self.tmp.name) / "tree_parent.py"
        pid_file = Path(self.tmp.name) / "child.pid"
        child_script.write_text("import time\ntime.sleep(30)\n", encoding="utf-8")
        parent_script.write_text(
            "import os, time\\n"
            "pid = os.fork()\\n"
            "if pid == 0:\\n"
            "    time.sleep(30)\\n"
            "    os._exit(0)\\n"
            "open(" + repr(str(pid_file)) + ", 'w').write(str(pid))\\n"
            "time.sleep(30)\\n",
            encoding="utf-8",
        )
        compile(parent_script.read_text(encoding="utf-8"), str(parent_script), "exec")
        result = run_isolated_process([sys.executable, str(parent_script)],
                                      allowed_executables={sys.executable},
                                      allowed_script_paths={str(parent_script)},
                                      timeout_seconds=0.6)
        self.assertEqual(result["status"], "TIMED_OUT")
        self.assertTrue(pid_file.exists())
        child_pid = int(pid_file.read_text(encoding="utf-8"))
        deadline = time.monotonic() + 5
        alive = True
        while time.monotonic() < deadline:
            try:
                stat = Path(f"/proc/{child_pid}/stat").read_text(encoding="utf-8")
                state = stat.rsplit(")", 1)[1].strip().split()[0]
                if state == "Z":
                    alive = False
                    break
            except FileNotFoundError:
                alive = False
                break
            time.sleep(0.05)
        self.assertFalse(alive, "descendant process survived process-group timeout")

if __name__ == "__main__":
    unittest.main()
