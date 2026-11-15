# Phase 59.41 — GitHub Quota Client Lifecycle and Reservation Recovery

**Mission:** P10CR / P59-003 AI Agentic Swarm Foundation  
**Status:** PR #20 merged to master at `c1dccb36dba3b0b65a6d7655cbc41e55dcb3815f`; all 13 PR checks PASS  
**Branch:** `phase59-41-quota-client-lifecycle`  
**PR:** [#20](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/pull/20) — merged
**Merge commit:** `c1dccb36dba3b0b65a6d7655cbc41e55dcb3815f`
**PR-head check SHA:** `94bf665eaceb48d8f34fd0dac7e6f5ae711fd9dc`  
**Latest test head:** `07c2b8c62e7f09501f05b436c5026706e841dfff`  
**Runtime tests:** 46/46 PASS
**Latest Workers runtime CI:** [43713060718](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43713060718) — SUCCESS, 46/46 tests
**PR regression matrix:** 13/13 checks PASS on PR head `94bf665eaceb48d8f34fd0dac7e6f5ae711fd9dc`  
**Spend:** ₹0; **live GitHub API calls:** 0; **live inference:** disabled; **production feature flag:** OFF

## 1. Production-safe client lifecycle

Added `cloud/swarm/quota-ledger-client.mjs` with a single-attempt guarded request sequence:

1. Validate the request against the reviewed endpoint registry.
2. Require a caller-stable request ID and derive a durable reservation ID.
3. Send an HMAC-authenticated `reserve` RPC to the quota Durable Object.
4. If admission is not `RESERVED`, do not send the provider request.
5. Send exactly one request to `https://api.github.com`; redirects are manual and are not followed automatically.
6. Parse provider response `x-ratelimit-*` headers and submit telemetry linked to the reservation.
7. Settle using the full server-authorized reservation until endpoint-specific actual costs are independently measured.
8. On network ambiguity, telemetry-write failure or settlement-acknowledgement failure, mark the reservation uncertain. Never release capacity on an unknown outcome.

The client does not automatically retry provider requests. Reusing the same stable request ID returns duplicate suppression and does not issue a second provider call.

## 2. Reviewed endpoint operation registry

Added `cloud/swarm/github-operation-registry.mjs`.

Initial allowlist is intentionally narrow:

- Operation: `github.rest.repositories.get.v1`
- Method/path: `GET /repos/{owner}/{repo}`
- Resource: `core`
- Reservation: 1 primary core request unit
- Query parameters: none; query-bearing variants are NO-GO
- Search, code search, GraphQL, mutations and every unregistered route: NO-GO

The registry creates a SHA-256 request-shape fingerprint from registry version, HTTP method, canonical endpoint template and normalized query shape. The fingerprint is persisted with the reservation. The Durable Object independently verifies that a fingerprinted operation exists in the reviewed registry and that the server-side operation-cost map exactly matches its registered resource and units.

This is a primary-rate-limit unit model only. It is not a secondary-rate-limit point-cost model and must not be interpreted as a universal cost table.

## 3. Reservation lease and crash recovery

- Added `expires_at_epoch` with a non-destructive SQLite migration for existing reservation rows.
- Default lease is 300 seconds; accepted server configuration is bounded to 30–900 seconds.
- A primary-only expiry sweep transitions abandoned `RESERVED` rows to `UNCERTAIN_BUDGET_RETAINED`.
- Every reserved bucket's units move from `reserved_units` to `uncertain_units`; quota is never silently released.
- The sweep runs before a new reservation is admitted and is also exposed as a primary-only maintenance action.
- Duplicate suppression runs after the identity-scoped expiry sweep, so a retry with an expired stable request ID cannot replay the provider request.

Uncertain usage remains charged until a separately audited reconciliation process proves the actual provider outcome. Lease expiry is not evidence that the request was never executed.

## 4. Runtime test coverage

The suite includes:
- successful reserve → provider response → linked telemetry → settlement;
- no provider request when admission is unavailable or telemetry authority is insufficient;
- network failure after request initiation → uncertain budget retention;
- response telemetry write failure → uncertain budget retention;
- settlement acknowledgement failure → uncertain budget retention;
- duplicate stable request ID → no second provider call;
- mandatory caller-stable request IDs;
- non-GitHub host rejection and manual redirect handling;
- unknown endpoint and unreviewed query shape NO-GO;
- server-side rejection of a fingerprinted operation outside the registry;
- real 30-second test lease expiry, duplicate retry, automatic expiry sweep and uncertain-budget preservation;
- existing authentication, replay, telemetry, reset-window, cross-Worker and quota contention regressions.

All provider fetches in tests are mocked. CI does not contact GitHub's API.

## 5. Evidence basis and limitations

Official GitHub documentation:
- REST primary limits count requests over time and distinguish special search limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- REST response headers describe the limit, remaining, used, reset and resource; GitHub identifies response headers as the live authority: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Repository metadata endpoint: https://docs.github.com/en/rest/repos/repos
- Search resource families are distinct from core: https://docs.github.com/en/rest/rate-limit/rate-limit
- GraphQL has its own point-based primary limit and query-cost model: https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api

Explicitly not implemented or proven:
- Secondary-rate-limit controller, `Retry-After` pacing and cross-endpoint concurrency budgeting.
- Search/code-search or GraphQL cost models.
- More than the single reviewed repository GET endpoint.
- Physical independent-host or multi-region contention proof.
- Lease renewal/heartbeat for long-running provider operations.
- Production worker integration or hosted deployment.

No Cloudflare hosted resource, namespace, secret, GitHub token, billing, external account, live provider request or model inference was activated. The client is a tested foundation module, not yet wired into mission workers. Production feature flag remains OFF.

## 6. Next phase — 59.42

1. Build a secondary-rate-limit controller for `403/429`, `Retry-After`, concurrency and exponential backoff without replaying ambiguous mutations.
2. Expand the endpoint registry one endpoint at a time using official endpoint documentation and observed response telemetry; search and GraphQL remain separate resource models.
3. Add lease renewal/heartbeat and an audited reconciliation path for uncertain reservations.
4. Add independent-host contention/failure-injection evidence where a genuinely independent runtime is available.
5. Integrate the client into one read-only swarm worker in mocked/shadow mode, keeping all production flags OFF.
6. Preserve owner approval for credentials, hosted deployment, billing, public release and AI-provider activation.
