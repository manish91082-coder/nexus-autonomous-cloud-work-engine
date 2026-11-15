# Phase 59.40 — Telemetry-Driven Quota Admission

**Mission:** P10CR / P59-003 AI agentic swarm foundation  
**Status:** Merged to master via PR #18 at `893e7beb30adc3cdb7e0067b9070cb8322c9b83a`; exact runtime and contract CI PASS  
**Branch:** `phase59-40-telemetry-driven-admission`  
**Runtime head:** `7ebaf1ff34dd4468f7d180b93bc78811e426c47a`  
**Workers runtime CI:** [43709858465](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43709858465) — **35/35 tests PASS**  
**Ledger contract CI:** [43709858448](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43709858448) — **8/8 tests PASS**  
**Spend:** ₹0; **live API calls:** none; **production feature flag:** OFF

## Admission architecture implemented

- The reserve path no longer accepts caller-supplied bucket telemetry or caller-supplied costs.
- Provider limit, remaining, observed time and reset window are read from the authenticated `quota_telemetry_current` store.
- Operation-to-bucket costs are loaded from server-side `NEXUS_QUOTA_OPERATION_COSTS`; unknown operations fail closed.
- Local safety reserve, recovery reserve and maximum telemetry age are loaded from server-side `NEXUS_QUOTA_BUCKET_POLICIES`; caller input cannot lower reserves.
- Admission requires response-level or GraphQL telemetry authority (rank >= 80). A periodic `GET /rate_limit` overview alone is insufficient for admission.
- Stale, future, missing, expired-reset and identity-mismatched telemetry fail closed.
- All required resource buckets are checked before any counter mutation; a multi-resource reservation is all-or-nothing.

## Reset-window accounting

- Added `quota_bucket_counters` with composite identity `(bucket_id, provider_window_id)`.
- Each reservation stores the exact provider reset window for every resource bucket.
- A new provider reset window receives a separate counter row; old-window counters remain until their reservations settle or become uncertain.
- Settlement and uncertain-outcome retention update only the exact reserved provider window. An old-window settlement cannot debit a new window.
- Newer accepted telemetry rebases committed-since-observation accounting. Same-window pending reservations remain reserved.
- If a provider response's telemetry is linked to its reservation, settlement does not double-count the usage already reflected by that response snapshot. Without linked response telemetry, settlement conservatively increments committed-since-observation usage.

## Caller permissions refined

- Primary: reserve, settle, mark uncertain, snapshot, and submit periodic or response telemetry.
- Secondary: reserve, settle its own reservations, mark uncertain, and submit response telemetry linked to its own reservation. It cannot snapshot or mutate another caller's reservation.
- `recordTelemetry` from a secondary caller requires a live reservation owned by that caller, matching bucket and provider reset window; only response-level sources (rank >= 80) are accepted.
- Reservation ownership is checked on both telemetry linking and settlement.

This refines Phase59.37's initial secondary policy: allowing a worker to settle its own reservation is necessary to complete its own work safely; cross-caller ownership remains forbidden.

## Test evidence

Workers/workerd runtime: **35/35 PASS**.  
Quota contract unit tests: **8/8 PASS**.

Coverage includes:
- no caller-supplied costs or telemetry;
- server-side operation registry and local bucket policy;
- overview-only admission rejection;
- local safety/recovery reserve enforcement;
- atomic multi-resource admission;
- concurrent cross-Worker contention without oversubscription;
- duplicate reservation rejection;
- settlement and uncertain usage;
- newer telemetry rebase;
- old-window settlement isolated from new-window counters;
- expired reset and stale/future telemetry rejection;
- caller ownership, linked secondary telemetry and no double accounting;
- all previous HMAC, nonce replay, provenance, resource authority and reset-window regression tests.

## Explicit non-claims

- The operation-cost and bucket-policy environment maps are test fixtures, not a production endpoint registry.
- No production Worker has been deployed or connected.
- No live GitHub API request, credential, token, Cloudflare hosted resource, billing or model inference was used.
- The quota feature flag remains OFF outside the isolated test host.
- This does not establish a 24x7 SLA or production multi-region guarantee.

## Next phase — 59.41

1. Build the production-safe worker client contract around reserve → provider request → response telemetry linked to reservation → settle/mark uncertain.
2. Add a reviewed endpoint operation registry with source/evidence, query fingerprint where applicable, and explicit NO-GO for unknown costs.
3. Add reservation expiry and crash recovery for workers that die between reserve and settlement.
4. Add idempotent retry and duplicate-response handling.
5. Add independent-host concurrency and failure-injection tests against the same Durable Object namespace.
6. Keep production feature flag OFF until owner-approved zero-billing deployment, secret provisioning and independent-host proof are available.
