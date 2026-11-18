# Phase 59.59 — zero-cost hosting eligibility and independent-host validation plan

**Mission:** P10CR / P59-003 only  
**Date:** 18-Nov-2026  
**Status:** research complete; owner-gated deployment not started  
**Spend:** ₹0  
**AI inference:** OFF  
**Production deployment:** OFF  
**Canonical master baseline:** 8856bf908f93e265cefd5c739f7f46b3dd995b3c

## Decision

A zero-cost-first hosted validation path is technically available on Cloudflare Workers Free using SQLite-backed Durable Objects, subject to owner confirmation that the existing account is actually on Workers Free and its account-wide usage is not shared with unaccounted workloads. No Paid plan, upgrade, KV-backed Durable Object, larger GitHub runner, paid add-on or alternate-account rotation is permitted.

The current Phase59.58 workerd evidence is not a deployed multi-host proof. A hosted endpoint and owner-controlled secrets are prerequisites. Do not deploy or expose an endpoint until the owner completes the action packet.

## Official primary-source findings

### Cloudflare Workers Free

Cloudflare's Workers pricing documentation, last updated 13-Nov-2026, states that Workers Free is available by default and includes 100,000 inbound Worker requests per day, no duration charge and 10 ms CPU per invocation. The Free plan has limited usage; the account must remain on Free.  
Source: https://developers.cloudflare.com/workers/platform/pricing/

### Cloudflare Durable Objects Free

Cloudflare's Durable Objects pricing documentation, last updated 13-Nov-2026, confirms:
- Durable Objects are available on Workers Free.
- Workers Free supports SQLite-backed Durable Objects only.
- Free limits: 100,000 DO requests/day; 13,000 GB-s/day duration; 5 million SQLite rows read/day; 100,000 rows written/day; 5 GB total SQLite stored data.
- Daily limits reset at 00:00 UTC.
- On Workers Free, exceeding a free limit causes further operations of that type to fail with an error; it does not silently upgrade the account to Paid.
- Each RPC method call on a Durable Object stub is counted as one request.
- Storage is metered; deletes count as writes; stored data is billed until removed on Paid plans.

Source: https://developers.cloudflare.com/durable-objects/platform/pricing/

### GitHub Actions public-repository runners

GitHub documents standard GitHub-hosted runners in public repositories as free independently of included private-repository compute. Larger runners are billed even for public repositories. Artifact and cache storage have separate allowances and can accrue charges.  
Source: https://docs.github.com/en/billing/concepts/product-billing/github-actions

The canonical repository is public. The proposed soak must use standard ubuntu-latest runners only, with no larger runners, no artifact upload, no cache action and no paid add-on.

## Zero-cost architecture decision

- Use one existing owner-controlled Cloudflare Workers Free account; do not create/rotate accounts to bypass limits.
- Use SQLite-backed Durable Objects only. The existing SwarmRunDO and quota DO already use SQLite.
- Keep P10CR as the only integrated project. Other project repositories and queues remain untouched/read-only.
- Because Cloudflare Free limits are account-wide, owner must confirm either (a) this account is dedicated to P10CR or (b) aggregate usage from all existing Workers/DOs is visible and included in the account-global budget. If neither is true, do not deploy.
- Use a signed, test-only HTTP ingress for independent GitHub-hosted runners. No marketing, marketplace listing or public product release. HMAC ingress remains mandatory.
- Keep the scheduled Python worker disconnected until the endpoint, identity, quotas and read-only permissions are validated.
- No LLM/provider inference in Phase59.59. Specialist graph remains deterministic and HOLD-only.

## Internal guardrails — 5% of published Free limits

These are deliberately stricter internal caps, not Cloudflare allowances:

