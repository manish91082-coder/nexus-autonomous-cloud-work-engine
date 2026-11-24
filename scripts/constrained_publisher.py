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

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from scripts.p10cr_artifact_provenance import (
    ArtifactProvenanceError,
    validate_artifact_attestation,
    validate_source_event as validate_verified_source_event,
)
from scripts.p10cr_summary_schema import (
    SummaryValidationError,
    build_summary,
    decode_summary_content,
    load_json_object,
    serialize_summary,
    validate_summary,
)

CANONICAL_REPOSITORY = "manish91082-coder/nexus-autonomous-cloud-work-engine"
WORKFLOW_NAME = "Mission Autonomous AI Worker (bounded, fail-closed)"
WORKFLOW_PATH = ".github/workflows/mission-autonomous-worker.yml"
ALLOWED_EVENTS = {"schedule", "push"}
ALLOWED_TASK_ID = "P59-003"
BRANCH_PREFIX = "automation/p10cr/worker-run-"
MAX_REPORT_BYTES = 65536
MAX_OUTPUT_BYTES = 32768
MAX_PUBLISH_PLAN_BYTES = 131072
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
    try:
        return validate_verified_source_event(event, expected_repo)
    except ArtifactProvenanceError as exc:
        raise PublisherError(str(exc)) from exc


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
    artifact_metadata: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    source = validate_source_event(event, expected_repo)
    if not isinstance(artifact_metadata, dict):
        raise PublisherError("verified source artifact attestation is required")
    try:
        artifact = validate_artifact_attestation(artifact_metadata, source)
    except ArtifactProvenanceError as exc:
        raise PublisherError("source artifact attestation is invalid") from exc
    report_path = _find_report(artifact_dir)
    if report_path is None:
        return None

    raw = report_path.read_bytes()
    report_manifest = next(
        (entry for entry in artifact["files"] if entry.get("name") == "ai_worker_report.json"),
        None,
    )
    if (
        not isinstance(report_manifest, dict)
        or len(raw) != report_manifest.get("size_in_bytes")
        or sha256(raw) != report_manifest.get("sha256")
    ):
        raise PublisherError("worker report bytes differ from the verified artifact file manifest")
    try:
        report = load_json_object(raw, "worker report")
    except SummaryValidationError as exc:
        raise PublisherError(str(exc)) from exc

    # A normal disabled/blocked run is a successful no-op, never a publish event.
    if report.get("status") != "DRAFT_READY_FOR_EVIDENCE_REVIEW":
        return None

    try:
        summary = build_summary(source, report, artifact)
        content = serialize_summary(summary)
    except SummaryValidationError as exc:
        raise PublisherError(str(exc)) from exc
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

    decoded_path = urllib.parse.unquote(parsed.path)
    compare_match = re.fullmatch(
        re.escape(root) + r"/compare/master\.\.\.(" + branch_pattern + r")",
        decoded_path,
    )
    if method == "GET" and compare_match and not query and payload is None:
        compare_branch = compare_match.group(1)
        expected_path = root + "/compare/master..." + urllib.parse.quote(compare_branch, safe="")
        if path != expected_path:
            raise PublisherError("publisher compare route is not canonically encoded")
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
            try:
                decode_summary_content(encoded, int(run_id), int(attempt))
            except SummaryValidationError as exc:
                raise PublisherError(str(exc)) from exc
            return

    if method == "GET" and parsed.path == root + "/pulls" and payload is None:
        owner_prefix = CANONICAL_REPOSITORY.split("/", 1)[0] + ":"
        heads = query.get("head", [])
        branch = heads[0][len(owner_prefix):] if len(heads) == 1 and heads[0].startswith(owner_prefix) else ""
        if (
            set(query) == {"state", "head", "base"}
            and query.get("state") == ["open"]
            and query.get("base") == ["master"]
            and re.fullmatch(branch_pattern, branch)
        ):
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


