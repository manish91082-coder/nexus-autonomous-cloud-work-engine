import hashlib
import json
import tempfile
import unittest
import zipfile
from datetime import datetime, timezone
from email.message import Message
from io import BytesIO
from pathlib import Path
from urllib.error import HTTPError

from scripts.p10cr_artifact_provenance import (
    ARTIFACT_PREFIX,
    CANONICAL_REPOSITORY,
    CANONICAL_REPOSITORY_ID,
    EXPECTED_FILES,
    WORKFLOW_ID,
    WORKFLOW_NAME,
    WORKFLOW_PATH,
    ArtifactProvenanceError,
    GitHubArtifactVerifier,
    validate_artifact_attestation,
    validate_artifact_listing,
    validate_source_event,
)


RUN_ID = 12345
ATTEMPT = 1
HEAD_SHA = "a" * 40
NOW = datetime(2026, 11, 24, 4, 0, tzinfo=timezone.utc)
BLOB_URL = "https://productionresultssa1.blob.core.windows.net/actions-results/test.zip?sig=fixture"


class FakeResponse:
    def __init__(self, data: bytes, status: int = 200, headers: dict | None = None):
        self.data = data
        self.status = status
        self.headers = headers or {}
        self.offset = 0

    def read(self, size: int = -1) -> bytes:
        if size is None or size < 0:
            size = len(self.data) - self.offset
        value = self.data[self.offset:self.offset + size]
        self.offset += len(value)
        return value

    def close(self):
        return None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


def json_bytes(value):
    return json.dumps(value, separators=(",", ":")).encode("utf-8")


def valid_event():
    return {
        "action": "completed",
        "repository": {"id": CANONICAL_REPOSITORY_ID, "full_name": CANONICAL_REPOSITORY},
        "workflow_run": {
            "id": RUN_ID,
            "run_attempt": ATTEMPT,
            "workflow_id": WORKFLOW_ID,
            "name": WORKFLOW_NAME,
            "path": WORKFLOW_PATH,
            "head_branch": "master",
            "head_sha": HEAD_SHA,
            "event": "schedule",
            "status": "completed",
            "conclusion": "success",
            "head_repository": {"id": CANONICAL_REPOSITORY_ID, "full_name": CANONICAL_REPOSITORY},
        },
    }


def valid_run_api():
    return {
        "id": RUN_ID,
        "workflow_id": WORKFLOW_ID,
        "name": WORKFLOW_NAME,
        "event": "schedule",
        "run_attempt": ATTEMPT,
        "head_branch": "master",
        "head_sha": HEAD_SHA,
        "status": "completed",
        "conclusion": "success",
        "repository": {"id": CANONICAL_REPOSITORY_ID, "full_name": CANONICAL_REPOSITORY},
        "head_repository": {"id": CANONICAL_REPOSITORY_ID, "full_name": CANONICAL_REPOSITORY},
    }


def make_archive(files=None):
    entries = files or {
        "ai_worker_report.json": b'{"status":"WAITING_FOR_OWNER_CONFIGURATION"}',
        "mission_guard_report.json": b'{"status":"PASS"}',
        "worker_tick_report.json": b'{"status":"POLL_OK"}',
    }
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for name, data in entries.items():
            bundle.writestr(name, data)
    return buffer.getvalue()


def valid_listing(archive=None):
    archive = archive if archive is not None else make_archive()
    return {
        "total_count": 1,
        "artifacts": [{
            "id": 67890,
            "name": f"{ARTIFACT_PREFIX}{RUN_ID}",
            "size_in_bytes": len(archive),
            "digest": "sha256:" + hashlib.sha256(archive).hexdigest(),
            "expired": False,
            "created_at": "2026-11-24T03:00:00Z",
            "expires_at": "2026-12-08T03:00:00Z",
            "workflow_run": {
                "id": RUN_ID,
                "repository_id": CANONICAL_REPOSITORY_ID,
                "head_repository_id": CANONICAL_REPOSITORY_ID,
                "head_branch": "master",
                "head_sha": HEAD_SHA,
            },
        }],
    }


