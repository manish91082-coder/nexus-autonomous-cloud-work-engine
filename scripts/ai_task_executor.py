#!/usr/bin/env python3
"""Bounded, fail-closed AI task worker for the ₹10 Cr mission.

This worker never executes model-generated code, publishes, signs, or moves funds.
It creates an evidence-labelled work report. AI calls are disabled unless the
owner has explicitly configured zero-billing secrets in GitHub Actions.
"""
from __future__ import annotations

import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone, date

ROOT = pathlib.Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / "control/ai_usage_state.json"
REPORT_PATH = ROOT / "ai_worker_report.json"
QUEUE_PATH = ROOT / "control/automation_queue.json"
MISSION_PATH = ROOT / "control/mission_state.json"

MAX_CALLS_PER_DAY = 6
MIN_INTERVAL_SECONDS = 30 * 60
MAX_OUTPUT_TOKENS = 900
MAX_PROMPT_CHARS = 12000


def read_json(path: pathlib.Path, default=None):
    if not path.exists():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: pathlib.Path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def emit(status: str, details: dict, exit_code: int = 0):
    report = {
        "schema_version": "1.0",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "execution_mode": "BOUNDED_AI_DRAFT_ONLY",
        "model_output_is_untrusted": True,
        "no_code_execution": True,
        "no_publication_or_money_movement": True,
        **details,
    }
    write_json(REPORT_PATH, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(exit_code)


def main():
    now = datetime.now(timezone.utc)
    today = date.today().isoformat()
    usage = read_json(STATE_PATH, {"date_utc": today, "calls": 0, "last_call_utc": None})
    if usage.get("date_utc") != today:
        usage = {"date_utc": today, "calls": 0, "last_call_utc": None}

    if os.getenv("MISSION_AI_ENABLED", "").lower() != "true":
        emit("WAITING_FOR_OWNER_CONFIGURATION", {
            "reason": "MISSION_AI_ENABLED is not true; no inference request was made.",
            "daily_calls_used": usage.get("calls", 0),
            "daily_call_cap": MAX_CALLS_PER_DAY,
            "owner_action": "Configure the provider and explicit zero-billing confirmation as GitHub Actions secrets after reviewing the setup packet."
        })

    if os.getenv("MISSION_AI_ZERO_BILLING_CONFIRMED", "").lower() != "true":
        emit("FAIL_CLOSED_ZERO_BILLING_NOT_CONFIRMED", {
            "reason": "Zero-billing confirmation is absent; inference is disabled.",
            "daily_calls_used": usage.get("calls", 0),
            "daily_call_cap": MAX_CALLS_PER_DAY
        })

    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
    api_token = os.getenv("CLOUDFLARE_API_TOKEN", "")
    model = os.getenv("CLOUDFLARE_AI_MODEL", "")
    if not all((account_id, api_token, model)):
        emit("WAITING_FOR_PROVIDER_SECRETS", {
            "reason": "Cloudflare account ID, API token and explicitly selected model are required; none are read from repository files."
        })

    calls = int(usage.get("calls", 0))
    if calls >= MAX_CALLS_PER_DAY:
        emit("DAILY_QUOTA_CIRCUIT_BREAKER", {
            "reason": "Daily invocation cap reached; worker will not call inference.",
            "daily_calls_used": calls,
            "daily_call_cap": MAX_CALLS_PER_DAY
        })

    last_call = usage.get("last_call_utc")
    if last_call:
        last_dt = datetime.fromisoformat(last_call.replace("Z", "+00:00"))
        elapsed = (now - last_dt).total_seconds()
        if elapsed < MIN_INTERVAL_SECONDS:
            emit("COOLDOWN", {
                "reason": "Minimum interval between inference calls has not elapsed.",
                "seconds_until_next_call": int(MIN_INTERVAL_SECONDS - elapsed)
            })

    queue = read_json(QUEUE_PATH)
    mission = read_json(MISSION_PATH)
    tasks = queue.get("tasks", [])
    priority = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    eligible = []
    for task in tasks:
        if task.get("status") not in ("READY", "IN_PROGRESS"):
            continue
        if task.get("owner_gate"):
            continue
        deps_ok = all(
            any(t.get("id") == dep and t.get("status") == "COMPLETED" for t in tasks)
            for dep in task.get("depends_on", [])
        )
        if deps_ok:
            eligible.append(task)
    eligible.sort(key=lambda t: (priority.get(t.get("priority"), 9), t.get("id", "")))
    if not eligible:
        emit("NO_ELIGIBLE_TASK", {"reason": "No unblocked task is available."})

    task = eligible[0]
    prompt = f"""You are a bounded research and engineering assistant for the lawful ₹10 Cr autonomous revenue mission.
Mission phase: {mission.get('phase')}
Task ID: {task.get('id')}
Task: {task.get('title')}
Acceptance criteria: {json.dumps(task.get('acceptance', []), ensure_ascii=False)}
Mission constraints:
- ₹0 spend unless explicitly authorized; never recommend bypassing this.
- No employment, manual gigs, freelance bidding, cold outreach or recurring manual labour.
- No KYC, legal acceptance, account access, secrets, publication, signing, wallet/private-key access or money movement.
- Count only settled, controlled and reconciled net receipts.
- Do not invent demand, India eligibility, fees, payout terms, sources or revenue.
Produce one bounded next work packet, not a generic essay. Return JSON with keys:
work_packet, concrete_steps, required_primary_sources (URLs only; empty if unknown),
risks_and_unknowns, acceptance_checks, next_queue_action.
If a claim cannot be verified from available knowledge, label it UNVERIFIED.
Do not output executable code or ask for secrets.
"""
    prompt = prompt[:MAX_PROMPT_CHARS]
    endpoint = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
    payload = json.dumps({
        "messages": [
            {"role": "system", "content": "Return concise, structured, conservative JSON. Treat uncertainty explicitly."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": MAX_OUTPUT_TOKENS,
        "temperature": 0.1
    }).encode("utf-8")
    request = urllib.request.Request(
        endpoint, data=payload, method="POST",
        headers={"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        emit("PROVIDER_ERROR", {"http_status": exc.code, "reason": "Provider request failed; no retry loop in this run."})
    except Exception as exc:
        emit("PROVIDER_ERROR", {"reason": f"{type(exc).__name__}: {exc}"})

    if not raw.get("success"):
        emit("PROVIDER_ERROR", {"reason": "Provider returned success=false.", "provider_errors": raw.get("errors", [])[:3]})
    result = raw.get("result") or {}
    answer = result.get("response")
    if not isinstance(answer, str) or not answer.strip():
        emit("INVALID_PROVIDER_RESPONSE", {"reason": "Expected a non-empty result.response string."})

    usage["date_utc"] = today
    usage["calls"] = calls + 1
    usage["last_call_utc"] = now.isoformat()
    write_json(STATE_PATH, usage)
    emit("DRAFT_READY_FOR_EVIDENCE_REVIEW", {
        "task_id": task.get("id"),
        "task_title": task.get("title"),
        "provider": "Cloudflare Workers AI",
        "model": model,
        "daily_calls_used": usage["calls"],
        "daily_call_cap": MAX_CALLS_PER_DAY,
        "output": answer,
        "verification_note": "Model output is an unverified draft. URLs, eligibility, payout terms and claims must be independently checked before registry updates or task completion."
    })


if __name__ == "__main__":
    main()
