"""Typed, evidence-first specialist workflow for bounded multi-source research.

Deterministic handlers only: no model inference, network access, account actions,
product publication, code execution, or mission-state mutation.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from copy import deepcopy
import hashlib
import json
import math
import re
import time

from scripts.swarm_coordinator import Specialist, run_specialists, verify_audit
from scripts.swarm_runtime import validate_evidence


class SpecialistWorkflowError(ValueError):
    pass


ROLE_IDS = (
    "EVIDENCE_INTEGRITY_RED_TEAM",
    "BUYER_DEMAND",
    "PAYOUT_ELIGIBILITY",
    "UNIT_ECONOMICS",
    "RIGHTS_COMPLIANCE",
    "INDEPENDENT_RED_TEAM",
)
DEMAND_SIGNAL_TYPES = {
    "PAID_TRANSACTION",
    "PAID_COMPETITOR_USE",
    "BUYER_COMPLAINT",
    "FEATURE_REQUEST",
    "BUYER_BUDGET_SIGNAL",
}
OFFICIAL_TYPES = {"OFFICIAL", "PRIMARY"}
REQUIRED_PAYOUT_GATES = {"INDIA_SELLER_ELIGIBILITY", "PAYOUT_TERMS"}
REQUIRED_RIGHTS_GATES = {
    "IP_OWNERSHIP_OR_LICENSE",
    "PLATFORM_TERMS",
    "PRIVACY_AND_DATA_ACCESS",
}
ECONOMIC_FIELDS = (
    "price_inr",
    "platform_fee_inr",
    "payment_fee_inr",
    "refund_reserve_inr",
    "delivery_cost_inr",
    "support_cost_inr",
    "other_direct_cost_inr",
)


def _json_clone(value, label):
    try:
        cloned = json.loads(json.dumps(value, sort_keys=True, allow_nan=False, ensure_ascii=False))
    except (TypeError, ValueError) as exc:
        raise SpecialistWorkflowError(f"{label} must be finite JSON data") from exc
    return cloned


def _validated_evidence(payload):
    evidence = payload.get("evidence", [])
    if not isinstance(evidence, list):
        raise SpecialistWorkflowError("evidence must be an array")
    valid = []
    invalid = []
    seen = set()
    for index, item in enumerate(evidence):
        try:
            validate_evidence(item)
            evidence_id = item["evidence_id"]
            if evidence_id in seen:
                raise SpecialistWorkflowError("duplicate evidence_id")
            seen.add(evidence_id)
            valid.append(item)
        except Exception as exc:
            invalid.append({"index": index, "error_code": type(exc).__name__})
    return valid, invalid


def _integrity_red_team_worker(payload):
    valid, invalid = _validated_evidence(payload)
    evidence = {x["evidence_id"]: x for x in valid}
    unsupported = []
    claims = payload.get("claims", [])
    if not isinstance(claims, list):
        claims = [{"claim_id": "CLAIMS_FIELD", "evidence_ids": [], "claim": "claims must be an array"}]
    for index, claim in enumerate(claims):
        if not isinstance(claim, dict):
            unsupported.append({"index": index, "reason": "MALFORMED_CLAIM"})
            continue
        ids = claim.get("evidence_ids", [])
        if not isinstance(ids, list) or not ids:
            unsupported.append({"claim_id": claim.get("claim_id", str(index)), "reason": "NO_EVIDENCE_LINK"})
            continue
        bad = [
            evidence_id for evidence_id in ids
            if evidence_id not in evidence
            or evidence[evidence_id].get("status") != "VERIFIED"
            or evidence[evidence_id].get("source_type") == "MODEL_DRAFT"
        ]
        if bad:
            unsupported.append({"claim_id": claim.get("claim_id", str(index)), "reason": "UNVERIFIED_OR_UNKNOWN_EVIDENCE", "evidence_ids": sorted(str(x) for x in bad)})
    draft_ids = sorted(x["evidence_id"] for x in valid if x.get("source_type") == "MODEL_DRAFT" or x.get("status") != "VERIFIED")
    return {
        "role": "EVIDENCE_INTEGRITY_RED_TEAM",
        "status": "PASS" if valid and not invalid and not unsupported and not draft_ids else "HOLD",
        "valid_evidence_ids": sorted(evidence),
        "invalid_evidence": invalid,
        "evidence_count": len(valid),
        "unsupported_claims": unsupported,
        "unverified_or_model_draft_evidence_ids": draft_ids,
        "note": "Independent deterministic evidence/provenance and claim-linkage review; source truth is not independently fetched here.",
    }def _demand_worker(payload):
    valid, _ = _validated_evidence(payload)
    qualifying = [
        x for x in valid
        if x.get("status") == "VERIFIED"
        and x.get("source_type") in {"OFFICIAL", "PRIMARY", "SECONDARY"}
        and x.get("signal_type") in DEMAND_SIGNAL_TYPES
        and isinstance(x.get("independent_party_id"), str)
        and x["independent_party_id"].strip()
    ]
    parties = sorted({x["independent_party_id"] for x in qualifying})
    return {
        "role": "BUYER_DEMAND",
        "status": "PASS" if len(parties) >= 2 else "HOLD",
        "qualifying_signal_count": len(qualifying),
        "independent_party_count": len(parties),
        "independent_party_ids": parties,
        "evidence_ids": sorted(x["evidence_id"] for x in qualifying),
        "note": "Only supplied, VERIFIED, typed signals from distinct parties count; no demand is inferred from market size or model output.",
    }


def _gate_worker(payload, role, required_gates):
    valid, _ = _validated_evidence(payload)
    verified = [
        x for x in valid
        if x.get("status") == "VERIFIED" and x.get("source_type") in OFFICIAL_TYPES
    ]
    by_gate = {}
    for item in verified:
        gate = item.get("gate")
        if isinstance(gate, str) and gate:
            by_gate.setdefault(gate, []).append(item["evidence_id"])
    missing = sorted(required_gates - set(by_gate))
    contradicted = sorted({
        x.get("gate") for x in valid
        if x.get("status") == "CONTRADICTED" and isinstance(x.get("gate"), str)
    })
    status = "FAIL" if contradicted else "PASS" if not missing else "HOLD"
    return {
        "role": role,
        "status": status,
        "required_gates": sorted(required_gates),
        "verified_gate_evidence": {k: sorted(v) for k, v in sorted(by_gate.items())},
        "missing_gates": missing,
        "contradicted_gates": contradicted,
    }


def _payout_worker(payload):
    return _gate_worker(payload, "PAYOUT_ELIGIBILITY", REQUIRED_PAYOUT_GATES)


def _rights_worker(payload):
    return _gate_worker(payload, "RIGHTS_COMPLIANCE", REQUIRED_RIGHTS_GATES)


def _economics_worker(payload):
    economics = payload.get("economics")
    if not isinstance(economics, dict) or any(key not in economics for key in ECONOMIC_FIELDS):
        return {
            "role": "UNIT_ECONOMICS",
            "status": "HOLD",
            "missing_fields": [key for key in ECONOMIC_FIELDS if not isinstance(economics, dict) or key not in economics],
        }
    values = {}
    for key in ECONOMIC_FIELDS:
        value = economics[key]
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) or value < 0:
            return {"role": "UNIT_ECONOMICS", "status": "FAIL", "invalid_field": key}
        values[key] = float(value)
    if values["price_inr"] <= 0:
        return {"role": "UNIT_ECONOMICS", "status": "FAIL", "invalid_field": "price_inr"}
    net = values["price_inr"] - sum(values[key] for key in ECONOMIC_FIELDS if key != "price_inr")
    margin = net / values["price_inr"] * 100.0
    return {
        "role": "UNIT_ECONOMICS",
        "status": "PASS" if net > 0 else "FAIL",
        "gross_price_inr": values["price_inr"],
        "total_attributable_costs_inr": round(values["price_inr"] - net, 2),
        "net_contribution_inr": round(net, 2),
        "contribution_margin_pct": round(margin, 2),
        "assumption_source": economics.get("assumption_source", "UNSPECIFIED"),
        "note": "Arithmetic over supplied assumptions only; not a forecast or verified price/cost quote.",
    }


def build_specialists():
    return [
        Specialist("EVIDENCE_INTEGRITY_RED_TEAM", _integrity_red_team_worker),
        Specialist("BUYER_DEMAND", _demand_worker),
        Specialist("PAYOUT_ELIGIBILITY", _payout_worker),
        Specialist("UNIT_ECONOMICS", _economics_worker),
        Specialist("RIGHTS_COMPLIANCE", _rights_worker),
    ]


def adjudicate_family(audit):
    if not verify_audit(audit):
        raise SpecialistWorkflowError("specialist coordinator audit hash failed")
    if audit.get("status") != "SUCCEEDED":
        return "HOLD"
    results = {
        item["worker_id"]: item.get("result", {})
        for item in audit.get("worker_results", [])
        if item.get("status") == "SUCCEEDED"
    }
    if set(results) != set(ROLE_IDS):
        return "HOLD"
    hard_fail_roles = {"PAYOUT_ELIGIBILITY", "RIGHTS_COMPLIANCE", "UNIT_ECONOMICS"}
    if any(results[role].get("status") == "FAIL" for role in hard_fail_roles):
        return "NO_GO"
    if any(results[role].get("status") != "PASS" for role in ROLE_IDS):
        return "HOLD"
    return "READY_FOR_HUMAN_REVIEW"


def run_source_family(batch_id, source):
    if not isinstance(source, dict):
        raise SpecialistWorkflowError("source family entry must be an object")
    source_id = source.get("source_id")
    source_family = source.get("source_family")
    if not isinstance(source_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}", source_id):
        raise SpecialistWorkflowError("invalid source_id")
    if not isinstance(source_family, str) or not source_family.strip():
        raise SpecialistWorkflowError("source_family is required")
    payload = _json_clone(source, "source family")
    envelope = {
        "schema_version": "1.0",
        "run_id": f"{batch_id}-{source_id}",
        "task_id": source_id,
        "payload": payload,
    }
    audit = run_specialists(
        envelope, build_specialists(), timeout_seconds=10.0, max_workers=5,
    )
    return {
        "source_id": source_id,
        "source_family": source_family,
        "decision": adjudicate_family(audit),
        "specialist_audit": audit,
        "evidence_ids": sorted(
            x["evidence_id"] for x in payload.get("evidence", [])
            if isinstance(x, dict) and isinstance(x.get("evidence_id"), str)
        ),
    }


def run_specialist_batch(batch):
    data = _json_clone(batch, "specialist batch")
    if data.get("schema_version") != "1.0":
        raise SpecialistWorkflowError("unsupported specialist batch schema")
    batch_id = data.get("batch_id")
    if not isinstance(batch_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}", batch_id):
        raise SpecialistWorkflowError("invalid batch_id")
    sources = data.get("source_families")
    if not isinstance(sources, list) or not 1 <= len(sources) <= 4:
        raise SpecialistWorkflowError("source_families must contain 1..4 entries")
    ids = [x.get("source_id") for x in sources if isinstance(x, dict)]
    if len(ids) != len(sources) or len(set(ids)) != len(ids):
        raise SpecialistWorkflowError("source family IDs must be valid and unique")

    started = time.monotonic()
    results = []
    errors = []
    with ThreadPoolExecutor(max_workers=min(4, len(sources)), thread_name_prefix="source-family") as pool:
        futures = {pool.submit(run_source_family, batch_id, source): source["source_id"] for source in sources}
        for future in as_completed(futures, timeout=30):
            source_id = futures[future]
            try:
                results.append(future.result())
            except Exception as exc:
                errors.append({"source_id": source_id, "error_code": type(exc).__name__})

    results.sort(key=lambda x: x["source_id"])
    errors.sort(key=lambda x: x["source_id"])
    if errors or any(x["decision"] != "READY_FOR_HUMAN_REVIEW" for x in results):
        status = "REVIEW_REQUIRED"
    else:
        status = "ALL_READY_FOR_HUMAN_REVIEW"
    dossier = {
        "schema_version": "1.0",
        "batch_id": batch_id,
        "status": status,
        "source_family_count": len(sources),
        "source_families_completed": len(results),
        "source_family_errors": errors,
        "source_results": results,
        "duration_ms": max(0, int((time.monotonic() - started) * 1000)),
        "execution_mode": "DETERMINISTIC_SPECIALIST_DRAFT_ONLY",
        "model_inference_used": False,
        "external_network_calls": False,
        "automatic_product_go": False,
        "owner_gates_bypassed": False,
    }
    canonical = json.dumps(dossier, sort_keys=True, separators=(",", ":"), allow_nan=False)
    dossier["dossier_sha256"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return dossier


def verify_dossier(dossier):
    data = _json_clone(dossier, "dossier")
    supplied = data.pop("dossier_sha256", None)
    if not isinstance(supplied, str) or not re.fullmatch(r"[a-f0-9]{64}", supplied):
        return False
    canonical = json.dumps(data, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest() == supplied
