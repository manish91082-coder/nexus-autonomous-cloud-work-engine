# PHASE 59.10 — CLOUD-ONLY ZERO-COST MULTI-CLOUD AUTONOMOUS SWARM & FAILOVER FINAL DESIGN
Date: 2026-11-14
Authority: MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V5.md
Canonical repository: manish91082-coder/nexus-autonomous-cloud-work-engine, branch master
Previous architecture: Phase 59.9 (superseded where it assumed optional laptop inference or a single-provider cloud wake-up path)
Status: ARCHITECTURE APPROVED FOR STAGED IMPLEMENTATION; NOT A DEPLOYMENT OR LIVE FAILOVER CERTIFICATION

## 0. Owner requirement and final decision

Owner requirement:
- No laptop, Windows, WSL, local Ollama, local CPU/GPU/RAM or home internet dependency.
- Entire system must run on free-of-cost infrastructure and open-source software.
- Maximum practical 24x7 autonomy.
- If any compute provider, queue, database, model API or service is down, blocked, rate-limited, quota-exhausted or suspended, move eligible work to another independent free resource.
- No paid fallback and no hidden billing.
- The project lead must preserve continuity and make the architecture decision.

**FINAL DECISION:** build a cloud-only, multi-provider, event-driven, active/standby autonomous system with a deterministic sovereign mission control plane, open-source agent graph, portable workers, multi-provider model routing, event-sourced recovery and independent health monitoring.

This is a best-effort resilience architecture, not a contractual 100% uptime guarantee. Zero-cost free tiers are revocable, quota-limited and do not offer a cross-provider SLA. If every eligible free resource is unavailable, acknowledged work must remain durably queued and resume later. Do not claim uninterrupted execution during total-provider outage.

## 1. Canonical mission and governance audit

V5 Master Constitution confirms:
- Goal: ₹10,00,00,000 cumulative Portfolio-Credited Net Earnings (PCNE) across the combined lawful self-serve portfolio, not GMV, valuation, downloads, forecasts or a single product.
- PCNE is credited only for genuine independent buyer payments evidenced in the owner's eligible seller/creator balance, net of applicable platform/payment/runtime costs, refunds, reversals and chargebacks. Bank settlement is tracked separately; never double-count a withdrawal.
- New spend ₹0 by default; no paid API, hosting, domain, subscription, runner, marketplace fee or chargeable test without explicit approval.
- Eligible lanes: self-serve software/SaaS, AI products, APIs, digital products and eligible IP licensing etc.
- Excluded core strategy: employment, gigs, freelance bidding, manual assignments, cold outreach/spam, fake traffic, recurring manual fulfilment, unauthorized scraping or platform-policy evasion.
- No product build/publication or customer commitment before V5 evidence, economics, payout and owner gates.
- Account creation, KYC, legal terms, secret access, payment setup, money movement and public release remain owner-gated.

Current canonical queue/state at audit:
- P59-003 IN_PROGRESS; P59-001 PAUSED pending safe swarm handoff; P59-002 BLOCKED pending product selection/V5 gates.
- Verified PCNE ₹0; authorized spend ₹0.
- Existing B3 parallel coordinator: 17 existing runtime tests + 7 coordinator tests passed. B3 workers are deterministic mocks, not live LLM agents.
- AI provider configured: NO. Live model inference: NOT proven. Production swarm deployed: NO.
- Current main worker workflow: five-minute scheduled bounded GitHub Actions job, max 8 minutes, ephemeral runner, sequential tests and one fail-closed AI packet. This is not a persistent daemon.
- Existing AI executor: Cloudflare Workers AI adapter, disabled unless owner-configured secrets; cap 6 calls/day, 30-minute minimum interval, 900 output tokens.
- Existing `cloud-work-engine/model_gateway.py`: OpenRouter free-route adapter exists, but is not unified with the Cloudflare executor and has no proven multi-provider failover.
- Existing `worker_tick.py`: validates/polls queue and emits heartbeat; it explicitly does not execute research or prove a continuously running process.
- Separate bounty/job/gig discovery workflows exist as manual-dispatch workflows. They must not be connected to P59 mission scheduling because V5 excludes these revenue paths.
- Current repo has no deployed Cloudflare/Oracle/GCP infrastructure evidence, no live provider dashboard proof and no end-to-end failover certification.

