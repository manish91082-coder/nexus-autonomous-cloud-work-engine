# Phase 59.58 — durable mission dispatcher and specialist graph integration

**Mission:** P10CR / P59-003 only  
**Baseline master:** 8856bf908f93e265cefd5c739f7f46b3dd995b3c  
**Branch:** phase59-58-durable-dispatcher-shadow-integration  
**Status:** implementation candidate; exact-head CI pending  
**Spend:** ₹0  
**AI inference:** disabled  
**External provider calls:** 0  
**Production deployment:** OFF

## Objective

Connect the P10CR mission dispatcher to the existing project-cell SwarmRunDO and a deterministic ten-role specialist graph. Keep the provider quota ledger separate. This is a shadow/test integration, not a production scheduler or live AI-agent deployment.

## Implemented design

- A service-binding-only internal Worker entrypoint accepts one strict task type: P59_003_SHADOW_DISPATCH for project P10CR.
- The dispatcher computes payload and policy SHA-256 fingerprints itself; callers cannot supply hashes, owner approval or execution permissions.
- A dedicated dispatcher HMAC identity can register, claim, checkpoint, complete and read tasks, but its action allowlist excludes approve and recover.
- The dispatcher uses the existing P10CR-project-cell SwarmRunDO; no provider quota object is called for this no-provider fixture.
- The lifecycle is register → snapshot/verify event chain → atomic claim → checkpoint → deterministic specialist graph → result checkpoint → complete → final snapshot/readback.
- A persisted specialist result checkpoint is hash-verified and reused after eviction/reclaim; the graph is not executed a second time after the result checkpoint is durable.
- Duplicate completed delivery is suppressed by the task idempotency key and terminal result ledger.
- The graph contains ten typed roles: evidence collection, research, red-team, payout eligibility, unit economics, rights/policy, engineering, QA, distribution readiness and revenue reconciliation.
- All incoming evidence and model-like text remains untrusted. In this phase every role returns HOLD without a trusted collector/owner attestation. The graph counts no PCNE and exposes no external side-effect capability.

## Security boundaries

- No global fetch, external network, live GitHub API, model inference, generated-code execution, publisher binding, repository write, account action or payment.
- Public routes are not configured. The Worker is disabled unless NEXUS_MISSION_SHADOW_ENABLED=true and a service binding plus dispatcher HMAC identity are present.
- The dispatcher identity cannot approve owner-gated work.
- The Worker only accepts P10CR/P59-003 shadow task envelopes; cross-project envelopes fail before registration.
- The quota Durable Object and task/run Durable Object remain separate.
- Other project repositories and their queues/workflows remain untouched and read-only.

## Acceptance tests

1. Full deterministic graph lifecycle with ten role outputs, all HOLD, PCNE ₹0 and duplicate suppression.
2. Process-termination simulation after durable result checkpoint, Durable Object eviction/reconstruction, expired-lease reclaim with a higher fencing token, checkpoint reuse without rerunning the graph, and stale-run write rejection.
3. Dispatcher caller cannot record owner approval.
4. Cross-project or unsupported task envelope rejected before registration.
5. Event-chain integrity and terminal result readback.

## Evidence boundary

Workerd CI can prove the Durable Object/service-binding path inside the test runtime. It does not prove a deployed Cloudflare Worker, independent physical-host atomicity, separate GitHub Actions workflow runs sharing a hosted namespace, live AI inference, production publisher operation, 24×7 SLA or revenue. Hosted setup remains owner-gated; account plan, free-tier eligibility, quotas, billing settings and zero-cost operation are not verified. No paid deployment is authorized.

## Next

After exact-head CI, proceed to Phase59.59: owner-approved independent-host tests, first bounded failure/contender tests, then 7-day and 30-day soak with explicit stop conditions and evidence export. Keep production flags OFF and P59-001 PAUSED until all P59-003 acceptance gates pass.


## Exact-head CI result — 18-Nov-2026

**Phase59.58 dedicated Workers/workerd workflow:** run [#44228723312](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44228723312) SUCCESS. Exact tested code head: `e3c7786c85c561c5c10c345e2826481e24aa3b34`. Four test files passed, 82/82 tests. The new `mission-dispatcher-runtime.test.mjs` contributed 6/6 tests.

**Phase59.35 full Workers/workerd regression:** run [#44228723269](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44228723269) SUCCESS, 82/82 tests. All 13 listed regression workflows for this PR head completed SUCCESS; the additional PostgreSQL transaction contract run [#44228723172](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44228723172) also completed SUCCESS. The 13 regression run IDs are 44228723231, 44228723114, 44228723031, 44228723069, 44228723319, 44228723337, 44228723126, 44228723206, 44228723271, 44228723122, 44228723075, 44228723172 and 44228723269.

The 6 new dispatcher tests prove: ten-role deterministic graph completion with all roles HOLD; duplicate completed delivery suppression without a new event; result-checkpoint reuse after Durable Object eviction and lease expiry; higher fencing token on reclaim; stale old-run checkpoint rejection; dispatcher cannot approve owner-gated work; unsigned ingress, oversized body and cross-project envelopes are rejected before registration. The total suite is 82/82.

The PR branch later received only control/registry/report/continuity commits after tested code head `e3c7786c85c561c5c10c345e2826481e24aa3b34`; no executable source or test changes were made after that tested head. Canonical master remains `8856bf908f93e265cefd5c739f7f46b3dd995b3c`; PR #44 is draft and unmerged.

**Master control-plane evidence:** Mission Worker #485 / run [#43998553989](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43998553989) SUCCESS on master HEAD 8856bf90; Mission Continuity Guard #288 / run [#43927317601](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43927317601) SUCCESS with 111 checks and zero errors on the same master HEAD.

## Acceptance boundary after CI

- Phase59.58 workerd shadow integration: PASS.
- Phase59.35 regression suite: PASS.
- Dispatcher and specialist graph are still shadow/test-only; the scheduled Python mission worker is not yet connected to a deployed Worker endpoint.
- No physical independent-host proof, hosted cross-run/cross-repository Durable Object proof, 7-day soak or 30-day soak.
- No Cloudflare deployment, GitHub App installation, publisher activation, AI inference, external provider call, public release, KYC, legal acceptance, billing or payment.
- P59-003 remains IN_PROGRESS and the sole active P0. P59-001 remains PAUSED; P59-002 remains BLOCKED.
