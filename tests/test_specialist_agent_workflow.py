import copy
import unittest

from scripts.specialist_agent_workflow import (
    ROLE_IDS, SpecialistWorkflowError, run_specialist_batch, verify_dossier,
)


def evidence(evidence_id, *, source_type="OFFICIAL", status="VERIFIED",
             gate=None, signal_type=None, party=None):
    item = {
        "evidence_id": evidence_id,
        "claim": f"Evidence-backed statement {evidence_id}",
        "source_type": source_type,
        "source_uri": f"https://evidence.example/{evidence_id}",
        "retrieved_at_utc": "2026-11-15T00:00:00Z",
        "sha256": "a" * 64,
        "status": status,
    }
    if gate:
        item["gate"] = gate
    if signal_type:
        item["signal_type"] = signal_type
    if party:
        item["independent_party_id"] = party
    return item


def qualified_source(source_id="saas-vertical", family="B2B_VERTICAL_SAAS"):
    items = [
        evidence("D1", source_type="SECONDARY", signal_type="PAID_COMPETITOR_USE", party="buyer-1"),
        evidence("D2", source_type="SECONDARY", signal_type="BUYER_COMPLAINT", party="buyer-2"),
        evidence("P1", gate="INDIA_SELLER_ELIGIBILITY"),
        evidence("P2", gate="PAYOUT_TERMS"),
        evidence("R1", source_type="PRIMARY", gate="IP_OWNERSHIP_OR_LICENSE"),
        evidence("R2", gate="PLATFORM_TERMS"),
        evidence("R3", gate="PRIVACY_AND_DATA_ACCESS"),
    ]
    return {
        "source_id": source_id,
        "source_family": family,
        "evidence": items,
        "claims": [{"claim_id": "C1", "claim": "A bounded candidate claim", "evidence_ids": ["D1", "P1"]}],
        "economics": {
            "price_inr": 1000,
            "platform_fee_inr": 100,
            "payment_fee_inr": 30,
            "refund_reserve_inr": 20,
            "delivery_cost_inr": 50,
            "support_cost_inr": 25,
            "other_direct_cost_inr": 10,
            "assumption_source": "SYNTHETIC_TEST_FIXTURE",
        },
    }


def batch(*sources):
    return {"schema_version": "1.0", "batch_id": "P59-26-TEST", "source_families": list(sources)}


class SpecialistAgentWorkflowTests(unittest.TestCase):
    def test_all_five_specialists_adjudicate_qualified_source_for_human_review_only(self):
        result = run_specialist_batch(batch(qualified_source()))
        self.assertEqual(ROLE_IDS, (
            "EVIDENCE_INTEGRITY_RED_TEAM", "BUYER_DEMAND",
            "PAYOUT_ELIGIBILITY", "UNIT_ECONOMICS", "RIGHTS_COMPLIANCE",
        ))
        self.assertEqual(result["status"], "ALL_READY_FOR_HUMAN_REVIEW")
        self.assertEqual(result["source_results"][0]["decision"], "READY_FOR_HUMAN_REVIEW")
        self.assertEqual(len(result["source_results"][0]["specialist_audit"]["worker_results"]), 5)
        self.assertTrue(verify_dossier(result))
        self.assertFalse(result["automatic_product_go"])
        self.assertFalse(result["model_inference_used"])

    def test_four_source_families_run_in_one_parallel_batch(self):
        sources = [
            qualified_source("saas", "B2B_VERTICAL_SAAS"),
            qualified_source("marketplace", "MARKETPLACE_APPS"),
            qualified_source("api", "AI_API_SOFTWARE"),
            qualified_source("licensing", "SOFTWARE_IP_LICENSING"),
        ]
        result = run_specialist_batch(batch(*sources))
        self.assertEqual(result["source_family_count"], 4)
        self.assertEqual(result["source_families_completed"], 4)
        self.assertEqual(result["status"], "ALL_READY_FOR_HUMAN_REVIEW")
        self.assertEqual(len({x["source_id"] for x in result["source_results"]}), 4)

    def test_missing_india_payout_evidence_holds_not_passes(self):
        source = qualified_source()
        source["evidence"] = [x for x in source["evidence"] if x.get("gate") != "PAYOUT_TERMS"]
        result = run_specialist_batch(batch(source))
        self.assertEqual(result["status"], "REVIEW_REQUIRED")
        self.assertEqual(result["source_results"][0]["decision"], "HOLD")

    def test_fewer_than_two_independent_demand_signals_holds(self):
        source = qualified_source()
        source["evidence"] = [x for x in source["evidence"] if x.get("evidence_id") != "D2"]
        result = run_specialist_batch(batch(source))
        self.assertEqual(result["source_results"][0]["decision"], "HOLD")

    def test_negative_net_contribution_is_candidate_no_go(self):
        source = qualified_source()
        source["economics"]["delivery_cost_inr"] = 1200
        result = run_specialist_batch(batch(source))
        self.assertEqual(result["source_results"][0]["decision"], "NO_GO")

    def test_model_draft_cannot_support_a_claim(self):
        source = qualified_source()
        source["evidence"].append(evidence(
            "MODEL-1", source_type="MODEL_DRAFT", status="UNVERIFIED",
            signal_type="PAID_TRANSACTION", party="invented-buyer",
        ))
        source["claims"].append({
            "claim_id": "C-MODEL",
            "claim": "Model generated claim, treated only as untrusted data",
            "evidence_ids": ["MODEL-1"],
        })
        result = run_specialist_batch(batch(source))
        self.assertEqual(result["source_results"][0]["decision"], "HOLD")

    def test_unsupported_claim_linkage_holds(self):
        source = qualified_source()
        source["claims"].append({"claim_id": "C2", "claim": "No source", "evidence_ids": ["MISSING"]})
        result = run_specialist_batch(batch(source))
        self.assertEqual(result["source_results"][0]["decision"], "HOLD")

    def test_duplicate_source_id_rejected(self):
        with self.assertRaises(SpecialistWorkflowError):
            run_specialist_batch(batch(qualified_source("same"), qualified_source("same")))

    def test_more_than_four_source_families_rejected(self):
        with self.assertRaises(SpecialistWorkflowError):
            run_specialist_batch(batch(*[qualified_source(f"s{i}") for i in range(5)]))

    def test_dossier_hash_detects_mutation(self):
        result = run_specialist_batch(batch(qualified_source()))
        self.assertTrue(verify_dossier(result))
        result["source_results"][0]["decision"] = "GO"
        self.assertFalse(verify_dossier(result))

    def test_bad_economics_values_fail_closed(self):
        source = qualified_source()
        source["economics"]["price_inr"] = float("nan")
        with self.assertRaises(SpecialistWorkflowError):
            run_specialist_batch(batch(source))


if __name__ == "__main__":
    unittest.main()
