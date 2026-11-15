# Phase 59.42 — GitHub Secondary Rate-Limit Controller

**Mission:** P10CR / P59-003 AI Agentic Swarm Foundation  
**Status:** PR #21 merged to master at `7b31d8c0945cb7eb6db93290901683c8711350cf`; all 13 PR checks PASS  
**Branch:** `phase59-42-secondary-rate-limit-controller`  
**PR:** [#21](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/pull/21) — merged
**Merge commit:** `7b31d8c0945cb7eb6db93290901683c8711350cf`
**Exact tested head:** `3df2a7121262beefd3f32e07cf0d179c99c4b274`  
**Runtime CI:** [43713811451](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43713811451) — SUCCESS, 53/53 tests
**PR regression matrix:** 13/13 checks PASS on PR head `0b61ac645718899ae93f7cf80b5244a9a01ce832`  
**Spend:** ₹0; **live GitHub API calls:** 0; **live inference:** disabled; **production feature flag:** OFF

## 1. Response classification and cooldown

Added `cloud/swarm/github-secondary-rate-limit.mjs`.

- Classifies only HTTP 403/429 as candidates; a permission-only 403 without rate-limit evidence is not throttling.
- Reads `Retry-After` as delta seconds or HTTP date.
- Treats `x-ratelimit-remaining: 0` plus a future reset as primary exhaustion.
- Recognizes secondary-limit/abuse messages and 429 responses.
- Uses at least 60 seconds for secondary throttling without an explicit Retry-After.
- Uses bounded exponential backoff: 60, 120, 240, 480, then 900 seconds maximum.
- Never retries a provider request automatically.

The client records a rate-limit event before telemetry settlement. If cooldown persistence fails, the reservation is marked uncertain. The original 403/429 response is returned to the worker.

## 2. Durable shared controls

Extended the SQLite Durable Object with:
- `quota_secondary_control`: credential-scoped cooldown and repeated-secondary-hit state.
- `quota_secondary_inflight`: active request leases for reviewed operations.
- `quota_secondary_endpoint_points`: rolling 60-second endpoint point accounting.

Admission checks run atomically inside the existing Durable Object transaction:
1. active credential cooldown;
2. abandoned reservation expiry;
3. duplicate reservation suppression;
4. local in-flight cap;
5. rolling endpoint point cap;
6. primary telemetry/quota admission.

The default local policy is **20 concurrent registered requests** and **600 points/minute per registered REST endpoint**. These are conservative system policy values, not GitHub-published thresholds. Configuration is bounded to 1–80 in-flight requests and 1–800 endpoint points/minute. Test configuration lowers both caps to 2 to prove the gates deterministically.

For the currently allowlisted GET endpoint, the secondary point value is set to 1 based on GitHub's published general rule that most REST GET requests cost one secondary point. GitHub notes that some endpoints have different, unpublished point costs, so this is a general documented default rather than an endpoint-specific guarantee. The 403/429 cooldown remains the protective backstop.

## 3. Verification

Workers/workerd runtime CI passed **53/53 tests**:
- primary exhaustion versus secondary 403/429 classification;
- permission-only 403 does not create a cooldown;
- Retry-After seconds and reset handling;
- bounded exponential backoff;
- shared in-flight cap;
- rolling per-endpoint point cap;
- durable Retry-After cooldown blocks subsequent admission;
- primary reset cooldown blocks subsequent admission;
- real guarded client 429 response persists cooldown before settlement;
- all Phase 59.35–59.41 quota, authentication, telemetry, duplicate, expiry and recovery regressions.

All provider requests are mocked. No real GitHub API request occurs in CI.

## 4. Official evidence and policy interpretation

GitHub's REST rate-limit documentation states:
- REST and GraphQL share a maximum of 100 concurrent requests.
- REST endpoints have a 900-point-per-minute secondary ceiling; GraphQL has a separate 2,000-point ceiling.
- Most REST GET/HEAD/OPTIONS requests cost one secondary point, most mutations cost five, and some endpoint costs are not publicly shared.
- For 403/429, respect Retry-After; if primary remaining is zero, wait until reset; otherwise secondary throttling requires at least one minute, then exponentially increasing waits if failures continue.
- Continuing to send requests while rate limited may lead to integration bans.
- Response `x-ratelimit-*` headers are authoritative; `GET /rate_limit` may differ and itself can count against secondary limits.

Source: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

## 5. Explicit limitations

- The local concurrency cap applies only to requests routed through this Durable Object. It cannot see requests made by other apps or tokens outside this system.
- Only the one reviewed GitHub REST repository GET endpoint is enabled. Search, code search, GraphQL and mutations remain NO-GO.
- The one-point secondary cost is the documented general GET default, not an endpoint-specific published cost.
- No independent physical host or multi-region proof.
- No jittered retry scheduler; the client deliberately does not retry.
- No worker integration or production deployment. Feature flag remains OFF.
- No secrets, live API calls, billing, inference or spend.

## 6. Next phase — 59.43

1. Add lease renewal/heartbeat for long-running read-only worker operations without extending leases indefinitely.
2. Add audited uncertain-budget reconciliation that requires authoritative evidence before releasing any reserved/uncertain units.
3. Add independent-host contention/failure tests where a genuinely separate runtime is available.
4. Integrate the client into one read-only swarm worker in mocked/shadow mode.
5. Keep live credentials, hosted deployment, billing and provider inference behind explicit owner gates.
