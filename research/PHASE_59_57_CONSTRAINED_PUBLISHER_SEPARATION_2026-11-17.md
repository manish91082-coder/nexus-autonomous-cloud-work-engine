# Phase 59.57 — compute / constrained-publisher separation

**Mission:** P10CR / P59-003 only  
**Baseline master HEAD:** 8856bf908f93e265cefd5c739f7f46b3dd995b3c  
**Stacked parent:** Phase59.56 branch phase59-56-synthetic-global-quota-proof at 290e2601a430d46bb5027675b5774aea37da6104  
**Status:** CODE-LEVEL SEPARATION PASS; OWNER APP / RULESET / STACKED MERGE PENDING  
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


## Exact-head CI and control-plane checkpoint (17-Nov-2026)

- Candidate branch head: \`4d419d4c260a21a653e05bce1b94e90e7cccf4f8\`; draft PR #42 is stacked on PR #41, which is stacked on draft PR #40. PR #42 is open, draft and unmerged. Master remains \`8856bf908f93e265cefd5c739f7f46b3dd995b3c\`.
- Dedicated push CI [#44015009269](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44015009269): SUCCESS. Python compile, **23/23 unit tests**, offline CLI check all passed.
- Exact PR-head CI [#44015026065](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44015026065): SUCCESS, same 23/23 tests.
- Bounded mission worker [#44015009217](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44015009217): SUCCESS; queue poll POLL_OK selected P59-003; AI executor returned WAITING_FOR_OWNER_CONFIGURATION; no inference request. The candidate workflow has no contents-write permission and no commit/push step.
- The PR #41 Phase59.56 exact-head run [#44012765651](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44012765651) remains SUCCESS; synthetic workerd quota result is 76/76, not hosted multi-run or physical-host proof.
- Latest master worker [#43998553989](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43998553989) remains SUCCESS on master HEAD \`8856bf908f93e265cefd5c739f7f46b3dd995b3c\`. No master write occurred in this phase.
- PR #40 remains draft; PR #41 remains open and stacked; PR #42 remains draft. No PR was merged.

### Acceptance and residual gates

Code-level separation is tested. The Publisher App is not created/installed; no App token was minted or used. Branch protection remains UNVERIFIED. The publisher workflow is inert until a valid P59-003 draft artifact and owner-installed App secrets exist. AI inference is hard-disabled in the candidate compute workflow, so even configured secrets cannot activate inference through this path.

The publisher token is restricted to one repository with Metadata:read, Contents:write and Pull requests:write. The code has no merge endpoint and only opens draft PRs, but Pull requests:write is technically powerful; an owner-configured ruleset requiring review/checks and denying bypass remains mandatory before App installation or token use.

No production deployment, live provider call, external network request in tests, KYC, legal acceptance, billing, public product release, payment, signing, money movement or spend occurred. PCNE / verified realized net receipts ₹0; authorized spend ₹0. P59-003 remains the sole active P0; P59-001 PAUSED; P59-002 BLOCKED.

**Next engineering task:** Phase59.58 durable mission-dispatcher integration with SwarmRunDO and the deterministic specialist graph, still shadow-only and with AI inference disabled.
