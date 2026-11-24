"""Strict P10CR worker-artifact and published-summary contracts.

This module uses only the Python standard library. Model text is never copied
into the published record; only a bounded SHA-256 fingerprint and byte count
cross the publisher boundary.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any

CANONICAL_REPOSITORY = "manish91082-coder/nexus-autonomous-cloud-work-engine"
WORKFLOW_NAME = "Mission Autonomous AI Worker (bounded, fail-closed)"
WORKFLOW_PATH = ".github/workflows/mission-autonomous-worker.yml"
ALLOWED_EVENTS = {"schedule", "push"}
ALLOWED_TASK_ID = "P59-003"
TASK_TITLE = "Audit and implement zero-cost-first autonomous multi-agent research and execution swarm"
PROVIDER_NAME = "Cloudflare Workers AI"
VERIFICATION_NOTE = (
    "Model output is an unverified draft. URLs, eligibility, payout terms and claims "
    "must be independently checked before registry updates or task completion."
)
MAX_REPORT_BYTES = 65536
MAX_OUTPUT_BYTES = 32768
MODEL_ID_PATTERN = re.compile(r"^[A-Za-z0-9@._/-]{1,256}$")
SECRET_PATTERNS = (
    re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"Bearer\s+[A-Za-z0-9._-]{20,}", re.IGNORECASE),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
)
FORBIDDEN_KEYS = {
    "password", "secret", "private_key", "access_token", "api_token",
    "authorization", "cookie", "otp", "recovery_code", "session_cookie",
}
WORKER_REPORT_KEYS = {
    "schema_version", "timestamp_utc", "status", "execution_mode",
    "model_output_is_untrusted", "no_code_execution", "no_publication_or_money_movement",
    "task_id", "task_title", "provider", "model", "daily_calls_used",
    "daily_call_cap", "output", "verification_note",
}
SUMMARY_KEYS = {
    "schema_version", "record_type", "worker_timestamp_utc", "source", "task",
    "provider", "usage", "model_output", "review", "safety",
}
SOURCE_KEYS = {
    "repository", "workflow", "workflow_path", "event", "branch",
    "run_id", "run_attempt", "head_sha",
}


class SummaryValidationError(ValueError):
    """Raised when untrusted worker data violates the publisher contract."""


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise SummaryValidationError("duplicate JSON object key")
        result[key] = value
    return result


def load_json_object(raw: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object)
    except (UnicodeDecodeError, json.JSONDecodeError, SummaryValidationError) as exc:
        raise SummaryValidationError(f"{label} is not valid UTF-8 JSON without duplicate keys") from exc
    if not isinstance(value, dict):
        raise SummaryValidationError(f"{label} must be a JSON object")
    return value


def _exact_keys(value: Any, expected: set[str], label: str) -> None:
    if not isinstance(value, dict) or set(value) != expected:
        raise SummaryValidationError(f"{label} fields do not match the strict schema")


def _reject_forbidden(value: Any, path: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key).strip().lower() in FORBIDDEN_KEYS:
                raise SummaryValidationError(f"forbidden sensitive field at {path}.{key}")
            _reject_forbidden(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _reject_forbidden(child, f"{path}[{index}]")


def _utc_timestamp(value: Any, label: str) -> None:
    if not isinstance(value, str) or not 1 <= len(value) <= 64:
        raise SummaryValidationError(f"{label} is invalid")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise SummaryValidationError(f"{label} is invalid") from exc
    if parsed.tzinfo is None or parsed.utcoffset() != timezone.utc.utcoffset(parsed):
        raise SummaryValidationError(f"{label} must be timezone-aware UTC")


def validate_worker_report(report: dict[str, Any]) -> bytes:
    """Validate the exact P59-003 worker artifact and return its raw output bytes."""
    _exact_keys(report, WORKER_REPORT_KEYS, "worker report")
    _reject_forbidden(report)
    if report.get("schema_version") != "1.0":
        raise SummaryValidationError("unsupported worker report schema")
    if report.get("status") != "DRAFT_READY_FOR_EVIDENCE_REVIEW":
        raise SummaryValidationError("worker report is not a publishable evidence-review draft")
    if report.get("execution_mode") != "BOUNDED_AI_DRAFT_ONLY":
        raise SummaryValidationError("worker execution mode is not draft-only")
    if report.get("task_id") != ALLOWED_TASK_ID or report.get("task_title") != TASK_TITLE:
        raise SummaryValidationError("worker task identity does not match the canonical P59-003 task")
    for key in ("model_output_is_untrusted", "no_code_execution", "no_publication_or_money_movement"):
        if report.get(key) is not True:
            raise SummaryValidationError(f"worker safety assertion is missing: {key}")
    _utc_timestamp(report.get("timestamp_utc"), "worker timestamp")
    if report.get("provider") != PROVIDER_NAME:
        raise SummaryValidationError("worker provider identity is not allowlisted")
    model = report.get("model")
    if not isinstance(model, str) or not MODEL_ID_PATTERN.fullmatch(model):
        raise SummaryValidationError("worker model identity is invalid")
    calls = report.get("daily_calls_used")
    cap = report.get("daily_call_cap")
    if not isinstance(calls, int) or isinstance(calls, bool) or not 1 <= calls <= 6:
        raise SummaryValidationError("daily call count is outside the hard cap")
    if not isinstance(cap, int) or isinstance(cap, bool) or not 1 <= cap <= 6 or calls > cap:
        raise SummaryValidationError("daily call cap is invalid")
    if report.get("verification_note") != VERIFICATION_NOTE:
        raise SummaryValidationError("worker verification note does not match deterministic policy")
    output = report.get("output")
    if not isinstance(output, str) or not output.strip():
        raise SummaryValidationError("draft output must be a non-empty string")
    try:
        output_bytes = output.encode("utf-8")
    except UnicodeEncodeError as exc:
        raise SummaryValidationError("model output is not valid UTF-8 text") from exc
    if not 1 <= len(output_bytes) <= MAX_OUTPUT_BYTES:
        raise SummaryValidationError("model output exceeds the bounded size")
    if any(pattern.search(output) for pattern in SECRET_PATTERNS):
        raise SummaryValidationError("secret-like material detected in model output")
    return output_bytes


def build_summary(source: dict[str, Any], report: dict[str, Any]) -> dict[str, Any]:
    output_bytes = validate_worker_report(report)
    summary = {
        "schema_version": "1.0",
        "record_type": "P10CR_AI_WORKER_DRAFT_SUMMARY",
        "worker_timestamp_utc": report["timestamp_utc"],
        "source": source,
        "task": {"id": ALLOWED_TASK_ID, "title": TASK_TITLE},
        "provider": {"name": PROVIDER_NAME, "model": report["model"]},
        "usage": {
            "daily_calls_used": report["daily_calls_used"],
            "daily_call_cap": report["daily_call_cap"],
        },
        "model_output": {
            "sha256": hashlib.sha256(output_bytes).hexdigest(),
            "bytes": len(output_bytes),
            "raw_content_included": False,
            "trust": "UNVERIFIED_PROPOSAL",
        },
        "review": {
            "status": "REQUIRES_HUMAN_EVIDENCE_REVIEW",
            "automatic_acceptance": False,
            "automatic_task_completion": False,
        },
        "safety": {
            "model_output_is_untrusted": True,
            "no_generated_code_execution": True,
            "no_publication_or_money_movement": True,
        },
    }
    validate_summary(summary, expected_source=source)
    return summary


def validate_summary(summary: dict[str, Any], expected_source: dict[str, Any] | None = None) -> None:
    """Validate every field that may cross the publisher API boundary."""
    _exact_keys(summary, SUMMARY_KEYS, "published summary")
    _reject_forbidden(summary)
    if summary.get("schema_version") != "1.0" or summary.get("record_type") != "P10CR_AI_WORKER_DRAFT_SUMMARY":
        raise SummaryValidationError("published summary type/version is invalid")
    _utc_timestamp(summary.get("worker_timestamp_utc"), "summary worker timestamp")

    source = summary.get("source")
    _exact_keys(source, SOURCE_KEYS, "summary source")
    if (
        source.get("repository") != CANONICAL_REPOSITORY
        or source.get("workflow") != WORKFLOW_NAME
        or source.get("workflow_path") != WORKFLOW_PATH
        or source.get("branch") != "master"
        or not isinstance(source.get("event"), str)
        or source.get("event") not in ALLOWED_EVENTS
    ):
        raise SummaryValidationError("summary source provenance is not allowlisted")
    run_id = source.get("run_id")
    attempt = source.get("run_attempt")
    if not isinstance(run_id, int) or isinstance(run_id, bool) or run_id < 1:
        raise SummaryValidationError("summary source run ID is invalid")
    if not isinstance(attempt, int) or isinstance(attempt, bool) or not 1 <= attempt <= 100:
        raise SummaryValidationError("summary source attempt is invalid")
    if not isinstance(source.get("head_sha"), str) or not re.fullmatch(r"[a-f0-9]{40}", source["head_sha"]):
        raise SummaryValidationError("summary source head SHA is invalid")
    if expected_source is not None and source != expected_source:
        raise SummaryValidationError("summary provenance differs from the verified workflow event")

    task = summary.get("task")
    _exact_keys(task, {"id", "title"}, "summary task")
    if task != {"id": ALLOWED_TASK_ID, "title": TASK_TITLE}:
        raise SummaryValidationError("summary task identity is not the canonical P59-003 task")

    provider = summary.get("provider")
    _exact_keys(provider, {"name", "model"}, "summary provider")
    if provider.get("name") != PROVIDER_NAME:
        raise SummaryValidationError("summary provider is not allowlisted")
    if not isinstance(provider.get("model"), str) or not MODEL_ID_PATTERN.fullmatch(provider["model"]):
        raise SummaryValidationError("summary model identity is invalid")

    usage = summary.get("usage")
    _exact_keys(usage, {"daily_calls_used", "daily_call_cap"}, "summary usage")
    calls = usage.get("daily_calls_used")
    cap = usage.get("daily_call_cap")
    if not isinstance(calls, int) or isinstance(calls, bool) or not 1 <= calls <= 6:
        raise SummaryValidationError("summary daily call count is invalid")
    if not isinstance(cap, int) or isinstance(cap, bool) or not 1 <= cap <= 6 or calls > cap:
        raise SummaryValidationError("summary daily call cap is invalid")

    model_output = summary.get("model_output")
    _exact_keys(model_output, {"sha256", "bytes", "raw_content_included", "trust"}, "summary model output")
    if not isinstance(model_output.get("sha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", model_output["sha256"]):
        raise SummaryValidationError("summary model-output digest is invalid")
    size = model_output.get("bytes")
    if not isinstance(size, int) or isinstance(size, bool) or not 1 <= size <= MAX_OUTPUT_BYTES:
        raise SummaryValidationError("summary model-output byte count is invalid")
    if model_output.get("raw_content_included") is not False or model_output.get("trust") != "UNVERIFIED_PROPOSAL":
        raise SummaryValidationError("summary must contain only an unverified output fingerprint")

    review = summary.get("review")
    _exact_keys(review, {"status", "automatic_acceptance", "automatic_task_completion"}, "summary review")
    if review != {
        "status": "REQUIRES_HUMAN_EVIDENCE_REVIEW",
        "automatic_acceptance": False,
        "automatic_task_completion": False,
    }:
        raise SummaryValidationError("summary review gate is invalid")

    safety = summary.get("safety")
    _exact_keys(safety, {"model_output_is_untrusted", "no_generated_code_execution", "no_publication_or_money_movement"}, "summary safety")
    if safety != {
        "model_output_is_untrusted": True,
        "no_generated_code_execution": True,
        "no_publication_or_money_movement": True,
    }:
        raise SummaryValidationError("summary safety contract is invalid")


def serialize_summary(summary: dict[str, Any]) -> bytes:
    validate_summary(summary)
    return (json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")


def decode_summary_content(encoded: str, expected_run_id: int, expected_attempt: int) -> tuple[dict[str, Any], bytes]:
    if not isinstance(encoded, str):
        raise SummaryValidationError("publisher content encoding is invalid")
    try:
        decoded = base64.b64decode(encoded, validate=True)
        summary = load_json_object(decoded, "publisher summary")
    except (ValueError, SummaryValidationError) as exc:
        raise SummaryValidationError("publisher content is not valid canonical UTF-8 JSON") from exc
    if not decoded or len(decoded) > MAX_REPORT_BYTES:
        raise SummaryValidationError("publisher summary content size is invalid")
    validate_summary(summary)
    if summary["source"]["run_id"] != expected_run_id or summary["source"]["run_attempt"] != expected_attempt:
        raise SummaryValidationError("summary source identity does not match the deterministic file path")
    if serialize_summary(summary) != decoded:
        raise SummaryValidationError("publisher summary JSON is not canonically serialized")
    return summary, decoded
