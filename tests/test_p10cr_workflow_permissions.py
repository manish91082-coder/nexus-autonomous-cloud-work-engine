"""Regression contract for the P10CR read-only compute / single publisher boundary.

Uses only the Python standard library so the check is deterministic and adds no
runtime dependency to the zero-cost worker.
"""
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
WORKER_PATH = WORKFLOWS / "mission-autonomous-worker.yml"
PUBLISHER_PATH = WORKFLOWS / "p10cr-constrained-publisher.yml"

AI_FALSE_FLAGS = (
    "MISSION_AI_ENABLED",
    "MISSION_AI_ZERO_BILLING_CONFIRMED",
    "MISSION_AI_PROVIDER_TERMS_REVIEWED",
    "MISSION_AI_MODEL_DATA_TERMS_REVIEWED",
    "MISSION_AI_GLOBAL_QUOTA_VERIFIED",
    "MISSION_AI_OWNER_APPROVED",
    "MISSION_AI_GLOBAL_QUOTA_DISPATCHER_VERIFIED",
)
APP_TOKEN_ACTION = (
    "actions/create-github-app-token@"
    "64ab729a6294000f5aa4a4bc0b73d1f32bc45510"
)
FORBIDDEN_PUBLISHER_WRITES = (
    "permission-actions",
    "permission-workflows",
    "permission-administration",
    "permission-secrets",
    "permission-deployments",
    "permission-packages",
)


def _read(path):
    return path.read_text(encoding="utf-8")


def _mapping_block(text, key, indent):
    """Return simple key/value entries from one indentation-scoped YAML map."""
    lines = text.splitlines()
    marker = " " * indent + key + ":"
    start = next((i for i, line in enumerate(lines) if line == marker), None)
    if start is None:
        raise AssertionError(f"missing YAML mapping: {marker}")
    entries = {}
    child_indent = indent + 2
    for line in lines[start + 1:]:
        if not line.strip():
            continue
        leading = len(line) - len(line.lstrip(" "))
        if leading <= indent:
            break
        if leading != child_indent:
            continue
        match = re.fullmatch(r"\s*([A-Za-z0-9_-]+):\s*([A-Za-z0-9_-]+)\s*", line)
        if match:
            entries[match.group(1)] = match.group(2)
    return entries


def _job_block(text, job_name):
    lines = text.splitlines()
    marker = f"  {job_name}:"
    start = next((i for i, line in enumerate(lines) if line == marker), None)
    if start is None:
        raise AssertionError(f"missing job: {job_name}")
    end = len(lines)
    for i in range(start + 1, len(lines)):
        if re.fullmatch(r"  [A-Za-z0-9_-]+:\s*", lines[i]):
            end = i
            break
    return "\n".join(lines[start:end]) + "\n"


def _permission_maps(text):
    lines = text.splitlines()
    maps = []
    for i, line in enumerate(lines):
        match = re.fullmatch(r"( *)permissions:\s*", line)
        if not match:
            continue
        indent = len(match.group(1))
        entries = {}
        for child in lines[i + 1:]:
            if not child.strip():
                continue
            leading = len(child) - len(child.lstrip(" "))
            if leading <= indent:
                break
            if leading != indent + 2:
                continue
            item = re.fullmatch(
                r"\s*([A-Za-z0-9_-]+):\s*([A-Za-z0-9_-]+)\s*", child
            )
            if item:
                entries[item.group(1)] = item.group(2)
        maps.append((indent, entries))
    return maps


def assert_worker_boundary(text):
    top = _mapping_block(text, "permissions", 0)
    if top != {"contents": "read"}:
        raise AssertionError(f"worker top-level permissions must be contents:read only; got {top}")
    for indent, permissions in _permission_maps(text):
        if any(value not in {"read", "none"} for value in permissions.values()):
            raise AssertionError(f"worker has write-capable permission map at indent {indent}: {permissions}")
    if not re.search(r"persist-credentials:\s*false\b", text):
        raise AssertionError("checkout must set persist-credentials: false")
    if re.search(r"\bgit\s+(?:push|commit|tag)\b", text, re.IGNORECASE):
        raise AssertionError("compute worker must not run git push/commit/tag")
    if "actions/create-github-app-token@" in text:
        raise AssertionError("compute worker must not mint a publisher App token")
    if "NEXUS_PUBLISHER_APP_" in text or "P10CR_PUBLISHER_ENV_APPROVED" in text:
        raise AssertionError("compute worker must not receive publisher credentials/attestation")
    if re.search(r"\$\{\{\s*secrets\.", text):
        raise AssertionError("compute worker must not reference Actions secrets")
    if re.search(r"\bCLOUDFLARE_(?:API_TOKEN|ACCOUNT_ID)\b", text):
        raise AssertionError("compute worker must not receive Cloudflare credentials")
    for flag in AI_FALSE_FLAGS:
        match = re.search(
            rf"^\s*{re.escape(flag)}:\s*['\"]?(true|false)['\"]?\s*$",
            text,
            re.MULTILINE | re.IGNORECASE,
        )
        if not match or match.group(1).lower() != "false":
            raise AssertionError(f"{flag} must be explicitly false in the worker workflow")


