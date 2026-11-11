#!/usr/bin/env python3
"""Evidence-first opportunity ranking. Ranking is not authorization to bid or submit."""
import json
import os
from pathlib import Path
from decimal import Decimal, InvalidOperation

REPORT_DIR = Path(os.getenv("REPORT_DIR", "report"))
MIN_USD = Decimal(os.getenv("NEXUS_RANK_MIN_USD", "50"))

def dec(value):
    try:
        result = Decimal(str(value))
        return result if result.is_finite() else None
    except (InvalidOperation, ValueError, TypeError):
        return None

def assess(item):
    raw = item.get("raw") if isinstance(item.get("raw"), dict) else {}
    reward = dec(item.get("reward_amount"))
    currency = str(item.get("reward_currency") or "").upper()
    reasons, blockers = [], []
    score = 0
    # Reward: USD/USDC only; no unsupported FX conversion.
    if reward is None or not currency:
        reasons.append("reward_or_currency_unknown")
    elif currency in ("USD", "USDC") and reward >= MIN_USD:
        score += 20
        reasons.append("reward_meets_50_usd_floor")
    elif currency in ("USD", "USDC"):
        reasons.append("below_50_usd_priority_floor")
    else:
        reasons.append("currency_not_comparable_without_verified_fx")
    # Funding proof must be task-specific and stronger than a tx reference.
    receipt = item.get("receipt_verification") or raw.get("_receipt_verification") or {}
    receipt_ok = (isinstance(receipt, dict) and receipt.get("status") == "SUCCESS_RECEIPT"
                  and receipt.get("deposit_transfer_covers_listed_reward") is True)
    explicit = str(item.get("funded_or_escrow_status") or "").upper()
    funding_ok = receipt_ok or explicit in ("FUNDED_AND_VERIFIED", "ESCROW_FUNDED_VERIFIED")
    if funding_ok:
        score += 25
        reasons.append("task_level_funding_evidence_present")
    else:
        blockers.append("funding_not_independently_verified")
    # Explicit AI/agent permission only. Unknown is a hard review gate.
    worker = str(raw.get("eligibleWorkerTypes") or raw.get("workerType") or item.get("worker_type") or "").lower()
    ai_allowed = raw.get("aiAllowed") is True or raw.get("agentAllowed") is True or worker in ("agent", "ai_agent", "both", "human_and_agent")
    human_only = worker in ("human_only", "human")
    if ai_allowed:
        score += 15
        reasons.append("agent_execution_explicitly_allowed")
    elif human_only:
        blockers.append("human_only_restriction")
    else:
        blockers.append("ai_permission_unknown")
    # India payout must be independently established, not inferred from provider country.
    payout = str(item.get("india_payout_status") or raw.get("indiaPayoutStatus") or "").upper()
    if payout == "VERIFIED":
        score += 15
        reasons.append("india_payout_verified")
    else:
        blockers.append("india_payout_unverified")
    # Cost and fees: only score net economics if complete and quantified.
    fee = dec(item.get("fee_amount"))
    cost = dec(item.get("execution_cost_amount"))
    net = None
    if reward is not None and fee is not None and cost is not None and currency in ("USD", "USDC"):
        net = reward - fee - cost
        if net > 0:
            score += 10
            reasons.append("known_positive_net_before_tax")
        else:
            blockers.append("known_non_positive_net")
    else:
        blockers.append("fees_or_execution_cost_unknown")
    # Acceptance criteria and capability match.
    criteria = item.get("acceptance_criteria") or raw.get("acceptanceCriteria") or raw.get("criteria")
    capability = item.get("capability_match")
    if criteria and capability is True:
        score += 10
        reasons.append("acceptance_criteria_and_capability_match")
    else:
        blockers.append("acceptance_or_capability_not_verified")
    # Competition signal must be numeric and sourced. Missing is neutral, not fabricated.
    competition = dec(item.get("active_competitor_count"))
    if competition is not None and competition >= 0:
        if competition <= 2:
            score += 5
            reasons.append("low_observed_competition")
        elif competition >= 8:
            reasons.append("crowded_candidate")
    else:
        reasons.append("competition_unknown_no_probability_inferred")
    # Strict shortlist only if all hard gates are clear.
    shortlist = not blockers and score >= 80
    return {
        "score": score, "tier": "SHORTLIST_FOR_HUMAN_REVIEW" if shortlist else ("WATCH" if score >= 40 else "DEFER"),
        "shortlist_eligible": shortlist, "blockers": blockers, "reasons": reasons,
        "known_net_amount": str(net) if net is not None else None,
        "known_net_currency": currency if net is not None else None,
        "estimated_acceptance_probability": None,
        "bid_or_submission_authorized": False
    }

def main():
    files = sorted(REPORT_DIR.glob("opportunities-*.json"))
    if not files:
        raise RuntimeError("No scanner opportunity report found")
    source_path = files[-1]
    source = json.loads(source_path.read_text(encoding="utf-8"))
    rows = []
    for item in source.get("opportunities", []):
        result = assess(item)
        rows.append({
            "platform": item.get("platform"), "task_id": item.get("task_id"),
            "title": item.get("title"), "reward_amount": item.get("reward_amount"),
            "reward_currency": item.get("reward_currency"), "source_url": item.get("source_url"),
            "fetched_at": item.get("fetched_at"), **result
        })
    rows.sort(key=lambda x: (x["shortlist_eligible"], x["score"]), reverse=True)
    output = {
        "status": "ok", "source_report": str(source_path), "minimum_priority_reward_usd": str(MIN_USD),
        "method": "deterministic_evidence_score_not_probability",
        "summary": {"total": len(rows), "shortlist": sum(x["shortlist_eligible"] for x in rows),
                    "watch": sum(x["tier"] == "WATCH" for x in rows), "defer": sum(x["tier"] == "DEFER" for x in rows)},
        "items": rows, "writes_enabled": False, "income_recognized": "0"
    }
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    target = REPORT_DIR / "opportunity-ranking.json"
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": "ok", "summary": output["summary"], "report": str(target)}))

if __name__ == "__main__":
    main()
