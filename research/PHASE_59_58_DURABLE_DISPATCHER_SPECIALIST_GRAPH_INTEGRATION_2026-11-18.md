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

Workerd CI can prove the Durable Object/service-binding path inside the test runtime. It does not prove a deployed Cloudflare Worker, independent physical-host atomicity, separate GitHub Actions workflow runs sharing a hosted namespace, live AI inference, production publisher operation, 24×7 SLA or revenue. Hosted setup remains owner-gated because Cloudflare Paid starts at $5/month and this mission authorizes ₹0 spend by default.

## Next

After exact-head CI, proceed to Phase59.59: owner-approved independent-host tests, first bounded failure/contender tests, then 7-day and 30-day soak with explicit stop conditions and evidence export. Keep production flags OFF and P59-001 PAUSED until all P59-003 acceptance gates pass.
