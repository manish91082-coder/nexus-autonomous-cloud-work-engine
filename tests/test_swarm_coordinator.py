import time
import unittest
from threading import Barrier

from scripts.swarm_coordinator import (
    CoordinatorError, Specialist, run_specialists, validate_envelope, verify_audit,
)


def envelope(payload=None):
    return {
        "schema_version": "1.0",
        "run_id": "RUN-B3-001",
        "task_id": "P59-003-B3",
        "payload": payload or {"query": "public evidence only"},
    }


class SwarmCoordinatorTests(unittest.TestCase):
    def test_three_specialists_execute_concurrently(self):
        barrier = Barrier(3)
        def worker(label):
            def run(payload):
                barrier.wait(timeout=2)
                return {"specialist": label, "query": payload["query"]}
            return run

        result = run_specialists(
            envelope(),
            [Specialist("research", worker("research")),
             Specialist("critic", worker("critic")),
             Specialist("economics", worker("economics"))],
            timeout_seconds=3,
            max_workers=3,
        )
        self.assertEqual(result["status"], "SUCCEEDED")
        self.assertEqual(result["succeeded"], 3)
        self.assertEqual(
            [x["worker_id"] for x in result["worker_results"]],
            ["critic", "economics", "research"],
        )
        self.assertTrue(verify_audit(result))

    def test_worker_exception_isolated(self):
        def broken(_payload):
            raise RuntimeError("sensitive details must not escape")
        result = run_specialists(
            envelope(),
            [Specialist("broken", broken),
             Specialist("healthy", lambda _p: {"ok": True})],
            timeout_seconds=2,
            max_workers=2,
        )
        self.assertEqual(result["status"], "PARTIAL")
        broken = next(x for x in result["worker_results"] if x["worker_id"] == "broken")
        self.assertEqual(broken["status"], "FAILED")
        self.assertEqual(broken["error_code"], "RuntimeError")
        self.assertNotIn("sensitive details", str(result))

    def test_timeout_isolated_from_successful_worker(self):
        def slow(_payload):
            time.sleep(0.08)
            return {"late": True}
        result = run_specialists(
            envelope(),
            [Specialist("slow", slow),
             Specialist("fast", lambda _p: {"ok": True})],
            timeout_seconds=0.01,
            max_workers=2,
        )
        states = {x["worker_id"]: x["status"] for x in result["worker_results"]}
        self.assertEqual(states["slow"], "TIMED_OUT")
        self.assertEqual(states["fast"], "SUCCEEDED")
        self.assertEqual(result["status"], "PARTIAL")

    def test_audit_hash_detects_mutation(self):
        result = run_specialists(
            envelope(), [Specialist("one", lambda _p: {"ok": True})]
        )
        self.assertTrue(verify_audit(result))
        result["worker_results"][0]["result"]["ok"] = False
        self.assertFalse(verify_audit(result))

    def test_invalid_envelope_rejected(self):
        with self.assertRaises(CoordinatorError):
            validate_envelope({"schema_version": "9", "run_id": "R", "task_id": "T", "payload": {}})

    def test_duplicate_specialist_id_rejected(self):
        worker = lambda _p: {"ok": True}
        with self.assertRaises(CoordinatorError):
            run_specialists(
                envelope(),
                [Specialist("same", worker), Specialist("same", worker)],
                max_workers=2,
            )

    def test_worker_count_cannot_exceed_five(self):
        workers = [Specialist(f"w{i}", lambda _p: {"ok": True}) for i in range(6)]
        with self.assertRaises(CoordinatorError):
            run_specialists(envelope(), workers, max_workers=5)


if __name__ == "__main__":
    unittest.main()
