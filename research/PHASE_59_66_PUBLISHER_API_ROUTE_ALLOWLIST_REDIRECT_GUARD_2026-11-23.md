# Phase59.66 — Constrained Publisher API Route and Redirect Boundary

**Date:** 2026-11-23  
**Mission:** P59-003, sole active P0  
**Master HEAD:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c` (unchanged)  
**Parent:** PR #51, `phase59-65-current-task-dispatch-guard`, tested Phase59.65 head `d970f0eb588f71b2590bb6565cbc798b79308a4d`  
**Candidate branch:** `phase59-66-publisher-api-boundary`  
**PR:** #52, draft/open/unmerged, stacked on PR #51  
**Initial code commit:** `d8aa9b7fa5847c29dfcf02a7b51d9e98b2ef2fdc`  
**Initial test commit:** `78534898c520c0e99e43fb4a3cc4934438fddae8`  
**Final tested PR code/test head:** `734e281ccbcb6d6493fa4c24f296a4153672cf0e`  
**Workflow trigger/YAML commit:** `813658b1e6830ef951ddb8c34b7d7d86f735730d`  
**Final evidence branch checkpoint:** `b35510251a108eb789a280896ee22c394202b49b`  
**Status:** ACCEPTED — exact-head CI PASS; owner gates pending  
**Spend:** ₹0  
**AI inference:** DISABLED  
**Verified realized net receipts:** ₹0

## 1. Finding

The constrained publisher's internal callers used a small fixed set of GitHub REST routes, but `GitHubApi.request` itself previously accepted any HTTP method and any path under the canonical repository prefix. It also used the default urllib opener, which follows HTTP redirects.

This exceeded the intended single capability: create/reuse one deterministic worker branch, write one sanitized summary file, and create one draft PR. In particular, a redirect could cause a scoped bearer token to be presented to a redirect destination depending on urllib redirect handling. No live API request or token existed, so no token was exposed; this was a defense-in-depth finding.

## 2. Correction

Added `_validate_api_request` and call it before constructing any HTTP request.

Allowed methods are only GET, POST and PUT. Allowed routes are only:

- GET canonical master ref.
- GET the deterministic `automation/p10cr/worker-run-{id}-attempt-{n}` ref.
- POST `git/refs` with exactly the deterministic branch ref and a 40-character master SHA.
- GET the matching sanitized draft file with exactly the matching branch query.
- PUT the matching sanitized draft file with exact branch, commit-message and bounded base64 content.
- GET open PRs with exact owner:branch and master base query.
- POST a draft PR to master with exact deterministic title/head/base and bounded body.

The validator rejects unsupported methods, any other route, noncanonical/absolute URL, fragments, extra query parameters, mismatched run/attempt/branch identity, unexpected payload keys, non-draft PR payloads and oversized/invalid content.

Added `_RejectRedirectHandler`; `GitHubApi.request` now uses an opener with this handler. A 3xx is returned as an HTTP error and converted to a fail-closed `ApiError`; it is never followed.

## 3. Tests

Added nine deterministic tests in `tests/test_constrained_publisher.py` (33 test methods total at this checkpoint).

1. All seven internal publisher routes are accepted.
2. DELETE/PATCH and unknown routes rejected.
3. Noncanonical/absolute/fragment paths rejected.
4. Swapped or extra content query rejected.
5. Content branch mismatch rejected.
6. Non-draft or wrong-base PR rejected.
7. Pull request query for another branch rejected.
8. Redirect handler refuses redirect.
9. GitHubApi uses the no-redirect handler and surfaces HTTP 302 as an error.

No test makes a live GitHub API request or supplies a token.

## 4. Failure history and correction

Runs #45110017616 and #45110119498 failed in the new publisher API suite with two test errors caused by an undefined local `branch` in the GET `/pulls` route validator. The route validator was corrected to derive the owner-qualified branch from the exact query and require the deterministic `automation/p10cr/worker-run-{id}-attempt-{n}` pattern. The negative test now rejects a non-deterministic branch rather than a different valid run branch. No live API call or token was involved. The final run below passes the corrected implementation.

## 5. Existing Phase59.65 acceptance

Phase59.65 code and CI passed on PR #51:

- [Run #45109541094](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45109541094): 32/32 offline host-client tests; YAML PASS; lockfile 165 packages/integrity PASS; AI/current-task safety 20/20; publisher validation/environment gate 24/24; Workers runtime 83/83 (6+7+2+68 across four files); Workerd integration 1/1.
- Both worker paths use the shared P59-003-only current-task guard.
- Publisher job requires the `p10cr-publisher` environment and explicit owner attestation marker before App token minting.

## 6. CI wiring and safety

Phase59.35 push and PR branch/path filters now include Phase59.66 and publisher source/tests/workflow. It runs the AI/current-task and publisher Python suites on Python 3.12.

No Cloudflare deployment, live GitHub API request, GitHub App installation, token creation, secret access, KYC, legal acceptance, public release, billing, payment, signing or money movement occurred. AI inference remains disabled; provider/quota adapters remain hard-disabled. Other projects remain read-only. P59-003 sole active P0; P59-001 PAUSED; P59-002 BLOCKED. Spend ₹0; receipts ₹0.

## 7. Remaining owner gates

- PR stack #44–#52 remains draft/unmerged; review/merge only in order after owner review.
- Branch protection/ruleset remains UNVERIFIED.
- `p10cr-publisher` environment must be pre-created with required reviewer(s), prevent-self-review, master-only deployment branch and no bypass where supported.
- App credentials and `P10CR_PUBLISHER_ENV_APPROVED=P59-003-PUBLISHER-OWNER-APPROVED` must be environment secrets only. None exists yet.
- Two legacy branch-scoped write workflows remain uninvoked and require owner review.
- Workers Free/account-wide usage and test-only namespaces remain unverified.

## 8. Exact-head Phase59.66 CI result

[Phase59.35 run #45110233131](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45110233131) completed SUCCESS on tested PR head `734e281ccbcb6d6493fa4c24f296a4153672cf0e`. Evidence: 32/32 offline host-client tests; Python AI/current-task suite 20/20; constrained-publisher suite 33/33; YAML syntax PASS across five workflow files; npm lockfile integrity PASS (165 packages); Workers runtime 83/83 across four files; isolated Workerd integration 1/1. All job steps succeeded. Non-failing warnings: Node 20 deprecation notice for pinned setup-node action (executed under Node 24) and Python/Node `punycode` deprecation notice.

## 9. Next

Phase59.66 code/CI is accepted. Continue P59-003 with Phase59.67 sanitized-summary schema enforcement at the publisher API boundary while the six-run physical proof remains owner-gated. The six-run proof must precede the 7-day soak; the 30-day soak follows 7-day acceptance. Do not resume P59-001 or P59-002.
