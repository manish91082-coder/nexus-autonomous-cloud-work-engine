import base64
import hashlib
import io
import json
import tempfile
import unittest
import urllib.error
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, unquote, urlsplit

from scripts.p10cr_artifact_provenance import (
    ARTIFACT_PREFIX,
    CANONICAL_REPOSITORY_ID,
    WORKFLOW_ID,
)
from scripts.constrained_publisher import (
    ALLOWED_TASK_ID,
    BRANCH_PREFIX,
    CANONICAL_REPOSITORY,
    WORKFLOW_NAME,
    WORKFLOW_PATH,
    ApiError,
    GitHubApi,
    PublisherError,
    _RejectRedirectHandler,
    _validate_api_request,
    build_publish_plan,
    main,
    publish_plan,
)


MASTER_SHA = "a" * 40


def valid_event():
    return {
        "action": "completed",
        "repository": {"id": CANONICAL_REPOSITORY_ID, "full_name": CANONICAL_REPOSITORY},
        "workflow_run": {
            "workflow_id": WORKFLOW_ID,
            "name": WORKFLOW_NAME,
            "path": WORKFLOW_PATH,
            "head_branch": "master",
            "event": "schedule",
            "conclusion": "success",
            "status": "completed",
            "head_sha": MASTER_SHA,
            "id": 12345,
            "run_attempt": 1,
            "head_repository": {"id": CANONICAL_REPOSITORY_ID, "full_name": CANONICAL_REPOSITORY},
        },
    }


def valid_report():
    return {
        "schema_version": "1.0",
        "timestamp_utc": "2026-11-17T00:00:00+00:00",
        "status": "DRAFT_READY_FOR_EVIDENCE_REVIEW",
        "execution_mode": "BOUNDED_AI_DRAFT_ONLY",
        "model_output_is_untrusted": True,
        "no_code_execution": True,
        "no_publication_or_money_movement": True,
        "task_id": ALLOWED_TASK_ID,
        "task_title": "Audit and implement zero-cost-first autonomous multi-agent research and execution swarm",
        "provider": "Cloudflare Workers AI",
        "model": "approved-model-fixture",
        "daily_calls_used": 1,
        "daily_call_cap": 6,
        "output": "UNVERIFIED proposal only. No executable source code.",
        "verification_note": "Model output is an unverified draft. URLs, eligibility, payout terms and claims must be independently checked before registry updates or task completion.",
    }


def valid_artifact_metadata(report_bytes=None):
    digest = "b" * 64
    report_bytes = report_bytes if report_bytes is not None else json.dumps(valid_report()).encode("utf-8")
    report_digest = hashlib.sha256(report_bytes).hexdigest()
    now = datetime.now(timezone.utc).replace(microsecond=0)
    created_at = (now - timedelta(minutes=1)).isoformat().replace("+00:00", "Z")
    expires_at = (now + timedelta(days=14)).isoformat().replace("+00:00", "Z")
    return {
        "schema_version": "1.0",
        "source": {
            "repository": CANONICAL_REPOSITORY,
            "repository_id": CANONICAL_REPOSITORY_ID,
            "head_repository_id": CANONICAL_REPOSITORY_ID,
            "workflow": WORKFLOW_NAME,
            "workflow_path": WORKFLOW_PATH,
            "workflow_id": WORKFLOW_ID,
            "event": "schedule",
            "branch": "master",
            "run_id": 12345,
            "run_attempt": 1,
            "head_sha": MASTER_SHA,
        },
        "artifact": {
            "id": 67890,
            "name": f"{ARTIFACT_PREFIX}12345-attempt-1",
            "digest": "sha256:" + digest,
            "size_in_bytes": 2048,
            "created_at": created_at,
            "expires_at": expires_at,
            "archive_sha256": digest,
            "files": [
                {"name": "ai_worker_report.json", "sha256": report_digest, "size_in_bytes": len(report_bytes)},
                {"name": "mission_guard_report.json", "sha256": "c" * 64, "size_in_bytes": 100},
                {"name": "worker_tick_report.json", "sha256": "d" * 64, "size_in_bytes": 100},
            ],
        },
    }


def valid_summary_content():
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        report_bytes = json.dumps(valid_report()).encode("utf-8")
        (root / "ai_worker_report.json").write_bytes(report_bytes)
        plan = build_publish_plan(valid_event(), root, artifact_metadata=valid_artifact_metadata(report_bytes))
        return plan["content_base64"]


def quote_branch(branch):
    from urllib.parse import quote
    return quote(branch, safe="")


