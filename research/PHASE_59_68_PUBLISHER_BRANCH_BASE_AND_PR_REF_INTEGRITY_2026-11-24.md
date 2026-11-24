# Phase 59.68 — Publisher Branch Base, Diff and Draft PR Ref Integrity

**Date:** 2026-11-24  
**Mission:** P59-003 only — zero-cost-first autonomous swarm foundation  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Master HEAD observed:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c`  
**Candidate branch:** `phase59-68-publisher-branch-integrity`  
**Exact tested HEAD:** `18edf6f2b65f11e63b02c0007e7b6f96a3a22fd4`  
**PR:** [#54](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/pull/54), draft/open/unmerged, base `phase59-67-sanitized-summary-schema`.

## 1. Finding

The constrained publisher previously used a deterministic branch name derived from workflow run ID and attempt, but did not prove that a pre-existing branch contained only the expected summary change relative to the current master. A pre-existing branch could have additional commits/files, be behind/diverged from master, or point to a different draft PR head. Merely verifying the summary file content did not prove the whole branch diff was safe.

This phase closes that gap before any live publisher credentials or API write are enabled.

## 2. Implemented controls

### 2.1 Exact compare API route

Added one narrowly scoped read-only GitHub Compare route:

`GET /repos/manish91082-coder/nexus-autonomous-cloud-work-engine/compare/master...automation/p10cr/worker-run-<run-id>-attempt-<attempt>`

- The branch must match the deterministic worker-run/attempt pattern.
- The branch component is canonically percent-encoded.
- Other bases, branch names, query parameters, methods and routes remain rejected.

### 2.2 Branch-state acceptance

The publisher accepts only two states:

**EMPTY:** a newly created branch whose tip is exactly the current master SHA, with zero commits ahead, zero behind, no changed files, and identical compare status.

**ONE_SUMMARY_COMMIT:** exactly one commit ahead, zero behind, merge base equal to the current master SHA, branch tip different from base, and exactly one added file at the deterministic expected summary path. Deletions must be zero and additions/changes must be positive and consistent.

All other states fail closed, including:
- extra commits or files;
- branch behind/diverged from current master;
- stale merge base;
- modified or unexpected summary path;
- missing summary file despite a reported diff;
- a file present while compare reports an empty branch;
- malformed compare counters or file metadata.

After writing a summary, the publisher re-reads the branch ref and re-runs the compare check. It verifies the one-commit/one-file invariant before querying or creating a draft PR.

### 2.3 Draft PR identity

Both existing and newly created PR responses must satisfy all of these exact conditions:

- PR state is open and draft is true;
- head ref equals the deterministic worker branch;
- head SHA equals the re-read branch tip SHA;
- head repository is the canonical repository;
- base ref is `master`;
- base SHA equals the master SHA used for branch validation;
- base repository is the canonical repository.

A mismatch fails closed. No merge, close, publish or deployment operation was added.

### 2.4 Tests

The mocked publisher API tests now cover:
- valid canonical compare route and rejection of wrong base/branch routes;
- pre-existing branch with extra commit/file;
- branch behind/diverged from master;
- wrong summary file path;
- existing summary file with different bytes after a valid one-file diff;
- existing draft PR with wrong head SHA;
- new draft PR response with wrong head SHA or base SHA;
- non-draft PR rejection;
- idempotent reuse of an exact one-commit/one-file branch and matching draft PR.

No live GitHub API call was made by these tests.

## 3. Exact-head CI

Final PR run: [GitHub Actions #45318616477](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45318616477)  
Conclusion: **SUCCESS**  
Exact tested HEAD: `18edf6f2b65f11e63b02c0007e7b6f96a3a22fd4`.

| Gate | Result |
|---|---:|
| P59-003 current-task/AI safety tests | 20/20 PASS |
| Constrained publisher tests | 39/39 PASS |
| Strict worker summary/provenance tests | 20/20 PASS |
| Independent-host client offline workflow step | PASS |
| Five workflow YAML syntax checks | 5/5 PASS |
| npm lockfile integrity | 165 package entries PASS |
| Cloudflare Workers runtime | 83/83 PASS across 4 files |
| Isolated Workerd cross-run integration | 1/1 PASS |
| Final job | SUCCESS |

An earlier push-triggered run on the pre-final fixture head succeeded; the final PR run above validates the exact final code/test head. A superseded push run was cancelled by workflow concurrency and is not counted as a failure.

## 4. Scope and safety

- Master remains `8856bf908f93e265cefd5c739f7f46b3dd995b3c`; no merge or master write.
- PR #54 is draft/open/unmerged; it is stacked on PR #53. PRs #44–#54 remain owner-review items.
- The branch compare and PR checks are code/test logic only. No GitHub App token was minted and no live publisher API request occurred.
- AI inference remains disabled; no Cloudflare deployment or account configuration occurred.
- No KYC, legal acceptance, public release, billing, payment, signing or money movement.
- Authorized spend ₹0; verified realized net receipts/PCNE ₹0.
- P59-003 remains sole active P0; P59-001 PAUSED; P59-002 BLOCKED.
- Other project repositories remain isolated/read-only.

## 5. Remaining acceptance gates

1. Owner review and sequential PR #44–#54 landing, retargeting each child to master only after its parent lands and rechecking the incremental diff.
2. Master control-plane reconciliation; master continuity/queue remain older than the candidate branch.
3. Branch protection/ruleset verification. Current branch-protection API access returned HTTP 403 and an empty rulesets list is not proof of protection.
4. Review legacy Phase59.25 disposable-state and federation-locks writers under verified branch restrictions.
5. Existing Cloudflare Workers Free account/aggregate usage verification and isolated test-only Durable Object namespace setup.
6. Required-reviewer `p10cr-publisher` environment, exact endpoint hostname pin and least-privilege GitHub App installation.
7. Six separate actual workflow runs across four independent hosted runners and two synthetic repository aliases.
8. Seven-day soak, then thirty-day soak.

## 6. Next engineering step

**Phase59.69 — immutable worker workflow and artifact provenance binding.** Pin the expected GitHub workflow ID, verify source run/workflow identity, require exactly one non-expired named artifact for that run, and validate artifact metadata/digest against the downloaded report before summary construction. Keep tests mocked/read-only; do not enable AI inference or publisher credentials.

The physical six-run proof remains owner-gated until the PR stack is landed, master controls reconciled, account/namespace/branch-protection gates verified and explicit owner approval is present.
