# Phase59.65 — Owner-Directed Current-Task Dispatch Guard

**Date:** 2026-11-23  
**Mission:** P59-003, sole active P0  
**Canonical master HEAD:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c` (unchanged)  
**Parent candidate:** PR #50, `phase59-64-host-slot-run-identity-binding`, head `03fd68473cf42afdcae4938803ad22e3b7b99486`  
**Candidate branch:** `phase59-65-current-task-dispatch-guard`  
**PR:** #51, draft/open/unmerged, stacked on PR #50  
**Exact tested PR head:** `d970f0eb588f71b2590bb6565cbc798b79308a4d`  
**Exact-head CI:** PASS — [Phase59.35 run #45109541094](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45109541094)  
**Spend:** ₹0  
**AI inference:** DISABLED  
**Verified realized net receipts:** ₹0

## 1. Finding

A source-level review found the same scope-drift defect in both `scripts/worker_tick.py` and `scripts/ai_task_executor.py`. Each previously scanned all READY/IN_PROGRESS queue records, filtered by owner gate and dependencies, then selected the first item by priority and task ID.

Neither selector required agreement among all three authoritative current-task fields:

- `mission_state.current_task`
- `automation_queue.current_task`
- `automation_queue.queue_policy.current_task`

Nor did the generic selection enforce P59-001 PAUSED and P59-002 BLOCKED. An unrelated READY P0 record could therefore be selected while P59-003 remained the sole active P0. The bootstrap worker only polls/reports, but its selection could misrepresent the active task; the future inference executor could waste quota or drift into unrelated work.

This was a latent safety defect, not an observed provider call. It was not exploitable in the current configuration because AI inference is disabled, the approval manifest is DISABLED, and both provider/quota adapters are hard-coded false.

## 2. Correction

Added shared module `scripts/current_task_guard.py` and wired both the bootstrap worker and future AI executor to the same `select_current_task(queue, mission)` function. Generic priority scanning was removed from both paths.

The selector fails closed unless:

1. Mission status is ACTIVE.
2. Root queue current task, nested queue-policy current task and mission current task all equal P59-003.
3. Exactly one record exists for each of P59-003, P59-001 and P59-002.
4. P59-001 is PAUSED and P59-002 is BLOCKED.
5. P59-003 is priority P0, READY or IN_PROGRESS, and has `owner_gate: false`.
6. Every P59-003 dependency exists exactly once and is COMPLETED.
7. All task records are well-formed.

The selector never searches for a substitute task. A mismatch returns a deterministic no-task result before a provider request. The bootstrap poller records the selection reason and treats authority/state-integrity mismatches as errors.

The Mission Worker push-path filter now includes the shared guard module so future edits to this safety boundary trigger the worker workflow. Phase59.35 CI installs Python 3.12 and runs both the AI/task-guard and constrained-publisher test files.

## 3. Tests

Added 15 deterministic tests in `tests/test_ai_task_executor.py` (20 test methods total including the five pre-existing tests) and one publisher workflow-gate test in `tests/test_constrained_publisher.py` (24 test methods total).

- P59-003 wins even when an unrelated READY P0 task is present.
- Root queue mismatch.
- Nested queue-policy mismatch.
- Mission current-task mismatch.
- Non-ACTIVE mission.
- P59-001 not PAUSED.
- P59-002 not BLOCKED.
- Duplicate or missing P59-003 record.
- Owner-gated P59-003.
- Wrong priority.
- Non-executable status.
- Incomplete dependency.
- Malformed task record.
- Bootstrap worker imports and calls the same shared guard.
- Bootstrap worker no longer contains generic priority sorting.

The isolated subprocess fixture now copies the shared guard module alongside the AI executor, so the disabled-by-default and adapter fail-closed subprocess tests exercise the refactored import path. No test enables a real provider call. Earlier PR run #45108874419 completed successfully on superseded head `24e34d33b5c37a5e4fa8e0db2a16a7f31ef021e9`; it does not cover the shared-guard refactor and is not final acceptance. Run #45109105198 was superseded by later code/workflow changes. Latest run #45109292533 is pending.

## 4. Read-only compute / constrained publisher boundary audit

Read the candidate source and workflow files for:

- `.github/workflows/mission-autonomous-worker.yml`
- `.github/workflows/p10cr-constrained-publisher.yml`
- `scripts/constrained_publisher.py`
- `scripts/ai_task_executor.py`
- `scripts/worker_tick.py`

Observed controls:

- Compute workflow has `contents: read`, checkout credential persistence disabled, no git commit/push step and no provider secrets passed to the AI executor.
- AI executor has `GLOBAL_QUOTA_ADAPTER_READY = False` and `PROVIDER_GATEWAY_ADAPTER_READY = False`; inference is not activated.
- Publisher first uses read-only GITHUB_TOKEN for source artifact retrieval and validation.
- A one-repository GitHub App token is only minted after a publishable artifact passes deterministic validation and owner secrets are configured.
- Publisher writes only the deterministic `automation/p10cr/worker-run-*` branch and `research/worker-drafts/ai-run-*.json` path, containing a sanitized metadata/hash summary, then creates a draft PR.
- Publisher code has no merge, release, deployment, delete or force-push call.



### Publisher owner-approval hardening

The publisher job previously had no job-level GitHub Environment. A missing environment can be auto-created without protection rules. Added:

- Job-level `environment: p10cr-publisher`.
- Required environment secret `P10CR_PUBLISHER_ENV_APPROVED` with exact attestation value `P59-003-PUBLISHER-OWNER-APPROVED`.
- App token minting now requires both App credentials and the exact environment attestation after artifact validation.
- Static regression test for the environment declaration and marker.
- Owner packet requires the environment be pre-created, required reviewer(s), prevent self-review, master-only deployment branch, no bypass where supported, and App credentials/marker stored as environment secrets only.

This is a code-level gate, not proof that the owner has configured the environment. No marker or App credential was created.

Residual owner gates:

- GitHub App PR-write permission is technically powerful; required-reviewer/ruleset enforcement is not verified.
- `.github/workflows/phase59-25-cloud-operational-soak.yml` retains branch-scoped Contents:write for its disposable test-state branch.
- `.github/workflows/federation-lock-store.yml` retains job-scoped Contents:write on the separate federation-locks branch.
- Neither legacy writer was invoked. Owner must review/disable or explicitly retain them with verified branch protections before production.

## 5. Prior synthetic swarm evidence retained

Phase59.64C remains accepted only for synthetic Workerd race proof:

- Code/test head: `9868b642a57caa697dd60f740d3664bcdab50087`.
- PR CI #45107642156: 32/32 offline, YAML PASS, 165-package lockfile, Workers 83/83, Workerd 1/1.
- Concurrent host-slot and snapshot-run claims each had one durable winner.
- Final synthetic snapshot: 8 settled, 0 reserved, 0 uncertain, 6 workflow-run IDs, 2 synthetic repositories, valid event chain.

This does not prove physical multi-host execution.

## 6. Safety and owner gates

- No Cloudflare deployment or live endpoint request.
- No GitHub App creation/installation, key generation or secret access.
- No AI inference, external provider call or generated-code execution.
- No KYC, legal acceptance, public release, billing, payment, signing or money movement.
- Other project repositories remain untouched/read-only.
- P59-003 remains sole active P0; P59-001 PAUSED; P59-002 BLOCKED.
- Authorized spend ₹0; verified realized net receipts ₹0.

## 7. Exact-head CI result

[Phase59.35 run #45109541094](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45109541094) completed SUCCESS on PR head `d970f0eb588f71b2590bb6565cbc798b79308a4d`. Results: 32/32 offline host-client tests; YAML PASS; lockfile integrity PASS (165 packages); Python AI/current-task suite 20/20; constrained-publisher suite 24/24; Workers runtime 83/83 across four files; isolated Workerd integration 1/1. All 13 job steps completed successfully. The earlier Phase59.65A run #45109349269 also passed 20/20 AI/task-guard tests and the runtime suite before the publisher environment-gate addition.

## 8. Next

Continue P59-003 with the next safe engineering task, Phase59.66 publisher API route/redirect hardening, while Phase59.64D remains owner-gated. Do not start the six-run live test until its owner gates are satisfied: sequential review/merge of PRs #44–#50, master control-plane reconciliation, branch-protection verification, legacy writer review, existing Workers Free plan and aggregate-usage verification, owner-created test-only namespaces and required-reviewer environment. Then execute six distinct workflow runs. Start 7-day soak only after the exact six-run snapshot passes; 30-day soak follows 7-day acceptance.
