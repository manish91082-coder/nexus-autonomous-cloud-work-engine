import unittest
from datetime import datetime, timedelta, timezone

from scripts.swarm_runtime import (
    ContractError, assert_pcne_non_regression, authorize_action, claim_task,
    eligible_tasks, finish_task, heartbeat, new_state, recover_stale_leases,
    stable_idempotency_key, validate_evidence, validate_run,
)

T0 = datetime(2026, 11, 14, 12, 0, tzinfo=timezone.utc)

def task(task_id="A", status="READY", deps=None, **kw):
    return {"schema_version":"1.0", "id": task_id, "task_type": "RESEARCH", "version": "1",
            "status": status, "payload": {"query": "public sources"},
            "depends_on": deps or [], "priority": "P0", "max_attempts": 2, **kw}

class SwarmRuntimeTests(unittest.TestCase):
    def state(self, *tasks):
        s = new_state()
        s["tasks"] = list(tasks)
        return s

    def test_stable_idempotency(self):
        self.assertEqual(stable_idempotency_key(task()), stable_idempotency_key(task()))

    def test_dependency_block_and_unblock(self):
        a, b = task("A", "COMPLETED"), task("B", deps=["A"])
        self.assertEqual([x["id"] for x in eligible_tasks([a, b])], ["B"])

    def test_duplicate_claim_rejected(self):
        s = self.state(task())
        claim_task(s, "A", "worker-1", T0)
        with self.assertRaises(ContractError):
            claim_task(s, "A", "worker-2", T0)

    def test_concurrency_limit(self):
        s = self.state(task("A"), task("B"))
        claim_task(s, "A", "w1", T0, max_concurrency=1)
        with self.assertRaises(ContractError):
            claim_task(s, "B", "w2", T0, max_concurrency=1)

    def test_heartbeat_requires_owner(self):
        s = self.state(task())
        claim_task(s, "A", "w1", T0)
        with self.assertRaises(ContractError):
            heartbeat(s, "A", "w2", T0 + timedelta(seconds=5))

    def test_stale_lease_recovery(self):
        s = self.state(task())
        claim_task(s, "A", "w1", T0, lease_seconds=30)
        self.assertEqual(recover_stale_leases(s, T0 + timedelta(seconds=31)), ["A"])
        self.assertEqual(s["tasks"][0]["status"], "READY")

    def test_retry_exhaustion_dead_letter(self):
        s = self.state(task())
        claim_task(s, "A", "w1", T0)
        finish_task(s, "A", "w1", False, error_code="TRANSIENT", now=T0)
        claim_task(s, "A", "w2", T0 + timedelta(seconds=61))
        result = finish_task(s, "A", "w2", False, error_code="FAILED", now=T0)
        self.assertEqual(result["status"], "DEAD_LETTER")
        self.assertEqual(len(s["dead_letters"]), 1)

    def test_exponential_backoff_blocks_early_retry(self):\n        s = self.state(task())\n        claim_task(s, "A", "w1", T0)\n        finish_task(s, "A", "w1", False, error_code="TEMP", now=T0)\n        with self.assertRaises(ContractError):\n            claim_task(s, "A", "w2", T0 + timedelta(seconds=30))\n        claim_task(s, "A", "w2", T0 + timedelta(seconds=61))\n\n    def test_evidence_provenance_contract(self):
        good = {"evidence_id":"E1","claim":"claim","source_type":"OFFICIAL",
                "source_uri":"https://example.org","retrieved_at_utc":"2026-11-14T00:00:00Z",
                "sha256":"a"*64,"status":"VERIFIED"}
        self.assertTrue(validate_evidence(good))
        with self.assertRaises(ContractError):
            validate_evidence({"claim":"untraceable"})

    def test_run_contract(self):
        self.assertTrue(validate_run({"run_id":"R1","schema_version":"1.0","task_id":"A",
            "worker_id":"W1","started_at_utc":"2026-11-14T00:00:00Z","status":"RUNNING"}))

    def test_owner_gate_fail_closed(self):
        with self.assertRaises(ContractError):
            authorize_action("PUBLIC_RELEASE")
        self.assertTrue(authorize_action("PUBLIC_RELEASE", owner_approved=True))

    def test_pcne_no_regression(self):
        self.assertTrue(assert_pcne_non_regression(0, 0))
        with self.assertRaises(ContractError):
            assert_pcne_non_regression(100, 99)

if __name__ == "__main__":
    unittest.main()