def _validate_branch_compare(
    result: dict[str, Any],
    expected_base_sha: str,
    expected_path: str,
    branch_sha: str,
    allow_empty: bool,
) -> str:
    """Require an isolated branch: either empty or exactly one summary-file commit."""
    if not isinstance(result, dict):
        raise PublisherError("publisher branch comparison response is invalid")
    base = result.get("base_commit")
    merge_base = result.get("merge_base_commit")
    if not isinstance(base, dict) or base.get("sha") != expected_base_sha:
        raise PublisherError("publisher compare base no longer matches the observed master SHA")
    if not isinstance(merge_base, dict) or merge_base.get("sha") != expected_base_sha:
        raise PublisherError("publisher branch is not directly based on the current master")
    ahead = result.get("ahead_by")
    behind = result.get("behind_by")
    total = result.get("total_commits")
    if any(not isinstance(value, int) or isinstance(value, bool) for value in (ahead, behind, total)):
        raise PublisherError("publisher branch comparison counters are invalid")
    if behind != 0:
        raise PublisherError("publisher branch is behind or diverged from current master")
    files = result.get("files")
    if files is None:
        files = []
    if not isinstance(files, list):
        raise PublisherError("publisher branch comparison file list is invalid")
    if allow_empty and ahead == 0 and total == 0 and files == [] and branch_sha == expected_base_sha and result.get("status") == "identical":
        return "EMPTY"
    if ahead != 1 or total != 1 or branch_sha == expected_base_sha or len(files) != 1 or result.get("status") != "ahead":
        raise PublisherError("publisher branch must contain exactly one commit and one summary file")
    file_entry = files[0]
    if not isinstance(file_entry, dict):
        raise PublisherError("publisher branch diff entry is invalid")
    additions = file_entry.get("additions")
    deletions = file_entry.get("deletions")
    changes = file_entry.get("changes")
    if (
        file_entry.get("filename") != expected_path
        or file_entry.get("status") != "added"
        or not isinstance(additions, int) or isinstance(additions, bool) or additions < 1
        or not isinstance(deletions, int) or isinstance(deletions, bool) or deletions != 0
        or not isinstance(changes, int) or isinstance(changes, bool) or changes != additions
    ):
        raise PublisherError("publisher branch diff contains unexpected files or modifications")
    return "ONE_SUMMARY_COMMIT"


def _validate_draft_pr(
    pr: dict[str, Any],
    branch: str,
    branch_sha: str,
    expected_base_sha: str,
) -> None:
    if not isinstance(pr, dict) or pr.get("state") != "open" or pr.get("draft") is not True:
        raise PublisherError("publisher PR must remain open and draft")
    head = pr.get("head")
    base = pr.get("base")
    if (
        not isinstance(head, dict)
        or head.get("ref") != branch
        or head.get("sha") != branch_sha
        or not isinstance(base, dict)
        or base.get("ref") != "master"
        or base.get("sha") != expected_base_sha
        or not isinstance(head.get("repo"), dict)
        or head["repo"].get("full_name") != CANONICAL_REPOSITORY
        or not isinstance(base.get("repo"), dict)
        or base["repo"].get("full_name") != CANONICAL_REPOSITORY
    ):
        raise PublisherError("publisher draft PR head/base identity does not match the verified refs")


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


