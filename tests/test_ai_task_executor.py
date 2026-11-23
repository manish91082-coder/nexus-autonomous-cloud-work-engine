import json
import os
import pathlib
import runpy
import subprocess
import sys
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "ai_task_executor.py"


def valid_manifest():
    stamp = "2026-11-19T00:00:00Z"
    def evidence(suffix):
        return {"status": "VERIFIED", "url": "https://evidence.example/" + suffix,
                "evidence_url": "https://evidence.example/" + suffix,
                "sha256": suffix[0] * 64, "verified_at_utc": stamp}
    return {
        "schema_version": "1.0",
        "status": "APPROVED_FOR_INFERENCE",
        "provider": "cloudflare-workers-ai",
        "model_id": "@cf/meta/llama-3.1-8b-instruct",
        "provider_terms": evidence("a"),
        "model_data_terms": {**evidence("b"), "training_use_policy": "REVIEWED_AND_DISCLOSED"},
        "zero_billing": {**evidence("c"), "billing_mode": "FREE_TIER_ONLY",
                         "paid_fallback": False, "hard_stop_on_paid_or_unknown": True},
        "quota": {**evidence("d"), "scope": "P10CR_ACCOUNT_GLOBAL",
                  "arbiter_integration": "VERIFIED", "daily_call_cap": 3,
                  "min_interval_seconds": 3600, "max_output_tokens": 500,
                  "hard_stop_on_paid_or_unknown": True, "paid_fallback": False},
        "gateway": {**evidence("e"), "endpoint": "https://gateway.example/infer",
                    "provider_allowlist": ["cloudflare-workers-ai"], "paid_fallback": False},
        "owner_approval": {"approved": True, "approved_at_utc": stamp,
                           "approval_reference": "owner-approved-test-fixture"},
    }


def prepare_root(root, manifest=None, source=None):
    (root / "scripts").mkdir()
    (root / "control").mkdir()
    (root / "scripts" / "ai_task_executor.py").write_text(
        source if source is not None else SCRIPT.read_text(), encoding="utf-8"
    )
    (root / "scripts" / "current_task_guard.py").write_text(
        (SCRIPT.parent / "current_task_guard.py").read_text(encoding="utf-8"),
        encoding="utf-8"
    )
    (root / "control" / "automation_queue.json").write_text('{"tasks":[]}', encoding="utf-8")
    (root / "control" / "mission_state.json").write_text("{}", encoding="utf-8")
    (root / "control" / "ai_usage_state.json").write_text(
        '{"date_utc":"2000-01-01","calls":0}', encoding="utf-8"
    )
    if manifest is not None:
        (root / "control" / "ai_inference_approval.json").write_text(
            json.dumps(manifest), encoding="utf-8"
        )


def enabled_env():
    env = os.environ.copy()
    for key in (
        "MISSION_AI_ENABLED", "MISSION_AI_ZERO_BILLING_CONFIRMED",
        "MISSION_AI_PROVIDER_TERMS_REVIEWED", "MISSION_AI_MODEL_DATA_TERMS_REVIEWED",
        "MISSION_AI_GLOBAL_QUOTA_VERIFIED", "MISSION_AI_OWNER_APPROVED",
        "MISSION_AI_GLOBAL_QUOTA_RESERVATION_ID", "MISSION_AI_GLOBAL_QUOTA_FENCING_TOKEN",
        "MISSION_AI_GLOBAL_QUOTA_LEASE_VERSION", "MISSION_AI_GLOBAL_QUOTA_DISPATCHER_VERIFIED",
        "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_AI_MODEL",
    ):
        env.pop(key, None)
    env.update({
        "MISSION_AI_ENABLED": "true",
        "MISSION_AI_ZERO_BILLING_CONFIRMED": "true",
        "MISSION_AI_PROVIDER_TERMS_REVIEWED": "true",
        "MISSION_AI_MODEL_DATA_TERMS_REVIEWED": "true",
        "MISSION_AI_GLOBAL_QUOTA_VERIFIED": "true",
        "MISSION_AI_OWNER_APPROVED": "true",
        "CLOUDFLARE_ACCOUNT_ID": "test-account-id",
        "CLOUDFLARE_API_TOKEN": "test-token-not-used",
        "CLOUDFLARE_AI_MODEL": "@cf/meta/llama-3.1-8b-instruct",
    })
    return env