## 2. Repository and dashboard audit findings

Canonical repo tree inspected:
- `scripts/swarm_runtime.py`, `scripts/swarm_coordinator.py`, `scripts/ai_task_executor.py`, `scripts/worker_tick.py`, `scripts/mission_guard.py`
- `cloud-work-engine/model_gateway.py`
- `schemas/swarm-contracts-v1.schema.json`
- `control/mission_state.json`, `control/automation_queue.json`, `control/revenue_ledger.json`, `control/payout_registry.json`, `control/product_registry.json`
- `.github/workflows/mission-autonomous-worker.yml`, `.github/workflows/mission-continuity-guard.yml` and separate legacy manual workflows.

GitHub Actions dashboard checked:
- Worker #337, run 43621474821: SUCCESS on HEAD 3e194441ef6e8f4bb2b9d7aefbaaaf5bff639fba.
- Continuity Guard #96, run 43621474840: SUCCESS on the same HEAD.
- The runs prove repository CI and bounded queue poll, not live cloud deployment, model inference, persistent execution or provider failover.

External Oracle Cloud, Google Cloud and Cloudflare account dashboards were not accessible through connected tools; account existence, region, VM allocation, billing state, quota usage, keys, and deployment status are therefore UNVERIFIED. Do not claim those services are deployed.

## 3. Provider research and admission decisions (official published documentation reviewed 2026-11-14)

### 3.1 Compute

**GitHub Actions public standard runners — ADMIT as burst/ephemeral worker fabric**
- Official docs state standard GitHub-hosted runners for public repositories are free and unlimited.
- Standard Ubuntu runner: 4 CPU, 16 GB RAM, 14 GB SSD; ephemeral VM per job.
- Schedules have a minimum five-minute interval and may be delayed/dropped during high load; schedule can stop if associated actor account is suspended/deleted/deprovisioned.
- Use for deterministic research, code/test, packaging, worker jobs and recovery tasks. Not an always-on daemon or real-time SLA.
- Keep concurrency bounded (start 3–5 specialists), tasks short, idempotent and persist all outputs externally before runner exit.
- Public repository security: no secrets, private customer records, PII or unreleased proprietary data in logs/artifacts/commits.

Sources:
https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
https://docs.github.com/en/actions/how-tos/troubleshoot-workflows
https://docs.github.com/en/actions/concepts/billing-and-usage

**Oracle Cloud Always Free — CONDITIONAL compute candidate, not sole primary**
- Always Free Ampere A1 allocation: 1,500 OCPU-hours + 9,000 GB-hours/month, equivalent to up to 2 OCPUs and 12 GB RAM when used within the monthly free allowance; home-region capacity can be unavailable.
- Always Free Object Storage: 20 GB combined and 50,000 requests/month for Always-Free-only tenancies.
- Critical: Oracle may reclaim idle Always Free compute if over a 7-day period CPU p95 <20%, network <20%, and for A1 memory <20%.
- Therefore do not assume an allocated VM remains forever. Do not generate artificial load to defeat idle reclamation. Run genuine mission work when available; continuously back up state; treat the VM as replaceable compute.
- Account eligibility, capacity and any billing state require owner-controlled account/dashboard verification.

Sources:
https://www.oracle.com/cloud/free/
https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

**Google Cloud e2-micro — CONDITIONAL small standby**
- One eligible e2-micro in selected US regions, up to 30 GB standard persistent disk and 1 GB monthly outbound transfer under Free Tier.
- Very small VM; suitable only for minimal watchdog/dispatcher or recovery, not multi-agent heavy execution.
- Verify exact region, machine, disk, IP, network and billing eligibility; any non-free resource can incur charges. Do not assume India region is eligible.

Sources:
https://cloud.google.com/free
https://docs.cloud.google.com/free/docs/free-cloud-features

**Koyeb / Render / Hugging Face Spaces — NOT admitted as critical always-on compute**
- Koyeb free instance is 0.1 vCPU/512 MB, scales to zero after one hour and cannot be a Worker Service; docs say not for production.
- Render free web services have 750 workspace hours/month; when exhausted services are suspended, and free Postgres expires after 30 days.
- Hugging Face CPU Basic Spaces can sleep/are not a dependable always-on worker; free compute use is limited and hardware upgrades are paid.
- Keep only for optional demos/static assets if useful, never for mission queue or critical worker.

