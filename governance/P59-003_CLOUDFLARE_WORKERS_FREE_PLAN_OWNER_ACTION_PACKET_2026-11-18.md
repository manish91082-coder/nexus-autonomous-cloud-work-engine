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


## Phase59.61 — dispatcher budget binding and settlement prerequisite (19-Nov-2026)

The P59-003 shadow dispatcher now requires a separate `PLATFORM_BUDGET` Durable Object namespace in addition to `SWARM_RUNS`. A missing/disabled budget binding returns `WAITING_FOR_OWNER_CONFIGURATION`; the dispatcher does not register or claim work without a budget reservation.

The tested shadow path:
1. reserves the server-owned resource vector for `P10CR/P59-003/P59.61` before task registration or claim;
2. derives a stable execution identity from the task ID, payload hash and policy hash so retries across workflow runs reuse the same reservation;
3. renews the budget lease before the durable claim;
4. writes the specialist result checkpoint and durable completion;
5. reads back the final task record and event-chain validity;
6. settles the budget reservation only after that readback;
7. reconciles an ambiguous settlement acknowledgement by re-reading the idempotent reservation; uncertain execution is never released or automatically retried.

The dispatcher identity is restricted to reserve, heartbeat, settle and snapshot. It cannot approve owner gates, write repository contents, publish, execute generated code, call an AI provider or move funds. The compute Worker has no publisher binding.

Candidate evidence: draft PR #46, branch `phase59-61-budget-dispatcher-integration`. Final dedicated Workerd integration tests passed 4/4 and full swarm runtime regression passed 82/82 in run 44453046636. The tested PR head is `bd39391cab62eb69b24d5cf5ffc76248d625225d` and the Actions merge ref is `f0f97364a454a66fbf79fa3e49b73f07572d8e95`. No live Cloudflare account test or production deployment is implied.

### Updated owner setup boundary

After the owner independently verifies Workers Free eligibility and aggregate account usage, the owner may configure the existing SQLite-backed `P10CR-account-platform-budget-v1` namespace and bind it as `PLATFORM_BUDGET` to the P10CR dispatcher. The owner must set the budget RPC caller identity/secret directly in Cloudflare's secret store and preserve the dispatcher-only action allowlist. Do not copy secrets into GitHub source, Actions logs, artifacts or chat.

The owner must verify that the budget namespace and every P10CR dispatcher instance use the same account-scope Durable Object namespace. If the account contains unaccounted workloads, if the plan is not Free, or if namespace sharing cannot be proven, stop. No paid fallback or account rotation.

**No deployment, secret configuration, endpoint activation, terms acceptance, account change or spend has been performed.** The internal 5% resource caps and 80% stop thresholds remain proposed guardrails pending live owner dashboard verification.


## Phase59.64B hosted-proof readiness update (23-Nov-2026)

- Candidate code head `3de92c7eb32ae594d3ea3f6da141a211a0ae6cb5` passed push #45106578746 and PR #45106583941. Final candidate checkpoint `e872f34afdbeae9350e84198d178fce63033bafd` passed #45107001561. All were SUCCESS: 32/32 offline, YAML PASS, 165-package lockfile integrity, 83/83 Workers runtime, 1/1 Workerd.
- Server now verifies the actual settled seed reservation and all earlier host-slot reservations against the exact supplied workflow-run IDs and synthetic repository aliases before accepting a host. Seed/replay payloads remain identical for idempotency. Snapshot/overflow is rejected until all four host slots are settled and the snapshot run ID is distinct.
- Synthetic Workerd rejects pre-seed replay, premature overflow, forged seed, premature host2/host3, swapped host IDs and swapped snapshot IDs; sequential host1–4 then settles, overflow1–3 settle and overflow4 is denied by the shared cap. Final readback: eight settled, zero reserved, zero uncertain, six run IDs, two repositories, valid event chain.
- This remains Workerd synthetic evidence only. No Cloudflare account was accessed or verified, no namespace was created/bound, no Worker was deployed, no endpoint was called and no secret was configured.
- Owner must still verify the existing Workers Free plan and aggregate account usage, prove one shared test-only Durable Object namespace across all workflow runs, configure the exact endpoint hostname and required-reviewer GitHub Environment, then approve the six separate manual workflow runs. No paid fallback, account rotation or hidden billing.


## Phase59.64C synthetic concurrency acceptance (23-Nov-2026)

- [PR CI #45107642156](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45107642156) passed on code head `9868b642a57caa697dd60f740d3664bcdab50087`: 32/32 offline, YAML PASS, lockfile 165, Workers 83/83, Workerd 1/1.
- Workerd proved one winner for concurrent host-slot claims and one winner for competing snapshot runs; losing snapshot run could not split overflow. Final synthetic ledger readback: eight settled, zero reserved, zero uncertain, six run IDs, two repositories, valid event chain.
- This remains synthetic evidence. No live Cloudflare account, deployment, endpoint request or namespace binding occurred. Owner must still verify the existing Workers Free plan and aggregate account usage, configure one shared test-only Durable Object namespace across the six runs, exact hostname pin and required-reviewer GitHub Environment before authorizing the six manual runs.