class FakeApi:
    def __init__(self):
        self.master_sha = MASTER_SHA
        self.branches = {}
        self.branch_bases = {}
        self.branch_commits = {}
        self.branch_files = {}
        self.files = {}
        self.pull_requests = []
        self.calls = []
        self.override_pr_head_sha = None
        self.override_pr_base_sha = None

    def request(self, method, path, payload=None):
        self.calls.append((method, path, payload))
        parsed = urlsplit(path)
        route = parsed.path
        query = parse_qs(parsed.query)

        if method == "GET" and route.endswith("/git/ref/heads/master"):
            return {"object": {"sha": self.master_sha}}

        if method == "GET" and "/compare/master..." in route:
            branch = unquote(route.split("/compare/master...", 1)[1])
            if branch not in self.branches:
                raise ApiError(404, "Reference not found")
            base_sha = self.branch_bases.get(branch, self.master_sha)
            ahead = self.branch_commits.get(branch, 0)
            behind = 0 if base_sha == self.master_sha else 1
            files = self.branch_files.get(branch, [])
            return {
                "status": "identical" if ahead == 0 and behind == 0 else "ahead",
                "ahead_by": ahead,
                "behind_by": behind,
                "total_commits": ahead,
                "base_commit": {"sha": self.master_sha},
                "merge_base_commit": {"sha": base_sha},
                "files": files,
            }

        if route.endswith("/git/refs") and method == "POST":
            branch = payload["ref"].removeprefix("refs/heads/")
            if branch in self.branches:
                raise ApiError(422, "Reference already exists")
            self.branches[branch] = payload["sha"]
            self.branch_bases[branch] = payload["sha"]
            self.branch_commits[branch] = 0
            self.branch_files[branch] = []
            return {"ref": payload["ref"]}

        if "/git/ref/heads/" in route and method == "GET":
            branch = route.split("/git/ref/heads/", 1)[1]
            if branch not in self.branches:
                raise ApiError(404, "Reference not found")
            return {"object": {"sha": self.branches[branch]}}

        if "/contents/" in route and method == "GET":
            path_value = route.split("/contents/", 1)[1]
            branch = query.get("ref", [""])[0]
            key = (branch, path_value)
            if key not in self.files:
                raise ApiError(404, "Content not found")
            return {"content": base64.b64encode(self.files[key]).decode("ascii"), "encoding": "base64"}

        if "/contents/" in route and method == "PUT":
            path_value = route.split("/contents/", 1)[1]
            branch = payload["branch"]
            key = (branch, path_value)
            if key in self.files:
                raise ApiError(409, "File already exists")
            raw = base64.b64decode(payload["content"], validate=True)
            self.files[key] = raw
            self.branch_commits[branch] = 1
            additions = max(1, len(raw.splitlines()))
            self.branch_files[branch] = [{
                "filename": path_value,
                "status": "added",
                "additions": additions,
                "deletions": 0,
                "changes": additions,
            }]
            self.branches[branch] = "b" * 40
            return {"content": {"path": path_value}}

        if route.endswith("/pulls") and method == "GET":
            head = query.get("head", [""])[0]
            base = query.get("base", [""])[0]
            return [
                pr for pr in self.pull_requests
                if pr["head"]["label"] == head and pr["base"]["ref"] == base and pr["state"] == "open"
            ]

        if route.endswith("/pulls") and method == "POST":
            number = len(self.pull_requests) + 1
            pr = {
                "number": number,
                "state": "open",
                "draft": payload["draft"],
                "html_url": f"https://github.com/{CANONICAL_REPOSITORY}/pull/{number}",
                "head": {
                    "label": f"manish91082-coder:{payload['head']}",
                    "ref": payload["head"],
                    "sha": self.override_pr_head_sha or self.branches[payload["head"]],
                    "repo": {"full_name": CANONICAL_REPOSITORY},
                },
                "base": {
                    "ref": payload["base"],
                    "sha": self.override_pr_base_sha or self.master_sha,
                    "repo": {"full_name": CANONICAL_REPOSITORY},
                },
            }
            self.pull_requests.append(pr)
            return pr

        if "/merge" in route:
            raise AssertionError("publisher must never call a merge endpoint")
        raise ApiError(404, f"unexpected route {method} {route}")


class PublisherValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "ai_worker_report.json").write_text(
            json.dumps(valid_report()), encoding="utf-8"
        )

    def tearDown(self):
        self.temp.cleanup()

    def plan(self, event=None):
        report_path = self.root / "ai_worker_report.json"
        report_bytes = report_path.read_bytes() if report_path.exists() else None
        return build_publish_plan(event or valid_event(), self.root, artifact_metadata=valid_artifact_metadata(report_bytes))

    def test_missing_artifact_attestation_is_rejected(self):
        with self.assertRaises(PublisherError):
            build_publish_plan(valid_event(), self.root)

    def test_artifact_attestation_from_another_run_is_rejected(self):
        attestation = valid_artifact_metadata()
        attestation["source"]["run_id"] = 99999
        with self.assertRaises(PublisherError):
            build_publish_plan(valid_event(), self.root, artifact_metadata=attestation)

    def test_artifact_digest_mismatch_is_rejected(self):
        attestation = valid_artifact_metadata()
        attestation["artifact"]["archive_sha256"] = "e" * 64
        with self.assertRaises(PublisherError):
            build_publish_plan(valid_event(), self.root, artifact_metadata=attestation)

    def test_builds_deterministic_allowlisted_plan(self):
        plan = self.plan()
        self.assertEqual(plan["branch"], BRANCH_PREFIX + "12345-attempt-1")
        self.assertEqual(plan["path"], "research/worker-drafts/ai-run-12345-attempt-1.json")
        self.assertEqual(plan["summary"]["task"]["id"], "P59-003")

    def test_raw_model_output_is_not_in_published_summary(self):
        plan = self.plan()
        content = base64.b64decode(plan["content_base64"]).decode("utf-8")
        self.assertNotIn(valid_report()["output"], content)
        self.assertIn(plan["summary"]["model_output"]["sha256"], content)
        self.assertFalse(plan["summary"]["model_output"]["raw_content_included"])

    def test_rejects_wrong_repository(self):
        event = valid_event()
        event["repository"]["full_name"] = "other/repository"
        with self.assertRaises(PublisherError):
            self.plan(event)

    def test_rejects_wrong_head_repository(self):
        event = valid_event()
        event["workflow_run"]["head_repository"]["full_name"] = "other/repository"
        with self.assertRaises(PublisherError):
            self.plan(event)

    def test_rejects_non_master_source(self):
        event = valid_event()
        event["workflow_run"]["head_branch"] = "untrusted-feature"
        with self.assertRaises(PublisherError):
            self.plan(event)

    def test_rejects_wrong_workflow(self):
        event = valid_event()
        event["workflow_run"]["name"] = "Untrusted Workflow"
        with self.assertRaises(PublisherError):
            self.plan(event)

    def test_rejects_wrong_workflow_path(self):
        event = valid_event()
        event["workflow_run"]["path"] = ".github/workflows/other.yml"
        with self.assertRaises(PublisherError):
            self.plan(event)

    def test_rejects_failed_run(self):
        event = valid_event()
        event["workflow_run"]["conclusion"] = "failure"
        with self.assertRaises(PublisherError):
            self.plan(event)

    def test_rejects_unapproved_event_type(self):
        event = valid_event()
        event["workflow_run"]["event"] = "pull_request_target"
        with self.assertRaises(PublisherError):
            self.plan(event)

    def test_rejects_invalid_head_sha(self):
        event = valid_event()
        event["workflow_run"]["head_sha"] = "not-a-sha"
        with self.assertRaises(PublisherError):
            self.plan(event)

    def test_rejects_non_p59_003_task(self):
        report = valid_report()
        report["task_id"] = "P59-001"
        (self.root / "ai_worker_report.json").write_text(json.dumps(report), encoding="utf-8")
        with self.assertRaises(PublisherError):
            self.plan()

    def test_missing_safety_assertion_fails_closed(self):
        report = valid_report()
        report["no_code_execution"] = False
        (self.root / "ai_worker_report.json").write_text(json.dumps(report), encoding="utf-8")
        with self.assertRaises(PublisherError):
            self.plan()

    def test_secret_like_output_fails_closed(self):
        report = valid_report()
        report["output"] = "example token ghp_abcdefghijklmnopqrstuvwxyz123456"
        (self.root / "ai_worker_report.json").write_text(json.dumps(report), encoding="utf-8")
        with self.assertRaises(PublisherError):
            self.plan()

    def test_forbidden_secret_field_fails_closed(self):
        report = valid_report()
        report["access_token"] = "not-a-real-token"
        (self.root / "ai_worker_report.json").write_text(json.dumps(report), encoding="utf-8")
        with self.assertRaises(PublisherError):
            self.plan()

    def test_oversized_report_fails_closed(self):
        (self.root / "ai_worker_report.json").write_bytes(b"x" * 70000)
        with self.assertRaises(PublisherError):
            self.plan()

    def test_duplicate_reports_fail_closed(self):
        nested = self.root / "nested"
        nested.mkdir()
        (nested / "ai_worker_report.json").write_text(json.dumps(valid_report()), encoding="utf-8")
        with self.assertRaises(PublisherError):
            self.plan()

    def test_normal_waiting_report_is_a_noop(self):
        report = valid_report()
        report["status"] = "WAITING_FOR_OWNER_CONFIGURATION"
        (self.root / "ai_worker_report.json").write_text(json.dumps(report), encoding="utf-8")
        self.assertIsNone(self.plan())

    def test_missing_report_is_a_noop(self):
        (self.root / "ai_worker_report.json").unlink()
        self.assertIsNone(self.plan())


class PublisherApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "ai_worker_report.json").write_text(json.dumps(valid_report()), encoding="utf-8")
        report_bytes = (self.root / "ai_worker_report.json").read_bytes()
        self.plan = build_publish_plan(valid_event(), self.root, artifact_metadata=valid_artifact_metadata(report_bytes))
        self.api = FakeApi()

    def tearDown(self):
        self.temp.cleanup()

    def test_creates_one_draft_pr_on_deterministic_branch(self):
        result = publish_plan(self.plan, self.api)
        self.assertEqual(result["status"], "DRAFT_PR_CREATED")
        self.assertEqual(result["number"], 1)
        self.assertEqual(len(self.api.pull_requests), 1)
        self.assertTrue(self.api.pull_requests[0]["draft"])
        self.assertTrue(self.plan["branch"].startswith("automation/p10cr/"))
        self.assertEqual(len(self.api.files), 1)

    def test_publish_is_idempotent(self):
        first = publish_plan(self.plan, self.api)
        write_calls_after_first = sum(1 for method, path, _ in self.api.calls if method in {"POST", "PUT"})
        second = publish_plan(self.plan, self.api)
        write_calls_after_second = sum(1 for method, path, _ in self.api.calls if method in {"POST", "PUT"})
        self.assertEqual(first["number"], second["number"])
        self.assertEqual(write_calls_after_first, write_calls_after_second)

    def test_existing_branch_with_different_content_is_rejected(self):
        branch = self.plan["branch"]
        self.api.branches[branch] = "b" * 40
        self.api.branch_bases[branch] = MASTER_SHA
        self.api.branch_commits[branch] = 1
        self.api.branch_files[branch] = [{
            "filename": self.plan["path"],
            "status": "added",
            "additions": 1,
            "deletions": 0,
            "changes": 1,
        }]
        self.api.files[(branch, self.plan["path"])] = b"different content"
        with self.assertRaises(PublisherError):
            publish_plan(self.plan, self.api)

    def test_no_merge_or_master_write_endpoint_is_called(self):
        publish_plan(self.plan, self.api)
        for method, path, _ in self.api.calls:
            self.assertNotIn("/merge", path)
            self.assertFalse(method == "PUT" and "/contents/" not in path and path.endswith("/master"))


    def test_rejects_preexisting_branch_with_extra_commit_or_file(self):
        branch = self.plan["branch"]
        self.api.branches[branch] = "c" * 40
        self.api.branch_bases[branch] = MASTER_SHA
        self.api.branch_commits[branch] = 2
        self.api.branch_files[branch] = [
            {"filename": self.plan["path"], "status": "added", "additions": 1, "deletions": 0, "changes": 1},
            {"filename": "unexpected.txt", "status": "added", "additions": 1, "deletions": 0, "changes": 1},
        ]
        with self.assertRaises(PublisherError):
            publish_plan(self.plan, self.api)
        self.assertEqual(len(self.api.pull_requests), 0)

    def test_rejects_preexisting_branch_behind_or_diverged_from_master(self):
        branch = self.plan["branch"]
        self.api.branches[branch] = "d" * 40
        self.api.branch_bases[branch] = "c" * 40
        self.api.branch_commits[branch] = 0
        self.api.branch_files[branch] = []
        with self.assertRaises(PublisherError):
            publish_plan(self.plan, self.api)
        self.assertEqual(len(self.api.pull_requests), 0)

    def test_rejects_existing_pr_with_mismatched_head_sha(self):
        publish_plan(self.plan, self.api)
        self.api.pull_requests[0]["head"]["sha"] = "c" * 40
        with self.assertRaises(PublisherError):
            publish_plan(self.plan, self.api)

    def test_rejects_new_pr_response_with_mismatched_head_sha(self):
        self.api.override_pr_head_sha = "c" * 40
        with self.assertRaises(PublisherError):
            publish_plan(self.plan, self.api)
        self.assertEqual(len(self.api.pull_requests), 1)
        self.assertTrue(self.api.pull_requests[0]["draft"])

    def test_rejects_new_pr_response_with_mismatched_base_sha(self):
        self.api.override_pr_base_sha = "c" * 40
        with self.assertRaises(PublisherError):
            publish_plan(self.plan, self.api)
        self.assertEqual(len(self.api.pull_requests), 1)
        self.assertTrue(self.api.pull_requests[0]["draft"])

    def test_rejects_branch_with_wrong_summary_path(self):
        branch = self.plan["branch"]
        self.api.branches[branch] = "b" * 40
        self.api.branch_bases[branch] = MASTER_SHA
        self.api.branch_commits[branch] = 1
        self.api.branch_files[branch] = [{
            "filename": "research/worker-drafts/unexpected.json",
            "status": "added",
            "additions": 1,
            "deletions": 0,
            "changes": 1,
        }]
        with self.assertRaises(PublisherError):
            publish_plan(self.plan, self.api)
        self.assertEqual(len(self.api.pull_requests), 0)

    def test_existing_non_draft_pr_is_rejected(self):
        publish_plan(self.plan, self.api)
        self.api.pull_requests[0]["draft"] = False
        with self.assertRaises(PublisherError):
            publish_plan(self.plan, self.api)


