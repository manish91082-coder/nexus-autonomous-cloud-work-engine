# Phase 59.49 — provider response journal and settlement idempotency

**Mission:** P10CR / P59-003 only  
**Status:** implementation submitted for exact-head cloud CI  
**Branch:** `phase59-49-response-journal-settlement-idempotency`  
**Spend:** ₹0  
**Provider calls in CI:** deterministic mocks only  
**External network:** 0  
**Production flags:** OFF  
**AI inference:** disabled

## Baseline forensic findings

1. `#settle` serialized mutations transactionally and prevented a second charge by rejecting every non-`RESERVED` row. However, an identical retry after a committed settlement received a generic owner/state rejection rather than a replay-safe idempotent acknowledgement. A conflicting replay was not distinguished from a harmless duplicate.
2. The existing telemetry observation table preserved response-header evidence, including request provenance, but there was no compact reservation-level response receipt that could be queried as a single durable record after a Worker restart.

## Changes

### 1. Idempotent settlement
- An identical settlement replay for a reservation already in `SETTLED` returns `SETTLEMENT_ALREADY_APPLIED` without touching counters.
- A replay with a different bucket set or amount fails closed with `settlement idempotency conflict`.
- Comparison is key-order independent.
- Transaction serialization remains the single-writer boundary; concurrent identical settlements must produce exactly one `SETTLED` and one `SETTLEMENT_ALREADY_APPLIED` result, with one committed charge.

### 2. Durable provider-response receipt
- Add SQLite table `quota_provider_response_journal`, keyed by reservation ID.
- During authoritative `response_header` telemetry persistence, write a compact receipt in the same Durable Object SQLite transaction as the telemetry observation.
- Receipt records caller, request fingerprint, provider request ID (when present), HTTP status, endpoint, method, observation time, first linked observation ID and durable record time.
- No response body, token, secret or credential material is stored.
- Repeated telemetry buckets for the same response reuse the same receipt; a conflicting response receipt for the same reservation is rejected.
- Expose the journal in the existing authenticated snapshot for audit and recovery inspection.

## Runtime acceptance tests
- Identical settlement replay is acknowledged without a second quota charge.
- Conflicting settlement replay is rejected.
- Concurrent identical settlement calls serialize and charge once.
- End-to-end deterministic provider mock creates exactly one durable response receipt linked to the reservation and request fingerprint.
- Existing expiry, telemetry, ownership, no-replay and fail-closed contracts remain in the full regression suite.

## Evidence boundary
The receipt is persisted only when the Worker successfully writes response-header telemetry to the Durable Object. A hard process termination after the provider has returned but before the receipt write is committed cannot be made atomic with the external provider; that irreducible gap remains covered conservatively by lease expiry and uncertain-budget retention. These tests do not claim a provider-side transactional commit, physical-host crash proof, production deployment, live GitHub App, live provider traffic, AI inference or revenue.

## Next
Run exact-head Cloudflare Workers/workerd runtime and all required regression workflows. Do not merge unless every required check passes. If successful, reconcile master and proceed to a dedicated crash-window/recovery harness for the interval between external response arrival and durable receipt commit, with all live provider calls still disabled.