Sources:
https://www.koyeb.com/docs/reference/instances
https://render.com/docs/free
https://huggingface.co/docs/hub/spaces-overview

### 3.2 Event, dispatch and serverless

**Cloudflare Workers Free — ADMIT as lightweight event/wake-up plane, not compute daemon**
- 100,000 requests/day; 10 ms CPU per invocation; 128 MB memory; up to five Cron Triggers/account.
- Use webhook intake, heartbeat check, small dispatch logic, status endpoint and GitHub dispatch API.
- Not for heavy Python, browser automation, builds or local inference.

**Cloudflare Queues — ADMIT as short-lived dispatch transport, not source of truth**
- Workers Free queue message retention is 24 hours and fixed; messages expire. Use task IDs/pointers only.
- Durable task state and event journal must exist outside the queue.

**Cloudflare Workflows — OPTIONAL, quota/billing guarded**
- Free includes 3,000 steps/day and 1 GB-month storage; request/CPU and steps/storage are separate dimensions. Do not treat as unlimited.
- Use only for lightweight waits/retries/approval workflows after daily budget guard and measured pilot.

**Cloudflare D1/R2 — ADMIT as one storage failure domain**
- D1 free queries fail after daily row-read/write limits; stored data remains but queries stop until reset. Never rely on D1 as only state copy.
- R2 free allocation: 10 GB-month, 1 million Class A and 10 million Class B operations/month, egress free.
- D1 + R2 are both Cloudflare; do not count them as two independent providers.

Sources:
https://developers.cloudflare.com/workers/platform/limits/
https://developers.cloudflare.com/workers/platform/pricing/
https://developers.cloudflare.com/queues/platform/limits/
https://developers.cloudflare.com/workflows/reference/pricing/
https://developers.cloudflare.com/d1/reference/faq/
https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/
https://www.cloudflare.com/products/r2/

### 3.3 Storage and mission state

Use event sourcing and portable snapshots:
- Canonical business rules, task contracts and code remain in GitHub.
- Durable task/run event journal is append-only, versioned, content-hashed and idempotent.
- Primary hot metadata store may be D1 only after quota test; OCI SQLite WAL or equivalent is independent compute-side replica; OCI Object Storage and GitHub snapshots provide independent backup domains.
- No single provider's queue is the only record of acknowledged work.
- Store payload/artifact objects separately from small dispatch messages.
- Use unique event_id, task_id, idempotency_key, schema_version, sequence/epoch, parent_event_id, source_provider, created_at_utc, payload_hash and evidence refs.
- Merge duplicate deliveries idempotently. Rebuild materialized task state from journal.
- Failover uses at-least-once delivery + deduplication, not impossible exactly-once network semantics.
- External side effects are owner-gated; agents cannot execute payments, publish, accept terms, create accounts or send bulk outreach autonomously.

### 3.4 Model inference provider pool

**Primary policy: provider-neutral adapter registry, not one chosen fixed vendor.**
Candidate order for a first audited pilot:
1. Cloudflare Workers AI — existing code adapter; official free allocation 10,000 neurons/day; some models require paid billing. Select only models explicitly free on the account and enforce 0 spend.
2. OpenRouter Free — existing adapter; free variants capped at 20 RPM and 50 requests/day; buying $10 credits increases quota but is prohibited by zero-spend rule. Use only explicit free route/models and validate actual response model/pricing; no credits purchase.
3. Gemini API Free — selected models and account/model-specific RPM/TPM/RPD; free-tier content may be used to improve Google products. Public/non-sensitive data only, subject to current terms.
4. Groq developer/free access — model-specific RPM/RPD/TPM/TPD; exact quotas are account-visible and changeable. Admit only after current account quota and free billing eligibility are verified.
5. Deterministic no-model worker — always available when a reasoning provider is exhausted; handles parsing, validation, state transitions, retries, tests, calculations and queue maintenance.

Provider availability is dynamic. Registry stores eligibility, allowed model IDs, data policy, free cost status, quota headers, cooldown, region, health, last success and failure state. A provider is not enabled merely because its marketing page says "free".

