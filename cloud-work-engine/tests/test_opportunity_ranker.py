import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("opportunity_ranker", ROOT / "opportunity_ranker.py")
RANKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RANKER)

class OpportunityRankerTests(unittest.TestCase):
    def test_unknown_evidence_never_shortlists(self):
        result = RANKER.assess({"reward_amount":"500","reward_currency":"USD","raw":{}})
        self.assertFalse(result["shortlist_eligible"])
        self.assertTrue(any("task_specific_funding" in x for x in result["blockers"]))
        self.assertIn("ai_permission_unknown", result["blockers"])

    def test_tx_reference_is_not_funding_proof(self):
        item = {"task_id":"task-1","reward_amount":"100","reward_currency":"USDC","raw":{"escrowTxHash":"0xabc","status":"open"}}
        self.assertTrue(any("task_specific_funding" in x for x in RANKER.assess(item)["blockers"]))

    def test_contract_pool_deposit_is_not_task_funding_proof(self):
        item = {"task_id":"task-1","reward_amount":"100","reward_currency":"USDC",
                "receipt_verification":{"status":"SUCCESS_RECEIPT","deposit_transfer_covers_listed_reward":True},
                "raw":{"escrowTxHash":"0xabc","status":"open"}}
        self.assertTrue(any("task_specific_funding" in x for x in RANKER.assess(item)["blockers"]))

    def test_task_specific_escrow_allocation_can_pass_funding_gate(self):
        item = {"task_id":"task-1","reward_amount":"100","reward_currency":"USD",
                "raw":{"taskEscrow":{"status":"funded","taskId":"task-1","allocatedAmount":"100"}}}
        self.assertFalse(any("task_specific_funding" in x for x in RANKER.assess(item)["blockers"]))

    def test_human_only_is_blocked(self):
        item = {"reward_amount":"100","reward_currency":"USD","raw":{"workerType":"human_only"}}
        self.assertIn("human_only_restriction", RANKER.assess(item)["blockers"])

    def test_known_complete_evidence_can_shortlist_for_human_review(self):
        item = {"task_id":"task-1","reward_amount":"120","reward_currency":"USD","fee_amount":"5","execution_cost_amount":"10",
                "india_payout_status":"VERIFIED","acceptance_criteria":"Merged PR meets tests",
                "capability_match":True,"active_competitor_count":1,
                "raw":{"taskFundingVerified":True,"taskFundingEvidenceRef":"evidence-ref","agentAllowed":True}}
        result = RANKER.assess(item)
        self.assertTrue(result["shortlist_eligible"])
        self.assertEqual(result["known_net_amount"],"105")
        self.assertFalse(result["bid_or_submission_authorized"])

    def test_unknown_cost_prevents_shortlist(self):
        item = {"task_id":"task-1","reward_amount":"200","reward_currency":"USD","india_payout_status":"VERIFIED",
                "acceptance_criteria":"criteria","capability_match":True,
                "raw":{"taskFundingVerified":True,"taskFundingEvidenceRef":"evidence-ref","aiAllowed":True}}
        self.assertIn("fees_or_execution_cost_unknown", RANKER.assess(item)["blockers"])

if __name__ == "__main__":
    unittest.main()
