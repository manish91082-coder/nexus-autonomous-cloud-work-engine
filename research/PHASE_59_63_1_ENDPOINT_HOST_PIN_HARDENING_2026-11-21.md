# Phase 59.63.1 — Exact Endpoint Host Pin and Fresh-Test-ID Hardening

**Date:** 2026-11-21  
**Scope:** P59-003 only. No revenue-source ranking, product discovery or other-project work.  
**Status:** Exact-code-head CI PASS; actual six-run hosted proof remains owner-gated.  
**Spend:** ₹0. **AI inference:** DISABLED. **Production:** OFF.

## 1. Repository and task state

- Canonical repository: `manish91082-coder/nexus-autonomous-cloud-work-engine`
- Verified master HEAD: `8856bf908f93e265cefd5c739f7f46b3dd995b3c` (unchanged).
- Candidate branch: `phase59-63-independent-workflow-run-proof`.
- Code/test head verified by CI: `12c58b8acc07953defd91c35cdcb97eced47a8ba`.
- Candidate branch head after control-plane fetch-back: `244650835c13196f350513eab55f91f2cac10fbe`.
- Draft PR #48 remains open/unmerged, base `phase59-62-dependency-hardening`.
- Parent PRs #44, #45, #46 and #47 remain open/draft/unmerged.
- P59-003 is the sole active P0; P59-001 remains PAUSED; P59-002 remains BLOCKED.

## 2. Security finding

The Phase59.63 manual workflow and client previously accepted any hostname ending in `.workers.dev`. That suffix check established a Cloudflare Workers hostname family, but it did not bind the HMAC-signed test request to the exact owner-approved Worker hostname. A misconfigured endpoint could therefore direct the test ingress signature to a different Worker within the broad suffix family.

No live request or secret disclosure occurred. The endpoint was owner-gated and had not been configured. This was treated as a defense-in-depth gap and corrected before any live test.

## 3. Implemented hardening

1. Added independent GitHub environment variable `P59_003_TEST_ENDPOINT_HOST`. It must contain the exact lower-case hostname only, without scheme, path, port, wildcard or trailing dot.
2. Workflow preflight now validates the hostname syntax and requires exact equality between the endpoint URL hostname and the separately configured host pin before any network request.
3. The cross-run client independently requires the host-pin variable and fails closed if it is missing or mismatched.
4. Every dispatch and snapshot HMAC request passes the expected hostname into `buildSignedRequest`, which validates the same exact host again.
5. Removed the reusable default `test_id`; the operator must supply a fresh unique test ID for each new proof and reuse it unchanged across the six stages.
6. Updated the owner packet with the new variable, exact-host requirement and fresh-ID rule.

The previous `*.workers.dev` suffix, HTTPS-only, exact path, no URL credentials, no query/fragment and no custom port restrictions remain in force.

## 4. Exact-head CI evidence

All runs below tested code/test head `12c58b8acc07953defd91c35cdcb97eced47a8ba` and completed successfully.

| Workflow | Run | Result |
|---|---:|---|
| Phase59.35 Workers runtime | [#44861739865](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44861739865) | 17/17 offline client tests; YAML syntax PASS; 83/83 Workers runtime; Phase59.63 Workerd 1/1 |
| Phase59.56 global quota | [#44861739923](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44861739923) | 2/2 synthetic global quota tests; 83/83 Workers runtime |
| Phase59.58 dispatcher | [#44861739854](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44861739854) | 83/83 Workers runtime |
| Phase59.60 account budget | [#44861739859](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44861739859) | 8/8 platform-budget tests |
| Phase59.62 dispatcher integration | [#44861739868](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44861739868) | 4/4 dedicated integration tests; 83/83 full swarm regression |

Phase59.35 job steps also verified the committed npm lockfile and dependency integrity, installed exact dependencies with lifecycle scripts disabled, ran offline client tests and parsed both independent-host workflow YAML files.

## 5. Material commits

### Executable and test changes

- `7c9c125` — exact hostname validation primitive.
- `47c3879` — exact pin passed through cross-run dispatch and snapshot requests.
- `37598cc` — exact host-pin positive/negative tests.
- `af3a3d8` — workflow host-pin and no-default test.
- `aef96cc` — owner-gated workflow preflight exact-host comparison, environment pin and removal of fixed test-ID default.
- `01b5604` — cross-run client now requires the endpoint host pin before network access.
- `12c58b8` — missing/mismatched host-pin fail-closed test.

### Owner and control-plane evidence

- `b553080` — owner packet update.
- `1fc217f` — mission-state reconciliation.
- `7c9d9cd` — automation-queue reconciliation.
- `2446508` — federation-registry reconciliation.

The complete report and continuity checkpoint are separate subsequent commits.

## 6. Workflow and owner-gate status

- PR #48 is still draft/open/unmerged.
- PR #44 → #45 → #46 → #47 → #48 remain a stacked review/merge sequence.
- GitHub exposes no `workflow_dispatch` execution for this workflow until its file exists on the default branch. No dispatch was attempted.
- Visible repository rulesets endpoint returned an empty list; the branch-protection endpoint returned HTTP 403 to the integration. Therefore actual branch protection remains UNVERIFIED, not presumed disabled.
- The required-reviewer environment is not configured/verified by this execution.
- Existing Cloudflare Workers Free eligibility and account-wide aggregate usage remain owner-unverified.
- The test-only `SwarmRunDO` and `PlatformBudgetDO` namespace pair is not deployed or configured.
- No GitHub App was installed.
- No live six-run proof, physical-host atomicity test or 7/30-day soak has started.

## 7. Safety and financial invariants

- AI inference remains disabled; live provider calls: 0.
- External network requests from CI tests: 0.
- Production feature flag: OFF.
- Authorized spend: ₹0.
- Verified realized net receipts: ₹0.
- No KYC, legal acceptance, publication, billing, payment, signing, private-key access or money movement.
- No other project was read for execution or mutated.

## 8. Next engineering/owner sequence

1. Owner reviews and merges PRs #44 → #45 → #46 → #47 → #48 in order, without bypassing repository rules.
2. Owner verifies the existing Workers Free account and aggregate usage; no paid fallback.
3. Owner configures the exact `P59_003_TEST_ENDPOINT_HOST` variable, matching endpoint secret, HMAC secret, test-only namespace pair and required-reviewer environment directly in GitHub.
4. After the workflow appears on default branch, manually execute seed, host1, host2, host3, host4 and snapshot as six distinct workflow runs within one UTC day.
5. Accept only six actual run IDs, two synthetic repository aliases, eight settled reservations, zero residual reserved/uncertain units, four duplicate replays suppressed, three overflow admissions, one budget denial and a valid event chain.
6. Only after exact snapshot acceptance begin the seven-day soak; thirty-day soak follows seven-day acceptance.

P59-003 remains the sole active P0. P59-001 remains PAUSED; P59-002 remains BLOCKED.
