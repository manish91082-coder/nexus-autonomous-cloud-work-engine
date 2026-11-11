import sys
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import economic_gate as gate

class EconomicGateTests(unittest.TestCase):
    def test_moltjobs_bid_is_watch_only(self):
        row={"platform":"MoltJobs","status":"open","reward_amount":"150","reward_currency":"USDC","raw":{"status":"OPEN","participationMode":"BID"}}
        self.assertEqual(gate.evaluate(row)[0],"WATCH_UNFUNDED_BID")

    def test_dealwork_unfunded_is_blocked(self):
        row={"platform":"Dealwork","status":"posted","reward_amount":"75","funded_or_escrow_status":"UNFUNDED_FLAG_FALSE","raw":{"posterFunded":False}}
        self.assertEqual(gate.evaluate(row)[0],"BLOCK_UNFUNDED")

    def test_taskmarket_purchase_is_excluded(self):
        row={"platform":"Taskmarket","status":"open","title":"Shop and buy the product","description":"Purchase required","reward_amount":"15","reward_currency":"USDC","raw":{"status":"open","escrowTxHash":"0xabc"}}
        self.assertEqual(gate.evaluate(row)[0],"EXCLUDE_PURCHASE_REQUIRED")

    def test_taskmarket_first_timer_no_purchase_is_deferred(self):
        row={"platform":"Taskmarket","status":"open","title":"First-timers only chain research","description":"No purchase is needed and a buy never qualifies.","reward_amount":"1","reward_currency":"USDC","raw":{"status":"open","escrowTxHash":"0xabc"}}
        self.assertEqual(gate.evaluate(row)[0],"DEFER_ELIGIBILITY")

    def test_taskmarket_explicit_buy_is_excluded(self):
        row={"platform":"Taskmarket","status":"open","title":"Shopping challenge","description":"Buy the product and submit the receipt.","reward_amount":"15","reward_currency":"USDC","raw":{"status":"open","escrowTxHash":"0xabc"}}
        self.assertEqual(gate.evaluate(row)[0],"EXCLUDE_PURCHASE_REQUIRED")

    def test_taskmarket_micro_reward_is_excluded(self):
        row={"platform":"Taskmarket","status":"open","title":"Small code fix","reward_amount":"0.25","reward_currency":"OUSD","raw":{"status":"open","escrowTxHash":"0xabc"}}
        self.assertEqual(gate.evaluate(row)[0],"EXCLUDE_LOW_VALUE")

    def test_taskmarket_escrow_reference_is_not_auto_approval(self):
        row={"platform":"Taskmarket","status":"open","title":"Research report","reward_amount":"10","reward_currency":"USDC","raw":{"status":"open","escrowTxHash":"0xabc","stakeRequired":False}}
        self.assertEqual(gate.evaluate(row)[0],"REVIEW_TASK_TERMS")

    def test_basedagents_no_bounty_is_non_cash(self):
        row={"platform":"BasedAgents","status":"open","raw":{"status":"open","bounty":None}}
        self.assertEqual(gate.evaluate(row)[0],"EXCLUDE_NON_CASH")

    def test_closed_task_is_excluded(self):
        row={"platform":"Taskmarket","status":"closed","raw":{"status":"closed"}}
        self.assertEqual(gate.evaluate(row)[0],"EXCLUDE_NOT_OPEN")

if __name__ == "__main__":
    unittest.main()
