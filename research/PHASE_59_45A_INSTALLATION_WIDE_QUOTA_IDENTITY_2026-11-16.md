# Phase 59.45A — Installation-wide quota identity across independent P10CR worker clients

**Date:** 2026-11-16  
**Mission:** P10CR / P59-003 only  
**Branch:** `phase59-45-installation-wide-quota-harness`  
**Base observed before branch:** `5f79bd9d72e272205d55c0dbb55eb9af513a6595`  
**Status:** Implementation prepared; CI and merge verification pending  
**Spend:** ₹0  
**Live provider calls:** 0  
**Live inference:** disabled  
**Production feature flags:** OFF

## Scope and isolation

This phase extends only the P10CR canonical repository metadata shadow worker. It does not call, inspect, dispatch, modify or depend on any other repository or mission. Both worker clients target exactly:

`manish91082-coder/nexus-autonomous-cloud-work-engine`

The two clients use distinct authenticated caller identities, distinct worker IDs and distinct workflow run/request IDs, while receiving the same trusted installation quota partition from worker configuration. The installation ID remains a test fixture, not a real GitHub App installation credential.

## Changes

1. The read-only shadow Worker now accepts a bounded worker identity only from trusted runtime configuration. It rejects missing, malformed or non-P10CR shadow worker IDs.
2. The workerd test topology now includes two separately named shadow Worker clients, each with a separate caller secret and caller policy, both bound to the same Durable Object namespace and same installation-scope fixture.
3. A new runtime test seeds one quota partition, executes two different workflow run envelopes through the two worker clients, and verifies:
   - both mocked requests complete;
   - the two reservation records have different worker IDs;
   - both records share the same installation-scoped quota object;
   - committed quota is aggregated in one bucket (2 units), with no outstanding reservation;
   - external network request count remains zero.

## Evidence boundary

This proves **two distinct Worker client identities and run IDs share one Durable Object quota partition inside the Cloudflare workerd test runtime**. It does not prove:
- two physically independent cloud hosts;
- separate GitHub Actions workflow runs sharing a deployed Durable Object;
- a real GitHub App installation-wide quota scope;
- cross-repository access or production global arbitration;
- Cloudflare hosted deployment or production availability.

No other repository is part of this test. P10CR mission isolation remains intact.

## Next

- Run exact PR-head Workers/workerd tests and all relevant regression workflows.
- Add a deterministic crash/restart and concurrent multi-client contention harness around the same shared ledger, preserving conservative uncertain accounting and fencing.
- Keep real provider requests mocked, production flags OFF, inference disabled and spend ₹0.
- Physical independent-host and cross-run hosted validation remain blocked until an owner-approved, zero-billing Cloudflare deployment and real installation identity exist. No deployment or credential is activated by this phase.


## Phase 59.45B failure analysis and correction (16-Nov-2026)

The first PR-head runtime execution reported 62/63 passing; the new two-client test returned HTTP 503 from the second shadow Worker. The failing assertion was at the second client's response check. Existing regression workflows passed.

Forensic inspection found that both synthetic provider responses reused the same fixed `x-github-request-id`, even though the clients represented distinct provider requests. This violated the evidence identity invariant and could cause duplicate telemetry provenance to be treated as a conflict. This was the leading code-level cause; the original Worker intentionally returned a generic fail-closed response, so the old run did not expose a definitive internal error.

Correction on the PR branch:
- Generate a distinct deterministic fixture request ID from each validated stable request ID.
- Add diagnostic assertion output to the test so any future 503 reports the sanitized JSON response body.
- Keep external network requests at zero and retain the shared installation-scope test fixture.

The PR was reopened against the corrected head to trigger a fresh PR validation cycle. The new exact-head run is queued/pending at the latest observation; **the correction is not yet CI-verified**. Do not merge until the Cloudflare Workers runtime test and all required regression workflows pass on the same exact head.

Latest corrected branch head: `54c81037de48747717259b84d1a2a3f37879c36b`.

No deployment, live GitHub API request, inference, real installation credential or spend occurred.


## Phase 59.45C fixture isolation correction (16-Nov-2026)

The latest exact-head CI result disproved the earlier request-ID collision hypothesis. The diagnostic response identified `SECONDARY_ENDPOINT_POINT_BUDGET`. The second worker was still denied because the Durable Object host owns the effective endpoint-point budget; setting a higher value only on the shadow Worker clients did not change the host's admission policy. The same installation fixture scope was also used by the preceding Phase 59.44 test in the shared workerd Durable Object namespace.

Correction: isolate Phase 59.45's two clients under the dedicated fixture credential scope `github-app-installation:shadow-test-45`, and seed the test partition with that same scope. Both clients still share one identical scope and one Durable Object namespace with each other. Restore their per-client endpoint budget binding to the normal fixture value of 2; do not weaken the host policy or inflate global test budgets.

This separates Phase 59.45 evidence from Phase 59.44 fixture history while preserving the actual invariant under test: two independently authenticated clients share one installation-scoped quota partition. Exact-head runtime CI must confirm the correction before merge.