class FakeOpener:
    def __init__(self, archive=None):
        self.archive = archive if archive is not None else make_archive()
        self.run_payload = valid_run_api()
        self.listing = valid_listing(self.archive)
        self.redirect_url = BLOB_URL
        self.calls = []
        self.blob_headers = None

    def open(self, request, timeout=0):
        url = request.full_url
        self.calls.append((url, request.header_items()))
        if url.endswith(f"/actions/runs/{RUN_ID}"):
            return FakeResponse(json_bytes(self.run_payload))
        if url.endswith(f"/actions/runs/{RUN_ID}/artifacts?per_page=100"):
            return FakeResponse(json_bytes(self.listing))
        if url.endswith(f"/actions/artifacts/67890/zip"):
            headers = Message()
            headers["Location"] = self.redirect_url
            raise HTTPError(url, 302, "Found", headers, None)
        if url.startswith("https://productionresultssa") or url.startswith("https://github-production-repository-file-"):
            self.blob_headers = request.header_items()
            return FakeResponse(self.archive, headers={"Content-Length": str(len(self.archive))})
        raise AssertionError(f"unexpected URL: {url}")


class SourceWorkflowIdentityTests(unittest.TestCase):
    def test_accepts_exact_immutable_workflow_and_repository_identity(self):
        source = validate_source_event(valid_event())
        self.assertEqual(source["workflow_id"], WORKFLOW_ID)
        self.assertEqual(source["repository_id"], CANONICAL_REPOSITORY_ID)
        self.assertEqual(source["run_id"], RUN_ID)

    def test_rejects_wrong_immutable_workflow_id(self):
        event = valid_event()
        event["workflow_run"]["workflow_id"] = WORKFLOW_ID + 1
        with self.assertRaises(ArtifactProvenanceError):
            validate_source_event(event)

    def test_rejects_wrong_repository_numeric_identity(self):
        event = valid_event()
        event["repository"]["id"] += 1
        with self.assertRaises(ArtifactProvenanceError):
            validate_source_event(event)

    def test_rejects_wrong_head_repository_identity(self):
        event = valid_event()
        event["workflow_run"]["head_repository"]["id"] += 1
        with self.assertRaises(ArtifactProvenanceError):
            validate_source_event(event)

    def test_rejects_api_run_metadata_mismatch(self):
        source = validate_source_event(valid_event())
        run = valid_run_api()
        run["run_attempt"] = ATTEMPT + 1
        with self.assertRaises(ArtifactProvenanceError):
            from scripts.p10cr_artifact_provenance import validate_run_api
            validate_run_api(run, source)


class ArtifactMetadataTests(unittest.TestCase):
    def setUp(self):
        self.source = validate_source_event(valid_event())
        self.archive = make_archive()
        self.listing = valid_listing(self.archive)

    def test_accepts_exact_nonexpired_artifact_metadata(self):
        artifact = validate_artifact_listing(self.listing, self.source, NOW)
        self.assertEqual(artifact["id"], 67890)
        self.assertEqual(artifact["size_in_bytes"], len(self.archive))
        self.assertEqual(artifact["digest"], self.listing["artifacts"][0]["digest"])

    def test_rejects_multiple_artifacts(self):
        listing = json.loads(json.dumps(self.listing))
        listing["total_count"] = 2
        listing["artifacts"].append(dict(listing["artifacts"][0], id=67891))
        with self.assertRaises(ArtifactProvenanceError):
            validate_artifact_listing(listing, self.source, NOW)

    def test_rejects_expired_artifact(self):
        listing = json.loads(json.dumps(self.listing))
        listing["artifacts"][0]["expired"] = True
        with self.assertRaises(ArtifactProvenanceError):
            validate_artifact_listing(listing, self.source, NOW)

    def test_rejects_artifact_with_expired_timestamp(self):
        listing = json.loads(json.dumps(self.listing))
        listing["artifacts"][0]["expires_at"] = "2026-11-24T03:30:00Z"
        with self.assertRaises(ArtifactProvenanceError):
            validate_artifact_listing(listing, self.source, NOW)

    def test_rejects_artifact_bound_to_another_run(self):
        listing = json.loads(json.dumps(self.listing))
        listing["artifacts"][0]["workflow_run"]["id"] = RUN_ID + 1
        with self.assertRaises(ArtifactProvenanceError):
            validate_artifact_listing(listing, self.source, NOW)

    def test_rejects_missing_or_malformed_digest(self):
        listing = json.loads(json.dumps(self.listing))
        del listing["artifacts"][0]["digest"]
        with self.assertRaises(ArtifactProvenanceError):
            validate_artifact_listing(listing, self.source, NOW)

    def test_rejects_artifact_size_outside_bound(self):
        listing = json.loads(json.dumps(self.listing))
        listing["artifacts"][0]["size_in_bytes"] = 1048577
        with self.assertRaises(ArtifactProvenanceError):
            validate_artifact_listing(listing, self.source, NOW)


class ArtifactDownloadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.archive = make_archive()
        self.opener = FakeOpener(self.archive)
        self.verifier = GitHubArtifactVerifier("read-only-test-token", self.opener, NOW)

    def tearDown(self):
        self.temp.cleanup()

    def run_verify(self):
        return self.verifier.verify_and_extract(
            valid_event(),
            CANONICAL_REPOSITORY,
            self.root / "artifact",
            self.root / "attestation.json",
        )

    def test_verifies_run_artifact_digest_and_extracts_exact_files(self):
        result = self.run_verify()
        self.assertEqual(result["status"], "SOURCE_ARTIFACT_VERIFIED")
        self.assertEqual(result["workflow_id"], WORKFLOW_ID)
        self.assertEqual(result["artifact_id"], 67890)
        self.assertEqual(result["verified_files"], 3)
        self.assertEqual(sorted(p.name for p in (self.root / "artifact").iterdir()), sorted(EXPECTED_FILES))
        attestation = json.loads((self.root / "attestation.json").read_text(encoding="utf-8"))
        self.assertEqual(attestation["source"]["run_id"], RUN_ID)
        self.assertEqual(attestation["artifact"]["digest"], self.opener.listing["artifacts"][0]["digest"])

    def test_never_forwards_github_bearer_to_artifact_storage(self):
        self.run_verify()
        headers = {key.lower(): value for key, value in self.opener.blob_headers}
        self.assertNotIn("authorization", headers)
        self.assertNotIn("cookie", headers)

    def test_rejects_unallowlisted_redirect_host_before_download(self):
        self.opener.redirect_url = "https://evil.example/steal"
        with self.assertRaises(ArtifactProvenanceError):
            self.run_verify()
        self.assertIsNone(self.opener.blob_headers)

    def test_rejects_archive_digest_mismatch(self):
        mutated = bytearray(self.archive)
        mutated[-1] ^= 1
        self.opener.archive = bytes(mutated)
        with self.assertRaises(ArtifactProvenanceError):
            self.run_verify()

    def test_rejects_archive_size_mismatch(self):
        self.opener.archive = self.archive + b"x"
        self.opener.listing["artifacts"][0]["size_in_bytes"] = len(self.archive)
        self.opener.listing["artifacts"][0]["digest"] = "sha256:" + hashlib.sha256(self.opener.archive).hexdigest()
        with self.assertRaises(ArtifactProvenanceError):
            self.run_verify()

    def test_rejects_run_api_workflow_id_mismatch(self):
        self.opener.run_payload["workflow_id"] = WORKFLOW_ID + 1
        with self.assertRaises(ArtifactProvenanceError):
            self.run_verify()

    def test_rejects_zip_with_unexpected_path(self):
        self.opener.archive = make_archive({
            "../ai_worker_report.json": b'{}',
            "mission_guard_report.json": b'{}',
            "worker_tick_report.json": b'{}',
        })
        self.opener.listing = valid_listing(self.opener.archive)
        with self.assertRaises(ArtifactProvenanceError):
            self.run_verify()

    def test_rejects_zip_with_missing_expected_file(self):
        self.opener.archive = make_archive({
            "ai_worker_report.json": b'{}',
            "worker_tick_report.json": b'{}',
        })
        self.opener.listing = valid_listing(self.opener.archive)
        with self.assertRaises(ArtifactProvenanceError):
            self.run_verify()

    def test_rejects_duplicate_zip_entries(self):
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
            for name in EXPECTED_FILES:
                bundle.writestr(name, b'{}')
            bundle.writestr("ai_worker_report.json", b'{"duplicate":true}')
        self.opener.archive = buffer.getvalue()
        self.opener.listing = valid_listing(self.opener.archive)
        with self.assertRaises(ArtifactProvenanceError):
            self.run_verify()


class ArtifactAttestationTests(unittest.TestCase):
    def test_rejects_attestation_digest_mutation(self):
        source = validate_source_event(valid_event())
        archive = make_archive()
        listing = valid_listing(archive)
        item = listing["artifacts"][0]
        attestation = {
            "schema_version": "1.0",
            "source": source,
            "artifact": {
                "id": item["id"],
                "name": item["name"],
                "digest": item["digest"],
                "size_in_bytes": item["size_in_bytes"],
                "created_at": item["created_at"],
                "expires_at": item["expires_at"],
                "archive_sha256": "0" * 64,
                "files": [
                    {"name": name, "sha256": "a" * 64, "size_in_bytes": 2}
                    for name in EXPECTED_FILES
                ],
            },
        }
        with self.assertRaises(ArtifactProvenanceError):
            validate_artifact_attestation(attestation, source)


if __name__ == "__main__":
    unittest.main()
