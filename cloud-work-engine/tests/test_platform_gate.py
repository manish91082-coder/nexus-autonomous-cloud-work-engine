import importlib.util
import pathlib
import unittest
ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("platform_gate", ROOT / "platform_gate.py")
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)
class PlatformGateTests(unittest.TestCase):
    def test_agentgigs_deferred_without_open_work(self):
        p = {"status":"CONDITIONAL_DEFER","live_open_jobs_observed":0,"india_payout":"UNVERIFIED","human_gates":["email_verification","Stripe_Connect_KYC"]}
        self.assertEqual(GATE.evaluate(p),"DEFER_NO_CURRENT_OPEN_WORK")
    def test_agentgigs_with_open_work_but_no_india_payout_is_deferred(self):
        p = {"status":"CONDITIONAL_DEFER","live_open_jobs_observed":4,"india_payout":"UNVERIFIED","human_gates":["KYC"]}
        self.assertEqual(GATE.evaluate(p),"DEFER_INDIA_PAYOUT_UNVERIFIED")
    def test_agentizable_legacy_protocol_blocked(self):
        self.assertEqual(GATE.evaluate({"status":"BLOCKED_PROTOCOL_V1_RETIRED_AND_FEED_DEGRADED"}),"BLOCK_RETIRED_PROTOCOL")
    def test_internal_credits_not_cash(self):
        self.assertEqual(GATE.evaluate({"status":"EXCLUDE_CREDIT_ONLY"}),"EXCLUDE_NON_CASH")
    def test_unknown_status_fails_closed(self):
        self.assertEqual(GATE.evaluate({"status":"MAYBE"}),"BLOCK_UNKNOWN_STATUS")
if __name__ == "__main__":
    unittest.main()
