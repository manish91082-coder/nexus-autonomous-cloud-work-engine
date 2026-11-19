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
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / "control/ai_usage_state.json"
APPROVAL_PATH = ROOT / "control/ai_inference_approval.json"
REPORT_PATH = ROOT / "ai_worker_report.json"
QUEUE_PATH = ROOT / "control/automation_queue.json"
MISSION_PATH = ROOT / "control/mission_state.json"

MAX_CALLS_PER_DAY = 6
MIN_INTERVAL_SECONDS = 30 * 60
MAX_OUTPUT_TOKENS = 900
MAX_PROMPT_CHARS = 12000

# Code-level release gates. Environment flags cannot turn these on.
# Phase 59.61 must implement and test the provider-neutral gateway and global
# quota reservation/settlement adapter before either constant can change.
GLOBAL_QUOTA_ADAPTER_READY = False
PROVIDER_GATEWAY_ADAPTER_READY = False


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



def _valid_evidence_record(record):
    if not isinstance(record, dict) or record.get("status") != "VERIFIED":
        return False
    url = record.get("url") or record.get("evidence_url")
    digest = record.get("sha256")
    timestamp = record.get("verified_at_utc")
    return (
        isinstance(url, str) and url.startswith("https://")
        and isinstance(digest, str) and re.fullmatch(r"[a-f0-9]{64}", digest) is not None
        and isinstance(timestamp, str) and bool(timestamp.strip())
    )


def validate_approval_manifest(manifest: dict, selected_model: str):
    """Validate owner-reviewed provider/model/data/zero-billing/quota evidence."""
    if not isinstance(manifest, dict) or manifest.get("schema_version") != "1.0":
        return False, "APPROVAL_MANIFEST_SCHEMA_INVALID"
    if manifest.get("status") != "APPROVED_FOR_INFERENCE":
        return False, "APPROVAL_MANIFEST_NOT_APPROVED"
    provider = manifest.get("provider")
    if provider != "cloudflare-workers-ai" or not selected_model or manifest.get("model_id") != selected_model:
        return False, "PROVIDER_OR_MODEL_MISMATCH"
    if not _valid_evidence_record(manifest.get("provider_terms")):
        return False, "PROVIDER_TERMS_EVIDENCE_MISSING"
    data_terms = manifest.get("model_data_terms")
    if (not _valid_evidence_record(data_terms)
            or not isinstance(data_terms.get("training_use_policy"), str)
            or not data_terms["training_use_policy"].strip()):
        return False, "MODEL_DATA_TERMS_EVIDENCE_MISSING"
    zero = manifest.get("zero_billing")
    if (not _valid_evidence_record(zero) or zero.get("billing_mode") != "FREE_TIER_ONLY"
            or zero.get("paid_fallback") is not False
            or zero.get("hard_stop_on_paid_or_unknown") is not True):
        return False, "ZERO_BILLING_EVIDENCE_INVALID"
    quota = manifest.get("quota")
    if not isinstance(quota, dict) or quota.get("status") != "VERIFIED":
        return False, "GLOBAL_QUOTA_EVIDENCE_MISSING"
    if (quota.get("scope") != "P10CR_ACCOUNT_GLOBAL"
            or quota.get("arbiter_integration") != "VERIFIED"
            or quota.get("hard_stop_on_paid_or_unknown") is not True
            or quota.get("paid_fallback") is not False
            or not _valid_evidence_record(quota)):
        return False, "GLOBAL_QUOTA_SCOPE_OR_EVIDENCE_INVALID"
    daily_cap = quota.get("daily_call_cap")
    interval = quota.get("min_interval_seconds")
    output_tokens = quota.get("max_output_tokens")
    if (not isinstance(daily_cap, int) or isinstance(daily_cap, bool) or not 1 <= daily_cap <= MAX_CALLS_PER_DAY
            or not isinstance(interval, int) or isinstance(interval, bool) or interval < MIN_INTERVAL_SECONDS
            or not isinstance(output_tokens, int) or isinstance(output_tokens, bool)
            or not 1 <= output_tokens <= MAX_OUTPUT_TOKENS):
        return False, "GLOBAL_QUOTA_LIMITS_INVALID"
    gateway = manifest.get("gateway")
    if (not isinstance(gateway, dict) or gateway.get("status") != "VERIFIED"
            or not isinstance(gateway.get("endpoint"), str) or not gateway["endpoint"].startswith("https://")
            or not _valid_evidence_record(gateway)
            or gateway.get("paid_fallback") is not False
            or provider not in gateway.get("provider_allowlist", [])):
        return False, "PROVIDER_GATEWAY_EVIDENCE_INVALID"
    approval = manifest.get("owner_approval")
    if (not isinstance(approval, dict) or approval.get("approved") is not True
            or not isinstance(approval.get("approval_reference"), str)
            or not approval["approval_reference"].strip()
            or not isinstance(approval.get("approved_at_utc"), str)
            or not approval["approved_at_utc"].strip()):
        return False, "OWNER_APPROVAL_MISSING"
    return True, "APPROVAL_MANIFEST_VALID"


