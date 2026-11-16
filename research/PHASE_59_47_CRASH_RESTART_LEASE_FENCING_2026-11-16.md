# Phase 59.47 — Durable Object crash/restart and lease-fencing recovery

**Mission:** P10CR / P59-003 only  
**Status:** implementation submitted for exact-head CI  
**Branch:** `phase59-47-crash-restart-lease-fencing`  
**Spend:** ₹0  
**Provider calls:** deterministic mocks only  
**External network:** 0  
**Production flags:** OFF  
**AI inference:** disabled

## Forensic finding

The Durable Object persists reservation state and lease metadata in SQLite. Its settlement path previously checked reservation ownership and `status='RESERVED'`, but did not run the expiry sweep before committing settlement. A delayed Worker could therefore submit a settlement after `expires_at_epoch` while the reservation still appeared RESERVED, provided no other request had triggered expiry processing.

This is a stale-worker acceptance race. Lease expiry must be enforced at the settlement boundary, not only opportunistically by a later reserve or explicit sweep.

## Change

Before reading and settling a reservation, `#settle` now runs `#expireReservations(now)` inside the same `transactionSync` transaction. An expired reservation is atomically moved from reserved units to uncertain units and its state becomes `UNCERTAIN_BUDGET_RETAINED`. The stale settlement then fails the existing owner/state guard.

## Runtime test

The existing 30-second lease-expiry runtime test is strengthened to:

1. Reserve quota and verify the reservation is active.
2. Evict the Durable Object using the Cloudflare Vitest `evictDurableObject` test helper.
3. Reacquire the same stub and verify SQLite-backed reservation and reserved counters survive reconstruction.
4. Wait for the actual persisted lease to expire; no clock override or test backdoor.
5. Attempt settlement from the stale worker before any explicit expiry sweep.
6. Verify stale settlement is rejected, the reservation is retained as uncertain, and reserved units return to zero.
7. Verify duplicate request suppression and subsequent admission behavior remain fail-closed.

## Acceptance assertions

- Durable Object eviction resets the instance while SQLite state survives.
- The same reservation remains visible after reconstruction.
- A settlement after lease expiry is rejected even when no prior request triggered expiry processing.
- Expired reservation units move atomically from reserved to uncertain.
- No quota is released merely because a worker disappeared.
- Duplicate reservation suppression remains intact.
- No external network calls, live provider calls, AI inference, deployment or spend.

## Evidence boundary

Cloudflare's Durable Object eviction test helper exercises instance teardown/reconstruction while preserving durable storage. This is a deterministic workerd runtime test, not a physical-host failure test, real production crash, deployed Cloudflare test, live GitHub App installation or revenue proof.

## Next

After exact-head Workers/workerd runtime and all regression workflows pass, inspect the merged-head evidence and reconcile master. Then continue with deeper fencing cases: stale heartbeat after expiry, duplicate/late settlement races, and crash between provider response and durable settlement. Keep production flags OFF and all provider calls mocked.
