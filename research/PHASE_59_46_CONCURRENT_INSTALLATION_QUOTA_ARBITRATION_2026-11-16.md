# Phase 59.46 — Concurrent installation-wide quota arbitration

**Mission:** P10CR / P59-003 only  
**Status:** MERGED after corrected exact-head CI  
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

## Exact-head CI and merge evidence

- Tested PR head: `4bf26dccd50ddf3b0887e310c3ad6f3d74386273`
- Workers/workerd runtime run: `43830209099` — SUCCESS
- PR regression workflows: 13/13 SUCCESS
- PR #27 merged at: `ea8d785691b9e92ae8034cec2dafab70573ad249`
- Spend: ₹0; external network requests: 0; AI inference: disabled; production flags: OFF.

## Next

Phase 59.47: deterministic crash/restart, lease expiry and stale-fencing rejection tests. Preserve fail-closed quota semantics and do not enable production clients.

## CI diagnostic correction

The first exact-head run executed 64 runtime tests: 63 passed and one failed only because the test incorrectly required both worker identities to receive an admission in the same 16-request burst. The observed ledger still admitted exactly two requests under the configured two-point endpoint budget, rejected the remaining requests, and settled both reservations. Both admitted reservations happened to belong to the primary worker. The quota contract does not currently promise fair scheduling between worker identities, so the corrected test asserts the actual safety contract: no oversubscription, valid worker attribution, and zero residual reserved/uncertain units. Fairness remains a separate future policy decision and is not silently assumed.