def main():
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
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

    required_owner_flags = (
        "MISSION_AI_PROVIDER_TERMS_REVIEWED",
        "MISSION_AI_MODEL_DATA_TERMS_REVIEWED",
        "MISSION_AI_ZERO_BILLING_CONFIRMED",
        "MISSION_AI_GLOBAL_QUOTA_VERIFIED",
        "MISSION_AI_OWNER_APPROVED",
    )
    for flag in required_owner_flags:
        if os.getenv(flag, "").lower() != "true":
            emit("FAIL_CLOSED_OWNER_GATE_MISSING", {
                "reason": f"{flag} is not true; no inference request was made.",
                "daily_calls_used": usage.get("calls", 0),
                "daily_call_cap": MAX_CALLS_PER_DAY
            })

    model = os.getenv("CLOUDFLARE_AI_MODEL", "")
    if not model:
        emit("WAITING_FOR_PROVIDER_CONFIGURATION", {
            "reason": "An exact model ID is required, but no provider request was made."
        })
    try:
        approval_manifest = read_json(APPROVAL_PATH, {})
    except Exception:
        emit("FAIL_CLOSED_APPROVAL_MANIFEST_INVALID", {
            "reason": "The owner approval manifest is missing or invalid JSON."
        })
    manifest_ok, manifest_reason = validate_approval_manifest(approval_manifest, model)
    if not manifest_ok:
        emit("FAIL_CLOSED_APPROVAL_MANIFEST", {
            "reason": manifest_reason,
            "approval_manifest": str(APPROVAL_PATH.relative_to(ROOT)),
            "no_provider_request": True
        })

    if not GLOBAL_QUOTA_ADAPTER_READY:
        emit("FAIL_CLOSED_GLOBAL_QUOTA_ADAPTER_NOT_INTEGRATED", {
            "reason": "The P59-003 account-global budget reservation/settlement adapter is not yet wired to this worker.",
            "no_provider_request": True
        })
    if not PROVIDER_GATEWAY_ADAPTER_READY:
        emit("FAIL_CLOSED_PROVIDER_GATEWAY_NOT_INTEGRATED", {
            "reason": "The provider-neutral zero-cost gateway is not yet implemented and verified.",
            "no_provider_request": True
        })
    required_reservation = (
        "MISSION_AI_GLOBAL_QUOTA_RESERVATION_ID",
        "MISSION_AI_GLOBAL_QUOTA_FENCING_TOKEN",
        "MISSION_AI_GLOBAL_QUOTA_LEASE_VERSION",
        "MISSION_AI_GLOBAL_QUOTA_DISPATCHER_VERIFIED",
    )
    if any(not os.getenv(name, "").strip() for name in required_reservation) or os.getenv("MISSION_AI_GLOBAL_QUOTA_DISPATCHER_VERIFIED", "").lower() != "true":
        emit("FAIL_CLOSED_GLOBAL_QUOTA_RESERVATION_MISSING", {
            "reason": "A verified dispatcher-issued global reservation and fencing context is required.",
            "no_provider_request": True
        })

    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
    api_token = os.getenv("CLOUDFLARE_API_TOKEN", "")
    if not all((account_id, api_token)):
        emit("WAITING_FOR_PROVIDER_SECRETS", {
            "reason": "Provider credentials are absent; do not paste them into chat or repository files."
        })

    quota_manifest = approval_manifest["quota"]
    daily_call_cap = min(MAX_CALLS_PER_DAY, quota_manifest["daily_call_cap"])
    min_interval_seconds = max(MIN_INTERVAL_SECONDS, quota_manifest["min_interval_seconds"])
    max_output_tokens = min(MAX_OUTPUT_TOKENS, quota_manifest["max_output_tokens"])
    calls = int(usage.get("calls", 0))
    if calls >= daily_call_cap:
        emit("DAILY_QUOTA_CIRCUIT_BREAKER", {
            "reason": "Daily invocation cap reached; worker will not call inference.",
            "daily_calls_used": calls,
            "daily_call_cap": daily_call_cap
        })

    last_call = usage.get("last_call_utc")
    if last_call:
        last_dt = datetime.fromisoformat(last_call.replace("Z", "+00:00"))
        elapsed = (now - last_dt).total_seconds()
        if elapsed < min_interval_seconds:
            emit("COOLDOWN", {
                "reason": "Minimum interval between inference calls has not elapsed.",
                "seconds_until_next_call": int(min_interval_seconds - elapsed)
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
        "max_tokens": max_output_tokens,
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
