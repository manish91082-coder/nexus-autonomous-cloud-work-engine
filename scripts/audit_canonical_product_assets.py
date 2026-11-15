#!/usr/bin/env python3
"""Read-only canonical-repository product asset inventory for Phase 59.29."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "control" / "product_registry.json"
EXPECTED = {
    "MSME-OPS-DESK-LITE": ("products/msme-ops-desk-lite", "FREE_SAMPLE_ONLY_HOLD"),
    "RECRUITMENT-REVENUE-ASSURANCE": ("products/recruitment-agency-revenue-assurance", "NO_GO_GETVIK_SCALE_AND_DIFFERENTIATION"),
    "JOB-TO-CASH-CONTROL-KIT": ("products/ai-ops-starter", "PRIVATE_PROTOTYPE_NO_DEMAND"),
    "CSV-TO-ACTION": ("products/csv-to-action", "PRIVATE_PROTOTYPE_NO_DEMAND"),
    "MESSAGE-TO-ACTION-RELIABILITY": ("products/message-to-action-reliability", "PRIVATE_PROTOTYPE_NOT_PRODUCTION_READY"),
    "REVENUE-OPS-CONTROL": ("products/revenue-ops-control", "PRIVATE_PROTOTYPE_NO_DEMAND"),
    "TRAVEL-REVENUE-DEMO": ("products/travel-revenue-demo", "PRIVATE_PROTOTYPE_NO_DEMAND"),
    "ORBIT-RELAY": ("products/orbit-relay", "NO_GO_CRAZYGAMES_AS_IS"),
}


def main():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    products = registry.get("products")
    if not isinstance(products, list):
        raise RuntimeError("product registry products must be an array")
    asset_items = [item for item in products if isinstance(item, dict) and str(item.get("path", "")).startswith("products/")]
    research_candidates = [item for item in products if isinstance(item, dict) and not str(item.get("path", "")).startswith("products/")]
    by_id = {item.get("id"): item for item in asset_items}
    if len(by_id) != len(asset_items) or set(by_id) != set(EXPECTED):
        raise RuntimeError("canonical built-product asset ID set changed; require explicit scope review")

    rows = []
    for product_id, (relative_path, expected_status) in EXPECTED.items():
        item = by_id[product_id]
        directory = ROOT / relative_path
        readme = directory / "README.md"
        if not directory.is_dir() or not readme.is_file():
            raise RuntimeError(f"missing canonical asset directory or README: {product_id}")
        if item.get("path", "").rstrip("/") != relative_path:
            raise RuntimeError(f"registry path mismatch for {product_id}")
        if item.get("status") != expected_status:
            raise RuntimeError(f"status changed for {product_id}; require explicit commercial re-review")
        if item.get("owner_gate") != "public_release":
            raise RuntimeError(f"owner release gate missing for {product_id}")
        license_path = directory / "LICENSE"
        license_status = "LICENSE_FILE_PRESENT_REVIEW_REQUIRED" if license_path.is_file() else "NO_LICENSE_FILE_CHAIN_OF_TITLE_UNVERIFIED"
        rows.append({
            "id": product_id,
            "name": item.get("name"),
            "path": relative_path,
            "version": item.get("version"),
            "status": item.get("status"),
            "build_status": item.get("build_status"),
            "ci_status_recorded": item.get("ci_status"),
            "distribution": item.get("distribution"),
            "pricing_status": item.get("pricing_status"),
            "differentiation": item.get("differentiation"),
            "next_action": item.get("next_action"),
            "owner_gate": item.get("owner_gate"),
            "license_evidence": license_status,
            "readme_sha256": __import__("hashlib").sha256(readme.read_bytes()).hexdigest(),
            "release_authorized": False,
            "demand_verified": False,
            "verified_pcne_inr": 0,
        })

    report = {
        "schema_version": "1.0",
        "phase": "59.29",
        "scope": "ONLY canonical repository products; no other repository or mission included",
        "result": "INVENTORY_VALIDATED",
        "canonical_repository": "manish91082-coder/nexus-autonomous-cloud-work-engine",
        "asset_count": len(rows),
        "assets": rows,
        "research_candidate_count": len(research_candidates),
        "research_candidates_not_built": [
            {"id": x.get("id"), "name": x.get("name"), "path": x.get("path"), "status": x.get("status"), "build_status": x.get("build_status"), "next_action": x.get("next_action")}
            for x in research_candidates
        ],
        "portfolio_decision": "NO_EXISTING_ASSET_IS_RELEASE_READY_ON_CURRENT_REPOSITORY_EVIDENCE",
        "rights_chain_of_title": "NOT_ESTABLISHED_FOR_PUBLIC_RELEASE",
        "buyer_demand": "NOT_VERIFIED_FOR_ANY_OF_THE_EIGHT_ASSETS",
        "account_or_listing_actions": False,
        "external_network_calls": False,
        "spend_inr": 0,
        "pcne_inr": 0,
        "next": "Compare rights-cleared existing asset with a greenfield B2B buyer problem; do not build or release before demand, rights, payout and unit-economics gates pass.",
    }
    output = ROOT / "canonical_asset_audit.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "result": report["result"],
        "asset_count": report["asset_count"],
        "research_candidate_count": report["research_candidate_count"],
        "release_ready": 0,
        "demand_verified": 0,
        "rights_chain_of_title": report["rights_chain_of_title"],
        "pcne_inr": 0,
        "spend_inr": 0,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
