import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("marketplace_radar", ROOT / "marketplace_radar.py")
RADAR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RADAR)

class MarketplaceRadarTests(unittest.TestCase):
    def test_agentbadge_micro_probe_excluded(self):
        old = RADAR.get_json
        RADAR.get_json = lambda url: {"jobs":[{"jobId":"probe-1","title":"durability probe","budgetUsdc":0.01,"status":"open"}],"count":1,"network":"mainnet"} if url.endswith("status=open") else {"takeRateBps":250}
        try:
            result = RADAR.audit_agentbadge()
        finally:
            RADAR.get_json = old
        self.assertEqual(result["items"][0]["decision"], "EXCLUDED_TEST_OR_MICRO_VALUE")

    def test_moltask_duplicate_hash_deduped_and_excluded(self):
        old = RADAR.get_json
        row = {"id":"1","task_hash":"same","title":"campaign","bounty_amount":"3000","created_at":"2026-01-01T00:00:00+00:00","tx_hash":"0xabc"}
        RADAR.get_json = lambda url: {"tasks":[row,row.copy()],"total":2}
        try:
            result = RADAR.audit_moltask()
        finally:
            RADAR.get_json = old
        self.assertEqual(result["unique_count"],1)
        self.assertEqual(result["items"][0]["decision"],"EXCLUDED_UNAUDITED_TOKEN_AND_STALE_FEED")

if __name__ == "__main__":
    unittest.main()
