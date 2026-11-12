import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "ai_task_executor.py"


class WorkerSafetyTests(unittest.TestCase):
    def test_disabled_by_default_and_no_provider_call(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / "scripts").mkdir()
            (root / "control").mkdir()
            (root / "scripts" / "ai_task_executor.py").write_text(SCRIPT.read_text())
            (root / "control" / "automation_queue.json").write_text('{"tasks":[]}')
            (root / "control" / "mission_state.json").write_text('{}')
            (root / "control" / "ai_usage_state.json").write_text('{"date_utc":"2000-01-01","calls":0}')
            env = os.environ.copy()
            for key in ("MISSION_AI_ENABLED", "MISSION_AI_ZERO_BILLING_CONFIRMED",
                        "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_AI_MODEL"):
                env.pop(key, None)
            proc = subprocess.run([sys.executable, str(root / "scripts" / "ai_task_executor.py")],
                                  cwd=root, env=env, text=True, capture_output=True)
            self.assertEqual(proc.returncode, 0)
            report = json.loads((root / "ai_worker_report.json").read_text())
            self.assertEqual(report["status"], "WAITING_FOR_OWNER_CONFIGURATION")
            self.assertFalse(report["no_publication_or_money_movement"] is False)

    def test_source_has_hard_caps_and_no_eval(self):
        source = SCRIPT.read_text()
        self.assertIn("MAX_CALLS_PER_DAY = 6", source)
        self.assertIn("MAX_OUTPUT_TOKENS = 900", source)
        self.assertNotIn("eval(", source)
        self.assertNotIn("exec(", source)


if __name__ == "__main__":
    unittest.main()
