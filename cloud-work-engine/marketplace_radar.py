#!/usr/bin/env python3
"""Read-only radar for additional agent-native marketplaces. No wallet or write calls."""
import json
import os
import time
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

OUT = Path(os.getenv("REPORT_DIR", "report"))
HEADERS = {"Accept": "application/json", "User-Agent": "NexusCloudWorkEngine/0.3"}

def get_json(url):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))

def amount(value):
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None

def audit_agentbadge():
    payload = get_json("https://agentbadge.xyz/api/venue/jobs?status=open")
    rows = payload.get("jobs", []) if isinstance(payload, dict) else []
    results = []
    for row in rows:
        reward = amount(row.get("budgetUsdc"))
        title = str(row.get("title") or "")
        is_probe = any(word in title.lower() for word in ("test", "probe", "regression", "durability"))
        if is_probe or reward is None or reward < Decimal("5"):
            decision = "EXCLUDED_TEST_OR_MICRO_VALUE"
            reason = "Current open feed contains a test/regression probe or sub-$5 budget; not commercial work."
        else:
            decision = "REVIEW_REQUIRED"
            reason = "Verify funded escrow, provider eligibility, terms, fees, and India-compatible payout before integration."
        results.append({
            "platform": "AgentBadge", "task_id": row.get("jobId"), "title": title,
            "reward_amount": str(reward) if reward is not None else None,
            "reward_currency": "USDC", "status": row.get("status"),
            "created_at": row.get("createdAt"), "decision": decision, "reason": reason,
            "source_url": "https://agentbadge.xyz/market/jobs"
        })
    return {"status": "ok", "network": payload.get("network"), "count": payload.get("count"), "items": results,
            "economics": get_json("https://agentbadge.xyz/api/venue/economics")}

def audit_moltask():
    payload = get_json("https://www.moltask.com/api/tasks")
    rows = payload.get("tasks", []) if isinstance(payload, dict) else []
    unique = {}
    for row in rows:
        key = row.get("task_hash") or row.get("id")
        if key and key not in unique:
            unique[key] = row
    items = []
    now = datetime.now(timezone.utc)
    for row in unique.values():
        created = row.get("created_at")
        age_days = None
        if created:
            try:
                age_days = (now - datetime.fromisoformat(created.replace("Z", "+00:00"))).days
            except ValueError:
                pass
        items.append({
            "platform": "Moltask", "task_id": row.get("id"), "title": row.get("title"),
            "reward_amount": row.get("bounty_amount"), "reward_currency": "MOLT",
            "created_at": created, "age_days": age_days, "on_chain_status": row.get("on_chain_status"),
            "transaction_reference_present": bool(row.get("tx_hash")),
            "decision": "EXCLUDED_UNAUDITED_TOKEN_AND_STALE_FEED",
            "reason": "Official site warns contracts are unaudited; rewards are volatile MOLT, and current feed includes old/repeated promotional tasks. Transaction reference/status is not independently verified here.",
            "source_url": "https://www.moltask.com/"
        })
    return {"status": "ok", "reported_total": payload.get("total"), "unique_count": len(items), "items": items,
            "contract_warning": "Official Moltask page states contracts are unaudited."}

def main():
    report = {"generated_at_utc": datetime.now(timezone.utc).isoformat(), "mode": "READ_ONLY",
              "sources": {}, "safety": {"registration": False, "wallet_actions": False, "claims": False, "submissions": False, "payments": False}}
    for name, fn in (("AgentBadge", audit_agentbadge), ("Moltask", audit_moltask)):
        try:
            report["sources"][name] = fn()
        except Exception as exc:
            report["sources"][name] = {"status": "error", "error": str(exc), "items": []}
    report["summary"] = {name: {"status": data.get("status"), "records": len(data.get("items", [])),
                                 "decisions": {decision: sum(1 for x in data.get("items", []) if x.get("decision") == decision)
                                               for decision in sorted({x.get("decision") for x in data.get("items", [])})}}
                         for name, data in report["sources"].items()}
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / "marketplace-radar.json"
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": "ok", "summary": report["summary"], "report": str(path)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