def assert_publisher_boundary(text, all_workflow_texts):
    top = _mapping_block(text, "permissions", 0)
    if top != {"actions": "read", "contents": "read"}:
        raise AssertionError(f"publisher GITHUB_TOKEN must remain read-only; got {top}")

    prepare = _job_block(text, "prepare-draft")
    publish = _job_block(text, "publish-draft")
    if "actions/create-github-app-token@" in prepare:
        raise AssertionError("prepare-draft must not mint an App token")
    if "write" in str(_permission_maps(prepare)).lower():
        raise AssertionError("prepare-draft must remain read-only")
    publish_maps = _permission_maps(publish)
    if not publish_maps or any(
        value not in {"read", "none"} for _, mapping in publish_maps for value in mapping.values()
    ):
        raise AssertionError("publish-draft GITHUB_TOKEN permissions must remain read-only")
    if not re.search(r"environment:\s*\n\s+name:\s*p10cr-publisher\b", publish):
        raise AssertionError("the only App-token job must use p10cr-publisher environment")
    if "plan_validation.outputs.valid == 'true'" not in publish:
        raise AssertionError("publisher token must require deterministic plan validation")
    if "owner_gate.outputs.configured == 'true'" not in publish:
        raise AssertionError("publisher token must require explicit owner configuration")
    gate = publish.find("Check owner-installed Publisher App configuration")
    mint = publish.find("Mint one-repository, narrowly scoped Publisher App token")
    if gate < 0 or mint < 0 or gate >= mint:
        raise AssertionError("owner configuration gate must precede App-token minting")
    if text.count("actions/create-github-app-token@") != 1:
        raise AssertionError("publisher workflow must contain exactly one App-token action")
    if APP_TOKEN_ACTION not in text:
        raise AssertionError("publisher App-token action must remain SHA-pinned to the reviewed commit")
    if "permission-metadata: read" not in publish:
        raise AssertionError("Publisher App token must retain metadata:read")
    if "permission-contents: write" not in publish:
        raise AssertionError("Publisher App token must retain only the intended contents:write scope")
    if "permission-pull-requests: write" not in publish:
        raise AssertionError("Publisher App token must retain only the intended pull-requests:write scope")
    for forbidden in FORBIDDEN_PUBLISHER_WRITES:
        if re.search(rf"^\s*{re.escape(forbidden)}:\s*write\s*$", publish, re.MULTILINE):
            raise AssertionError(f"Publisher App scope must not include {forbidden}:write")
    token_workflows = [
        name for name, body in all_workflow_texts.items()
        if "actions/create-github-app-token@" in body
    ]
    if token_workflows != ["p10cr-constrained-publisher.yml"]:
        raise AssertionError(f"only the constrained publisher may mint an App token: {token_workflows}")
    secret_workflows = [
        name for name, body in all_workflow_texts.items()
        if "NEXUS_PUBLISHER_APP_" in body or "P10CR_PUBLISHER_ENV_APPROVED" in body
    ]
    if secret_workflows != ["p10cr-constrained-publisher.yml"]:
        raise AssertionError(f"publisher credentials escaped the publisher workflow: {secret_workflows}")


class P10CRWorkflowPermissionBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.worker = _read(WORKER_PATH)
        cls.publisher = _read(PUBLISHER_PATH)
        cls.all_workflows = {
            path.name: _read(path)
            for path in sorted(WORKFLOWS.glob("*.yml"))
        }
        cls.all_workflows.update({
            path.name: _read(path)
            for path in sorted(WORKFLOWS.glob("*.yaml"))
        })

    def test_compute_worker_is_read_only_and_provider_disabled(self):
        assert_worker_boundary(self.worker)

    def test_prepare_job_is_read_only_and_publisher_is_single_writer(self):
        assert_publisher_boundary(self.publisher, self.all_workflows)

    def test_worker_guard_detects_contents_write_regression(self):
        mutated = self.worker.replace("  contents: read", "  contents: write", 1)
        with self.assertRaises(AssertionError):
            assert_worker_boundary(mutated)

    def test_worker_guard_detects_persisted_checkout_credentials(self):
        mutated = self.worker.replace("persist-credentials: false", "persist-credentials: true", 1)
        with self.assertRaises(AssertionError):
            assert_worker_boundary(mutated)

    def test_worker_guard_detects_publisher_token_injection(self):
        mutated = self.worker + "\n      - uses: actions/create-github-app-token@v3\n"
        with self.assertRaises(AssertionError):
            assert_worker_boundary(mutated)

    def test_worker_guard_detects_direct_git_push(self):
        mutated = self.worker + "\n      - run: git push origin HEAD\n"
        with self.assertRaises(AssertionError):
            assert_worker_boundary(mutated)

    def test_publisher_guard_detects_missing_owner_gate(self):
        mutated = self.publisher.replace(
            "owner_gate.outputs.configured == 'true' and ",
            "",
        )
        with self.assertRaises(AssertionError):
            assert_publisher_boundary(mutated, self.all_workflows)

    def test_publisher_guard_detects_scope_escalation(self):
        mutated = self.publisher.replace(
            "permission-pull-requests: write",
            "permission-pull-requests: write\n          permission-actions: write",
            1,
        )
        with self.assertRaises(AssertionError):
            assert_publisher_boundary(mutated, self.all_workflows)


if __name__ == "__main__":
    unittest.main()
