# P59-003 — Cloudflare Workers Free Plan owner action packet

**Purpose:** enable an owner-controlled, zero-cost hosted test endpoint for independent GitHub-hosted runner validation.  
**This is not an authorization to deploy, upgrade, accept terms, publish or spend.**

## Decision requested from owner

Confirm whether an existing Cloudflare account can be used for P10CR under the Workers Free plan and whether the account's total Workers/Durable Objects usage can be treated as an account-global budget.

Do not create or rotate accounts to bypass limits. If the existing account is Paid, contains unaccounted workloads or cannot be verified as Free, stop. No paid fallback is authorized.

## Owner-only checklist

1. In the Cloudflare dashboard, inspect the current account plan. Confirm it is **Workers Free**, not Workers Paid. Do not upgrade or enable a paid add-on.
2. Confirm the account has no other Worker/Durable Object workloads, or inspect aggregate account usage so the P10CR global budget includes all workloads. If other projects share the account and cannot be accounted for without changing them, stop.
3. Confirm the Durable Object namespace is SQLite-backed. Do not use legacy KV-backed Durable Objects.
4. Confirm there is no paid custom domain, paid runner, paid storage product or paid service dependency.
5. Review Cloudflare's current plan terms yourself. ChatGPT will not accept terms or make account declarations.
6. If and only if the account is Free and the owner approves a test-only endpoint, configure the dispatcher and SwarmRunDO as internal test services. Do not enable production mode.
7. Store the ingress HMAC secret and dispatcher RPC secret directly in Cloudflare's secret store. Never put them in GitHub source, workflow logs, artifacts or chat.
8. If independent GitHub-hosted runners need an endpoint, approve one signed test-only HTTP route. It is not a public product release or marketplace listing. Every request must pass HMAC verification and the P10CR/P59-003 envelope allowlist.
9. Confirm the GitHub workflow uses standard ubuntu-latest runners only. Do not select larger runners, upload artifacts, use Actions cache or enable paid add-ons.
10. Review the account usage dashboard before and after every test. Stop at 80% of the internal caps recorded in the Phase59.59 report.

## Published free limits and internal caps

Cloudflare Workers Free: 100,000 inbound requests/day and 10 ms CPU per invocation. Cloudflare Durable Objects Free: SQLite backend only; 100,000 requests/day; 13,000 GB-s/day duration; 5 million rows read/day; 100,000 rows written/day; 5 GB total stored data. Daily limits reset at 00:00 UTC. On Free, exceeding a limit causes further operations of that type to fail rather than silently moving to Paid.

Internal caps are 5% of published limits: 5,000 Worker requests/day; 5,000 DO requests/day; 650 GB-s/day; 250,000 rows read/day; 5,000 rows written/day; 250 MB stored data; 100 shadow dispatches/day. Stop at 80% of any internal cap. These are guardrails, not Cloudflare entitlements.

GitHub standard-hosted runners in public repositories are free. Larger runners are billed. Artifact/cache storage has separate allowances and can accrue charges; this plan uses neither artifacts nor cache.

## Exact post-approval test

- Four independent GitHub-hosted standard Ubuntu runners.
- Four distinct worker IDs, four synthetic repository IDs and unique run IDs.
- One shared P10CR account-scope Durable Object.
- One-task lease race: exactly one winner.
- Shared quota race: 100 reservations against cap 8; exactly 8 admitted, 92 fail-closed.
- Inject eviction/restart, expired lease, stale fencing, duplicate delivery and timeout.
- Verify one canonical outcome, checkpoint recovery, event-chain integrity, no owner approval from compute identity, no external provider call and zero spend.

## Secrets and identity handling

- Do not send passwords, OTPs, cookies, recovery codes, private keys, API tokens or HMAC secrets to ChatGPT.
- The owner sets secrets directly in the Cloudflare dashboard and GitHub repository/environment secret settings.
- No account rotation, KYC bypass, secret rotation workflow or identity substitution is part of this packet.
- The compute/dispatcher identity must not have the approve action. The constrained publisher remains separate and inactive.

## Explicit non-actions

No account creation, KYC, legal acceptance, payment method change, paid upgrade, deployment, public route activation, GitHub App installation, publisher activation, AI inference, provider call, repository master merge, public release, signing or money movement has been performed.

## Official sources

- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/
- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions

The owner should verify the current account dashboard and official terms at the time of action. This packet is a technical instruction, not a financial or tax declaration.


## Additional prerequisite before any deployment

The current Phase59.56 quota ledger is scoped to a GitHub App installation and is not the Cloudflare account-wide Free-plan usage arbiter. Phase59.60 must first implement and test a separate account-scope platform budget object for P10CR. The 5% caps in this packet are proposed internal guardrails only until that implementation passes. Do not deploy the Worker or begin the soak before the account-scope budget is committed, tested and wired into every P10CR worker path.
