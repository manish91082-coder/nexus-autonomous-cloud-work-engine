#!/usr/bin/env python3
"""Verify the immutable P10CR worker run and its exact GitHub artifact before use.

Only the publisher job uses this module. The source worker remains contents:read.
The GitHub bearer token is sent only to api.github.com, never to the artifact
storage redirect host. All parsing, archive limits and extraction are fail-closed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import sys
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from typing import Any

CANONICAL_REPOSITORY = "manish91082-coder/nexus-autonomous-cloud-work-engine"
CANONICAL_REPOSITORY_ID = 1454085952
WORKFLOW_ID = 415454534
WORKFLOW_NAME = "Mission Autonomous AI Worker (bounded, fail-closed)"
WORKFLOW_PATH = ".github/workflows/mission-autonomous-worker.yml"
ALLOWED_EVENTS = {"schedule", "push"}
ARTIFACT_PREFIX = "mission-autonomous-worker-"
EXPECTED_FILES = (
    "ai_worker_report.json",
    "mission_guard_report.json",
    "worker_tick_report.json",
)
MAX_API_RESPONSE_BYTES = 131072
MAX_ARCHIVE_BYTES = 1048576
MAX_FILE_BYTES = 65536
MAX_TOTAL_UNCOMPRESSED_BYTES = 131072
MAX_COMPRESSION_RATIO = 100
API_BASE = "https://api.github.com"
SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
RUN_ID_RE = re.compile(r"^[1-9][0-9]{0,19}$")
AZURE_ARTIFACT_HOST_RE = re.compile(r"^productionresultssa[0-9]+\.blob\.core\.windows\.net$")
AWS_ARTIFACT_HOST_RE = re.compile(r"^github-production-repository-file-[a-f0-9]+\.s3\.amazonaws\.com$")


class ArtifactProvenanceError(ValueError):
    """Raised when a source run or its artifact cannot be proven exact."""


class _NoRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ArtifactProvenanceError("duplicate JSON object key")
        result[key] = value
    return result


def _json_object(raw: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object)
    except (UnicodeDecodeError, json.JSONDecodeError, ArtifactProvenanceError) as exc:
        raise ArtifactProvenanceError(f"{label} is not valid UTF-8 JSON without duplicate keys") from exc
    if not isinstance(value, dict):
        raise ArtifactProvenanceError(f"{label} must be a JSON object")
    return value


def _read_limited(response: Any, limit: int) -> bytes:
    declared = response.headers.get("Content-Length") if getattr(response, "headers", None) else None
    if declared is not None:
        try:
            if int(declared) > limit:
                raise ArtifactProvenanceError("response exceeds the configured byte limit")
        except ValueError as exc:
            raise ArtifactProvenanceError("response Content-Length is invalid") from exc
    chunks = []
    total = 0
    while True:
        chunk = response.read(min(65536, limit + 1 - total))
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise ArtifactProvenanceError("response exceeds the configured byte limit")
        chunks.append(chunk)
    return b"".join(chunks)


def _utc(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or not 1 <= len(value) <= 64:
        raise ArtifactProvenanceError(f"{label} is invalid")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ArtifactProvenanceError(f"{label} is invalid") from exc
    if parsed.tzinfo is None or parsed.utcoffset() != timezone.utc.utcoffset(parsed):
        raise ArtifactProvenanceError(f"{label} must be UTC")
    return parsed.astimezone(timezone.utc)


def _positive_int(value: Any, label: str, maximum: int = 2**63 - 1) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= maximum:
        raise ArtifactProvenanceError(f"{label} is invalid")
    return value


def validate_source_event(event: dict[str, Any], expected_repo: str = CANONICAL_REPOSITORY) -> dict[str, Any]:
    if expected_repo != CANONICAL_REPOSITORY or event.get("action") != "completed":
        raise ArtifactProvenanceError("publisher event or repository is not canonical")
    repository = event.get("repository")
    run = event.get("workflow_run")
    if not isinstance(repository, dict) or not isinstance(run, dict):
        raise ArtifactProvenanceError("repository or workflow_run payload is missing")
    if repository.get("full_name") != CANONICAL_REPOSITORY or repository.get("id") != CANONICAL_REPOSITORY_ID:
        raise ArtifactProvenanceError("source repository identity mismatch")
    if (
        run.get("workflow_id") != WORKFLOW_ID
        or run.get("name") != WORKFLOW_NAME
        or run.get("path") != WORKFLOW_PATH
    ):
        raise ArtifactProvenanceError("immutable source workflow identity mismatch")
    if (
        run.get("head_branch") != "master"
        or run.get("event") not in ALLOWED_EVENTS
        or run.get("conclusion") != "success"
        or run.get("status") not in (None, "completed")
    ):
        raise ArtifactProvenanceError("source workflow is not a successful canonical master run")
    head_repository = run.get("head_repository")
    if (
        not isinstance(head_repository, dict)
        or head_repository.get("full_name") != CANONICAL_REPOSITORY
        or head_repository.get("id") != CANONICAL_REPOSITORY_ID
    ):
        raise ArtifactProvenanceError("source head repository identity mismatch")
    run_id = _positive_int(run.get("id"), "source run ID")
    attempt = _positive_int(run.get("run_attempt", 1), "source run attempt", 100)
    head_sha = run.get("head_sha")
    if not isinstance(head_sha, str) or not re.fullmatch(r"[a-f0-9]{40}", head_sha):
        raise ArtifactProvenanceError("source head SHA is invalid")
    return {
        "repository": CANONICAL_REPOSITORY,
        "repository_id": CANONICAL_REPOSITORY_ID,
        "head_repository_id": CANONICAL_REPOSITORY_ID,
        "workflow": WORKFLOW_NAME,
        "workflow_path": WORKFLOW_PATH,
        "workflow_id": WORKFLOW_ID,
        "event": run["event"],
        "branch": "master",
        "run_id": run_id,
        "run_attempt": attempt,
        "head_sha": head_sha,
    }


def validate_run_api(run: dict[str, Any], source: dict[str, Any]) -> None:
    repository = run.get("repository")
    head_repository = run.get("head_repository")
    if (
        run.get("id") != source["run_id"]
        or run.get("workflow_id") != WORKFLOW_ID
        or run.get("name") != WORKFLOW_NAME
        or run.get("event") != source["event"]
        or run.get("run_attempt") != source["run_attempt"]
        or run.get("head_branch") != "master"
        or run.get("head_sha") != source["head_sha"]
        or run.get("status") != "completed"
        or run.get("conclusion") != "success"
        or not isinstance(repository, dict)
        or repository.get("id") != CANONICAL_REPOSITORY_ID
        or repository.get("full_name") != CANONICAL_REPOSITORY
        or not isinstance(head_repository, dict)
        or head_repository.get("id") != CANONICAL_REPOSITORY_ID
        or head_repository.get("full_name") != CANONICAL_REPOSITORY
    ):
        raise ArtifactProvenanceError("GitHub source-run API metadata differs from the signed workflow event")


def _allowed_redirect(url: str) -> bool:
    try:
        parsed = urlsplit(url)
        host = (parsed.hostname or "").lower()
        port = parsed.port
    except ValueError:
        return False
    return (
        parsed.scheme == "https"
        and parsed.username is None
        and parsed.password is None
        and parsed.fragment == ""
        and port in (None, 443)
        and (AZURE_ARTIFACT_HOST_RE.fullmatch(host) is not None or AWS_ARTIFACT_HOST_RE.fullmatch(host) is not None)
    )


def validate_artifact_listing(
    listing: dict[str, Any],
    source: dict[str, Any],
    now: datetime | None = None,
) -> dict[str, Any]:
    artifacts = listing.get("artifacts")
    if (
        listing.get("total_count") != 1
        or not isinstance(artifacts, list)
        or len(artifacts) != 1
    ):
        raise ArtifactProvenanceError("source run must contain exactly one artifact")
    item = artifacts[0]
    if not isinstance(item, dict):
        raise ArtifactProvenanceError("artifact metadata is invalid")
    artifact_id = _positive_int(item.get("id"), "artifact ID")
    expected_name = f"{ARTIFACT_PREFIX}{source['run_id']}"
    if item.get("name") != expected_name or item.get("expired") is not False:
        raise ArtifactProvenanceError("artifact name or expiry state is invalid")
    size = _positive_int(item.get("size_in_bytes"), "artifact size", MAX_ARCHIVE_BYTES)
    digest = item.get("digest")
    if not isinstance(digest, str) or not re.fullmatch(r"sha256:[a-f0-9]{64}", digest):
        raise ArtifactProvenanceError("GitHub artifact SHA-256 digest is missing or invalid")
    created_at = item.get("created_at")
    expires_at = item.get("expires_at")
    created = _utc(created_at, "artifact created_at")
    expires = _utc(expires_at, "artifact expires_at")
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None or current.utcoffset() != timezone.utc.utcoffset(current):
        raise ArtifactProvenanceError("verification clock must be timezone-aware UTC")
    if expires <= current.astimezone(timezone.utc) or created > current.astimezone(timezone.utc) or expires <= created:
        raise ArtifactProvenanceError("artifact is expired or has an invalid lifetime")
    workflow_run = item.get("workflow_run")
    if not isinstance(workflow_run, dict) or (
        workflow_run.get("id") != source["run_id"]
        or workflow_run.get("repository_id") != CANONICAL_REPOSITORY_ID
        or workflow_run.get("head_repository_id") != CANONICAL_REPOSITORY_ID
        or workflow_run.get("head_branch") != "master"
        or workflow_run.get("head_sha") != source["head_sha"]
    ):
        raise ArtifactProvenanceError("artifact is not bound to the exact source workflow run")
    return {
        "id": artifact_id,
        "name": expected_name,
        "digest": digest,
        "size_in_bytes": size,
        "created_at": created_at,
        "expires_at": expires_at,
    }


def validate_artifact_attestation(
    attestation: dict[str, Any],
    expected_source: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(attestation, dict) or set(attestation) != {"schema_version", "source", "artifact"}:
        raise ArtifactProvenanceError("artifact attestation fields do not match the closed contract")
    if attestation.get("schema_version") != "1.0" or attestation.get("source") != expected_source:
        raise ArtifactProvenanceError("artifact attestation source identity mismatch")
    artifact = attestation.get("artifact")
    expected_keys = {
        "id", "name", "digest", "size_in_bytes", "created_at", "expires_at",
        "archive_sha256", "files",
    }
    if not isinstance(artifact, dict) or set(artifact) != expected_keys:
        raise ArtifactProvenanceError("artifact attestation fields do not match the closed contract")
    _positive_int(artifact.get("id"), "artifact ID")
    if artifact.get("name") != f"{ARTIFACT_PREFIX}{expected_source['run_id']}":
        raise ArtifactProvenanceError("artifact attestation name is not bound to the source run")
    if not isinstance(artifact.get("digest"), str) or not re.fullmatch(r"sha256:[a-f0-9]{64}", artifact["digest"]):
        raise ArtifactProvenanceError("artifact attestation digest is invalid")
    size = _positive_int(artifact.get("size_in_bytes"), "artifact size", MAX_ARCHIVE_BYTES)
    created = _utc(artifact.get("created_at"), "artifact created_at")
    expires = _utc(artifact.get("expires_at"), "artifact expires_at")
    if expires <= created:
        raise ArtifactProvenanceError("artifact attestation lifetime is invalid")
    archive_sha = artifact.get("archive_sha256")
    if not isinstance(archive_sha, str) or not SHA256_RE.fullmatch(archive_sha):
        raise ArtifactProvenanceError("verified archive digest is invalid")
    if artifact["digest"] != "sha256:" + archive_sha:
        raise ArtifactProvenanceError("verified archive digest differs from GitHub artifact digest")
    files = artifact.get("files")
    if not isinstance(files, list) or [entry.get("name") for entry in files if isinstance(entry, dict)] != list(EXPECTED_FILES):
        raise ArtifactProvenanceError("artifact file manifest is not the exact expected set")
    if len(files) != len(EXPECTED_FILES):
        raise ArtifactProvenanceError("artifact file manifest contains duplicates or invalid entries")
    for entry in files:
        if not isinstance(entry, dict) or set(entry) != {"name", "sha256", "size_in_bytes"}:
            raise ArtifactProvenanceError("artifact file manifest entry is invalid")
        if not isinstance(entry.get("sha256"), str) or not SHA256_RE.fullmatch(entry["sha256"]):
            raise ArtifactProvenanceError("artifact file digest is invalid")
        _positive_int(entry.get("size_in_bytes"), "artifact file size", MAX_FILE_BYTES)
    return artifact


class GitHubArtifactVerifier:
    def __init__(self, token: str, opener: Any | None = None, now: datetime | None = None):
        if not isinstance(token, str) or not token.strip():
            raise ArtifactProvenanceError("read-only GitHub Actions token is unavailable")
        self.token = token
        self.opener = opener or build_opener(_NoRedirectHandler())
        self.now = now

    def _api_json(self, path: str) -> dict[str, Any]:
        request = Request(
            API_BASE + path,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "P10CR-Artifact-Provenance-Verifier",
            },
            method="GET",
        )
        try:
            with self.opener.open(request, timeout=20) as response:
                if getattr(response, "status", 200) != 200:
                    raise ArtifactProvenanceError("GitHub API did not return HTTP 200")
                return _json_object(_read_limited(response, MAX_API_RESPONSE_BYTES), "GitHub API response")
        except HTTPError as exc:
            raise ArtifactProvenanceError(f"GitHub API returned HTTP {exc.code}") from exc
        except (URLError, TimeoutError, OSError) as exc:
            raise ArtifactProvenanceError("GitHub API request failed") from exc

    def _download_archive(self, artifact_id: int, expected_size: int, expected_digest: str) -> bytes:
        request = Request(
            f"{API_BASE}/repos/{CANONICAL_REPOSITORY}/actions/artifacts/{artifact_id}/zip",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "P10CR-Artifact-Provenance-Verifier",
            },
            method="GET",
        )
        try:
            response = self.opener.open(request, timeout=20)
        except HTTPError as exc:
            if exc.code != 302:
                raise ArtifactProvenanceError(f"artifact API returned HTTP {exc.code}") from exc
            location = exc.headers.get("Location") if exc.headers else None
            exc.close()
        except (URLError, TimeoutError, OSError) as exc:
            raise ArtifactProvenanceError("artifact download request failed") from exc
        else:
            response.close()
            raise ArtifactProvenanceError("artifact API did not return the required single redirect")

        if not isinstance(location, str) or not _allowed_redirect(location):
            raise ArtifactProvenanceError("artifact redirect host is not allowlisted")
        # Deliberately construct a fresh request without Authorization or Cookie headers.
        blob_request = Request(
            location,
            headers={"Accept": "application/zip", "User-Agent": "P10CR-Artifact-Provenance-Verifier"},
            method="GET",
        )
        try:
            with self.opener.open(blob_request, timeout=30) as response:
                if getattr(response, "status", 200) != 200:
                    raise ArtifactProvenanceError("artifact storage did not return HTTP 200")
                archive = _read_limited(response, MAX_ARCHIVE_BYTES)
        except HTTPError as exc:
            raise ArtifactProvenanceError(f"artifact storage returned HTTP {exc.code}") from exc
        except (URLError, TimeoutError, OSError) as exc:
            raise ArtifactProvenanceError("artifact storage download failed") from exc
        if len(archive) != expected_size:
            raise ArtifactProvenanceError("downloaded artifact byte count differs from GitHub metadata")
        digest = hashlib.sha256(archive).hexdigest()
        if "sha256:" + digest != expected_digest:
            raise ArtifactProvenanceError("downloaded artifact digest differs from GitHub metadata")
        return archive

    @staticmethod
    def _extract_archive(archive: bytes, output_dir: Path) -> list[dict[str, Any]]:
        try:
            bundle = zipfile.ZipFile(BytesIO(archive))
        except (OSError, zipfile.BadZipFile) as exc:
            raise ArtifactProvenanceError("artifact archive is not a valid ZIP") from exc
        output_dir.mkdir(parents=True, exist_ok=True)
        if any(output_dir.iterdir()):
            raise ArtifactProvenanceError("artifact output directory must be empty")
        files_manifest = []
        try:
            with bundle:
                infos = bundle.infolist()
                names = [info.filename for info in infos]
                if len(names) != len(EXPECTED_FILES) or sorted(names) != sorted(EXPECTED_FILES):
                    raise ArtifactProvenanceError("artifact ZIP does not contain the exact expected file set")
                total_size = 0
                for info in infos:
                    if (
                        info.is_dir()
                        or "/" in info.filename
                        or "\\" in info.filename
                        or info.filename in ("", ".", "..")
                        or info.flag_bits & 0x1
                        or info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)
                    ):
                        raise ArtifactProvenanceError("artifact ZIP contains an unsafe entry")
                    mode = info.external_attr >> 16
                    file_type = stat.S_IFMT(mode)
                    if mode and file_type not in (0, stat.S_IFREG):
                        raise ArtifactProvenanceError("artifact ZIP entry is not a regular file")
                    if not 1 <= info.file_size <= MAX_FILE_BYTES:
                        raise ArtifactProvenanceError("artifact file size is outside the limit")
                    if info.compress_size <= 0 or info.file_size > info.compress_size * MAX_COMPRESSION_RATIO:
                        raise ArtifactProvenanceError("artifact compression ratio is outside the limit")
                    total_size += info.file_size
                    if total_size > MAX_TOTAL_UNCOMPRESSED_BYTES:
                        raise ArtifactProvenanceError("artifact total uncompressed size exceeds the limit")
                    with bundle.open(info, "r") as handle:
                        data = handle.read(MAX_FILE_BYTES + 1)
                    if len(data) != info.file_size or len(data) > MAX_FILE_BYTES:
                        raise ArtifactProvenanceError("artifact entry size differs from ZIP metadata")
                    digest = hashlib.sha256(data).hexdigest()
                    destination = output_dir / info.filename
                    with destination.open("xb") as handle:
                        handle.write(data)
                    files_manifest.append({
                        "name": info.filename,
                        "sha256": digest,
                        "size_in_bytes": len(data),
                    })
        except (OSError, RuntimeError, zipfile.BadZipFile) as exc:
            raise ArtifactProvenanceError("artifact ZIP extraction failed") from exc
        files_manifest.sort(key=lambda entry: entry["name"])
        if [entry["name"] for entry in files_manifest] != list(EXPECTED_FILES):
            raise ArtifactProvenanceError("artifact extraction manifest is not canonical")
        return files_manifest

    def verify_and_extract(
        self,
        event: dict[str, Any],
        expected_repo: str,
        output_dir: Path,
        metadata_file: Path,
    ) -> dict[str, Any]:
        source = validate_source_event(event, expected_repo)
        run_id = source["run_id"]
        run_api = self._api_json(f"/repos/{CANONICAL_REPOSITORY}/actions/runs/{run_id}")
        validate_run_api(run_api, source)
        listing = self._api_json(f"/repos/{CANONICAL_REPOSITORY}/actions/runs/{run_id}/artifacts?per_page=100")
        artifact = validate_artifact_listing(listing, source, self.now)
        archive = self._download_archive(artifact["id"], artifact["size_in_bytes"], artifact["digest"])
        files = self._extract_archive(archive, output_dir)
        attestation = {
            "schema_version": "1.0",
            "source": source,
            "artifact": {
                **artifact,
                "archive_sha256": hashlib.sha256(archive).hexdigest(),
                "files": files,
            },
        }
        validate_artifact_attestation(attestation, source)
        metadata_file.parent.mkdir(parents=True, exist_ok=True)
        temporary = metadata_file.with_suffix(metadata_file.suffix + ".tmp")
        temporary.write_text(json.dumps(attestation, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
        temporary.replace(metadata_file)
        return {
            "status": "SOURCE_ARTIFACT_VERIFIED",
            "workflow_id": source["workflow_id"],
            "run_id": run_id,
            "run_attempt": source["run_attempt"],
            "artifact_id": artifact["id"],
            "artifact_digest": artifact["digest"],
            "artifact_size_in_bytes": artifact["size_in_bytes"],
            "verified_files": len(files),
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the exact P10CR worker run and artifact")
    sub = parser.add_subparsers(dest="command", required=True)
    verify = sub.add_parser("verify-download")
    verify.add_argument("--event-file", required=True)
    verify.add_argument("--repo", required=True)
    verify.add_argument("--token", default=os.getenv("GH_TOKEN", ""))
    verify.add_argument("--output-dir", required=True)
    verify.add_argument("--metadata-file", required=True)
    args = parser.parse_args()
    try:
        event = _json_object(Path(args.event_file).read_bytes(), "workflow_run event")
        result = GitHubArtifactVerifier(args.token).verify_and_extract(
            event,
            args.repo,
            Path(args.output_dir),
            Path(args.metadata_file),
        )
        print(json.dumps(result, sort_keys=True))
        return 0
    except (ArtifactProvenanceError, OSError) as exc:
        print(f"ARTIFACT_PROVENANCE_REJECTED: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
