# Phase 59.46 — Concurrent installation-wide quota arbitration

**Mission:** P10CR / P59-003 only  
**Status:** implementation submitted for exact-head CI  
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
- Both worker identities are represented in settled reservations.
- Committed units equal 2; reserved and uncertain units return to zero.
- Every response reports zero external network requests.

## Evidence boundary

This is a deterministic Cloudflare workerd test with a shared Durable Object namespace and synthetic installation scope. It is not proof of independent physical hosts, separate hosted workflow runs, a real GitHub App installation, Cloudflare production deployment, live provider access or revenue.

## Next

After exact-head CI, inspect the run logs and all regression checks. If the runtime test exposes scheduling assumptions, correct the test without raising the endpoint budget or weakening quota policy. Only then reconcile the merge and proceed to crash/restart, lease expiry and stale-fence tests.
