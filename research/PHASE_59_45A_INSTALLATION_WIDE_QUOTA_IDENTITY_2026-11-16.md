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
