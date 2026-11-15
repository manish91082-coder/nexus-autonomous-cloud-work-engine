# Phase 59.22 — Batched Heartbeat Control Plane

Date: 2026-11-15
Base master: fd9aa4037d91759065b179a6b1d073bb1cc5f535
Branch: phase59-22-batched-heartbeat-control-plane

## Decision

Implement a single atomic batch-heartbeat transition for up to the configured active lease cap (8). One controller heartbeat renews all supplied leases, validates every owner/fencing token/expiry, advances one event sequence, and commits once. A single stale member rejects the whole batch. The existing individual heartbeat API remains for compatibility, but the future controller should use batch renewal.

This reduces the full-capacity heartbeat write count from 8 independent mutations per five-minute interval to 1 mutation per interval. At 9 REST calls per no-conflict mutation, the synthetic 30-day model changes from 622,080 calls to 77,760 calls (108 requests/hour), a 8x reduction. This is still a model, not measured traffic. CAS retries can increase it up to 540 requests/hour if every batch mutation consumes all five attempts.

## Alternatives evaluated

1. **Keep individual per-worker heartbeat commits:** rejected for steady-state multi-agent use; 8 leases at 300 seconds causes 69,120 events and 622,080 no-conflict calls per 30 days.
2. **Batch all active lease renewals in one atomic transition:** selected as the smallest safe improvement using the existing CAS/event journal. It preserves monotonic fencing and all-or-nothing renewal.
3. **GitHub Actions concurrency as the only lock:** not selected as a durable lease/fencing replacement. Concurrency groups serialize workflow runs but do not themselves provide this project's durable monotonic fencing token, journal, or worker identity checks.
4. **GitHub Issues/Artifacts/Actions cache as lock database:** rejected as primary lock store because these primitives do not provide the same atomic fast-forward compare-and-swap semantics and/or mutable durable transactional state.
5. **Cloud database or external coordinator:** deferred because no account, free-tier eligibility, billing status, or owner-approved service activation has been verified. No new service is required for this phase.

## Request model

Assumptions: 8 continuously active leases, one batch renewal every 300 seconds, 30 days, 9 REST calls per successful no-conflict commit.
- 2,880 batch renewals per 30 days.
- 2,880 journal events.
- 12 chunks at 256 events/chunk.
- 25,920 no-conflict REST calls over 30 days.
- 36 no-conflict calls/hour.
- Worst-case five attempts for every batch: 129,600 calls over 30 days, 180 calls/hour.

Correction: compare the prior individual model carefully. Individual model = 8 × 2,880 = 23,040 mutations, 207,360 no-conflict requests, 864/hour. Batch model = 2,880 mutations, 25,920 calls, 108/hour. The ratio is 8x.

## Quota decision

Do not enable the persisted quota arbiter. Its reservations are written through the same CAS store and therefore self-consume the resource they meter. Do not claim an account-wide API or Actions-minutes budget from a repository-local ledger.

Next design option: use the actual GitHub response rate-limit headers as an observation signal, retain a local per-invocation hard request ceiling, and fail closed when remaining primary quota approaches a configured safety reserve. This is telemetry and admission protection, not a globally coordinated quota guarantee; other clients sharing the token may still consume quota between observations. No separate reservation write is required for this observation method.

## Safety

- No live writes to federation-locks branch.
- No federation clients or quota arbiter enabled.
- No provider inference, paid services, account upgrades, or spend.
- P59-003 remains IN_PROGRESS; P59-001 PAUSED; P59-002 BLOCKED.
- PCNE ₹0; authorized spend ₹0.
- CI and tests must pass before merge. No production claim or 7/30-day soak claim.

## Next

Phase 59.23: instrument actual response headers and per-invocation request counters; add bounded request ceiling and low-remaining fail-closed tests. Then run batch-heartbeat concurrency/failure tests and a non-production test-branch soak. Keep the production lock branch untouched.
