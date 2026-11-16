# Phase 59.53 — project-cell durable swarm run ledger

**Mission:** P10CR / P59-003 AI agentic swarm foundation  
**Base master:** 636436921d97a34e0f1f95e0fb3e7a8553f63bf4  
**Branch:** phase59-53-project-cell-durable-swarm-ledger  
**Status:** implementation submitted for exact-head workerd CI; not yet merged  
**Spend:** ₹0  
**External network:** 0  
**Live provider calls:** 0  
**AI inference:** disabled  
**Production feature flags:** OFF

## Objective

Implement the missing durable task/run ledger as a separate project-cell Durable Object. Do not overload the existing provider quota ledger. The ledger stores task identity and policy fingerprints, owner approval evidence, lease ownership, monotonically increasing fencing tokens, checkpoints, terminal outcomes and an append-only SHA-256 event chain. It never executes payloads or makes provider requests.

## Implementation

- `cloud/swarm/swarm-run-do.mjs`: SQLite-backed `SwarmRunDO`, authenticated HMAC RPC, replay-protected caller nonces, action allowlists, idempotent task registration, owner approval, atomic claim, bounded lease, heartbeat, monotonic fencing, checkpoint, completion, retry/backoff, dead-letter, expired-lease recovery, snapshot and event-chain verification.
- `cloud/swarm/swarm-run-host.mjs`: isolated host that exports only `SwarmRunDO` and returns 404 on public fetch.
- `cloud/swarm/worker-tests/wrangler.jsonc`: separate `SWARM_RUNS` Durable Object binding; quota ledger remains separately bound.
- `cloud/swarm/worker-tests/vitest.config.mjs`: isolated workerd namespace and caller policies for primary/secondary test identities.
- `cloud/swarm/worker-tests/swarm-run-ledger-runtime.test.mjs`: five runtime scenarios covering registration/idempotency, owner gate, checkpoint restart, completion replay, two-client contention, lease expiry/recovery, stale fencing, retry/backoff, dead-letter and auth replay protection.

## Safety and correctness boundaries

1. A task ID or idempotency key cannot be rebound to a different project/type/payload/policy/owner-gate/retry identity.
2. Owner-gated tasks cannot be claimed until a primary caller records an approval event.
3. Claim and state mutation are serialized through SQLite transactions and an event-head compare-and-swap.
4. Fencing tokens are stored on the task row and remain monotonic even when lease rows are deleted during recovery or terminal transitions.
5. Heartbeat, checkpoint, completion and failure require the exact current worker identity, fencing token and unexpired lease.
6. Checkpoint sequence is monotonic; exact duplicate checkpoint is acknowledged, conflicting sequence is rejected.
7. Completion is idempotent only for the same result hash; conflicting terminal result fails closed.
8. Retry delay is bounded exponential backoff; exhausted attempts transition to DEAD_LETTER.
9. Event snapshots verify sequence continuity, previous-hash linkage, event SHA-256 and the durable head.
10. HMAC-authenticated RPC uses a per-caller action allowlist and durable nonce replay prevention.

## Explicitly not yet done

- The ledger is not yet connected to the read-only shadow Worker or the scheduled mission worker.
- No production Wrangler deployment or Cloudflare account binding is configured.
- No real task payload, model inference, provider API, repository write, publisher or payment operation is enabled.
- The quota Durable Object and task/run Durable Object are separate, but cross-project global arbitration and independent physical-host proof remain future gates.
- Workerd CI is required before claiming implementation acceptance. No test pass is claimed in this report until exact-head workflow results are available.

## Acceptance gate

Run the complete Cloudflare workerd runtime suite plus all required repository regression and mission-continuity checks on the exact PR head. Do not merge if any required check fails or remains pending. After merge, reconcile `control/mission_state.json`, `control/automation_queue.json` and `PROJECT_CONTINUITY.md` with the exact tested head and test totals.

## Next phase if accepted

Phase 59.54: connect a deterministic, non-provider shadow task path to `SwarmRunDO`: register → claim → checkpoint → deterministic fixture → checkpoint → complete. The quota ledger remains separate and no external fetch is permitted. Add duplicate-delivery and restart tests around the integrated path. Keep production flags OFF, AI inference disabled and spend ₹0.