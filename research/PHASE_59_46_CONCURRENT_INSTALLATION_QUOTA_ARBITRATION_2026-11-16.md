# Phase 59.46 — Concurrent installation-wide quota arbitration

**Mission:** P10CR / P59-003 only  
**Status:** implementation submitted for corrected exact-head CI  
**Spend:** ₹0  
**Provider calls:** deterministic mocks only  
**External network:** 0  
**Production flags:** OFF  
**AI inference:** disabled

## Objective

Extend Phase 59.45A's two-client shared installation-scope workerd proof with a concurrent burst test. Two independently authenticated shadow Worker clients share one dedicated Durable Object quota partition and receive 16 unique run/request envelopes concurrently.

## Acceptance assertions

- Exactly 16 requests are submitted concurrently across two worker identities.
- The fixture host's reviewed endpoint-point budget remains 2. No budget inflation or policy weakening.
- At most the two requests allowed by the shared endpoint budget may reach the mock provider.
- All other requests fail closed with quota waiting / unconfirmed admission.
- Every settled reservation is attributed to one of the authenticated Worker identities. The current contract does not guarantee fair scheduling or require both identities to win admission in a single burst.
- Committed units equal 2; reserved and uncertain units return to zero.
- Every response reports zero external network requests.

## Evidence boundary

This is a deterministic Cloudflare workerd test with a shared Durable Object namespace and synthetic installation scope. It is not proof of independent physical hosts, separate hosted workflow runs, a real GitHub App installation, Cloudflare production deployment, live provider access or revenue.

## Next

After corrected exact-head CI, inspect the run logs and all regression checks. If the runtime test exposes scheduling assumptions, correct the test without raising the endpoint budget or weakening quota policy. Only then reconcile the merge and proceed to crash/restart, lease expiry and stale-fence tests.

## CI diagnostic correction

The first exact-head run executed 64 runtime tests: 63 passed and one failed only because the test incorrectly required both worker identities to receive an admission in the same 16-request burst. The observed ledger still admitted exactly two requests under the configured two-point endpoint budget, rejected the remaining requests, and settled both reservations. Both admitted reservations happened to belong to the primary worker. The quota contract does not currently promise fair scheduling between worker identities, so the corrected test asserts the actual safety contract: no oversubscription, valid worker attribution, and zero residual reserved/uncertain units. Fairness remains a separate future policy decision and is not silently assumed.