Failure classification:
- 429/quota: mark WAITING_FOR_QUOTA until reset or try another verified free provider.
- 5xx/network/timeout: bounded retry then alternate provider.
- 401/403/account suspension/policy block: quarantine that adapter/account and stop; do not create alternate accounts, rotate identities or bypass provider enforcement. Other independently legitimate providers may continue with public lawful tasks.
- Unknown model price, billing uncertainty, payment method requirement or nonzero price: fail closed.
- No free model available: task remains durable WAITING_FOR_PROVIDER; deterministic work continues.
- No paid fallback, no auto-upgrade, no credits purchase.

Cloudflare Workers AI official free allocation: 10,000 neurons/day.
OpenRouter Free variants: 20 RPM / 50 RPD; 1,000 RPD only after purchasing $10 credits, prohibited.
Gemini Free: selected models; model/project-specific quotas; free-tier data-use disclosure.
Groq: account/model-specific limits shown in console.

Sources:
https://developers.cloudflare.com/workers-ai/platform/pricing/
https://openrouter.ai/collections/free-models/
https://openrouter.ai/pricing
https://ai.google.dev/gemini-api/docs/pricing
https://ai.google.dev/gemini-api/docs/rate-limits
https://console.groq.com/docs/rate-limits

**Open-source model gateway:** evaluate LiteLLM Router for adapter normalization, retries, cooldown and fallback; configure allowlist of explicitly free deployments only. Its fallback feature must be constrained so a free route can never fall back to a paid model. Existing custom gateway may be retained if simpler and safer. Do not deploy a new always-on proxy on a laptop.

Sources:
https://docs.litellm.ai/docs/router/learn/reliability
https://docs.litellm.ai/docs/router/learn/concepts

## 4. Final cloud-only target topology

### Control and orchestration
- Sovereign mission policy/control plane: existing Python contracts and state machine, portable and provider-neutral.
- LangGraph: open-source specialist graph runtime, introduced only after B4; graph state/checkpoints mapped to mission run IDs.
- GitHub repository: canonical code, governance, contracts and audit index.
- Cloudflare Worker: one lightweight watchdog/dispatcher when account eligibility verified.
- GitHub Actions: independent scheduled and event-triggered burst workers; minimum five-minute schedule and missed-run detection.
- OCI VM: optional long-running supervisor/worker pool if eligible; must be treated as reclaimable.
- Google e2-micro: optional independent low-capacity standby if eligible.
- No single cloud service is assumed always available.

### Specialist roles
1. Mission Supervisor / Portfolio Allocator.
2. Opportunity Scout (strict V5 exclusions).
3. Evidence & Research Analyst.
4. Market & Unit Economics Analyst.
5. Product Architect / Builder (only after V5 GO).
6. QA, Security & Independent Critic.
7. Growth & Distribution (only after release gate).
8. Revenue Operations / PCNE reconciler.
9. Independent Mission Auditor.
Logical roles are dispatched as isolated tasks; they are not nine always-running servers.

### Dispatch paths
- Path A: Cloudflare Cron/Queue -> durable task pointer -> GitHub workflow_dispatch or OCI worker.
- Path B: GitHub schedule/event independently scans durable journal and dispatches eligible tasks if Cloudflare is unavailable.
- Path C: OCI supervisor independently polls durable state/replica and claims eligible work if GitHub schedule is delayed.
- Path D: optional Google standby scans a read-only recovery feed when primary compute is unhealthy.
- Each path uses deterministic task IDs, leases/fencing epochs, idempotency keys and bounded claims. A missed wake-up is recovered by scanning the durable journal; queue messages are not the source of truth.

### State and failover
- Event-sourced task journal with schema version and SHA-256 payload integrity.
- D1 hot metadata (optional) + OCI SQLite WAL mirror + OCI Object Storage snapshots + GitHub versioned audit snapshots.
- Cloudflare D1 and R2 are one failure domain; Oracle compute and Object Storage are one provider domain; GitHub Actions and GitHub repo are one provider domain.
- Cross-domain backups must be independently readable and periodically restore-tested.
- No distributed transaction guarantee is claimed. Use append-only events, unique IDs, idempotent projection and explicit reconciliation.

## 5. Failover controller behavior

