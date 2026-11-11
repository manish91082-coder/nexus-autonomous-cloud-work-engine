#!/usr/bin/env python3
"""Cross-marketplace economic and eligibility gate. Read-only; never submits work."""
import json
import os
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

REPORT_DIR = Path(os.getenv("REPORT_DIR", "report"))
MIN_REWARD = Decimal(os.getenv("NEXUS_MIN_REWARD", "5"))
PURCHASE_PATTERNS = (re.compile(r"\b(?:buy|purchase)\s+(?:the|a|an|any|one|your)\b"), re.compile(r"\b(?:must|required|requires|need)\s+(?:to\s+)?(?:buy|purchase)\b"), re.compile(r"\bshopping\s+(?:challenge|task|requirement)\b"), re.compile(r"\bpay\s+for\s+(?:the|a|an|any)\b"))

def requires_purchase(text):
    return any(pattern.search(text) for pattern in PURCHASE_PATTERNS)
RESTRICTED_TERMS = ("first-timers only", "first timer only", "first-time participants only")

def dec(value):
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None

def evaluate(item):
    platform = str(item.get("platform") or "")
    raw = item.get("raw") if isinstance(item.get("raw"), dict) else {}
    title = str(item.get("title") or "")
    description = str(item.get("description") or "")
    body = (title + " " + description).lower()
    status = str(item.get("status") or raw.get("status") or "").lower()
    amount = dec(item.get("reward_amount"))
    currency = str(item.get("reward_currency") or "").upper()
    reasons = []

    if status not in ("open", "posted", "active", "available"):
        return "EXCLUDE_NOT_OPEN", ["task is not in an open state"]

    if platform == "MoltJobs":
        mode = str(raw.get("participationMode") or item.get("task_mode") or "").upper()
        if mode == "BID":
            return "WATCH_UNFUNDED_BID", ["bid budget is not a guaranteed payout", "no funded escrow and assignment evidence"]
        if raw.get("funded") is not True or not raw.get("escrowTxHash"):
            return "BLOCK_ESCROW_UNVERIFIED", ["independent funded escrow evidence is absent"]
    elif platform == "Dealwork":
        if raw.get("posterFunded") is False or str(item.get("funded_or_escrow_status") or "").startswith("UNFUNDED"):
            return "BLOCK_UNFUNDED", ["poster funding is explicitly false"]
    elif platform == "BasedAgents":
        bounty = raw.get("bounty") if isinstance(raw.get("bounty"), dict) else {}
        escrow = raw.get("escrow") if isinstance(raw.get("escrow"), dict) else {}
        if not bounty:
            return "EXCLUDE_NON_CASH", ["no cash bounty"]
        if escrow.get("status") != "funded" or raw.get("claimable") is not True:
            return "BLOCK_ESCROW_UNVERIFIED", ["funded and claimable escrow not both confirmed"]
        return "BLOCK_OWNER_AUTH_REQUIRED", ["claim bond or owner-controlled wallet action requires separate authorization"]
    elif platform == "Taskmarket":
        if raw.get("stakeRequired") is True or int(raw.get("stakeBps") or 0) > 0:
            return "EXCLUDE_STAKE_REQUIRED", ["task requires a stake"]
        if requires_purchase(body):
            return "EXCLUDE_PURCHASE_REQUIRED", ["task requires purchases or upfront spending"]
        if any(term in body for term in RESTRICTED_TERMS):
            return "DEFER_ELIGIBILITY", ["first-timer eligibility must be verified"]
        if not raw.get("escrowTxHash"):
            return "BLOCK_ESCROW_UNVERIFIED", ["escrow transaction reference absent"]
        if amount is None or amount < MIN_REWARD:
            return "EXCLUDE_LOW_VALUE", [f"reward below configured threshold {MIN_REWARD} {currency or 'units'}"]
        return "REVIEW_TASK_TERMS", ["escrow transaction and task terms require independent verification", "worker eligibility and payout route remain unverified"]

    if amount is None or amount < MIN_REWARD:
        return "EXCLUDE_LOW_VALUE", [f"reward below configured threshold {MIN_REWARD} {currency or 'units'}"]
    return "REVIEW_MANUAL", ["platform-specific evidence is incomplete"]

def main():
    files = sorted(REPORT_DIR.glob("opportunities-*.json"))
    if not files:
        raise RuntimeError("No scanner opportunity report found")
    source_path = files[-1]
    source = json.loads(source_path.read_text(encoding="utf-8"))
    rows = []
    counts = {}
    for item in source.get("opportunities", []):
        decision, reasons = evaluate(item)
        counts[decision] = counts.get(decision, 0) + 1
        rows.append({
            "platform": item.get("platform"),
            "task_id": item.get("task_id"),
            "title": item.get("title"),
            "reward_amount": item.get("reward_amount"),
            "reward_currency": item.get("reward_currency"),
            "decision": decision,
            "reasons": reasons,
            "submission_authorized": False,
            "income_recognized": "0"
        })
    result = {
        "status": "ok",
        "source_report": str(source_path),
        "minimum_reward_threshold": str(MIN_REWARD),
        "counts": counts,
        "actionable_candidates": sum(1 for row in rows if row["decision"] == "REVIEW_TASK_TERMS"),
        "marketplace_writes": False,
        "items": rows
    }
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORT_DIR / "economic-eligibility-gate.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": "ok", "counts": counts, "actionable_candidates": result["actionable_candidates"], "report": str(out)}))

if __name__ == "__main__":
    main()
