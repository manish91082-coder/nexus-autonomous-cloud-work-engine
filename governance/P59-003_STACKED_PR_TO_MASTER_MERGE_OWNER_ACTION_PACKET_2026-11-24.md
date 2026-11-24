# P59-003 — Sequential Stacked PR Review and Owner Approval Packet

**Updated:** 2026-11-24  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Master HEAD observed:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c`  
**Current candidate branch:** `phase59-69-artifact-provenance`  
**Current candidate code/test head:** `603d293f4eee1fbd6d13dc195a4e55b7e6f71479`  
**Current PR:** #55, draft/open/unmerged, stacked on PR #54

## 1. Owner decision required

This packet is a review and configuration guide only. No merge, retarget, environment creation, GitHub App installation, secret creation, Cloudflare deployment, KYC, legal acceptance, billing, public release, or money movement has been performed.

The entire stack is deliberately draft/unmerged. Review and merge only in the exact order below. After each parent merge, retarget the next child PR to `master`, inspect its full diff against the new master, verify the exact tested code SHA and required checks, and only then merge that child. Never merge a child while it still targets an intermediate feature branch.

## 2. Exact current PR stack

| Order | PR | Phase | Head branch | Current base | Current state |
|---:|---:|---|---|---|---|
| 1 | #44 | 59.54–59.59 durable swarm foundation | `phase59-58-durable-dispatcher-shadow-integration` | `master` | Draft, unmerged |
| 2 | #45 | 59.60 account-scope budget arbiter | `phase59-60-account-scope-platform-budget` | `phase59-58-durable-dispatcher-shadow-integration` | Draft, unmerged |
| 3 | #46 | 59.61 budget/dispatcher integration | `phase59-61-budget-dispatcher-integration` | `phase59-60-account-scope-platform-budget` | Draft, unmerged |
| 4 | #47 | 59.62 dependency hardening | `phase59-62-dependency-hardening` | `phase59-61-budget-dispatcher-integration` | Draft, unmerged |
| 5 | #48 | 59.63 independent workflow-run proof harness | `phase59-63-independent-workflow-run-proof` | `phase59-62-dependency-hardening` | Draft, unmerged |
| 6 | #49 | 59.63.2 default-branch execution guard | `phase59-64-default-branch-execution-guard` | `phase59-63-independent-workflow-run-proof` | Draft, unmerged |
| 7 | #50 | 59.64 ordered six-run prerequisites | `phase59-64-host-slot-run-identity-binding` | `phase59-64-default-branch-execution-guard` | Draft, unmerged |
| 8 | #51 | 59.65 current-task dispatch guard | `phase59-65-current-task-dispatch-guard` | `phase59-64-host-slot-run-identity-binding` | Draft, unmerged |
| 9 | #52 | 59.66 publisher API route/redirect boundary | `phase59-66-publisher-api-boundary` | `phase59-65-current-task-dispatch-guard` | Draft, unmerged |
| 10 | #53 | 59.67 strict sanitized summary schema | `phase59-67-sanitized-summary-schema` | `phase59-66-publisher-api-boundary` | Draft, unmerged |
| 11 | #54 | 59.68 publisher branch ancestry and PR ref integrity | `phase59-68-publisher-branch-integrity` | `phase59-67-sanitized-summary-schema` | Draft, unmerged |
| 12 | #55 | 59.69 immutable workflow/artifact provenance | `phase59-69-artifact-provenance` | `phase59-68-publisher-branch-integrity` | Draft, unmerged |

All twelve PRs were observed open, draft, unmerged and mergeable at the last verification. Re-fetch every PR immediately before any owner action; do not rely on this historical snapshot.

## 3. Sequential review procedure

For each PR in the table:

1. Review the complete PR diff and the phase report linked from its body.
2. Confirm the current base is exactly the preceding PR's merged master result (or `master` for #44).
3. Merge only the first PR after confirming its exact tested head and required CI.
4. Fetch the new `master` ref and compare the next PR's full diff against that new master.
5. Retarget the next PR to `master` only after verifying that its diff contains the expected cumulative implementation and no unrelated or duplicate changes.
6. Re-run required CI on the retargeted PR. Require exact-head success; do not treat an older successful run on a different SHA as acceptance.
7. Merge only after the retargeted diff and checks are verified.
8. Repeat until #55. If any conflict, unexpected deletion, changed secret/permission, missing check, failed test, non-draft publisher route, or control-plane regression appears, stop and reconcile before proceeding.

Do not use force-push, bypass rules, administrator bypass, auto-merge, or merge queue shortcuts to skip this sequence.

## 4. Phase59.69 artifact provenance change

PR #55 changes the worker artifact name to:

`mission-autonomous-worker-<GITHUB_RUN_ID>-attempt-<GITHUB_RUN_ATTEMPT>`

The publisher then verifies the immutable workflow ID `415454534`, canonical repository ID `1454085952`, source run metadata, exact attempt-bound artifact, non-expiry, GitHub SHA-256 digest, byte count, bounded ZIP contents and per-file hashes before accepting the worker report.

The publisher token is not used for artifact download. The read-only `GITHUB_TOKEN` is scoped to `actions:read` and `contents:read`; the bearer is sent only to `api.github.com`, never to the artifact-storage redirect host. The GitHub App token remains a separate owner-gated capability and is not minted by this phase.

The historical master Worker #588 artifact uses the pre-Phase59.69 run-only artifact name and is intentionally not eligible under the new attempt-bound verifier. After #55 is merged, wait for a new master Worker run to produce the new name before any publisher acceptance test.

## 5. GitHub App and publisher environment owner actions

Only after PR #55 and its parent stack are reviewed/merged:

- Create or verify the `p10cr-publisher` GitHub Environment.
- Require at least one independent owner reviewer; prevent self-review and administrator bypass where available.
- Protect the publisher environment and branch rules using the repository owner UI.
- Store the exact owner attestation marker and App credentials only as GitHub Environment secrets. Never place secrets in repository files, workflow artifacts, logs, issues, PR bodies or chat.
- Install a single-repository least-privilege GitHub App. Compute workers remain `contents:read`; only the constrained publisher may receive the minimal content/PR write permissions after deterministic validation and owner approval.
- Verify that the publisher can only create a deterministic worker branch and one draft PR; it cannot merge, release, deploy, delete or move money.

No password, OTP, cookie, recovery code, private key, or credential should be shared in chat.

## 6. Cloudflare owner actions

Before any live six-run proof:

- Verify that an already-existing Cloudflare Workers Free account is available.
- Verify account-wide aggregate usage and current free-tier limits in the Cloudflare dashboard.
- Verify the exact test-only `SwarmRunDO` and `PlatformBudgetDO` namespace pair.
- Confirm internal safety caps are below published free limits and all failure modes are fail-closed.
- Confirm no paid plan, auto-upgrade, paid fallback, hidden billing, account rotation or additional account creation is enabled.
- Configure only a test-only endpoint and the exact owner-pinned hostname after review.

If the existing account or aggregate usage cannot be verified, do not deploy or start the live proof.

## 7. Branch protection and legacy writer review

The branch ruleset listing was empty and the branch-protection API returned HTTP 403. This is **UNVERIFIED**, not proof that protection is disabled. The owner must inspect GitHub Settings and confirm:

- Required pull-request review.
- Required status checks on the latest SHA.
- Force-push and deletion restrictions.
- No unexpected bypass actors.
- Default-branch protection.
- Publisher environment protection.

Two legacy write-capable paths remain separate from P59-003: the Phase59.25 bounded disposable-branch writer and the federation-locks writer. Review and explicitly disable or retain them under independent rules; do not invoke them as part of the P59-003 proof.

## 8. Live proof and soak gate

Only after the full stack is on master and all owner gates above are verified:

1. Run the six distinct manual workflow runs: seed, host1, host2, host3, host4, snapshot.
2. Require six distinct actual GitHub workflow-run IDs, two synthetic repository aliases, eight settled reservations, zero reserved/uncertain capacity, no oversubscription, correct replay suppression, valid event-chain integrity and exact run/attempt-bound artifacts.
3. Reconcile every run's artifact ID, digest, size, source run ID/attempt, repository ID and head SHA.
4. Start a bounded seven-day soak only after independent-host acceptance.
5. Start a thirty-day soak only after the seven-day acceptance and incident review.

A Workerd simulation, four runner jobs inside one workflow run, or a candidate-branch artifact is not physical six-run proof.

## 9. Mission and financial invariants

- P59-003 remains the sole active P0.
- P59-001 remains PAUSED.
- P59-002 remains BLOCKED.
- AI inference remains DISABLED until provider/model/data terms, zero-billing, quotas and explicit owner approval are verified.
- Authorized spend remains ₹0.
- No public release, KYC, legal acceptance, billing, payment, wallet signing, private-key access or money movement is authorized by this packet.
- Count only settled, controlled and reconciled net receipts. Current verified realized net receipts remain ₹0.

**This packet grants no approval by itself.** It records the exact owner actions and safe sequence; the owner must perform and confirm each gated action through the official GitHub/Cloudflare interfaces.