Health states:
`HEALTHY`, `DEGRADED`, `QUOTA_LOW`, `QUOTA_EXHAUSTED`, `UNAVAILABLE`, `AUTH_BLOCKED`, `POLICY_BLOCKED`, `RECOVERING`, `QUARANTINED`.

Signals:
- heartbeat freshness;
- endpoint health and bounded canary;
- HTTP status and Retry-After;
- remaining request/token/neurons quota;
- storage read/write errors and quota;
- worker start/completion time;
- lease age and backlog age;
- exact-head CI and continuity guard status;
- cost estimate and actual billed usage where available.

Policy:
- At 80% quota use: stop nonessential jobs and reduce concurrency.
- At 90%: switch eligible tasks to another verified free provider.
- At 100%/429: open circuit until reset; do not retry storm.
- For 5xx/timeouts: exponential backoff + jitter; try alternate independent provider after bounded retries.
- For 401/403, terms/account suspension or security warning: quarantine and require review; never evade blocks with account rotation.
- For storage/provider outage: write to local append-only spool if available; otherwise do not acknowledge task until a durable copy exists.
- Recovery: canary one read-only task, reconcile journal, then gradually restore normal concurrency.
- Failover must be tested by fault injection, not accepted from design alone.

## 6. Model gateway design

- Normalize provider requests/responses through a typed interface.
- Task classes: deterministic/no-model, lightweight extraction, research synthesis, code assistance, critic/review.
- Choose only providers/models whose current cost is explicitly zero and data policy is acceptable.
- Track per-provider RPM/RPD/TPM/TPD/neurons, reset time, response model ID, provider ID, token usage and cost.
- Enforce `max_cost_usd = 0` as a hard invariant at gateway and worker layers.
- Unknown provider, unknown price, paid-required model, nonzero cost, billing uncertainty or missing quota telemetry => reject/fail closed.
- Use data classification: public / internal / confidential / personal. Free providers with training-use terms receive public-only data.
- All outputs are untrusted drafts; evidence critic and deterministic validation decide task completion.
- No provider gets secrets, credentials, personal customer data or private financial records.

## 7. Dashboard: required operational control tower

Build a static/private-safe dashboard from sanitized metrics; no secrets, tokens or sensitive payloads.
Panels:
1. Overall mission state, current phase/task, PCNE, authorized spend.
2. Provider matrix: compute, model, database, queue, storage; status and failure domain.
3. Quota gauges and reset times.
4. Worker pool: active, idle, failed, timed-out, recovered.
5. Queue: READY, RUNNING, WAITING_FOR_PROVIDER, WAITING_FOR_QUOTA, DEAD_LETTER, age/backlog.
6. Failover timeline and last successful failover test.
7. Data replication/backup freshness and last restore test.
8. AI model calls, provider/model provenance, cost $0 audit.
9. Mission drift/V5 gate status and prohibited-lane alerts.
10. PCNE ledger: only verified receipts, with source evidence.
11. GitHub Actions worker/guard latest run and exact HEAD.
12. Uptime and missed-wakeup measurements over 7/30 days.

Dashboard hosting can be GitHub Pages or Cloudflare Pages static output, but control writes require authenticated, narrowly scoped API. Never expose secrets or private data in public pages. GitHub Actions dashboard was checked; Oracle/Google/Cloudflare account dashboards were not connected and remain UNVERIFIED.

## 8. Deployment and acceptance roadmap

### Phase B4 — Portable durable execution (next)
- SQLite WAL event journal and versioned run/task schemas.
- Process-isolated worker supervisor, hard timeout/termination and resource bounds.
- Atomic checkpoint, resume, lease/fencing and idempotent replay.
- Duplicate delivery, crash windows, stale lease, corruption, provider timeout and quota tests.
- No laptop runtime, no LLM provider enablement, no cloud account setup yet.
- Exact-head CI + Continuity Guard.

### Phase C — LangGraph mock specialist graph
- Pin dependency and lockfile.
- Supervisor -> three parallel mock specialists -> evidence aggregator -> critic -> typed result.
- Map LangGraph checkpoint IDs to mission run ID and portable event journal.
- Test retries, interrupts, resume, merge conflicts, graph version migration and prompt-injection payloads.
- No hosted model until mock graph and B4 pass.

