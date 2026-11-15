# Phase 59.21: Federation API Cost and 30-Day Growth Audit

Date: 2026-11-15
Base master: 8737f249fb630f922623cbdf745c283ea2f7e1bd
Branch: phase59-21-api-cost-and-growth-audit
Scope: Static source-derived REST request accounting and explicitly synthetic capacity model. No live lock-branch writes, no client activation, no quota reservations, no paid services.

## Executive decision

NO-GO to enable the federation lock client or quota arbiter. The Git-ref store default max_retries=5 means five full attempts. A successful mutation costs 9 GitHub REST requests under the current implementation. A conflict on the ref update occurs after all 9 calls, so the worst-case five-attempt mutation costs 45 requests. The quota arbiter currently reserves only 10 requests per unit and persists each reservation through the same 9-request mutation path. It is not a safe admission controller at present.

The code direction remains aligned with P59-003's prerequisite: deterministic, fail-closed coordination before multi-agent execution. But this is still infrastructure prototype work, not a deployed autonomous AI swarm. P59-001 portfolio research remains PAUSED and must resume after a safe swarm handoff; infrastructure work must not become an endless substitute for revenue-source execution.

## 1. Source-level request accounting

Reviewed scripts/federation_git_ref_store.py at base master blob b6f0cb89cc99b673bb0d48c49990ee5ac8685226 and scripts/federation_quota_arbiter.py at db2ca02ae25742ff5339bf84fd6d148fcabf07fe.

### One full mutation attempt

| Operation | REST calls |
|---|---:|
| GET branch ref | 1 |
| GET parent commit | 1 |
| GET state contents | 1 |
| POST state blob | 1 |
| GET target event chunk (404 if new chunk, still a request) | 1 |
| POST event chunk blob | 1 |
| POST tree | 1 |
| POST commit | 1 |
| PATCH branch ref (fast-forward CAS) | 1 |
| Total | 9 |

- Existing chunk and new chunk both incur one GET; HTTP 404 is not a zero-cost lookup.
- One CAS conflict is discovered only at the final PATCH, after the other eight requests have already been spent. The next attempt rereads all three snapshot resources and rebuilds all six commit resources.
- Default retry count is 5, verified from the constructor. Thus success without conflict = 9; one conflict then success = 18; four conflicts then success = 45; five conflicts/exhaustion = 45.
- A read-only assert_fence or snapshot costs 3 calls.
- A transition rejected after snapshot validation generally costs 3 calls; a committed mutation costs 9 per attempt.
- This is source-derived structural accounting, not a live API trace or measurement of secondary-rate-limit cost.

### Quota-arbiter self-accounting flaw

The current policy uses 36 reservations/hour × 10 requests = 360 nominal requests/hour. However, every reservation is itself a lock-store mutation. With no conflict, 36 reservations can consume 324 REST calls merely to reserve the units; the work those reservations admit then consumes additional calls. A five-attempt conflict path consumes 45 calls per reservation, so the current 10-request unit materially under-reserves. Reservation writes are not free and the arbiter cannot be assumed to protect its own control-plane writes.

Decision: keep quota arbiter disabled. Do not merely change 10 to 45 and enable it: reserve operations, release operations, read-only checks, retries, contention, and the fixed-point problem of metering the meter must be included in a separate design and tested with an independent budget source or a bounded pre-allocated envelope.

## 2. Synthetic 30-day lease heartbeat model

Assumptions (not observed live workload):
- Maximum 8 active leases.
- One heartbeat per active lease every 300 seconds.
- 30 days × 24 hours × 12 five-minute intervals = 8,640 intervals.
- All 8 leases are continuously active for the entire period.

| Metric | Synthetic result |
|---|---:|
| Heartbeats/day | 2,304 |
| Heartbeats/30 days | 69,120 |
| Events at 256 events/chunk | 270 chunks (ceil) |
| Mutation REST calls at 9 per heartbeat | 622,080 |
| Average mutation calls/hour | 864 |
| Calls/hour if every mutation exhausts 5 attempts | 4,320 |

