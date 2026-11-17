# Phase 59.57 — compute / constrained-publisher separation

**Mission:** P10CR / P59-003 only  
**Baseline master HEAD:** 8856bf908f93e265cefd5c739f7f46b3dd995b3c  
**Stacked parent:** Phase59.56 branch phase59-56-synthetic-global-quota-proof at 290e2601a430d46bb5027675b5774aea37da6104  
**Status:** implementation candidate committed; exact-head CI pending  
**Spend:** ₹0  
**AI inference:** hard-disabled in compute workflow  
**Production deployment:** OFF  
**Publisher App:** not approved, not created, not installed

## Objective

Remove repository-write capability from the scheduled compute worker and prepare one separate, deterministic publisher that can create only a sanitized draft pull request after owner-controlled GitHub App setup. The publisher must never merge, deploy, publish a product, execute model output, or change account/financial state.

## Compute-worker boundary

The candidate update to mission-autonomous-worker.yml:

- changes GITHUB_TOKEN permissions from contents:write to contents:read;
- disables checkout credential persistence;
- removes the worker's git add/commit/push step;
- removes all provider secrets from the AI executor environment and sets both inference gates explicitly false;
- retains deterministic queue polling, local report generation and artifact upload.

Therefore the compute workflow has no repository write token and no model inference, even if unrelated secrets are later added. Reports remain run artifacts; no canonical state is mutated by compute.

## Constrained publisher boundary

A separate workflow, p10cr-constrained-publisher.yml, listens only for a successful completed Mission Autonomous AI Worker run whose source branch is master. Its GITHUB_TOKEN is actions:read + contents:read only.

The publisher:
1. downloads the exact source-run artifact using the read-only token;
2. validates repository, workflow name/path, source branch, event, conclusion, run ID/attempt and source SHA;
3. accepts only a P59-003 DRAFT_READY_FOR_EVIDENCE_REVIEW report with explicit untrusted-output and no-code/no-money-movement assertions;
4. rejects oversized, duplicate, malformed or secret-like report material;
5. publishes only a sanitized summary containing the model-output SHA-256 and byte count, never the raw model text;
6. uses the owner-installed Publisher App token, limited to this one repository and Contents:write + Pull requests:write, only after the artifact passes validation;
7. creates/reuses a deterministic automation/p10cr/* branch and a DRAFT PR against master.

The implementation has no merge, delete, force-push, release, deployment, KYC, payment or account action. A deterministic branch/path allowlist restricts output to research/worker-drafts/ai-run-<run>-attempt-<attempt>.json. The raw model proposal is not committed.

## Official action pin

The publisher uses actions/create-github-app-token at verified commit 64ab729a6294000f5aa4a4bc0b73d1f32bc45510 (v3.3.0, released 12-Oct-2026). Only client-id, private-key, owner, one repository, metadata:read, contents:write and pull-requests:write are configured. The App is not installed and no secrets were read or created.

## Tests and current evidence

The dedicated Python test suite uses only the standard library and a fake GitHub API. It covers:
- exact source workflow/repository/master/event/conclusion validation;
- P59-003-only task gate and explicit safety assertions;
- no raw model text in published summary;
- secret-like and oversized payload rejection;
- duplicate/malformed artifact rejection;
- deterministic branch/path;
- draft PR creation and idempotent replay;
- mismatch rejection for an existing deterministic branch;
- absence of merge/master-write calls.

**Exact-head CI is pending.** Do not claim this phase accepted until the dedicated workflow and regression workflows pass on the exact PR head.

## Important deployment and approval boundary

- PR #40 remains draft and unmerged; PR #41 remains stacked on PR #40; master remains at 8856bf908f93e265cefd5c739f7f46b3dd995b3c.
- This candidate is stacked on PR #41. No master merge or protected-state mutation is performed.
- GitHub App installation, secrets, branch ruleset and required-review configuration remain owner-gated.
- GitHub App Contents:write + Pull requests:write is still a powerful repository token. The script itself only creates a draft PR and contains no merge operation, but owner-configured branch ruleset and required approval are necessary defense-in-depth. Branch protection remains UNVERIFIED.
- No other project repository is read or modified.
- No production Cloudflare deployment, live provider request, model inference, public product release, KYC, legal acceptance, billing, payment, signing or money movement occurred.

## Acceptance boundary

This phase can be accepted as code-level separation after exact-head CI. It does not prove the App is installed, the publisher has operated against a real owner-approved token, protected branch rules are configured, hosted cross-workflow runs share a deployed Durable Object, or independent physical hosts are atomic.

P59-003 remains the sole active P0. P59-001 remains PAUSED and P59-002 remains BLOCKED. Next engineering task after this phase's CI is Phase59.58 durable mission-dispatcher integration with the project-cell SwarmRunDO and deterministic specialist graph. Keep inference and all production flags OFF.