### Phase D — Model provider failover
- Implement provider registry and strict zero-cost LiteLLM/custom router.
- Add Cloudflare AI, OpenRouter free, Gemini free and Groq only after account-specific eligibility/terms/quota checks.
- Fault-inject 429, 5xx, timeout, 401/403, unknown price and provider shutdown.
- Prove no paid fallback and no task loss.
- Public-only prompt data for providers whose free-tier terms may use content for product improvement.

### Phase E — Cloud-only multi-provider pilot
- Owner-controlled eligibility check for OCI Always Free and Google e2-micro; do not assume account access.
- Deploy portable worker container to OCI if free allocation exists; configure backup/restore and idle-reclamation handling.
- Deploy Cloudflare lightweight event/watchdog only after zero-billing/account-plan guard.
- Wire GitHub Actions as independent burst worker and schedule fallback.
- Keep GCP e2-micro as optional low-capacity standby only if eligible.
- Deploy event journal replicas and verify provider-domain separation.
- No persistent paid service and no laptop dependency.

### Phase F — Operational dashboard and failover drills
- Static/private-safe dashboard from real sanitized metrics.
- Simulate Cloudflare down, OCI VM reclaimed, GitHub schedule missed, D1 quota exceeded, model 429, model 403, provider timeout, corrupted snapshot and duplicate task.
- Verify another independent free path claims eligible tasks.
- Verify no task loss, no duplicate external side effect and no paid usage.
- 7-day soak test then 30-day reliability test.
- Report observed availability and recovery, not a promised SLA.

### Phase G — Revenue loop
- Resume P59-001 only after safe swarm handoff and V5 queue/state reconciliation.
- Re-evaluate the largest credible portfolio revenue sources using evidence and buyer economics.
- One active product build maximum; no product build until V5 gates pass.
- Distribution, payout and PCNE reconciliation require actual platform/customer evidence.
- No job/gig/bounty paths.

## 9. Green-light audit

**GREEN — ARCHITECTURE AND RESEARCH DECISION.**
Approved:
- Cloud-only; laptop excluded.
- Zero-cost-first and open-source software.
- Multi-provider active/standby compute and inference.
- GitHub Actions burst workers; Cloudflare lightweight event plane; conditional OCI and GCP VM candidates.
- Event-sourced durable state, idempotency and cross-provider backups.
- LangGraph after B4; optional LiteLLM/custom zero-cost router.
- Fail-closed cost policy and explicit owner gates.

**NOT GREEN — PRODUCTION DEPLOYMENT.**
Not yet proven:
- OCI/GCP accounts, free allocation and billing state.
- Cloudflare account, Workers AI and quotas.
- Cross-cloud secrets and endpoints.
- Actual model-provider accounts and free quotas.
- Live automatic compute failover.
- Live database restore/failover.
- Live 24x7 soak test.
- Live AI specialist execution.
- Real revenue/PCNE.

No production deployment may be declared until these tests pass. This is the final approved architecture; deployment readiness remains conditional on owner-controlled account eligibility and technical proof.

## 10. Official source register

Oracle:
- https://www.oracle.com/cloud/free/
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

Google:
- https://cloud.google.com/free
- https://docs.cloud.google.com/free/docs/free-cloud-features

GitHub:
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/actions/how-tos/troubleshoot-workflows
- https://docs.github.com/en/actions/concepts/billing-and-usage

Cloudflare:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/queues/platform/limits/
- https://developers.cloudflare.com/workflows/reference/pricing/
- https://developers.cloudflare.com/d1/reference/faq/
- https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://www.cloudflare.com/products/r2/

AI:
- https://openrouter.ai/collections/free-models/
- https://openrouter.ai/pricing
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://console.groq.com/docs/rate-limits
- https://docs.litellm.ai/docs/router/learn/reliability

Rejected/limited compute:
- https://www.koyeb.com/docs/reference/instances
- https://render.com/docs/free
- https://huggingface.co/docs/hub/spaces-overview

## 11. Final project lead decision

The Phase 59.10 cloud-only multi-cloud failover architecture supersedes Phase 59.9's laptop-optional wording and is the final design baseline. Implementation remains staged through B4, C, D, E and F. Keep P59-003 as the sole active engineering task until safe handoff. Do not silently change the V5 revenue goal, PCNE accounting, zero-spend rule or owner gates.
