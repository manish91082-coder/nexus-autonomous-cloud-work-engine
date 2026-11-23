# Phase59.65 — Owner-Directed Current-Task Dispatch Guard

**Date:** 2026-11-23  
**Mission:** P59-003, sole active P0  
**Canonical master HEAD:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c` (unchanged)  
**Parent candidate:** PR #50, `phase59-64-host-slot-run-identity-binding`, head `03fd68473cf42afdcae4938803ad22e3b7b99486`  
**Candidate branch:** `phase59-65-current-task-dispatch-guard`  
**Code commit:** `48af1d5c07b3fc5190cd5ae535861b5c43c49737`  
**Test commit:** `ccaa47b8e51e84fda86d4c21feba2e17ec8e8b03`  
**Status:** IMPLEMENTED; exact-head CI pending at report creation  
**Spend:** ₹0  
**AI inference:** DISABLED  
**Verified realized net receipts:** ₹0

## 1. Finding

A source-level review of `scripts/ai_task_executor.py` found that its future inference task selector scanned every queue record in READY/IN_PROGRESS state, filtered by owner gate and dependencies, then selected the first item by priority and task ID.

That selector did not bind selection to all three authoritative current-task fields:

- `mission_state.current_task`
- `automation_queue.current_task`
- `automation_queue.queue_policy.current_task`

It also did not enforce the current mission invariants that P59-001 remains PAUSED and P59-002 remains BLOCKED. An unrelated READY P0 record could therefore be selected if one appeared in the queue. The publisher would later reject non-P59-003 output, but inference could still be wasted and task-scope drift could occur.

This is a latent safety defect, not an observed provider call. It was not exploitable in the current configuration because inference is disabled, the approval manifest is DISABLED, and both provider/quota adapters are hard-coded false.

## 2. Correction

Added `select_current_task(queue, mission)` and removed generic priority scanning.

The selector fails closed unless:

1. Mission status is ACTIVE.
2. Root queue current task, nested queue-policy current task and mission current task all equal P59-003.
3. Exactly one record exists for each of P59-003, P59-001 and P59-002.
4. P59-001 is PAUSED and P59-002 is BLOCKED.
5. P59-003 is priority P0, READY or IN_PROGRESS, and has `owner_gate: false`.
6. Every P59-003 dependency exists exactly once and is COMPLETED.
7. Task records are well-formed.

The selector never searches for a substitute task. Any mismatch returns a deterministic no-task result before a provider request.

## 3. Tests added

Added 14 direct selector tests covering:

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

The existing AI safety tests remain in place. No test enables a real provider call.

## 4. Read-only compute / constrained publisher boundary audit

Read the candidate source and workflow files for:

- `.github/workflows/mission-autonomous-worker.yml`
- `.github/workflows/p10cr-constrained-publisher.yml`
- `scripts/constrained_publisher.py`
- `scripts/ai_task_executor.py`

Observed controls:

- Compute workflow has `contents: read`, checkout credential persistence disabled, no git commit/push step and no provider secrets passed to the AI executor.
- AI executor has `GLOBAL_QUOTA_ADAPTER_READY = False` and `PROVIDER_GATEWAY_ADAPTER_READY = False`; inference is not activated.
- Publisher first uses read-only GITHUB_TOKEN for source artifact retrieval and validation.
- A one-repository GitHub App token is only minted after a publishable artifact passes deterministic validation and owner secrets are configured.
- Publisher writes only the deterministic `automation/p10cr/worker-run-*` branch and `research/worker-drafts/ai-run-*.json` path, containing a sanitized metadata/hash summary, then creates a draft PR.
- Publisher code has no merge, release, deployment, delete or force-push call.

Residual owner gates remain:

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

## 7. Next

After exact-head CI, continue P59-003 with Phase59.64D only when its owner gates are satisfied: sequential review/merge of PRs #44–#50, master control-plane reconciliation, branch-protection verification, legacy writer review, existing Workers Free plan and aggregate-usage verification, owner-created test-only namespaces and required-reviewer environment. Then execute six distinct workflow runs. Start 7-day soak only after the exact six-run snapshot passes; 30-day soak follows 7-day acceptance.