class WorkerSafetyTests(unittest.TestCase):
    def test_disabled_by_default_and_no_provider_call(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            prepare_root(root)
            env = os.environ.copy()
            for key in enabled_env():
                if key.startswith("MISSION_AI_") or key.startswith("CLOUDFLARE_"):
                    env.pop(key, None)
            proc = subprocess.run(
                [sys.executable, str(root / "scripts" / "ai_task_executor.py")],
                cwd=root, env=env, text=True, capture_output=True
            )
            self.assertEqual(proc.returncode, 0)
            report = json.loads((root / "ai_worker_report.json").read_text())
            self.assertEqual(report["status"], "WAITING_FOR_OWNER_CONFIGURATION")
            self.assertTrue(report["no_code_execution"])
            self.assertTrue(report["no_publication_or_money_movement"])

    def test_manifest_requires_verified_terms_zero_billing_quota_and_owner_approval(self):
        namespace = runpy.run_path(str(SCRIPT))
        validate = namespace["validate_approval_manifest"]
        ok, reason = validate({"schema_version": "1.0", "status": "DISABLED"}, "")
        self.assertFalse(ok)
        self.assertEqual(reason, "APPROVAL_MANIFEST_NOT_APPROVED")
        ok, reason = validate(valid_manifest(), "@cf/meta/llama-3.1-8b-instruct")
        self.assertTrue(ok, reason)
        bad = valid_manifest()
        bad["zero_billing"]["paid_fallback"] = True
        ok, reason = validate(bad, "@cf/meta/llama-3.1-8b-instruct")
        self.assertFalse(ok)
        self.assertEqual(reason, "ZERO_BILLING_EVIDENCE_INVALID")

    def test_global_quota_adapter_remains_hard_disabled_even_with_valid_manifest_and_flags(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            prepare_root(root, valid_manifest())
            proc = subprocess.run(
                [sys.executable, str(root / "scripts" / "ai_task_executor.py")],
                cwd=root, env=enabled_env(), text=True, capture_output=True
            )
            self.assertEqual(proc.returncode, 0)
            report = json.loads((root / "ai_worker_report.json").read_text())
            self.assertEqual(report["status"], "FAIL_CLOSED_GLOBAL_QUOTA_ADAPTER_NOT_INTEGRATED")
            self.assertTrue(report["no_provider_request"])

    def test_provider_gateway_remains_hard_disabled_without_verified_adapter(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            source = SCRIPT.read_text().replace(
                "GLOBAL_QUOTA_ADAPTER_READY = False", "GLOBAL_QUOTA_ADAPTER_READY = True"
            )
            prepare_root(root, valid_manifest(), source)
            proc = subprocess.run(
                [sys.executable, str(root / "scripts" / "ai_task_executor.py")],
                cwd=root, env=enabled_env(), text=True, capture_output=True
            )
            self.assertEqual(proc.returncode, 0)
            report = json.loads((root / "ai_worker_report.json").read_text())
            self.assertEqual(report["status"], "FAIL_CLOSED_PROVIDER_GATEWAY_NOT_INTEGRATED")
            self.assertTrue(report["no_provider_request"])

    def test_source_has_hard_caps_and_no_eval(self):
        source = SCRIPT.read_text()
        self.assertIn("MAX_CALLS_PER_DAY = 6", source)
        self.assertIn("MAX_OUTPUT_TOKENS = 900", source)
        self.assertNotIn("eval(", source)
        self.assertNotIn("exec(", source)


class CurrentTaskSelectionTests(unittest.TestCase):
    def setUp(self):
        namespace = runpy.run_path(str(SCRIPT))
        self.select = namespace["select_current_task"]
        self.queue = {
            "current_task": "P59-003",
            "queue_policy": {"current_task": "P59-003"},
            "tasks": [
                {"id": "P59-001", "priority": "P0", "status": "PAUSED",
                 "owner_gate": False, "depends_on": []},
                {"id": "P59-002", "priority": "P1", "status": "BLOCKED",
                 "owner_gate": False, "depends_on": ["P59-001"]},
                {"id": "P59-003", "priority": "P0", "status": "IN_PROGRESS",
                 "owner_gate": False, "depends_on": []},
                {"id": "P00-999", "priority": "P0", "status": "READY",
                 "owner_gate": False, "depends_on": []},
            ],
        }
        self.mission = {"status": "ACTIVE", "current_task": "P59-003"}

    def test_selects_only_p59_003_even_if_another_p0_task_is_ready(self):
        task, reason = self.select(self.queue, self.mission)
        self.assertEqual(reason, "CURRENT_TASK_SELECTED")
        self.assertEqual(task["id"], "P59-003")

    def test_rejects_root_queue_current_task_mismatch(self):
        self.queue["current_task"] = "P59-001"
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "CURRENT_TASK_AUTHORITY_MISMATCH")

    def test_rejects_nested_queue_policy_mismatch(self):
        self.queue["queue_policy"]["current_task"] = "P59-001"
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "CURRENT_TASK_AUTHORITY_MISMATCH")

    def test_rejects_mission_state_mismatch(self):
        self.mission["current_task"] = "P59-001"
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "CURRENT_TASK_AUTHORITY_MISMATCH")

    def test_rejects_non_active_mission(self):
        self.mission["status"] = "PAUSED"
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "MISSION_NOT_ACTIVE")

    def test_requires_p59_001_to_remain_paused(self):
        self.queue["tasks"][0]["status"] = "READY"
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "P59_001_MUST_REMAIN_PAUSED")

    def test_requires_p59_002_to_remain_blocked(self):
        self.queue["tasks"][1]["status"] = "READY"
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "P59_002_MUST_REMAIN_BLOCKED")

    def test_rejects_duplicate_p59_003_records(self):
        self.queue["tasks"].append(dict(self.queue["tasks"][2]))
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "TASK_RECORD_COUNT_INVALID:P59-003")

    def test_rejects_missing_p59_003_record(self):
        self.queue["tasks"] = [t for t in self.queue["tasks"] if t["id"] != "P59-003"]
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "TASK_RECORD_COUNT_INVALID:P59-003")

    def test_rejects_owner_gated_p59_003(self):
        self.queue["tasks"][2]["owner_gate"] = True
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "P59_003_OWNER_GATE_ACTIVE")

    def test_rejects_non_p0_p59_003(self):
        self.queue["tasks"][2]["priority"] = "P1"
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "P59_003_PRIORITY_MISMATCH")

    def test_rejects_non_executable_p59_003_status(self):
        self.queue["tasks"][2]["status"] = "PAUSED"
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "P59_003_NOT_EXECUTABLE")

    def test_rejects_incomplete_dependencies(self):
        self.queue["tasks"][2]["depends_on"] = ["P59-001"]
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "P59_003_DEPENDENCY_NOT_COMPLETED:P59-001")

    def test_rejects_malformed_task_record(self):
        self.queue["tasks"].append("not-an-object")
        task, reason = self.select(self.queue, self.mission)
        self.assertIsNone(task)
        self.assertEqual(reason, "TASK_RECORD_INVALID")



    def test_bootstrap_worker_uses_the_same_current_task_guard(self):
        worker_tick = SCRIPT.parent / "worker_tick.py"
        source = worker_tick.read_text(encoding="utf-8")
        self.assertIn("from scripts.current_task_guard import select_current_task", source)
        self.assertIn("select_current_task(queue, state)", source)
        self.assertNotIn("eligible.sort", source)


if __name__ == "__main__":
    unittest.main()
