#!/usr/bin/env python3
"""Safe bootstrap tick for the mission queue. No external side effects or secrets."""
from __future__ import annotations
import json
import os
import pathlib
import sys
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
def read_json(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))

errors = []
try:
    state = read_json("control/mission_state.json")
    queue = read_json("control/automation_queue.json")
    opportunities = read_json("control/opportunity_registry.json")
    payouts = read_json("control/payout_registry.json")
    ledger = read_json("control/revenue_ledger.json")
except Exception as exc:
    print(json.dumps({"result": "FAIL", "error": str(exc)}))
    raise SystemExit(1)

tasks = queue.get("tasks", [])
ids = {task.get("id") for task in tasks}
for task in tasks:
    for dependency in task.get("depends_on", []):
        if dependency not in ids:
            errors.append(f"{task.get('id')} has unknown dependency {dependency}")
if state.get("verified_realized_net_receipts_inr") != ledger.get("verified_realized_net_receipts_inr"):
    errors.append("mission state and revenue ledger totals differ")

eligible = []
for task in tasks:
    if task.get("status") not in ("READY", "IN_PROGRESS"):
        continue
    if task.get("owner_gate"):
        continue
    if all(next((t.get("status") == "COMPLETED" for t in tasks if t.get("id") == dep), False)
           for dep in task.get("depends_on", [])):
        eligible.append(task)
priority = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
eligible.sort(key=lambda t: (priority.get(t.get("priority"), 9), t.get("id", "")))
selected = eligible[0] if eligible else None

report = {
    "schema_version": "1.0",
    "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    "workflow_run_id": os.getenv("GITHUB_RUN_ID"),
    "workflow_run_attempt": os.getenv("GITHUB_RUN_ATTEMPT"),
    "repository": os.getenv("GITHUB_REPOSITORY"),
    "head_sha": os.getenv("GITHUB_SHA"),
    "result": "POLL_OK" if not errors else "FAIL",
    "execution_mode": "SAFE_BOOTSTRAP_ONLY",
    "phase": state.get("phase"),
    "queue_size": len(tasks),
    "eligible_task_count": len(eligible),
    "selected_task": None if selected is None else {
        "id": selected.get("id"),
        "title": selected.get("title"),
        "priority": selected.get("priority"),
        "status": selected.get("status")
    },
    "candidate_count": len(opportunities.get("candidates", [])),
    "payout_provider_count": len(payouts.get("providers", [])),
    "verified_realized_net_receipts_inr": ledger.get("verified_realized_net_receipts_inr"),
    "authorized_spend_inr": state.get("authorized_spend_inr"),
    "errors": errors,
    "limitations": [
        "This bootstrap validates and selects queue work only; it does not execute research, publish products, access accounts or move funds.",
        "AI inference adapter is not deployed; no AI provider secret is read or logged.",
        "A successful poll is not proof of productive task completion or a continuously running process."
    ],
    "next_engineering_step": "Implement the provider-neutral AI task executor with a strict zero-spend quota circuit-breaker and evidence-only task handlers."
}
(ROOT / "worker_tick_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(1 if errors else 0)
