# Phase 59.72 — Read-only Compute / Single Constrained Publisher Permission Regression

**Checkpoint date:** 2026-11-26  
**Implementation date:** 2026-11-26  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem  
**Task:** P59-003 — sole active P0  
**Branch:** `phase59-72-workflow-permission-regression`  
**Parent candidate:** `phase59-71-publisher-ambiguous-write-recovery`  
**Parent PR:** #57 (draft/open/unmerged)  
**Phase72 tested code head:** `99954b82bbeb34671bda95a8f086670609ee7955`  
**Master HEAD:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c` (unchanged)

## 1. Decision

**Phase59.72 ACCEPTED — exact-head bounded-worker CI passed.**

Added a standard-library-only regression contract that verifies the candidate compute worker remains read-only and that the constrained publisher is the only P10CR workflow allowed to mint the scoped Publisher App token. The regression is executed inside the bounded Mission Autonomous AI Worker before queue polling.

This is workflow/code/CI evidence. It does not prove that the candidate stack has been merged to master, that GitHub branch protection is configured, or that physical multi-host execution has passed.

## 2. Files changed

1. `tests/test_p10cr_workflow_permissions.py`
   - Adds 8 deterministic tests using only Python's standard library.
   - No package, network, secret or provider dependency was added.
   - Checks the worker and publisher YAML directly from the checked-out repository.
2. `.github/workflows/mission-autonomous-worker.yml`
   - Adds the new test and publisher workflow to the bounded worker's push path filter.
   - Runs the permission regression immediately after deterministic mission-state validation and before other worker tests or queue polling.

## 3. Enforced compute-worker boundary

The regression fails if any of the following regressions are introduced:

- Top-level worker token permissions differ from exactly `contents: read`, or any worker permission map includes a write/admin scope.
- Checkout changes from `persist-credentials: false`.
- A direct `git push`, `git commit` or `git tag` command appears in the compute workflow.
- The compute workflow receives an App-token action, Publisher App credentials, publisher approval marker, Actions secrets or Cloudflare API/account credentials.
- Any of the seven mission AI/provider/billing/quota/owner flags is missing or not explicitly false.

The test includes mutation cases proving detection of contents-write, persisted checkout credentials, publisher-token injection and direct Git push.

## 4. Enforced publisher boundary

The regression verifies:

- Workflow-level GITHUB_TOKEN permissions are exactly Actions:read and Contents:read.
- `prepare-draft` does not mint an App token and has no write-capable GITHUB_TOKEN permissions.
- `publish-draft` has read-only GITHUB_TOKEN permissions and is bound to the `p10cr-publisher` environment.
- Deterministic plan validation and explicit owner configuration are both required before token minting.
- The owner-configuration step occurs before the token action.
- The token action remains pinned to reviewed commit `64ab729a6294000f5aa4a4bc0b73d1f32bc45510`.
- Publisher App scope is limited to metadata:read, contents:write and pull-requests:write. Actions, Workflows, Administration, Secrets, Deployments and Packages write scopes are rejected.
- Across all workflow YAML files, only `p10cr-constrained-publisher.yml` may contain the Publisher App token action or Publisher App credential/attestation references.

Mutation tests prove detection of owner-gate removal and permission-scope escalation.

This is a deterministic workflow-source regression contract. It does not replace GitHub Environment reviewer configuration, repository rulesets or owner verification in GitHub Settings.

## 5. Exact CI evidence

Candidate exact-head bounded worker:

- Run: [#619 / 45746313748](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45746313748)
- Event: push
- Branch: `phase59-72-workflow-permission-regression`
- Exact head: `99954b82bbeb34671bda95a8f086670609ee7955`
- Result: **SUCCESS**
- Completed: 2026-11-26T03:02:30Z

Verified log results:

| Suite / control | Result |
|---|---:|
| Mission/control-plane guard | 111 checks, 0 errors |
| New compute/publisher permission regression | 8/8 |
| Swarm runtime and failure injection | 17/17 |
| Swarm coordinator | 7/7 |
| AI task/current-task safety | 20/20 |
| MSME product smoke suite | 3/3 |
| Recruitment assurance suite | 7/7 |
| Queue poll | POLL_OK; P59-003/P0 selected |
| AI executor | WAITING_FOR_OWNER_CONFIGURATION |
| AI inference requests | 0 |

The candidate workflow has no productive commit/push step and uses checkout with persisted credentials disabled.

## 6. Failure and correction history

- Initial run [#618 / 45746259365](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45746259365) FAILED in a mutation test, not in the workflow boundary itself.
- The test intended to remove the owner approval predicate but its mutation string used Python-style `and`; the actual YAML expression uses `&&`. Consequently, the mutation did not change the source and the detector correctly remained green.
- Corrected the mutation to remove the exact `owner_gate.outputs.configured == 'true'` predicate.
- Correction commit: `99954b82bbeb34671bda95a8f086670609ee7955`.
- Exact-head rerun #619 passed all 8 boundary tests and all other bounded-worker steps.
- The failed run remains part of the evidence history and is not reclassified as a pass.

## 7. Live master and parent-candidate status

- Master HEAD remains `8856bf908f93e265cefd5c739f7f46b3dd995b3c`.
- Master Worker #617 / run [45742739967](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45742739967) completed SUCCESS on exact master HEAD; log reports POLL_OK, P59-003 selected, AI executor WAITING_FOR_OWNER_CONFIGURATION and no inference request.
- Master Continuity Guard #428 / run [45606993264](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45606993264) completed SUCCESS on the same master HEAD; 111 checks, zero errors.
- PR #57 remains draft/open/unmerged. Its exact final candidate runtime run #578 / [45537622886](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45537622886) completed SUCCESS on `30abe577bf3742d7200d118207d9edf955025b86`.
- The Phase59.72 branch is a child of PR #57's head and is not merged to master.

**Critical master/candidate gap remains:** master still has the historical mission-worker `contents: write` permission and direct productive report/quota-state commit step. The read-only compute/publisher split and this Phase59.72 regression exist only on the unmerged candidate stack. The master worker run did not perform a productive write because inference was disabled; this does not remove the broad permission.

## 8. Mission, security and financial invariants

- P59-003: sole active P0 / IN_PROGRESS.
- P59-001: PAUSED.
- P59-002: BLOCKED.
- AI inference: disabled; provider not configured.
- Publisher App token minted: false.
- Live publisher API writes: 0.
- Cloudflare deployment: false.
- Other project repositories: unchanged and read-only.
- KYC, legal acceptance, billing, public release, payment, signing and money movement: none.
- Authorized spend: ₹0.
- Verified realized net receipts / PCNE: ₹0.
- Revenue ledger unchanged.

## 9. Remaining gates

1. Keep PR #58 draft and unmerged; review it as a child of PR #57.
2. Sequential owner review/merge of the full stacked PR chain, retargeting each child only after its parent is merged and exact diff/CI is revalidated.
3. Reconcile master mission state, queue, federation registry and continuity after the stack is merged.
4. Verify repository rulesets, branch protection, required CI and required human reviewer in the owner UI; API visibility is insufficient.
5. Review/disable or explicitly retain the two legacy branch-scoped write workflows: `federation-lock-store.yml` and `phase59-25-cloud-operational-soak.yml`.
6. Complete owner-gated account-wide zero-billing/usage verification and test-only namespace setup.
7. Perform the six independent workflow-run proof, physical multi-host contention/crash/replay tests, then 7-day and 30-day soak.

## 10. Next engineering step

**Phase59.73 — sequential PR stack and master-control reconciliation preflight.**

Prepare a machine-verifiable stack manifest for PRs #44 onward: exact parent/child branch, base SHA, head SHA, changed-file allowlist, required CI evidence and post-merge readback. No automatic merge. Then prove that the owner merge sequence cannot skip a parent or retarget a child against an unverified base. Keep live six-run proof owner-gated until the complete stack and owner prerequisites are satisfied.


## 11. Final candidate PR and post-checkpoint verification

- Draft PR #58 is open, mergeable and unmerged; base `phase59-71-publisher-ambiguous-write-recovery` at `30abe577bf3742d7200d118207d9edf955025b86`; head `phase59-72-workflow-permission-regression` at final evidence/control head `5ec9afd3ff2da49e8488089dcecabd418f8158e0`.
- PR #58 is a child of PR #57. PR #57 remains open, draft and unmerged. Neither PR was marked ready or merged.
- Post-checkpoint candidate Worker #621 / [run 45746603025](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45746603025) completed SUCCESS on control checkpoint `2076dfd1bd3dc2ea0f069bba779fd8ec581d01a5`; mission guard 111/111 with zero errors, queue poll POLL_OK selected P59-003, AI executor WAITING_FOR_OWNER_CONFIGURATION, zero inference.
- Final evidence-branch Continuity Guard #431 / [run 45746675602](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45746675602) completed SUCCESS on final evidence/control head `5ec9afd3ff2da49e8488089dcecabd418f8158e0`; 111 checks, zero errors.
- The exact code/test head remains `99954b82bbeb34671bda95a8f086670609ee7955` and its dedicated permission-regression run #619 remains the acceptance run for the 8 new tests. Later commits only record report/control/continuity evidence.
- Master remains `8856bf908f93e265cefd5c739f7f46b3dd995b3c`. Candidate-only permission hardening is not yet active on master.