This baseline excludes claims, releases, expiry recovery, quota reservation/release events, verification reads, CI, normal repository use, and other project activity. It also assumes zero CAS conflicts in the 9-call estimate. Eight simultaneous leases do not guarantee eight successful writes per heartbeat interval: all eight writers contend on one branch ref, so serialized retries/backoff and WAITING_FOR_LOCK behavior are essential.

### Chunk rewrite amplification

The event chunk is rewritten on every append. For a full 256-event chunk, the sequence of stored chunk versions contains 1+2+...+256 = 32,896 event entries. Across 270 chunks, this is approximately 8,881,920 event-entry serializations in the Git object history for the heartbeat-only scenario, before claims/releases and other events. This is a logical serialization/write-amplification estimate, not a byte-size estimate; Git compression/deduplication and actual repository growth were not measured.

The v2 verifier traverses year/month/chunk directory listings, each bounded at 1,000 entries. At 270 chunks in one month, the chunk listing remains below that ceiling in this scenario. It is not a 30-day soak, and the model does not establish acceptable verification latency or API consumption.

## 3. 30-day conclusion and architecture correction

The single shared Git ref is a serialization point. At the synthetic full heartbeat rate, the no-conflict mutation path alone averages 864 requests/hour, leaving little headroom below the documented 1,000 requests/hour primary limit for a repository token. Conflict retries can exceed it. This does not include the arbiter's own reservation writes or other API use. Therefore a 360-request/hour nominal quota budget is not proven safe and may create false confidence.

Before activation, design and test:
1. Reduce heartbeat write frequency or use a lease renewal strategy that avoids one full Git commit per worker heartbeat, while preserving expiry safety.
2. Add a bounded batch/transaction design or partitioned coordination model without weakening the single-writer/fencing invariant.
3. Meter every request class, including reads, retries, 404s, reservation writes, journal verification, and failures.
4. Avoid self-referential quota accounting; establish a separately bounded controller overhead allowance and reserve the full worst-case cost before dispatch.
5. Simulate burst contention (8 simultaneous workers), stale writers, retry exhaustion, hour-boundary rollover, month-boundary partitioning, and recovery.
6. Measure real verifier runtime and repository growth in a controlled, non-production test branch before any 7/30-day soak.

## 4. Agentic swarm alignment audit

P59-003 acceptance remains the correct prerequisite for a cloud-only, zero-cost-first swarm: deterministic dispatcher, typed task/evidence contracts, idempotency, leases/fencing, crash recovery, bounded retries, evidence provenance, independent critic/red-team, and owner gates. The latest verified state still says provider not configured, no live AI inference, no project clients enabled, and no production deployment. The Flash Loan repository remains a separate public-GitHub research-only mission; ZCIRA and Daily1000 remain separate queues. Do not merge their tasks or ledgers.

The strategic correction is to keep infrastructure work bounded. Once the lock/quota design reaches a defensible safe handoff, resume P59-001's portfolio-wide revenue-source ranking. The ₹10 Cr mission is not achieved by building an elaborate orchestration layer alone.

## 5. Safety and accounting invariants

- No live writes to federation-locks branch in this phase.
- No federation client or quota arbiter enabled.
- No paid provider, paid fallback, account upgrade, spend, KYC, publication, or owner-only action.
- P59-003 remains IN_PROGRESS; P59-001 remains PAUSED; P59-002 remains BLOCKED.
- PCNE ₹0; authorized spend ₹0.
- No production autonomy, 24×7 SLA, or cloud failover claim.

## 6. Next sequence

Phase 59.22: design a non-self-referential quota model and lower-write lease/heartbeat protocol; add deterministic tests for exact request accounting and eight-way contention. Only after tests and a bounded test-branch soak should client integration be considered. Keep the production lock branch untouched.