class PublisherWorkflowGateTests(unittest.TestCase):
    def test_publisher_write_job_requires_owner_review_environment(self):
        workflow = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "p10cr-constrained-publisher.yml"
        source = workflow.read_text(encoding="utf-8")
        expected = "  publish-draft:\n    environment:\n      name: p10cr-publisher\n"
        self.assertIn(expected, source)
        self.assertIn("permission-contents: write", source)
        self.assertIn("permission-pull-requests: write", source)
        self.assertIn("ENV_APPROVAL_MARKER: ${{ secrets.P10CR_PUBLISHER_ENV_APPROVED }}", source)
        self.assertIn('P59-003-PUBLISHER-OWNER-APPROVED', source)



class PublisherApiBoundaryTests(unittest.TestCase):
    ROOT = "/repos/" + CANONICAL_REPOSITORY
    BRANCH = "automation/p10cr/worker-run-12345-attempt-1"
    FILE = "research/worker-drafts/ai-run-12345-attempt-1.json"

    def test_all_internal_publisher_routes_are_allowlisted(self):
        content = valid_summary_content()
        _validate_api_request("GET", self.ROOT + "/git/ref/heads/master")
        _validate_api_request("GET", self.ROOT + "/git/ref/heads/" + self.BRANCH)
        _validate_api_request("GET", self.ROOT + "/compare/master..." + quote_branch(self.BRANCH))
        with self.assertRaises(PublisherError):
            _validate_api_request("GET", self.ROOT + "/compare/main..." + quote_branch(self.BRANCH))
        with self.assertRaises(PublisherError):
            _validate_api_request("GET", self.ROOT + "/compare/master..." + quote_branch("automation/p10cr/other"))
        _validate_api_request("POST", self.ROOT + "/git/refs", {
            "ref": "refs/heads/" + self.BRANCH, "sha": MASTER_SHA
        })
        _validate_api_request("GET", self.ROOT + "/contents/" + self.FILE + "?ref=" + self.BRANCH)
        _validate_api_request("PUT", self.ROOT + "/contents/" + self.FILE, {
            "message": "Add sanitized P10CR worker draft summary for run 12345",
            "content": content,
            "branch": self.BRANCH,
        })
        _validate_api_request(
            "GET",
            self.ROOT + "/pulls?state=open&head=manish91082-coder%3A" + self.BRANCH + "&base=master",
        )
        _validate_api_request("POST", self.ROOT + "/pulls", {
            "title": "P10CR AI worker draft evidence: run 12345 attempt 1",
            "head": self.BRANCH,
            "base": "master",
            "body": "Untrusted evidence summary; human review required.",
            "draft": True,
        })

    def test_rejects_unsupported_methods_and_unknown_routes(self):
        for method, path in (
            ("DELETE", self.ROOT + "/git/refs/heads/" + self.BRANCH),
            ("PATCH", self.ROOT + "/pulls/1"),
            ("POST", self.ROOT + "/issues"),
            ("PUT", self.ROOT + "/contents/README.md"),
        ):
            with self.subTest(method=method, path=path):
                with self.assertRaises(PublisherError):
                    _validate_api_request(method, path, {})

    def test_rejects_noncanonical_or_absolute_api_paths(self):
        for path in (
            "/repos/another-owner/other-repo/git/ref/heads/master",
            "https://api.github.com" + self.ROOT + "/git/ref/heads/master",
            "//evil.example/" + self.ROOT.lstrip("/"),
            self.ROOT + "/git/ref/heads/master#fragment",
        ):
            with self.subTest(path=path):
                with self.assertRaises(PublisherError):
                    _validate_api_request("GET", path)

    def test_rejects_swapped_or_extra_content_query(self):
        path = self.ROOT + "/contents/" + self.FILE
        with self.assertRaises(PublisherError):
            _validate_api_request("GET", path + "?ref=automation%2Fp10cr%2Fworker-run-99999-attempt-1")
        with self.assertRaises(PublisherError):
            _validate_api_request("GET", path + "?ref=" + self.BRANCH + "&download=1")

    def test_rejects_content_payload_branch_mismatch(self):
        payload = {
            "message": "Add sanitized P10CR worker draft summary for run 12345",
            "content": base64.b64encode(b'{"safe":true}').decode("ascii"),
            "branch": "automation/p10cr/worker-run-99999-attempt-1",
        }
        with self.assertRaises(PublisherError):
            _validate_api_request("PUT", self.ROOT + "/contents/" + self.FILE, payload)

    def test_rejects_non_draft_pull_request_or_wrong_base(self):
        payload = {
            "title": "P10CR AI worker draft evidence: run 12345 attempt 1",
            "head": self.BRANCH,
            "base": "release",
            "body": "Untrusted evidence summary; human review required.",
            "draft": True,
        }
        with self.assertRaises(PublisherError):
            _validate_api_request("POST", self.ROOT + "/pulls", payload)
        payload["base"] = "master"
        payload["draft"] = False
        with self.assertRaises(PublisherError):
            _validate_api_request("POST", self.ROOT + "/pulls", payload)

    def test_rejects_pull_request_query_for_non_deterministic_branch(self):
        path = self.ROOT + "/pulls?state=open&head=manish91082-coder%3Aautomation%2Fother-branch&base=master"
        with self.assertRaises(PublisherError):
            _validate_api_request("GET", path)

    def test_redirect_handler_refuses_redirect(self):
        handler = _RejectRedirectHandler()
        request = urllib.request.Request("https://api.github.com/repos/example/repo")
        self.assertIsNone(handler.redirect_request(request, None, 302, "Found", {}, "https://evil.example/steal"))

    def test_github_api_never_follows_redirect(self):
        class RedirectOpener:
            def open(self, request, timeout):
                raise urllib.error.HTTPError(request.full_url, 302, "Found", {}, None)

        opener = RedirectOpener()
        with patch("scripts.constrained_publisher.urllib.request.build_opener", return_value=opener) as build:
            with self.assertRaises(ApiError) as raised:
                GitHubApi("x" * 24).request("GET", self.ROOT + "/git/ref/heads/master")
        self.assertEqual(raised.exception.status, 302)
        handler = build.call_args.args[0]
        self.assertIsInstance(handler, _RejectRedirectHandler)






class PublisherEventFlowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.artifact_dir = self.root / "artifact"
        self.artifact_dir.mkdir()
        self.event_path = self.root / "event.json"
        self.metadata_path = self.root / "artifact-attestation.json"
        self.plan_path = self.root / "publisher-plan.json"

    def tearDown(self):
        self.temp.cleanup()

    def write_inputs(self, report=None, event=None, metadata_mutator=None):
        report = report or valid_report()
        report_bytes = json.dumps(report).encode("utf-8")
        (self.artifact_dir / "ai_worker_report.json").write_bytes(report_bytes)
        event = event or valid_event()
        self.event_path.write_text(json.dumps(event), encoding="utf-8")
        metadata = valid_artifact_metadata(report_bytes)
        if metadata_mutator:
            metadata_mutator(metadata)
        self.metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
        return event, metadata

    def invoke_publish(self):
        argv = [
            "constrained_publisher.py", "publish",
            "--event-file", str(self.event_path),
            "--artifact-dir", str(self.artifact_dir),
            "--artifact-metadata-file", str(self.metadata_path),
            "--repo", CANONICAL_REPOSITORY,
            "--plan-file", str(self.plan_path),
        ]
        stdout = io.StringIO()
        stderr = io.StringIO()
        with (
            patch("sys.argv", argv),
            patch.dict("os.environ", {"NEXUS_PUBLISHER_TOKEN": "test-token-must-not-be-read"}, clear=True),
            patch("scripts.constrained_publisher.GitHubApi") as api_class,
            patch("scripts.constrained_publisher.os.getenv", side_effect=AssertionError("publisher token must not be read before deterministic validation")),
            redirect_stdout(stdout),
            redirect_stderr(stderr),
        ):
            result = main()
        return result, stdout.getvalue(), stderr.getvalue(), api_class

    def test_waiting_for_owner_configuration_is_noop_before_token_read_or_api(self):
        report = valid_report()
        report["status"] = "WAITING_FOR_OWNER_CONFIGURATION"
        self.write_inputs(report=report)
        result, stdout, stderr, api_class = self.invoke_publish()
        self.assertEqual(result, 0, stderr)
        payload = json.loads(stdout)
        self.assertEqual(payload["status"], "NO_PUBLISHABLE_P59_003_DRAFT")
        self.assertFalse(payload["write_token_used"])
        api_class.assert_not_called()
        self.assertFalse(self.plan_path.exists())

    def test_duplicate_workflow_run_event_delivery_reuses_one_draft_pr(self):
        self.write_inputs()
        metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        plan_one = build_publish_plan(valid_event(), self.artifact_dir, artifact_metadata=metadata)
        plan_two = build_publish_plan(valid_event(), self.artifact_dir, artifact_metadata=metadata)
        self.assertEqual(plan_one, plan_two)
        api = FakeApi()
        first = publish_plan(plan_one, api)
        writes_after_first = [call for call in api.calls if call[0] in {"POST", "PUT"}]
        second = publish_plan(plan_two, api)
        writes_after_second = [call for call in api.calls if call[0] in {"POST", "PUT"}]
        self.assertEqual(first["status"], "DRAFT_PR_CREATED")
        self.assertEqual(second["status"], "EXISTING_DRAFT_PR")
        self.assertEqual(first["number"], second["number"])
        self.assertEqual(len(api.pull_requests), 1)
        self.assertEqual(len(api.files), 1)
        self.assertEqual(len(writes_after_first), 3)
        self.assertEqual(len(writes_after_second), 3)

    def test_wrong_workflow_attempt_branch_expiry_and_digest_fail_before_token_or_api(self):
        cases = []

        wrong_workflow = valid_event()
        wrong_workflow["workflow_run"]["workflow_id"] += 1
        cases.append(("wrong workflow", wrong_workflow, None))

        wrong_attempt = valid_event()
        wrong_attempt["workflow_run"]["run_attempt"] = 2
        cases.append(("wrong run attempt", wrong_attempt, None))

        wrong_branch = valid_event()
        wrong_branch["workflow_run"]["head_branch"] = "feature/untrusted"
        cases.append(("wrong branch", wrong_branch, None))

        def expire(metadata):
            now = datetime.now(timezone.utc).replace(microsecond=0)
            metadata["artifact"]["created_at"] = (now - timedelta(hours=2)).isoformat().replace("+00:00", "Z")
            metadata["artifact"]["expires_at"] = (now - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
        cases.append(("expired artifact", valid_event(), expire))

        def alter_digest(metadata):
            metadata["artifact"]["archive_sha256"] = "f" * 64
        cases.append(("altered digest", valid_event(), alter_digest))

        for label, event, metadata_mutator in cases:
            with self.subTest(label=label):
                self.write_inputs(event=event, metadata_mutator=metadata_mutator)
                result, stdout, stderr, api_class = self.invoke_publish()
                self.assertEqual(result, 2, f"{label}: {stdout} {stderr}")
                self.assertIn("PUBLISHER_REJECTED", stderr)
                api_class.assert_not_called()

    def test_tampered_summary_plan_fails_before_token_or_api(self):
        self.write_inputs()
        metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        plan = build_publish_plan(valid_event(), self.artifact_dir, artifact_metadata=metadata)
        plan["summary"]["task"]["title"] = "tampered summary"
        self.plan_path.write_text(json.dumps(plan), encoding="utf-8")
        result, stdout, stderr, api_class = self.invoke_publish()
        self.assertEqual(result, 2, stdout)
        self.assertIn("PUBLISHER_REJECTED", stderr)
        api_class.assert_not_called()

    def test_worker_report_tampering_after_artifact_verification_fails_before_api(self):
        self.write_inputs()
        metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        report_path = self.artifact_dir / "ai_worker_report.json"
        report_path.write_text(json.dumps(valid_report() | {"output": "changed after attestation"}), encoding="utf-8")
        with self.assertRaises(PublisherError):
            build_publish_plan(valid_event(), self.artifact_dir, artifact_metadata=metadata)

    def test_workflow_skips_owner_environment_for_nonpublishable_events(self):
        workflow = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "p10cr-constrained-publisher.yml"
        source = workflow.read_text(encoding="utf-8")
        prepare_index = source.index("  prepare-draft:")
        publish_job_index = source.index("  publish-draft:")
        prepare_block = source[prepare_index:publish_job_index]
        publish_block = source[publish_job_index:]
        self.assertNotIn("environment:", prepare_block)
        self.assertIn("needs: prepare-draft", publish_block)
        self.assertIn("if: ${{ needs.prepare-draft.result == 'success' && needs.prepare-draft.outputs.publishable == 'true' }}", publish_block)
        self.assertIn("environment:\n      name: p10cr-publisher", publish_block)

    def test_workflow_mints_app_token_only_after_plan_validation_and_owner_gate(self):
        workflow = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "p10cr-constrained-publisher.yml"
        source = workflow.read_text(encoding="utf-8")
        validation_index = source.index("- name: Validate source run and sanitized P59-003 draft")
        publish_job_index = source.index("  publish-draft:")
        plan_index = source.index("- name: Revalidate sanitized plan before owner token gate")
        owner_index = source.index("- name: Check owner-installed Publisher App configuration")
        token_index = source.index("- name: Mint one-repository, narrowly scoped Publisher App token")
        publish_index = source.index("- name: Create or reuse allowlisted draft PR only")
        self.assertLess(validation_index, publish_job_index)
        self.assertLess(plan_index, owner_index)
        self.assertLess(owner_index, token_index)
        self.assertLess(token_index, publish_index)
        token_step = source[token_index:publish_index]
        publish_step = source[publish_index:]
        gate = "if: steps.plan_validation.outputs.valid == 'true' && steps.owner_gate.outputs.configured == 'true'"
        self.assertIn(gate, token_step)
        self.assertIn(gate, publish_step)
        self.assertEqual(source.count("actions/create-github-app-token@"), 1)

    def test_validate_command_exports_only_a_bounded_sanitized_plan(self):
        self.write_inputs()
        output_path = self.root / "github-output.txt"
        argv = [
            "constrained_publisher.py", "validate",
            "--event-file", str(self.event_path),
            "--artifact-dir", str(self.artifact_dir),
            "--artifact-metadata-file", str(self.metadata_path),
            "--repo", CANONICAL_REPOSITORY,
            "--plan-file", str(self.plan_path),
        ]
        stdout = io.StringIO()
        with (
            patch("sys.argv", argv),
            patch.dict("os.environ", {"GITHUB_OUTPUT": str(output_path)}, clear=True),
            redirect_stdout(stdout),
        ):
            result = main()
        self.assertEqual(result, 0)
        outputs = output_path.read_text(encoding="utf-8")
        self.assertIn("publishable=true", outputs)
        encoded = next(line.split("=", 1)[1] for line in outputs.splitlines() if line.startswith("plan_b64="))
        plan_bytes = base64.b64decode(encoded, validate=True)
        self.assertLessEqual(len(plan_bytes), 131072)
        plan = json.loads(plan_bytes)
        self.assertNotIn(valid_report()["output"], plan["content_base64"])
        self.assertEqual(plan["summary"]["task"]["id"], "P59-003")

    def test_waiting_validation_exports_false_and_no_plan_output(self):
        report = valid_report()
        report["status"] = "WAITING_FOR_OWNER_CONFIGURATION"
        self.write_inputs(report=report)
        output_path = self.root / "github-output.txt"
        self.plan_path.write_text("stale-plan", encoding="utf-8")
        argv = [
            "constrained_publisher.py", "validate",
            "--event-file", str(self.event_path),
            "--artifact-dir", str(self.artifact_dir),
            "--artifact-metadata-file", str(self.metadata_path),
            "--repo", CANONICAL_REPOSITORY,
            "--plan-file", str(self.plan_path),
        ]
        stdout = io.StringIO()
        with (
            patch("sys.argv", argv),
            patch.dict("os.environ", {"GITHUB_OUTPUT": str(output_path)}, clear=True),
            redirect_stdout(stdout),
        ):
            result = main()
        self.assertEqual(result, 0)
        outputs = output_path.read_text(encoding="utf-8")
        self.assertIn("publishable=false", outputs)
        self.assertNotIn("plan_b64=", outputs)
        self.assertFalse(self.plan_path.exists())

    def test_publish_plan_cli_rejects_tampered_summary_before_token_read(self):
        self.write_inputs()
        metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        plan = build_publish_plan(valid_event(), self.artifact_dir, artifact_metadata=metadata)
        plan["summary"]["task"]["title"] = "tampered"
        encoded = base64.b64encode(json.dumps(plan).encode("utf-8")).decode("ascii")

        def fake_getenv(name, default=None):
            if name == "P10CR_VALIDATED_PLAN_B64":
                return encoded
            if name == "NEXUS_PUBLISHER_TOKEN":
                raise AssertionError("publisher token must not be read for an invalid plan")
            return default

        stdout = io.StringIO()
        stderr = io.StringIO()
        with (
            patch("sys.argv", ["constrained_publisher.py", "publish-plan", "--plan-base64-env", "P10CR_VALIDATED_PLAN_B64"]),
            patch("scripts.constrained_publisher.os.getenv", side_effect=fake_getenv),
            patch("scripts.constrained_publisher.GitHubApi") as api_class,
            redirect_stdout(stdout),
            redirect_stderr(stderr),
        ):
            result = main()
        self.assertEqual(result, 2)
        self.assertIn("PUBLISHER_REJECTED", stderr.getvalue())
        api_class.assert_not_called()


if __name__ == "__main__":
    unittest.main()
