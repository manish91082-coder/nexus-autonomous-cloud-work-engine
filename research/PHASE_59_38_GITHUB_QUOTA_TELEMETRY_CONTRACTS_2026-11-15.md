# Phase 59.38 — GitHub Quota Telemetry Contracts

**Mission:** P10CR / P59-003 AI agentic swarm foundation  
**Status:** Merged to master; deterministic CI PASS  
**PR:** [#16](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/pull/16)  
**Merge commit:** `6d9f0f7622464627bab103dad023390f8ae4d8f0`  
**Exact tested head:** `1585ac608a9229ff548d46089bb1033790a57c7b`  
**CI:** [43708502624](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43708502624) — 28/28 tests PASS  
**Spend:** ₹0; **live API calls:** none; **quota activation:** OFF

## Official evidence used

- REST rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- REST rate-limit endpoint/resources: https://docs.github.com/en/rest/rate-limit/rate-limit
- GraphQL rate limits and query costs: https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api

## Resource taxonomy: no invented Actions bucket

The parser treats `x-ratelimit-resource` and the `GET /rate_limit` resource map as the source of bucket identity. It supports resource families dynamically.

- `core`: non-search REST resources.
- `search`: REST search excluding code search.
- `code_search`: code-search resource.
- `graphql`: separate GraphQL primary point budget.
- `actions_runner_registration`: only the self-hosted Actions runner registration resource when GitHub reports it.
- `integration_manifest`, `dependency_snapshots`, `dependency_sbom`, `scim`, `code_scanning_autofix` and other returned categories are accepted dynamically.
- `source_import` is ignored because GitHub documents it as no longer used.
- Ordinary GitHub Actions REST endpoints are not guessed into a separate `actions` bucket; the response header identifies the resource actually charged.

## Implemented pure contracts

1. Parse `x-ratelimit-limit`, `remaining`, `used`, `reset` and `resource` from actual response headers, including native Fetch `Headers`.
2. Parse `GET /rate_limit` resource snapshots as lower-authority periodic telemetry. Per-response headers dominate disagreements.
3. Reconcile out-of-order observations, credential scopes and reset windows. A newer authoritative header may legitimately show higher remaining capacity; same-second observations use a conservative minimum.
4. Parse primary rate-limit errors even when GitHub returns HTTP 200 with an error message and `remaining=0`; honor `x-ratelimit-reset`.
5. Parse 403/429 throttle responses, honor `Retry-After`, use at least a one-minute retry floor when secondary limiting is suspected, and never claim a queryable secondary-limit status.
6. Separate primary REST request units, GraphQL primary points and secondary points.
7. Generic secondary-point defaults are provisional only: most REST GET/HEAD/OPTIONS cost 1, most REST POST/PATCH/PUT/DELETE cost 5; GraphQL non-mutations cost 1 and mutations cost 5. Endpoint-specific costs may differ and some are not public.
8. Admission remains blocked until endpoint-specific secondary cost evidence is supplied. GraphQL primary cost requires query-specific measured `rateLimit.cost` evidence.
9. `GET /rate_limit` is modelled as zero primary REST units but not zero secondary points.
10. Published secondary-limit ceilings are represented as local guardrails, not live telemetry counters.

## Published secondary-limit guardrails encoded

- 100 concurrent REST + GraphQL requests shared.
- 900 REST endpoint points per minute.
- 2,000 GraphQL endpoint points per minute.
- 90 seconds CPU per 60 seconds, with 60 seconds for GraphQL.
- 80 content-generating requests per minute and 500 per hour, with some endpoints lower.
- 2,000 OAuth token requests per hour.

These are published ceilings that may change; secondary-limit status is not directly queryable, and GitHub may impose undisclosed limits. The policy helper therefore marks them as local conservative guardrails, not authoritative live counters.

## Verification and limits

- Phase 59.38 deterministic Node 24 CI run [43708502624](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43708502624): **28/28 PASS**.
- Exact PR head had 14/14 checks successful, including workers runtime, quota contracts, quota budget, specialist contracts, journal, contention recovery, cloud soak, quota guard, PostgreSQL reference and telemetry contracts.
- No network requests, GitHub token access, credentials or live API calls were used in the tests.
- Parser and cost contracts are not yet connected to the Durable Object store or a production API client.
- No quota admission is enabled, no Cloudflare resource is deployed, and no live inference or revenue is claimed.

## Next phase — 59.39

1. Extend the Durable Object bucket schema with telemetry source, authority rank, provenance, freshness and last-reset fields.
2. Add authenticated `recordTelemetry` action with per-caller authorization and identity checks.
3. Enforce header-overview authority, stale/future/out-of-order rejection and reset-window rollover inside the transactional store.
4. Add provider response-hook interface to capture telemetry without logging tokens or request secrets.
5. Add tests for mixed resource families, regional remaining increases, same-second observations, expired windows, secondary cooldown and cross-caller telemetry updates.
6. Keep live provider credentials and feature flag disabled; use fixtures until an owner-approved zero-billing deployment path exists.
