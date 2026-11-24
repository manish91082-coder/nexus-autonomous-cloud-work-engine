# Phase59.70 — Offline Publisher Event Replay and No-Token Dry-Run

**Date:** 2026-11-24  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Master HEAD:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c` (unchanged)  
**Candidate branch:** `phase59-70-offline-publisher-dry-run`  
**Exact tested code+test HEAD:** `70f876788e125ba7cc4a5032f571d2bd848da9d9` (subsequent evidence/control commits are documentation-only; current evidence branch head is recorded in `PROJECT_CONTINUITY.md`).  
**Parent branch:** `phase59-69-artifact-provenance` at `816b42f2ae1a99182fe8f6c97ef7ceab8f261d39`  
**Draft PR:** [#56](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/pull/56), open/unmerged, mergeable, stacked on PR #55.  
**Exact-head CI:** [Phase59.35 run #45324208218 — SUCCESS](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45324208218).

## 1. Decision

Phase59.70 is **ACCEPTED for offline code, workflow-contract and exact-head CI**. It is not production or physical multi-host acceptance.

The phase closes three gaps in the constrained publisher path:

1. Recheck artifact-attestation time validity at the moment the publisher consumes the attestation.
2. Bind the actual consumed `ai_worker_report.json` bytes and size to the per-file digest manifest verified during artifact extraction.
3. Ensure a non-publishable worker event does not enter the owner-review environment or mint a GitHub App token.

The publisher remains draft-PR-only. No merge, release, deployment, public product publication, payment or money movement path was added.

## 2. Implementation

### 2.1 Artifact freshness and byte binding

- `validate_artifact_attestation(..., now=None)` now requires a timezone-aware UTC verification clock.
- The attestation is rejected when its creation time is in the future, its expiry is at or before the verification time, or its lifetime is invalid.
- `build_publish_plan` compares the exact bytes and byte count of the consumed worker report with the `ai_worker_report.json` entry in the verified artifact manifest.
- A report changed after artifact verification fails closed before summary planning and before any publisher API call.

### 2.2 Pure plan validation and bounded hand-off

- Extracted `validate_publish_plan`, a pure deterministic validator that makes no network request and reads no publisher token.
- Added `validate-plan` and `publish-plan` CLI commands.
- The prepare job emits only a bounded base64-encoded sanitized summary plan through the GitHub Actions job output.
- Maximum serialized plan size: 131,072 bytes.
- The raw model text is not part of the summary plan; only the existing unverified-output fingerprint and byte count cross the publisher boundary.
- The publish command validates the plan before reading the scoped token and revalidates before API writes.

### 2.3 Read-only prepare job separated from owner-gated publisher

The publisher workflow is now split into two jobs:

**`prepare-draft`**
- Runs after a successful canonical master worker run.
- Uses only `actions:read` and `contents:read`.
- Verifies the exact source workflow run and attempt-bound artifact using the read-only GitHub token.
- Produces `publishable=false` for `WAITING_FOR_OWNER_CONFIGURATION` or another non-publishable state.
- Emits no plan output for a no-op.
- Has no GitHub Environment and no App-token action.

**`publish-draft`**
- Runs only when `needs.prepare-draft.outputs.publishable == 'true'`.
- This is the only job attached to the `p10cr-publisher` required-reviewer environment.
- Revalidates the sanitized plan before the owner configuration check and App-token step.
- Mints the single-repository, narrowly scoped GitHub App token only when plan validation and owner configuration both pass.
- Creates or reuses only the deterministic draft PR.

Consequently, a `WAITING_FOR_OWNER_CONFIGURATION` event skips the publish job entirely. It does not wait for publisher environment approval and does not mint an App token.

The prepare job still performs read-only source-run/artifact GETs and artifact download for provenance verification. “No publisher API call” here means no write-capable constrained-publisher API call; no-op does not bypass read-only provenance verification.

## 3. Offline end-to-end evidence

The exact-head test suite verifies:

| Scenario | Expected behaviour | Result |
|---|---|---|
| `WAITING_FOR_OWNER_CONFIGURATION` | No plan output, no token read, no publisher API client | PASS |
| WAITING validation output | `publishable=false`; stale plan removed; no `plan_b64` | PASS |
| Valid sanitized plan hand-off | Bounded plan output; no raw model text | PASS |
| Valid plan preflight | Validates without reading/minting a token or making an API call | PASS |
| Duplicate workflow-run event delivery | Same deterministic plan/branch; one draft PR; no second branch/file/PR write | PASS |
| Wrong immutable workflow ID | Reject before token/API | PASS |
| Wrong run attempt | Reject before token/API | PASS |
| Wrong source branch | Reject before token/API | PASS |
| Expired artifact attestation | Reject before token/API | PASS |
| Altered archive digest | Reject before token/API | PASS |
| Worker report mutated after attestation | File-manifest mismatch; reject before API | PASS |
| Tampered sanitized summary plan | Reject before token/API | PASS |
| Workflow owner gate | Environment exists only on conditional publish job | PASS |
| App-token ordering | Plan validation and owner configuration precede token mint | PASS |

Duplicate-event replay uses an in-memory fake GitHub API. It proves deterministic idempotency of the publisher state machine without making a live GitHub write.

## 4. Exact-head CI

[Run #45324208218](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45324208218) completed SUCCESS on `70f876788e125ba7cc4a5032f571d2bd848da9d9`.

| Suite / check | Result |
|---|---:|
| Independent-host client offline tests | 32/32 |
| P59-003 current-task / AI guard | 20/20 |
| Constrained publisher and event/replay/no-token dry-run | 53/53 |
| Published summary schema | 22/22 |
| Immutable workflow/artifact provenance | 26/26 |
| Cloudflare Workers runtime | 83/83 across 4 files |
| Phase59.63 Workerd cross-run integration | 1/1 |
| Workflow YAML syntax | 5/5 |
| npm lockfile | 165 package entries, integrity PASS |
| Exact dependency install | `npm ci --ignore-scripts --no-audit --no-fund` PASS |
| Final workflow steps | 15/15 SUCCESS |

Runtime pins: Node `22.16.0`, npm `11.6.3`. Install lifecycle scripts remain disabled.

### Superseded CI history

- Run #45323587075 FAILED because the existing summary publisher boundary test still used a placeholder worker-report hash/size. The fixture was corrected to derive the report digest and byte count from the exact serialized report.
- Run #45323826471 then passed on the corrected fixture.
- Run #45324009281 passed after the two-job workflow split and 52 publisher tests.
- Run #45324094575 passed on the latest executable code head `5a2637561da42c68d891a60e7a3b53964a1d836b`.
- Final run #45324208218 passed on the final code/test head `70f876788e125ba7cc4a5032f571d2bd848da9d9`, including the valid-plan preflight test.
- Intermediate runs #45323990673, #45323955778, #45323926167, #45323890820 and #45324019602 were cancelled/superseded by newer commits; they are not counted as test failures.

## 5. Material commits

| Commit | Change |
|---|---|
| `ef2e358efc0e2ced7a1cad710e786cf3bdca4064` | Enforce current artifact-attestation expiry |
| `a0fe8f52ef840f5a7e3926ce20f5c9af0a1b13b6` | Bind consumed report bytes to verified file manifest |
| `1c4e0c932b0b5e8e4171d10e36fb59adc6a5f83f` | Add event replay and no-token dry-run tests |
| `a5a30329de9fc53120e5e7bc23cc8cdb685ccea7` | Add Phase59.70 runtime workflow branch trigger |
| `52837bef0545a9795939810d343edee6c8d40c5d` | Extract pure plan validation; add publish-plan CLI and bounded plan output |
| `cdc4c62b8cdb07d24a7466ff06e3626c2c3bc912` | Split read-only prepare and owner-gated publish jobs |
| `06e2ef2de96e99647a352468716198c317bbdb09` | Add pre-token validate-plan CLI |
| `9595db174eab2cdded4e70d3076a6846870c4564` | Test conditional environment and sanitized plan hand-off |
| `8b5303a4f6c59a798bc3cadebbf24f61ee8f84a0` | Align summary-schema test fixture with report file digest |
| `21a97c007992dbba946d2bdfbc2036af28e47339` | Correct workflow-gate assertions and raw-output exclusion test |
| `f9b4793d9407c8987330f739e4b29118452caad6` | Keep PR trigger scoped to parent base branch |
| `5a2637561da42c68d891a60e7a3b53964a1d836b` | Revalidate legacy publish plan before token read |
| `70f876788e125ba7cc4a5032f571d2bd848da9d9` | Test valid plan preflight without token |

All writes are on the candidate branch and are fetch-back verifiable. No master write or merge occurred.

## 6. Mission and safety state

- P59-003 remains the sole active P0.
- P59-001 remains PAUSED.
- P59-002 remains BLOCKED.
- No revenue-source/product research or unrelated project work was performed.
- AI inference remains DISABLED; specialist graph remains deterministic/shadow only.
- No GitHub App token was minted.
- No live publisher API write was made.
- No Cloudflare deployment or namespace configuration was performed.
- No KYC, legal acceptance, public product release, billing, payment, wallet signing or money movement occurred.
- Authorized spend: ₹0.
- Verified realized net receipts: ₹0.
- Revenue ledger unchanged.
- Other project repositories remain isolated/read-only.

## 7. Remaining gates

Phase59.70 does not prove physical multi-host atomicity. Still pending:

1. Owner review and sequential merge of the stacked PR chain #44 onward, with each child retargeted to master only after its parent is merged and verified.
2. Reconcile master mission state, queue, federation and continuity after the approved stack merge.
3. Verify branch protection and required reviewers in the owner UI; the existing API read limitation remains UNVERIFIED.
4. Verify the existing Cloudflare Workers Free account and aggregate usage; configure only the isolated test namespace after owner approval.
5. Install the least-privilege GitHub App only after owner approval and required-reviewer environment configuration.
6. Run six distinct hosted workflow runs (seed, four hosts, snapshot) against one shared test-only Durable Object namespace.
7. Verify eight settled reservations, zero residual reserved/uncertain capacity, two repository aliases, six distinct actual run IDs and a valid event chain.
8. Start the seven-day soak only after physical proof; start the thirty-day soak only after the seven-day acceptance.

## 8. Next engineering step

**Phase59.71 — offline publisher ambiguous-write recovery and replay-race injection.**

Test simulated lost acknowledgements after branch creation, Contents PUT and draft-PR creation; prove retry/readback reuses the same deterministic branch/file/PR and never duplicates a write. Add bounded retry and uncertain-outcome evidence. Keep live publishing disabled until the owner gates and physical proof are complete.
