#!/usr/bin/env python3
"""Run a four-family synthetic contract demo; never presents fixtures as research."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.specialist_agent_workflow import run_specialist_batch, verify_dossier

FAMILIES = [
    ("vertical-saas", "B2B_VERTICAL_SAAS"),
    ("marketplace", "MARKETPLACE_APPS"),
    ("ai-api", "AI_API_SOFTWARE"),
    ("ip-licensing", "SOFTWARE_IP_LICENSING"),
]


def main():
    sources = []
    for source_id, family in FAMILIES:
        sources.append({
            "source_id": source_id,
            "source_family": family,
            "evidence": [{
                "evidence_id": f"TEST-{source_id}",
                "claim": "Synthetic fixture only; not a market fact",
                "source_type": "INTERNAL_TEST",
                "source_uri": "https://example.invalid/synthetic-fixture",
                "retrieved_at_utc": "2026-11-15T00:00:00Z",
                "sha256": "b" * 64,
                "status": "UNVERIFIED",
            }],
            "claims": [],
            "economics": {
                "price_inr": 100,
                "platform_fee_inr": 0,
                "payment_fee_inr": 0,
                "refund_reserve_inr": 0,
                "delivery_cost_inr": 0,
                "support_cost_inr": 0,
                "other_direct_cost_inr": 0,
                "assumption_source": "SYNTHETIC_TEST_FIXTURE_NOT_A_QUOTE",
            },
        })
    dossier = run_specialist_batch({
        "schema_version": "1.0",
        "batch_id": "PHASE59-26-SYNTHETIC-DEMO",
        "source_families": sources,
    })
    if not verify_dossier(dossier):
        raise RuntimeError("demo dossier hash verification failed")
    if dossier["source_family_count"] != 4 or dossier["source_families_completed"] != 4:
        raise RuntimeError("demo did not complete four source families")
    if any(item["decision"] != "HOLD" for item in dossier["source_results"]):
        raise RuntimeError("synthetic-only evidence must never pass hard gates")
    if dossier["model_inference_used"] or dossier["external_network_calls"] or dossier["automatic_product_go"]:
        raise RuntimeError("demo crossed a prohibited execution boundary")
    path = Path("specialist_agent_demo_dossier.json")
    path.write_text(json.dumps(dossier, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "result": "PASS",
        "source_families": dossier["source_family_count"],
        "specialist_invocations": sum(x["specialist_audit"]["worker_count"] for x in dossier["source_results"]),
        "decisions": [x["decision"] for x in dossier["source_results"]],
        "dossier_sha256": dossier["dossier_sha256"],
        "note": "Synthetic contract test only; no actual revenue evidence or product decision.",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