def validate_publish_plan(plan: dict[str, Any]) -> dict[str, Any]:
    """Validate the complete sanitized plan without reading a token or making a request."""
    if not isinstance(plan, dict) or set(plan) != {
        "repository", "branch", "path", "content_base64", "content_sha256", "summary"
    }:
        raise PublisherError("publisher plan fields do not match the strict contract")
    repo = plan["repository"]
    if repo != CANONICAL_REPOSITORY:
        raise PublisherError("publisher plan repository is not canonical")
    owner, _ = repo.split("/", 1)
    summary = plan["summary"]
    try:
        validate_summary(summary)
        run_id = summary["source"]["run_id"]
        attempt = summary["source"]["run_attempt"]
        content = base64.b64decode(plan["content_base64"], validate=True)
        canonical_content = serialize_summary(summary)
    except (SummaryValidationError, ValueError) as exc:
        raise PublisherError("publisher plan summary/content is invalid") from exc
    branch = plan["branch"]
    path = plan["path"]
    if branch != f"{BRANCH_PREFIX}{run_id}-attempt-{attempt}":
        raise PublisherError("publisher branch does not match verified provenance")
    if path != f"research/worker-drafts/ai-run-{run_id}-attempt-{attempt}.json":
        raise PublisherError("publisher file path does not match verified provenance")
    if not isinstance(plan.get("content_sha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", plan["content_sha256"]):
        raise PublisherError("publisher plan digest format is invalid")
    if content != canonical_content or sha256(content) != plan["content_sha256"]:
        raise PublisherError("publisher plan content does not match the validated summary")
    return {
        "repository": repo,
        "owner": owner,
        "summary": summary,
        "run_id": run_id,
        "attempt": attempt,
        "content": content,
        "branch": branch,
        "path": path,
    }


def publish_plan(plan: dict[str, Any], api: Any) -> dict[str, Any]:
    """Create/reuse one allowlisted branch and one draft PR. There is no merge path."""
    validated = validate_publish_plan(plan)
    repo = validated["repository"]
    owner = validated["owner"]
    summary = validated["summary"]
    run_id = validated["run_id"]
    attempt = validated["attempt"]
    content = validated["content"]
    branch = validated["branch"]
    path = validated["path"]
    root = f"/repos/{repo}"
    master = api.request("GET", root + "/git/ref/heads/master")
    base_sha = (master.get("object") or {}).get("sha")
    if not isinstance(base_sha, str) or not re.fullmatch(r"[a-f0-9]{40}", base_sha):
        raise PublisherError("canonical master ref is invalid")

    branch_ref_path = root + "/git/ref/heads/" + urllib.parse.quote(branch, safe="/")
    try:
        branch_ref = api.request("GET", branch_ref_path)
    except ApiError as exc:
        if exc.status != 404:
            raise
        try:
            api.request("POST", root + "/git/refs", {"ref": "refs/heads/" + branch, "sha": base_sha})
        except ApiError as create_error:
            if create_error.status not in (409, 422):
                raise
        branch_ref = api.request("GET", branch_ref_path)

    branch_sha = (branch_ref.get("object") or {}).get("sha")
    if not isinstance(branch_sha, str) or not re.fullmatch(r"[a-f0-9]{40}", branch_sha):
        raise PublisherError("deterministic publisher branch ref is invalid")
    compare_path = root + "/compare/master..." + urllib.parse.quote(branch, safe="")
    compare = api.request("GET", compare_path)
    branch_state = _validate_branch_compare(compare, base_sha, path, branch_sha, allow_empty=True)

    encoded_path = urllib.parse.quote(path, safe="/")
    content_query = urllib.parse.urlencode({"ref": branch})
    content_path = root + "/contents/" + encoded_path + "?" + content_query
    try:
        existing = api.request("GET", content_path)
    except ApiError as exc:
        if exc.status != 404:
            raise
        if branch_state != "EMPTY":
            raise PublisherError("publisher branch diff claims a summary commit but its file is missing")
        api.request(
            "PUT",
            root + "/contents/" + encoded_path,
            {
                "message": f"Add sanitized P10CR worker draft summary for run {run_id}",
                "content": plan["content_base64"],
                "branch": branch,
            },
        )
    else:
        if branch_state != "ONE_SUMMARY_COMMIT":
            raise PublisherError("publisher branch contains a file without the exact expected one-commit diff")
        try:
            existing_bytes = base64.b64decode(existing.get("content", "").replace("\n", ""), validate=True)
        except Exception as exc:
            raise PublisherError("existing branch file encoding is invalid") from exc
        if existing_bytes != content:
            raise PublisherError("existing deterministic branch contains different content")

    # Re-read both refs and compare after any write; a concurrent or pre-existing
    # branch mutation must fail before a draft PR can be created or reused.
    branch_ref = api.request("GET", branch_ref_path)
    branch_sha = (branch_ref.get("object") or {}).get("sha")
    if not isinstance(branch_sha, str) or not re.fullmatch(r"[a-f0-9]{40}", branch_sha):
        raise PublisherError("publisher branch ref changed to an invalid SHA")
    compare = api.request("GET", compare_path)
    _validate_branch_compare(compare, base_sha, path, branch_sha, allow_empty=False)

    pull_query = urllib.parse.urlencode({
        "state": "open",
        "head": owner + ":" + branch,
        "base": "master",
    })
    existing_prs = api.request("GET", root + "/pulls?" + pull_query)
    if isinstance(existing_prs, list) and existing_prs:
        pr = existing_prs[0]
        _validate_draft_pr(pr, branch, branch_sha, base_sha)
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
    if not isinstance(pr.get("number"), int):
        raise PublisherError("GitHub did not confirm creation of a draft PR")
    _validate_draft_pr(pr, branch, branch_sha, base_sha)
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
    validate.add_argument("--artifact-metadata-file", required=True)
    validate.add_argument("--repo", default=CANONICAL_REPOSITORY)
    validate.add_argument("--plan-file", required=True)
    publish = sub.add_parser("publish")
    publish.add_argument("--event-file", required=True)
    publish.add_argument("--artifact-dir", required=True)
    publish.add_argument("--artifact-metadata-file", required=True)
    publish.add_argument("--repo", default=CANONICAL_REPOSITORY)
    publish.add_argument("--plan-file", required=True)
    validate_plan_cmd = sub.add_parser("validate-plan")
    validate_plan_cmd.add_argument("--plan-base64-env", default="P10CR_VALIDATED_PLAN_B64")
    publish_plan_cmd = sub.add_parser("publish-plan")
    publish_plan_cmd.add_argument("--plan-base64-env", default="P10CR_VALIDATED_PLAN_B64")

    args = parser.parse_args()
    try:
        if args.command in {"validate-plan", "publish-plan"}:
            encoded_plan = os.getenv(args.plan_base64_env, "")
            if not isinstance(encoded_plan, str) or not encoded_plan or len(encoded_plan) > MAX_PUBLISH_PLAN_BYTES * 2:
                raise PublisherError("validated publisher plan output is unavailable or oversized")
            try:
                plan_bytes = base64.b64decode(encoded_plan, validate=True)
                if not plan_bytes or len(plan_bytes) > MAX_PUBLISH_PLAN_BYTES:
                    raise PublisherError("validated publisher plan byte size is outside the limit")
                plan = load_json_object(plan_bytes, "validated publisher plan")
            except (ValueError, SummaryValidationError) as exc:
                raise PublisherError("validated publisher plan output is invalid") from exc
            validate_publish_plan(plan)
            if args.command == "validate-plan":
                _write_output("valid", "true")
                print(json.dumps({"status": "VALIDATED_SANITIZED_PUBLISHER_PLAN", "write_token_requested": False}))
                return 0
            token = os.getenv("NEXUS_PUBLISHER_TOKEN", "")
            if not token:
                raise PublisherError("owner-approved scoped publisher token is unavailable")
            result = publish_plan(plan, GitHubApi(token))
            print(json.dumps(result, ensure_ascii=False))
            return 0

        event = _read_event(Path(args.event_file))
        try:
            artifact_metadata = load_json_object(
                Path(args.artifact_metadata_file).read_bytes(),
                "verified source artifact attestation",
            )
        except (OSError, SummaryValidationError) as exc:
            raise PublisherError("verified source artifact attestation is unavailable or invalid") from exc
        plan = build_publish_plan(event, Path(args.artifact_dir), args.repo, artifact_metadata)
        plan_path = Path(args.plan_file)
        if args.command == "validate":
            if plan is None:
                plan_path.unlink(missing_ok=True)
                _write_output("publishable", "false")
                print(json.dumps({"status": "NO_PUBLISHABLE_P59_003_DRAFT", "write_token_requested": False}))
                return 0
            plan_bytes = (json.dumps(plan, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")
            if len(plan_bytes) > MAX_PUBLISH_PLAN_BYTES:
                raise PublisherError("validated publisher plan exceeds the job-output size limit")
            plan_path.write_bytes(plan_bytes)
            _write_output("plan_b64", base64.b64encode(plan_bytes).decode("ascii"))
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
