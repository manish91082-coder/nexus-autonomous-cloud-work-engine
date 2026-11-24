# Phase 59.69 — Immutable Workflow and Exact Source-Artifact Provenance

**Date:** 2026-11-24  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem  
**Task:** P59-003 — AI agentic swarm foundation  
**Status:** ACCEPTED_CODE_AND_EXACT_HEAD_CI_PASS; OWNER_GATES_PENDING  
**Branch:** `phase59-69-artifact-provenance`  
**Parent branch / PR:** `phase59-68-publisher-branch-integrity` / PR #54  
**Candidate master baseline:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c`  
**Exact tested code/test HEAD:** `603d293f4eee1fbd6d13dc195a4e55b7e6f71479`  
**Exact-head CI:** [Run #538 — SUCCESS](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45321056047)

## 1. Decision and scope

Phase59.69 closes the next publisher trust boundary after Phase59.68. A worker report is not accepted merely because it appears in a ZIP downloaded for a workflow-run event. The publisher now requires a verified immutable source-workflow identity, exact workflow-run metadata, one uniquely named artifact for the exact run attempt, the GitHub artifact SHA-256 digest, exact archive byte count, and a closed extracted-file manifest before the worker report is read.

The worker artifact name now includes both the immutable run ID and the run attempt:

`mission-autonomous-worker-<GITHUB_RUN_ID>-attempt-<GITHUB_RUN_ATTEMPT>`

This prevents an artifact from an earlier re-run attempt from being mistaken for the current attempt. Artifacts from other attempts may remain in the run listing; the verifier selects exactly one artifact with the current run/attempt name and rejects duplicate matches or an incomplete listing.

No revenue-source ranking, product discovery, unrelated asset work, or other-project execution was performed.

## 2. Immutable source identity

The verifier pins and checks:

- Canonical repository: `manish91082-coder/nexus-autonomous-cloud-work-engine`
- Numeric repository ID: `1454085952`
- Immutable worker workflow ID: `415454534`
- Workflow name: `Mission Autonomous AI Worker (bounded, fail-closed)`
- Workflow path: `.github/workflows/mission-autonomous-worker.yml`
- Source branch: `master` only
- Allowed source events: `schedule` and `push`
- Successful completed run only
- Exact positive run ID, bounded run attempt, and 40-character head SHA
- Same canonical repository and numeric ID for both source repository and head repository

The workflow-run event is cross-checked against the GitHub REST source-run record, including workflow ID, name, event, run attempt, run ID, branch, head SHA, conclusion, repository ID, and head-repository ID. A feature-branch candidate run is rejected even if its artifact is otherwise valid.

## 3. Artifact metadata and digest verification

New module: `scripts/p10cr_artifact_provenance.py`.

Before the publisher reads `ai_worker_report.json`, the module:

1. Reads the signed `workflow_run` event and validates the canonical repository/workflow/branch/event identity.
2. Fetches the source workflow-run record using a read-only `actions:read` token.
3. Lists artifacts for that exact run with a bounded first-page request; the returned total must equal the number of listed records.
4. Requires exactly one artifact named for the exact run ID and run attempt.
5. Rejects missing/malformed SHA-256 digest, expired artifact, invalid timestamps, wrong repository/run/head SHA, wrong artifact name, and out-of-range size.
6. Calls the GitHub artifact ZIP endpoint and requires the expected single HTTP 302 response.
7. Allows only the configured GitHub artifact-storage host families (Azure Blob or GitHub's repository-artifact S3 host). It creates a new unauthenticated request for the storage URL; the GitHub bearer token and cookies are never forwarded.
8. Rejects a second redirect, non-HTTPS URL, userinfo, non-default port, fragment, or non-allowlisted host.
9. Streams the archive under a 1 MiB ceiling and requires the downloaded byte count and SHA-256 digest to match GitHub artifact metadata exactly.
10. Extracts only the exact three expected files, with no directories, traversal paths, symlinks, duplicate entries, encryption, unsupported compression, oversized members, excessive total expansion, or excessive compression ratio.
11. Computes a SHA-256 digest and byte count for every extracted file and writes a separate strict attestation file outside the extracted artifact directory.

The exact expected archive entries are:

- `ai_worker_report.json`
- `mission_guard_report.json`
- `worker_tick_report.json`

The attestation contains the source identity, artifact ID/name/digest/size/timestamps, verified archive SHA-256, and per-file SHA-256/size. It contains no bearer token, cookie, raw provider output, or secret.

## 4. Publisher and summary integration

- `p10cr-constrained-publisher.yml` no longer uses `gh run download` as the trust boundary. It runs the verifier first and passes the separate attestation to both validation and publish-plan generation.
- `scripts/constrained_publisher.py` rejects missing, malformed, or source-mismatched artifact attestations before it accepts a worker report.
- Published sanitized summaries move to schema version `2.0`.
- New schema: `schemas/p10cr-worker-draft-summary-v2.schema.json`.
- The summary binds canonical repository IDs, immutable workflow ID, source run ID/attempt/head SHA, artifact ID/name/digest/size/timestamps, archive SHA-256, and exact per-file hashes.
- Raw model output remains excluded. Only a fingerprint and byte count may be present, with trust fixed to `UNVERIFIED_PROPOSAL`.
- Human evidence review remains mandatory. Automatic acceptance and automatic task completion remain false.
- No model-generated code is executed. No public release, merge, payment, or money movement is possible through this path.

## 5. Exact-head CI evidence

[GitHub Actions run #538](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45321056047) completed **SUCCESS** at exact code/test HEAD `603d293f4eee1fbd6d13dc195a4e55b7e6f71479`.

| Suite / gate | Result |
|---|---:|
| Independent-host client | 32/32 |
| P59-003 current-task / AI executor guard | 20/20 |
| Constrained publisher and owner-environment gate | 42/42 |
| Sanitized summary schema | 22/22 |
| Immutable workflow/artifact provenance | 26/26 |
| Cloudflare Workers runtime | 83/83 |
| Isolated Phase59.63 Workerd integration | 1/1 |
| Workflow YAML files | 5/5 |
| npm lockfile | 165 packages verified |
| Lifecycle-script-disabled exact install | PASS |
| Final workflow steps | 15/15 SUCCESS |

Total deterministic Python unit tests: **142/142**.  
Total Workers/Workerd tests: **84/84**.  
No live external provider request was made by the test suites.

## 6. Real artifact readback evidence

Two GitHub artifacts were independently downloaded read-only and compared byte-for-byte with the GitHub API's artifact digest and size. These readbacks validate that the API digest corresponds to the actual ZIP bytes; they do not constitute a live publisher run.

### Current master Worker #588 (legacy pre-Phase59.69 artifact naming)

- Run ID: `45276398411`; run attempt: 1
- Workflow ID: `415454534`
- Artifact ID: `14867217432`
- Historical name: `mission-autonomous-worker-45276398411`
- Size: `1900` bytes
- GitHub digest and downloaded ZIP SHA-256: `d019c66456f1394ae7eaa382b6ab3d8aedf8e1110af1ef70ebd9ba251c6c906b`
- Exact three expected report files present.
- `ai_worker_report.json` says `WAITING_FOR_OWNER_CONFIGURATION`; `MISSION_AI_ENABLED` is not true and no inference request was made.

This old artifact name intentionally does not satisfy the new attempt-bound name contract. The new publisher will not accept it.

### Candidate Worker #599 (attempt-bound artifact name)

- Run ID: `45320801123`; run attempt: 1
- Workflow ID: `415454534`
- Candidate branch: `phase59-69-artifact-provenance`
- Candidate head: `2a9f2ed87294cfbe8363d3e721818365682f0ae6`
- Artifact ID: `14887411312`
- Name: `mission-autonomous-worker-45320801123-attempt-1`
- Size: `1936` bytes
- GitHub digest and downloaded ZIP SHA-256: `903600cc177fd0f41cb22c40448b6bdde25f73ff3e0b1d37d2829771b50266be`
- Exact three expected report files present.

This candidate run is intentionally ineligible for publisher acceptance because its head branch is not `master`. It proves the worker workflow emits the new attempt-bound name, not that the publisher accepted or published anything.

### Latest candidate Worker #601 (post-queue/state reconciliation)

- Run ID: `45321415382`; run attempt: 1
- Candidate branch: `phase59-69-artifact-provenance`
- Candidate head at execution: `2a6d1d9e4769cfbe8363d3e721818365682f0ae6`
- Queue result: `POLL_OK`; selected task: `P59-003`
- AI executor: `WAITING_FOR_OWNER_CONFIGURATION`; no inference request.
- Guard preflight: 111 checks, zero errors.
- Artifact ID: `14888305665`
- Name: `mission-autonomous-worker-45321415382-attempt-1`
- Size: `1927` bytes
- GitHub digest and downloaded ZIP SHA-256: `d83845f6bf8580e430765f1351547c1ab6dab497eb185bc9006bbd8539081d41`
- Exact three expected report files present.

This newer candidate run is also intentionally ineligible for publisher acceptance because it ran on a feature branch, not `master`. It proves current worker selection, AI-disabled behavior and attempt-bound artifact production; no publisher job consumed it.

## 7. Failure and correction audit

Intermediate failures were retained and corrected:

- Run #524: publisher tests still called the planner without the newly required artifact attestation fixture. Updated fixtures and explicit missing-attestation rejection tests.
- Run #526: ZIP member mode validation rejected regular files whose ZIP mode omitted explicit file-type bits. Changed the check to inspect `stat.S_IFMT`, allowing mode 0 or a regular file while continuing to reject symlinks/directories.
- Run #531: publisher fixtures still used the old run-only artifact name after attempt binding. Updated fixtures and schema/test contracts to include the run attempt.
- Run #535: a stale run-only name check remained after selecting the exact attempt artifact. Removed the stale check; the final validator now checks expiry after exact-name selection.
- Runs #525, #527, #529, #532, #533, #534, #536 were superseded/cancelled during rapid commit sequencing and are not counted as test failures.
- Run #537 passed at the preceding code head; final run #538 includes the additional explicit prior-attempt rejection test and is the acceptance run.

## 8. GitHub state and owner gates

- Master HEAD remains `8856bf908f93e265cefd5c739f7f46b3dd995b3c`; no master write or merge.
- Candidate branch: `phase59-69-artifact-provenance`.
- Parent PR #54 remains draft/open/unmerged.
- Phase59.69 PR #55 is open, draft, mergeable, and unmerged; base is `phase59-68-publisher-branch-integrity`, head is `14b1fcbca35885c817d27f990b6d4624e5231897`, 30 commits / 16 changed files. [PR #55](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/pull/55). PR-triggered exact-head CI [run #539](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45321506379) also completed SUCCESS at that PR head.
- GitHub App is not installed; no App token minted.
- Cloudflare Workers Free plan and account-wide aggregate usage remain owner-unverified.
- Publisher environment required reviewers and owner attestation remain unconfigured.
- Branch protection remains unverified because the API integration returned HTTP 403; verify in the GitHub owner UI.
- Physical six-independent-workflow-run proof has not started.
- Seven-day and thirty-day soak have not started.

## 9. Mission and financial invariants

- P59-003 remains the sole active P0.
- P59-001 remains PAUSED.
- P59-002 remains BLOCKED.
- Other project cells remain isolated/read-only.
- AI inference remains DISABLED.
- Provider calls: 0.
- Authorized spend: ₹0.
- Verified realized net receipts: ₹0.
- Revenue ledger unchanged.
- No KYC, legal acceptance, public release, billing, payment, wallet signing, private-key access, or money movement.

## 10. Next engineering step

**Phase59.70 — publisher event/replay and no-token end-to-end dry-run contract.**

Build a fully offline end-to-end workflow fixture using the exact source event, run/attempt-bound artifact attestation, and sanitized summary. Prove that a normal `WAITING_FOR_OWNER_CONFIGURATION` worker artifact is a no-op before any publisher API call or App-token mint; duplicate workflow-run delivery is idempotent; a stale attempt, expired artifact, wrong workflow ID, wrong branch, altered digest, or modified summary is rejected before any write.

Physical six-run proof remains owner-gated until the sequential PR stack, master control-plane reconciliation, branch protection, required-reviewer environment, existing Workers Free account/aggregate usage, and isolated namespace are owner-verified.
