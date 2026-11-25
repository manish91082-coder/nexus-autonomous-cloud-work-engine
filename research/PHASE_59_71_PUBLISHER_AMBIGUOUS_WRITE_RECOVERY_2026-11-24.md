# Phase 59.71 — Bounded Publisher Ambiguous-Write Recovery and Replay-Race Proof

**Checkpoint date:** 2026-11-25  
**Implementation date:** 2026-11-24  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem (P10CR)  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Canonical master HEAD:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c` (unchanged)  
**Candidate branch:** `phase59-71-publisher-ambiguous-write-recovery`  
**Parent candidate:** `phase59-70-offline-publisher-dry-run` at `2c6524dafbbe78888fd0a074c08b44ac35e24cd0`  
**Tested code head:** `686c4926db7bda702ba56713cd6c82b0211cb590`  
**Exact-head CI:** [Run #45325920285 — SUCCESS](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45325920285)  
**Draft PR:** to be created as a child of PR #56; no merge or production activation is authorized.

## 1. Decision

Phase59.71 is **ACCEPTED for deterministic offline publisher recovery, replay-race and exact-head CI**. It is not live publisher acceptance, production deployment, independent physical-host proof or revenue evidence.

The phase closes the acknowledgement-loss window around the constrained publisher's three deterministic GitHub write operations:

1. Create the per-run draft branch.
2. Write the sanitized summary file.
3. Create the draft pull request.

A timeout or lost response can occur after GitHub has committed a write but before the publisher receives its acknowledgement. Blindly repeating the write would be unsafe. The new wrapper restarts the publisher state machine from read-only GitHub readbacks and verifies the existing branch, exact diff, summary bytes and draft PR before deciding whether another bounded attempt is appropriate.

## 2. Implementation

File: `scripts/constrained_publisher.py`

Added:

- `MAX_PUBLISH_ATTEMPTS = 2`.
- Retryable ambiguous/transient statuses: 408, 409, 500, 502, 503, 504 and the internal transport sentinel 599.
- `publish_plan_with_recovery(plan, api, max_attempts=2)`.
- Hard validation of the publish plan before entering the retry loop.
- A strict attempt bound: caller-supplied values must be integers from 1 to 3; booleans and unbounded values are rejected.
- The CLI's `publish-plan` command now uses the recovery wrapper.

Each retry re-enters `publish_plan`, which re-reads the current master SHA, deterministic branch ref, branch/master comparison, exact summary file and matching open draft PR. It does not blindly replay the previous POST/PUT. Unexpected branch ancestry, extra commits/files, changed summary bytes, mismatched PR refs or non-draft PRs remain fail-closed.

The recovery is bounded and immediate; no unbounded retry loop, automatic merge, release, deployment or public product publication was added. Provider calls, inference and payment operations are outside this publisher.

## 3. Exact-head test evidence

The final run #45325920285 passed the complete Phase59.35 regression workflow on the exact tested code head `686c4926db7bda702ba56713cd6c82b0211cb590`.

| Suite / check | Result |
|---|---:|
| Independent-host client offline tests | 32/32 |
| P59-003 current-task / AI safety tests | 20/20 |
| Constrained publisher tests | 57/57 |
| Published summary schema | 22/22 |
| Immutable artifact provenance | 26/26 |
| Cloudflare Workers/workerd runtime | 83/83 across 4 files |
| Phase59.63 isolated Workerd integration | 1/1 |
| Workflow YAML syntax | 5/5 |
| npm lockfile | 165 package entries, integrity PASS |
| Exact dependency installation | PASS with lifecycle scripts disabled |
| Final workflow job | SUCCESS |

The publisher suite includes:

- Lost acknowledgement after branch creation; readback reuses the committed branch.
- Lost acknowledgement after sanitized contents PUT; readback verifies the exact committed bytes and one-file diff.
- Lost acknowledgement after draft PR creation; readback finds and validates the existing draft PR.
- Concurrent duplicate delivery where one request wins the contents write and the other observes a conflict/stale compare snapshot; exactly one draft PR is created, the losing path fails closed or is reconciled, and a later replay returns the existing draft.

The final log explicitly records all four recovery/concurrency tests as `ok` and `Ran 57 tests ... OK`.

## 4. Failure and correction history

- Run [#45325645593](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45325645593) FAILED in the concurrent duplicate-delivery test. The first test contract treated only an HTTP 409 as the losing outcome, while the implementation could correctly reject the stale one-commit comparison as a `PublisherError`.
- Commit `5642be01358c51dba1c5d9b2a978b9bc70a14e64` corrected the concurrency assertion to accept either the explicit HTTP conflict or the fail-closed stale-diff result, while still requiring exactly one successful draft PR and successful later readback.
- Run #45325782583 was cancelled/superseded by a newer push; it is not counted as a test failure.
- Final run [#45325920285](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45325920285) passed 57/57 publisher tests and all other regression steps.

The failure was retained in the evidence history; it is not hidden or reclassified as a pass.

## 5. Current compute/publisher boundary observed on the candidate

The candidate branch's `.github/workflows/mission-autonomous-worker.yml` currently has:

- Workflow permission `contents: read`.
- Checkout `persist-credentials: false`.
- No direct Git commit or push step.
- No publisher App token action or publisher token.
- AI flags statically false, including provider terms, model/data terms, zero-billing, global quota and owner approval.
- No Cloudflare account ID, API token or model secret passed to the compute job.
- Machine-readable worker reports uploaded as an attempt-bound artifact.

The candidate `.github/workflows/p10cr-constrained-publisher.yml` keeps read-only prepare and a conditional owner-environment-gated publish job. The scoped App token is minted only after plan validation and owner configuration; its permissions are limited to metadata read, contents write and pull-request write for this one repository. Its code path creates/reuses draft PRs only.

**Important master/candidate difference:** master HEAD `8856bf90` still contains the older mission-worker workflow with `contents: write` and a direct report/quota-state commit step. The read-only compute workflow is present on the unmerged candidate stack only. Until the sequential PR stack is reviewed, merged and fetched back to master, the master workflow is not yet protected by this candidate change. The latest master Worker run did not make a productive commit because AI execution was disabled, but the permission remains broad on master.

Two legacy branch-scoped writers remain separate owner-review items: `federation-lock-store.yml` and `phase59-25-cloud-operational-soak.yml`. They are not activated by this phase.

## 6. Live control-plane evidence

- Master Mission Worker [#45525144002](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45525144002), run #612, completed SUCCESS on master SHA `8856bf908f93e265cefd5c739f7f46b3dd995b3c`. Its log reports `POLL_OK`, selected `P59-003`, and `WAITING_FOR_OWNER_CONFIGURATION`; no inference request was made.
- Master Continuity Guard [#45398270050](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45398270050), run #424, completed SUCCESS on the same master SHA; log reports 111 checks and an empty error list.
- Candidate Phase59.71 runtime [#45325920285](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45325920285), push event on `phase59-71-publisher-ambiguous-write-recovery`, completed SUCCESS on `686c4926...`.

The current master `mission_state.json` and `automation_queue.json` still carry the 2026-11-16 Phase59.53 checkpoint. Candidate control files were last reconciled at Phase59.70 on 2026-11-24. This report and the next control checkpoint update the candidate branch; they do not mutate master.

## 7. Mission, safety and financial truth

- P59-003: sole active P0.
- P59-001: PAUSED.
- P59-002: BLOCKED.
- Other project repositories: unchanged and read-only.
- AI inference: DISABLED.
- Live provider calls: 0.
- Live publisher write API calls: 0.
- GitHub App token minted: false.
- Cloudflare deployment: false.
- Public release, KYC, legal acceptance, billing, payment, signing and money movement: none.
- Authorized spend: ₹0.
- Verified realized net receipts / PCNE: ₹0.

CI success is engineering evidence only, not buyer demand or revenue.

## 8. Remaining acceptance gates

1. Sequential owner review/merge of the stacked PRs, with each child retargeted only after its parent is merged and its exact diff/CI is revalidated.
2. Reconcile the master mission state, queue, federation registry and continuity after the stack is merged.
3. Verify GitHub branch protection and required-reviewer environment in the owner UI; API access remains insufficient to assert protection.
4. Verify the existing Cloudflare Workers Free account and aggregate account usage; deploy no test namespace until the owner confirms zero-billing headroom.
5. Complete the six distinct workflow-run proof against one shared test-only Durable Object namespace and two synthetic repository aliases.
6. Prove physical independent-host atomicity and then complete bounded 7-day and 30-day soak.

## 9. Next engineering step — Phase59.72

Add an exact-head regression contract for the candidate's read-only compute / constrained-publisher separation. The test must fail if the mission worker regains `contents: write`, checkout credential persistence, a direct Git push/commit, publisher App credentials, or provider secrets; it must also prove that only the conditional `p10cr-publisher` job holds the scoped write-capable App-token action. Then run the exact-head CI. Keep the live six-run proof owner-gated until the sequential stack is on master and account prerequisites are verified.