| Resource | Published Free limit | Internal daily/total cap | Stop at 80% of internal cap |
|---|---:|---:|---:|
| Worker inbound requests | 100,000/day | 5,000/day | 4,000/day |
| Durable Object requests | 100,000/day | 5,000/day | 4,000/day |
| DO active duration | 13,000 GB-s/day | 650 GB-s/day | 520 GB-s/day |
| SQLite rows read | 5,000,000/day | 250,000/day | 200,000/day |
| SQLite rows written | 100,000/day | 5,000/day | 4,000/day |
| SQLite stored data | 5 GB total | 250 MB total | 200 MB |
| Shadow dispatches | Not a platform quota | 100/day | 80/day |
| Worker CPU | 10 ms/invocation | target ≤5 ms | any measured >8 ms blocks rollout |

All caps are account-global for the P10CR deployment, not per repository, worker identity or run. The arbiter must reserve from a single account-scope bucket before any task work. If the account cannot be dedicated or fully accounted, the gate remains closed.

## Independent-host test plan

After owner approval and Free-plan verification:

1. Deploy only the test-only SwarmRunDO host and signed shadow dispatcher. Keep the production feature flag OFF.
2. Use a single authenticated internal test endpoint. Store ingress and RPC secrets only in Cloudflare/GitHub secret stores; never in source, artifacts or chat.
3. Launch four independent standard GitHub-hosted Ubuntu runners in a matrix. Give each a distinct worker identity, synthetic repository identity and run ID; all target the same P10CR account-scope Durable Object.
4. First test: four hosts contend for one task. Exactly one lease holder; all other claim attempts are BUSY or stale-fenced. Verify one task/run outcome, one terminal result, monotonic fencing and a valid event chain.
5. Second test: 100 concurrent quota reservations across four synthetic repository identities and distinct run IDs against a deliberately small shared cap of eight. Expected: exactly eight admissions and 92 fail-closed rejections; never 9 or more. No provider call is made.
6. Inject process termination, request timeout, duplicate delivery, DO eviction, lease expiry and stale old-run writes. Verify checkpoint recovery, no double completion and no oversubscription.
7. Reconcile account usage before/after each run. Any unexpected billing, quota ambiguity, event-chain break, stale-write acceptance or usage above 80% of an internal cap stops the experiment.

## Soak sequence

- Only after independent-host tests pass: 7-day soak, one synthetic health/dispatch cycle every 15 minutes (96/day maximum), with daily reconciliation and automatic stop conditions.
- Only after the 7-day review passes: 30-day soak at the same bounded rate.
- The soak is infrastructure validation, not proof of 24×7 SLA or AI autonomy. No live revenue tasks, external provider calls, publication or account actions are included.
- Retain compact event evidence in the canonical repository; do not upload large artifacts or use Actions cache. Preserve append-only ledger integrity.

## Stop conditions

Immediately disable the test flag and stop new reservations if:
- Workers Paid or any paid add-on is detected;
- account-wide usage cannot be reconciled;
- any internal cap reaches 80%;
- CPU exceeds 8 ms per invocation;
- an operation unexpectedly incurs or could incur non-zero spend;
- quota admission exceeds the shared cap;
- duplicate completion, stale fencing acceptance or invalid event-chain verification occurs;
- ingress authentication, owner approval or project isolation fails;
- a test would require a KYC, legal acceptance, public release, private key, payment or money movement.

## Next

Owner reviews the exact action packet. Only after explicit approval may a separate Phase59.60 deployment/test task be opened. P59-003 remains the sole active P0; P59-001 remains PAUSED and P59-002 BLOCKED.


## Important quota-scope gap before deployment

Phase59.56 proves that two synthetic repository identities and four run envelopes share one GitHub App installation quota partition in the existing quota Durable Object (16 attempts: 2 admitted/settled, 14 fail-closed). That is not a physical-host test and it is not the Cloudflare account-wide Workers Free budget.

Cloudflare's Free limits are account-wide. The current GitHub API quota ledger is installation-scoped and its operation registry is GitHub-specific. It does not yet enforce the Cloudflare account's Worker requests, Durable Object requests, SQLite usage or stored-data budget. Phase59.60 must implement and workerd-test a separate account-scope platform budget arbiter before any hosted deployment. The internal caps in this report are proposed guardrails, not yet enforced quotas. No account-scope claim is considered proven until the same budget object is shared across all P10CR worker/run/repository identities and tested for atomic oversubscription.
