# Phase 59.48 — stale heartbeat and provider-response settlement crash window

**Mission:** P10CR / P59-003 only  
**Status:** implementation submitted for exact-head CI  
**Branch:** `phase59-48-heartbeat-settlement-crash-window`  
**Spend:** ₹0  
**Provider calls in CI:** deterministic mocks only  
**External network:** 0  
**Production flags:** OFF  
**AI inference:** disabled

## Forensic findings

Phase 59.47 closed stale settlement acceptance by sweeping expired leases inside settlement. A parallel boundary remained: `renewReservation` rejected an expired heartbeat by throwing inside its transaction without first committing the expiry transition. A stale worker could be correctly rejected while its reservation remained `RESERVED` until another request swept it.

The provider client also handled an unsuccessful settlement response, but a thrown ledger transport error after a successful provider response escaped the accounting fallback. The durable lease expiry path still protected budget eventually, but the immediate client path did not explicitly attempt to retain the reservation as uncertain.

## Changes

1. **Heartbeat fencing:** `renewReservation` now runs the expiry sweep inside the transaction, returns an internal `LEASE_EXPIRED` sentinel so the expiry transition commits, and rejects outside the transaction. This mirrors the transaction-safe pattern established in Phase 59.47.
2. **Provider-response / settlement transport gap:** after a provider response and persisted telemetry, a thrown settlement RPC error is caught. The client attempts `markUncertain` and returns `RESPONSE_RECEIVED_ACCOUNTING_UNCERTAIN`; it never retries the provider request. If the Worker is terminated before the uncertainty write commits, lease expiry remains the durable fail-closed fallback.
3. **Runtime tests:** extend the real 30-second lease test so the first post-expiry action is a stale heartbeat, then verify uncertain retention and reject a subsequent stale settlement. Change the settlement-failure fixture to throw a transport error after provider response and verify the explicit uncertain transition.

## Acceptance assertions

- Late heartbeat cannot renew an expired lease.
- Expiry transition commits to `UNCERTAIN_BUDGET_RETAINED` even though heartbeat is rejected.
- Reserved units move to zero and uncertain units retain the full reservation.
- A subsequent late settlement is rejected and cannot double-account.
- A thrown settlement-ledger transport error after provider response attempts an uncertain transition.
- Stable request ID prevents replay of the provider request.
- No live provider call, external network, AI inference, deployment or spend.

## Evidence boundary

These are deterministic Cloudflare workerd tests and injected transport-failure fixtures. They are not proof of physical process termination at every instruction boundary, a deployed production environment, live GitHub App installation, independent physical hosts, or realized revenue. A true hard Worker termination after provider response is covered conservatively by the persisted lease-expiry path, not claimed as directly injected in this test.

## Next

After exact-head Workers/workerd runtime and all required regression workflows pass, inspect the full CI evidence. Do not merge until all required checks pass. Then reconcile master and continue with deeper duplicate settlement/idempotency and provider response journal durability tests. Keep production flags OFF, provider calls mocked, AI inference disabled and spend ₹0.
