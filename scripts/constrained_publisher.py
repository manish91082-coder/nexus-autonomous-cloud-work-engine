#!/usr/bin/env python3
"""Deterministic, allowlisted, owner-gated publisher for P10CR draft evidence.

The compute worker never receives a write token. This publisher accepts only a
sanitized summary of a P59-003 model draft, creates one dedicated branch and a
DRAFT pull request, and has no merge, delete, force-push, release or deployment
operation. Validation mode is fully offline and uses only the Python standard
library.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

CANONICAL_REPOSITORY = "manish91082-coder/nexus-autonomous-cloud-work-engine"
WORKFLOW_NAME = "Mission Autonomous AI Worker (bounded, fail-closed)"
WORKFLOW_PATH = ".github/workflows/mission-autonomous-worker.yml"
ALLOWED_EVENTS = {"schedule", "push"}
ALLOWED_TASK_ID = "P59-003"
BRANCH_PREFIX = "automation/p10cr/worker-run-"
MAX_REPORT_BYTES = 65536
MAX_OUTPUT_BYTES = 32768
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


class PublisherError(RuntimeError):
    pass


class ApiError(PublisherError):
    def __init__(self, status: int, message: str):
        self.status = status
        super().__init__(f"GitHub API returned HTTP {status}: {message[:400]}")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _reject_forbidden_keys(value: Any, path: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = str(key).strip().lower()
            if normalized in FORBIDDEN_KEYS:
                raise PublisherError(f"forbidden sensitive field at {path}.{key}")
            _reject_forbidden_keys(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _reject_forbidden_keys(child, f"{path}[{index}]")


def validate_source_event(event: dict[str, Any], expected_repo: str) -> dict[str, Any]:
    if event.get("action") != "completed":
        raise PublisherError("source event is not a completed workflow_run event")
    repository = (event.get("repository") or {}).get("full_name")
    if repository != expected_repo or repository != CANONICAL_REPOSITORY:
        raise PublisherError("source repository is not the canonical P10CR repository")

    run = event.get("workflow_run")
    if not isinstance(run, dict):
        raise PublisherError("workflow_run payload is missing")
    if run.get("name") != WORKFLOW_NAME or run.get("path") != WORKFLOW_PATH:
        raise PublisherError("source workflow identity mismatch")
    if run.get("head_branch") != "master":
        raise PublisherError("source run must originate from canonical master")
    if run.get("event") not in ALLOWED_EVENTS:
        raise PublisherError("source event type is not allowlisted")
    if run.get("conclusion") != "success":
        raise PublisherError("source workflow did not succeed")

    head_repository = (run.get("head_repository") or {}).get("full_name")
    if head_repository != CANONICAL_REPOSITORY:
        raise PublisherError("source head repository mismatch")

    head_sha = run.get("head_sha")
    if not isinstance(head_sha, str) or not re.fullmatch(r"[a-f0-9]{40}", head_sha):
        raise PublisherError("source head SHA is invalid")
    run_id = run.get("id")
    attempt = run.get("run_attempt", 1)
    if not isinstance(run_id, int) or isinstance(run_id, bool) or run_id < 1:
        raise PublisherError("source run ID is invalid")
    if not isinstance(attempt, int) or isinstance(attempt, bool) or not 1 <= attempt <= 100:
        raise PublisherError("source run attempt is invalid")

    return {
        "repository": CANONICAL_REPOSITORY,
        "workflow": WORKFLOW_NAME,
        "workflow_path": WORKFLOW_PATH,
        "event": run["event"],
        "branch": "master",
        "run_id": run_id,
        "run_attempt": attempt,
        "head_sha": head_sha,
    }


def _find_report(artifact_dir: Path) -> Path | None:
    if not artifact_dir.exists() or not artifact_dir.is_dir():
        raise PublisherError("artifact directory is unavailable")
    candidates = list(artifact_dir.rglob("ai_worker_report.json"))
    if not candidates:
        return None
    if len(candidates) != 1:
        raise PublisherError("artifact must contain exactly one AI worker report")
    report_path = candidates[0]
    if report_path.is_symlink() or not report_path.is_file():
        raise PublisherError("worker report must be a regular non-symlink file")
    if report_path.stat().st_size > MAX_REPORT_BYTES:
        raise PublisherError("worker report exceeds the size limit")
    return report_path


def build_publish_plan(
    event: dict[str, Any],
    artifact_dir: Path,
    expected_repo: str = CANONICAL_REPOSITORY,
) -> dict[str, Any] | None:
    source = validate_source_event(event, expected_repo)
    report_path = _find_report(artifact_dir)
    if report_path is None:
        return None

    raw = report_path.read_bytes()
    try:
        report = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PublisherError("worker report is not valid UTF-8 JSON") from exc
    if not isinstance(report, dict):
        raise PublisherError("worker report must be a JSON object")
    _reject_forbidden_keys(report)

    # A normal disabled/blocked run is a successful no-op, never a publish event.
    if report.get("status") != "DRAFT_READY_FOR_EVIDENCE_REVIEW":
        return None

    if report.get("schema_version") != "1.0":
        raise PublisherError("unsupported worker report schema")
    if report.get("execution_mode") != "BOUNDED_AI_DRAFT_ONLY":
        raise PublisherError("worker execution mode is not draft-only")
    if report.get("task_id") != ALLOWED_TASK_ID:
        raise PublisherError("publisher is restricted to P59-003")
    if report.get("model_output_is_untrusted") is not True:
        raise PublisherError("model output must be explicitly marked untrusted")
    if report.get("no_code_execution") is not True:
        raise PublisherError("code execution safety assertion is missing")
    if report.get("no_publication_or_money_movement") is not True:
        raise PublisherError("publication/money-movement safety assertion is missing")

    output = report.get("output")
    if not isinstance(output, str) or not output.strip():
        raise PublisherError("draft output must be a non-empty string")
    output_bytes = output.encode("utf-8")
    if len(output_bytes) > MAX_OUTPUT_BYTES:
        raise PublisherError("model output exceeds the bounded size")
    if any(pattern.search(output) for pattern in SECRET_PATTERNS):
        raise PublisherError("secret-like material detected in model output")

    provider = report.get("provider")
    model = report.get("model")
    timestamp = report.get("timestamp_utc")
    task_title = report.get("task_title", "")
    calls = report.get("daily_calls_used")
    cap = report.get("daily_call_cap")
    if not isinstance(provider, str) or not provider.strip() or len(provider) > 128:
        raise PublisherError("provider identity is invalid")
    if not isinstance(model, str) or not model.strip() or len(model) > 256:
        raise PublisherError("model identity is invalid")
    if not isinstance(timestamp, str) or len(timestamp) > 64:
        raise PublisherError("worker timestamp is invalid")
    if not isinstance(task_title, str) or len(task_title) > 256:
        raise PublisherError("task title is invalid")
    if not isinstance(calls, int) or isinstance(calls, bool) or not 1 <= calls <= 6:
        raise PublisherError("daily call count is outside the hard cap")
    if not isinstance(cap, int) or isinstance(cap, bool) or not 1 <= cap <= 6 or calls > cap:
        raise PublisherError("daily call cap is invalid")

    summary = {
        "schema_version": "1.0",
        "record_type": "P10CR_AI_WORKER_DRAFT_SUMMARY",
        "source": source,
        "task": {"id": ALLOWED_TASK_ID, "title": task_title},
        "provider": {"name": provider, "model": model},
        "usage": {"daily_calls_used": calls, "daily_call_cap": cap},
        "model_output": {
            "sha256": sha256(output_bytes),
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
    content = (json.dumps(summary, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")
    run_id = source["run_id"]
    attempt = source["run_attempt"]
    branch = f"{BRANCH_PREFIX}{run_id}-attempt-{attempt}"
    path = f"research/worker-drafts/ai-run-{run_id}-attempt-{attempt}.json"
    return {
        "repository": CANONICAL_REPOSITORY,
        "branch": branch,
        "path": path,
        "content_base64": base64.b64encode(content).decode("ascii"),
        "content_sha256": sha256(content),
        "summary": summary,
    }


def _validate_api_request(method: str, path: str, payload: dict[str, Any] | None = None) -> None:
    """Allow only the exact GitHub REST routes used by the draft-only publisher."""
    if method not in {"GET", "POST", "PUT"}:
        raise PublisherError("publisher HTTP method is not allowlisted")
    if not isinstance(path, str):
        raise PublisherError("publisher API path must be a string")
    parsed = urllib.parse.urlsplit(path)
    if parsed.scheme or parsed.netloc or parsed.fragment or parsed.path.startswith("//"):
        raise PublisherError("publisher API path must be a relative canonical route")
    root = "/repos/" + CANONICAL_REPOSITORY
    if not parsed.path.startswith(root + "/"):
        raise PublisherError("publisher API path is outside the canonical repository")
    try:
        query = urllib.parse.parse_qs(parsed.query, keep_blank_values=True, strict_parsing=True) if parsed.query else {}
    except ValueError as exc:
        raise PublisherError("publisher API query is malformed") from exc

    branch_pattern = r"automation/p10cr/worker-run-([1-9][0-9]*)-attempt-([1-9][0-9]*)"
    branch_ref = re.fullmatch(re.escape(root) + r"/git/ref/heads/(" + branch_pattern + r")", parsed.path)
    if method == "GET" and parsed.path == root + "/git/ref/heads/master" and not query and payload is None:
        return
    if method == "GET" and branch_ref and not query and payload is None:
        return

    if method == "POST" and parsed.path == root + "/git/refs" and not query:
        if not isinstance(payload, dict) or set(payload) != {"ref", "sha"}:
            raise PublisherError("publisher ref payload is not allowlisted")
        ref = payload.get("ref")
        sha = payload.get("sha")
        if not isinstance(ref, str) or not re.fullmatch(r"refs/heads/" + branch_pattern, ref):
            raise PublisherError("publisher ref name is not allowlisted")
        if not isinstance(sha, str) or not re.fullmatch(r"[a-f0-9]{40}", sha):
            raise PublisherError("publisher ref target SHA is invalid")
        return

    content_match = re.fullmatch(
        re.escape(root) + r"/contents/research/worker-drafts/ai-run-([1-9][0-9]*)-attempt-([1-9][0-9]*)\.json",
        parsed.path,
    )
    if content_match:
        run_id, attempt = content_match.groups()
        branch = f"automation/p10cr/worker-run-{run_id}-attempt-{attempt}"
        if method == "GET" and query == {"ref": [branch]} and payload is None:
            return
        if method == "PUT" and not query:
            if not isinstance(payload, dict) or set(payload) != {"message", "content", "branch"}:
                raise PublisherError("publisher content payload is not allowlisted")
            if payload.get("branch") != branch:
                raise PublisherError("publisher content branch does not match the file path")
            if payload.get("message") != f"Add sanitized P10CR worker draft summary for run {run_id}":
                raise PublisherError("publisher content commit message is not allowlisted")
            encoded = payload.get("content")
            if not isinstance(encoded, str):
                raise PublisherError("publisher content encoding is invalid")
            try:
                decoded = base64.b64decode(encoded, validate=True)
            except Exception as exc:
                raise PublisherError("publisher content encoding is invalid") from exc
            if not decoded or len(decoded) > MAX_REPORT_BYTES:
                raise PublisherError("publisher content size is outside the limit")
            return

    if method == "GET" and parsed.path == root + "/pulls" and payload is None:
        if query == {
            "state": ["open"],
            "head": [CANONICAL_REPOSITORY.split("/", 1)[0] + ":" + branch],
            "base": ["master"],
        }:
            return
        raise PublisherError("publisher pull-request query is not allowlisted")

    if method == "POST" and parsed.path == root + "/pulls" and not query:
        if not isinstance(payload, dict) or set(payload) != {"title", "head", "base", "body", "draft"}:
            raise PublisherError("publisher pull-request payload is not allowlisted")
        match = re.fullmatch(branch_pattern, payload.get("head", "") if isinstance(payload.get("head"), str) else "")
        if not match:
            raise PublisherError("publisher pull-request head is not allowlisted")
        run_id, attempt = match.groups()
        if payload.get("base") != "master" or payload.get("draft") is not True:
            raise PublisherError("publisher may create draft PRs to master only")
        if payload.get("title") != f"P10CR AI worker draft evidence: run {run_id} attempt {attempt}":
            raise PublisherError("publisher pull-request title is not allowlisted")
        body = payload.get("body")
        if not isinstance(body, str) or not 1 <= len(body) <= 4096:
            raise PublisherError("publisher pull-request body is outside the size limit")
        return

    raise PublisherError("publisher API route/method is not allowlisted")


class _RejectRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Never forward the scoped GitHub App token through an HTTP redirect."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class GitHubApi:
    """Small standard-library REST client. Token is never included in errors/logs."""

    def __init__(self, token: str):
        if not isinstance(token, str) or len(token) < 20:
            raise PublisherError("scoped publisher token is missing")
        self._token = token

    def request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
        _validate_api_request(method, path, payload)
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            "https://api.github.com" + path,
            data=data,
            method=method,
            headers={
                "Authorization": "Bearer " + self._token,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "P10CR-Constrained-Publisher",
                "Content-Type": "application/json",
            },
        )
        try:
            opener = urllib.request.build_opener(_RejectRedirectHandler())
            with opener.open(request, timeout=20) as response:
                body = response.read(1024 * 1024)
                return json.loads(body.decode("utf-8")) if body else {}
        except urllib.error.HTTPError as exc:
            try:
                message = exc.read(4096).decode("utf-8", errors="replace")
            except Exception:
                message = "unavailable"
            raise ApiError(exc.code, message) from None
        except (urllib.error.URLError, TimeoutError) as exc:
            raise PublisherError(f"GitHub API transport failed: {type(exc).__name__}") from None


def publish_plan(plan: dict[str, Any], api: Any) -> dict[str, Any]:
    """Create/reuse one allowlisted branch and one draft PR. There is no merge path."""
    repo = plan["repository"]
    owner, _ = repo.split("/", 1)
    branch = plan["branch"]
    path = plan["path"]
    if not branch.startswith(BRANCH_PREFIX) or not re.fullmatch(
        r"automation/p10cr/worker-run-[1-9][0-9]*-attempt-[1-9][0-9]*", branch
    ):
        raise PublisherError("publisher branch is outside the deterministic allowlist")
    if not re.fullmatch(r"research/worker-drafts/ai-run-[1-9][0-9]*-attempt-[1-9][0-9]*\.json", path):
        raise PublisherError("publisher file path is outside the deterministic allowlist")
    content = base64.b64decode(plan["content_base64"], validate=True)
    if sha256(content) != plan["content_sha256"]:
        raise PublisherError("publisher plan digest mismatch")

    root = f"/repos/{repo}"
    master = api.request("GET", root + "/git/ref/heads/master")
    base_sha = (master.get("object") or {}).get("sha")
    if not isinstance(base_sha, str) or not re.fullmatch(r"[a-f0-9]{40}", base_sha):
        raise PublisherError("canonical master ref is invalid")

    branch_ref_path = root + "/git/ref/heads/" + urllib.parse.quote(branch, safe="/")
    try:
        api.request("GET", branch_ref_path)
    except ApiError as exc:
        if exc.status != 404:
            raise
        try:
            api.request("POST", root + "/git/refs", {"ref": "refs/heads/" + branch, "sha": base_sha})
        except ApiError as create_error:
            if create_error.status not in (409, 422):
                raise
            # A concurrent retry may have created the same deterministic branch.
            api.request("GET", branch_ref_path)

    encoded_path = urllib.parse.quote(path, safe="/")
    content_query = urllib.parse.urlencode({"ref": branch})
    content_path = root + "/contents/" + encoded_path + "?" + content_query
    try:
        existing = api.request("GET", content_path)
    except ApiError as exc:
        if exc.status != 404:
            raise
        api.request(
            "PUT",
            root + "/contents/" + encoded_path,
            {
                "message": f"Add sanitized P10CR worker draft summary for run {plan['summary']['source']['run_id']}",
                "content": plan["content_base64"],
                "branch": branch,
            },
        )
    else:
        try:
            existing_bytes = base64.b64decode(existing.get("content", "").replace("\n", ""), validate=True)
        except Exception as exc:
            raise PublisherError("existing branch file encoding is invalid") from exc
        if existing_bytes != content:
            raise PublisherError("existing deterministic branch contains different content")

    pull_query = urllib.parse.urlencode({
        "state": "open",
        "head": owner + ":" + branch,
        "base": "master",
    })
    existing_prs = api.request("GET", root + "/pulls?" + pull_query)
    if isinstance(existing_prs, list) and existing_prs:
        pr = existing_prs[0]
        if pr.get("draft") is not True:
            raise PublisherError("existing publisher PR is not a draft")
        return {"status": "EXISTING_DRAFT_PR", "number": pr.get("number"), "url": pr.get("html_url")}

    run_id = plan["summary"]["source"]["run_id"]
    attempt = plan["summary"]["source"]["run_attempt"]
    body = (
        "Automated P10CR worker evidence summary. This draft contains only a sanitized "
        "hash/metadata record; raw model output is not included. Model output remains an "
        "untrusted proposal and requires independent evidence review. This publisher "
        "creates draft PRs only and never merges, deploys, publishes products or changes "
        "financial/account state.\n\n"
        f"- Source run: {run_id}, attempt {attempt}\n"
        f"- Source SHA: {plan['summary']['source']['head_sha']}\n"
        f"- Summary SHA-256: {plan['content_sha256']}\n"
        "- Required: human review and required CI checks before any merge."
    )
    pr = api.request(
        "POST",
        root + "/pulls",
        {
            "title": f"P10CR AI worker draft evidence: run {run_id} attempt {attempt}",
            "head": branch,
            "base": "master",
            "body": body,
            "draft": True,
        },
    )
    if pr.get("draft") is not True or not isinstance(pr.get("number"), int):
        raise PublisherError("GitHub did not confirm creation of a draft PR")
    return {"status": "DRAFT_PR_CREATED", "number": pr["number"], "url": pr.get("html_url")}


def _write_output(name: str, value: str) -> None:
    output_path = os.getenv("GITHUB_OUTPUT")
    if output_path:
        with open(output_path, "a", encoding="utf-8") as handle:
            handle.write(f"{name}={value}\n")


def _read_event(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PublisherError("workflow event file is unavailable or invalid JSON") from exc
    if not isinstance(value, dict):
        raise PublisherError("workflow event must be a JSON object")
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description="P10CR deterministic constrained publisher")
    sub = parser.add_subparsers(dest="command", required=True)
    validate = sub.add_parser("validate")
    validate.add_argument("--event-file", required=True)
    validate.add_argument("--artifact-dir", required=True)
    validate.add_argument("--repo", default=CANONICAL_REPOSITORY)
    validate.add_argument("--plan-file", required=True)
    publish = sub.add_parser("publish")
    publish.add_argument("--event-file", required=True)
    publish.add_argument("--artifact-dir", required=True)
    publish.add_argument("--repo", default=CANONICAL_REPOSITORY)
    publish.add_argument("--plan-file", required=True)

    args = parser.parse_args()
    try:
        event = _read_event(Path(args.event_file))
        plan = build_publish_plan(event, Path(args.artifact_dir), args.repo)
        plan_path = Path(args.plan_file)
        if args.command == "validate":
            if plan is None:
                plan_path.unlink(missing_ok=True)
                _write_output("publishable", "false")
                print(json.dumps({"status": "NO_PUBLISHABLE_P59_003_DRAFT", "write_token_requested": False}))
                return 0
            plan_path.write_text(json.dumps(plan, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
            _write_output("publishable", "true")
            print(json.dumps({
                "status": "VALIDATED_DRAFT_SUMMARY",
                "branch": plan["branch"],
                "path": plan["path"],
                "summary_sha256": plan["content_sha256"],
                "raw_model_output_included": False,
            }))
            return 0

        if plan is None:
            print(json.dumps({"status": "NO_PUBLISHABLE_P59_003_DRAFT", "write_token_used": False}))
            return 0
        try:
            saved = json.loads(plan_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise PublisherError("validated publisher plan is unavailable") from exc
        if saved != plan:
            raise PublisherError("publisher plan changed after validation")
        token = os.getenv("NEXUS_PUBLISHER_TOKEN", "")
        if not token:
            raise PublisherError("owner-approved scoped publisher token is unavailable")
        result = publish_plan(plan, GitHubApi(token))
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (PublisherError, ApiError) as exc:
        print(f"PUBLISHER_REJECTED: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
