#!/usr/bin/env python3
"""Deterministic, zero-secret mission state/queue guard for scheduled CI."""
from __future__ import annotations
import json
import pathlib
import sys
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILES = {
    "state": ROOT / "control/mission_state.json",
    "queue": ROOT / "control/automation_queue.json",
    "opportunities": ROOT / "control/opportunity_registry.json",
    "payouts": ROOT / "control/payout_registry.json",
    "ledger": ROOT / "control/revenue_ledger.json",
}
errors: list[str] = []
loaded = {}
for key, path in FILES.items():
    try:
        loaded[key] = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{path.relative_to(ROOT)}: invalid/unreadable JSON: {exc}")

if not errors:
    state, queue, opps, payouts, ledger = (loaded[k] for k in ("state","queue","opportunities","payouts","ledger"))
    if state.get("mission") != "INR_10_CR_AUTONOMOUS_REVENUE":
        errors.append("mission_state: unexpected mission identifier")
    if state.get("verified_realized_net_receipts_inr") != ledger.get("verified_realized_net_receipts_inr"):
        errors.append("mission_state and revenue_ledger realized receipt totals disagree")
    tasks = queue.get("tasks", [])
    ids = [t.get("id") for t in tasks]
    if len(ids) != len(set(ids)):
        errors.append("automation_queue: duplicate task IDs")
    known = set(ids)
    for task in tasks:
        if not all(task.get(k) for k in ("id","title","priority","status","idempotency_key")):
            errors.append(f"automation_queue: incomplete required fields in {task.get('id')}")
        for dep in task.get("depends_on", []):
            if dep not in known:
                errors.append(f"automation_queue: {task.get('id')} depends on unknown task {dep}")
    if sum(1 for t in tasks if t.get("status") in ("IN_PROGRESS","ACTIVE")) > 4:
        errors.append("automation_queue: more than four concurrent engineering/research tasks")
    if opps.get("scoring") != {"demand":25,"payout_certainty_and_speed":20,"automation":20,"net_economics_and_zero_cost":15,"distribution_and_differentiation":10,"risk_and_compliance":10}:
        errors.append("opportunity_registry: scoring weights changed without schema update")
    if not isinstance(payouts.get("providers"), list) or not isinstance(ledger.get("entries"), list):
        errors.append("payout_registry/providers and revenue_ledger/entries must be arrays")

now = datetime.now(timezone.utc).isoformat()
report = {
    "timestamp_utc": now,
    "result": "FAIL" if errors else "PASS",
    "checks": len(FILES) + (len(loaded.get("queue", {}).get("tasks", [])) if "queue" in loaded else 0),
    "errors": errors,
    "mission": loaded.get("state", {}).get("mission"),
    "phase": loaded.get("state", {}).get("phase"),
    "queue_tasks": len(loaded.get("queue", {}).get("tasks", [])),
    "verified_realized_net_receipts_inr": loaded.get("ledger", {}).get("verified_realized_net_receipts_inr"),
    "note": "This deterministic guard does not perform AI research, publish products, access private accounts, sign terms or move funds."
}
out = ROOT / "mission_guard_report.json"
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(1 if errors else 0)
