# Phase 59.34 — Independent PostgreSQL Transactional Quota Store

**Mission:** P10CR / P59-003 swarm foundation  
**Implementation status:** PR branch; CI pending  
**Production feature flag:** OFF by default  
**Provider inference:** disabled  
**Spend:** ₹0

## Why this phase exists

Phase 59.32 and 59.33 supplied deterministic quota policy contracts but no shared transactional persistence. The earlier Git-ref quota arbiter remains disabled: Phase 59.21 source-derived accounting found its reservation mutation self-consuming and potentially underfunded. The quota ledger must not be stored in the same provider budget it controls.

## Implementation

- PostgreSQL is used as an independent transaction boundary. It is not SQLite, a Git ref, or an in-process lock.
- Provider quota identity is scoped by provider + credential + window + bucket.
- A trusted telemetry adapter registers/refreshes snapshots; this module performs no provider API calls.
- Multi-bucket admission locks all required rows in deterministic order and commits reservations in one SERIALIZABLE transaction.
- Serialization/deadlock conflicts receive bounded retries; exhaustion fails closed.
- Settlement is all-or-nothing and rejects measured usage above any reservation.
- Unknown outcomes move all affected reservations to UNCERTAIN_BUDGET_RETAINED.
- Telemetry refresh rebases the committed-since-observation counter to avoid double-subtracting usage already reflected in the fresh provider remaining count.
- Explicit `P10CR_QUOTA_STORE_ENABLED=true` is required in addition to constructor opt-in. Default is disabled.

## Verification target

A PostgreSQL 16 service in GitHub Actions exercises independent database connections. The 32-client race expects exactly 20 reservations of 20 units to succeed against 400 admissible units and 12 to fail closed. Other tests cover multi-bucket atomicity, telemetry freshness, duplicate IDs, ownership, settlement, uncertain outcomes and disabled-by-default behavior.

This is a same-database concurrent-client CI proof. It is **not** a proof of multi-region networking, provider deployment, high availability, backup/restore, failover or 7/30-day soak. Those remain later gates.

## Production blockers

- No PostgreSQL account/instance has been provisioned or connected.
- No provider-specific telemetry collector is implemented.
- No worker or publisher client is integrated.
- Feature flag remains off.
- No credentials or DSN are stored in the repository.
- No live LLM inference or paid fallback is enabled.

## Next gate

Pass exact-head PostgreSQL CI, review SQL/transaction invariants, then create a deployment-neutral owner approval packet for a genuinely independent zero-cost-eligible PostgreSQL control-plane service. Do not provision or connect an external account, accept terms, enter billing, or enable the feature flag without owner approval and verified zero-billing conditions.
