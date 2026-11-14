# PHASE 59.9 — ZERO-COST-FIRST 24x7 AUTONOMOUS AGENTIC SWARM ARCHITECTURE
Date: 2026-11-14
Owner objective: ₹10 Cr Autonomous Revenue Ecosystem
Canonical repository: `manish91082-coder/nexus-autonomous-cloud-work-engine` / `master`
Authority: V5 Master Constitution and existing mission invariants
Status: RESEARCH + ARCHITECTURE DECISION; implementation not yet deployed

## 0. Executive decision

Build a **hybrid, event-driven, zero-cost-first autonomous agentic workforce**. Do not replace the existing deterministic mission control plane. Extend it.

The architecture separates five concerns:
1. **Mission control and policy plane:** existing deterministic Python runtime, queue contracts, leases, idempotency, evidence validation and owner gates remain authoritative.
2. **Agent reasoning/workflow plane:** adopt LangGraph (open-source library) as the first candidate for explicit multi-agent state graphs, specialist subgraphs, parallel fan-out/fan-in, checkpoints and human approval interrupts. Integrate only after B4 persistence/process isolation and compatibility tests.
3. **Execution plane:** isolated, short-lived specialist worker processes; public GitHub Actions standard Linux runners are the initial free burst-compute substrate, not a permanent daemon.
4. **24x7 event/wake-up plane:** evaluate Cloudflare Workers + Queues + Workflows for lightweight webhooks, wake-ups, dispatch signals and retry orchestration. It is not the LLM/Python compute plane. Cloudflare free quotas and Workflows step/storage billing must be budgeted; never assume unlimited free use.
5. **Evidence and memory plane:** durable run/checkpoint records, immutable evidence references/hashes, task artifacts, revenue/payout reconciliation and append-only mission audit. GitHub remains the canonical source-control/evidence index; do not make a Git commit the only transactional database.

**n8n decision:** optional integration/connector automation only, not the agent brain or core scheduler. Self-hosted Community is free for internal workflow creation/use under its Sustainable Use License, but hosting n8n as a service or letting external customers/agents configure workflows requires a commercial license in relevant cases. It adds Redis/Postgres/server operations for queue-mode scale. Do not introduce it into the critical path now.

**Temporal decision:** retain as a future durability alternative, not initial deployment. Temporal is a strong durable workflow engine, but production self-hosting adds persistent service/database/operations complexity. Our current B4 should prove the smaller process-isolated durable executor first.

No paid fallback, no paid model, no infrastructure spend, no external irreversible action and no AI inference activation are authorized by this architecture decision.

## 1. Non-negotiable mission invariants

- Mission: build a self-operating ecosystem that works toward ₹10,00,00,000 cumulative verified PCNE (Portfolio Cumulative Net Earnings / realized net receipts under the controlling mission definition).
- Goal is a target, not a forecast or guarantee. Never claim the system will inevitably reach it.
- Current verified PCNE: ₹0.
- Authorized new spend: ₹0.
- Zero-cost-first means no paid tier, API, runner, hosting, domain, model, marketplace fee or subscription may be silently activated.
- No job offers or gig marketplaces as the mission's revenue strategy. No gig/bounty lane wiring into this mission queue.
- No product is selected and no product build is authorized until the existing V5 qualification, market evidence, unit economics, payout eligibility and acceptance gates pass.
- External account creation, KYC, accepting terms, payment setup, spending, public release, customer commitments, money movement and secret access remain explicit owner-gated actions.
- AI output is untrusted draft material until independently validated against source evidence and deterministic acceptance tests.
- Agent-generated code is never executed in the coordinator process. Build/test runs happen in isolated workers with narrow permissions and no production secrets.
- Every task, model call, artifact, evidence claim, retry, state transition, cost/quota event and revenue receipt must be traceable.

## 2. What 24x7 means operationally

24x7 is a **service objective for event intake, state durability, queue recovery and task dispatch**, not a promise that every free provider will always be available or every LLM agent runs continuously.

The system should:
- accept an event/webhook or scheduled wake-up at any time;
- persist it before acknowledging it;
- enqueue a deterministic task with an idempotency key;
- dispatch a bounded worker when capacity and provider quota exist;
- checkpoint progress and evidence;
- retry transient failures with bounded exponential backoff;
- move exhausted tasks to a dead-letter queue;
- resume after worker/process interruption;
- continue deterministic work when AI quota/provider is unavailable;
- expose degraded status and alert through durable status records.

If a free provider is down, quota-exhausted, sleeping, paused, or has changed its terms, the system must degrade gracefully and resume later. It must not switch to a paid provider.

**Hard truth:** a guaranteed 24x7 SLA with zero spend cannot be promised on free-tier infrastructure. Free tiers are best-effort, quota-limited and subject to policy/availability changes. We can engineer high automation and recoverability, not contractual uptime.

## 3. Technology selection

| Layer | Primary choice | Role | Decision / constraint |
|---|---|---|---|
| Deterministic control plane | Existing Python stdlib runtime | Mission policy, queue state, leases, idempotency, evidence gates | Keep; authoritative |
| Agent graph runtime | LangGraph Python | Stateful specialist graphs, conditional edges, parallel branches, checkpointed graph state, approval interrupts | Adopt as first candidate after B4; pin version and test |
| Durable execution | Existing contracts + atomic run store + process supervisor | Cross-run resume, retries, hard timeouts, run audit | Build B4 before LangGraph production integration |
| Free burst compute | GitHub Actions public standard Linux runners | Short-lived isolated build/test/research workers | Keep; not a daemon or real-time scheduler |
| Event / wake-up plane | Cloudflare Workers + Queues; Workflows only after cost/limits test | Webhooks, lightweight dispatch, delayed retry, wake-ups | Optional pilot; stay within free quotas; no heavy Python inference |
| Long-term relational state | Local SQLite WAL for prototype; evaluate Cloudflare D1 or Supabase only after quota/pause/backup tests | Run indexes, task metadata, metrics | Do not make Supabase Free the only 24x7 state store because inactive projects may pause |
| Evidence/source control | GitHub repository + content hashes + immutable artifacts | Versioned code, specs, audit reports, evidence pointers | Keep canonical repository; avoid secrets and sensitive user data in public repo |
| Integrations | Direct typed Python adapters first; n8n optional later | Email, webhooks, forms, publishing, notifications | n8n not core; license and infra constraints apply |
| Local inference | Ollama on Windows/WSL laptop, optional | Offline/sanitized low-priority tasks | Benchmark CPU/RAM first; no GPU assumed; one request at a time initially |
| Hosted model adapters | Free-tier APIs behind provider-neutral gateway | High-value reasoning when quota available | Opt-in, quota-aware, data-minimization, no paid fallback; free tiers not guaranteed |

### Why LangGraph, not “agents all calling each other”

LangGraph is a low-level stateful orchestration runtime: graphs are shared state, nodes and edges; deterministic and LLM-driven nodes can coexist. Its documented focus includes durable execution, streaming, persistence, memory and human-in-the-loop. It does not force one fixed agent architecture and does not require LangChain. This maps to our need for explicit state transitions, controlled fan-out/fan-in and specialist subgraphs.

Use LangGraph for **reasoning topology**, not as the sole source of truth for mission policy, billing, task leases or PCNE accounting. Existing deterministic contracts remain the outer control plane.

### Why not n8n as the brain

n8n is excellent for visual business automation and integrations. Its queue mode uses a main instance, Redis broker and worker processes, with a database shared by workers. This introduces always-on services and operational dependencies. More importantly, n8n's Sustainable Use License allows internal workflow use and certain managed client work, but hosting it as a service or letting external customers/agents configure workflows can require a commercial license. Keep it optional and internal if later justified.

### Why not Temporal first

Temporal's durable workflow model is technically strong and explicitly designed to resume workflows after crashes and outages. Its self-hosted service requires deployment and operations of the Temporal service and supporting infrastructure. Revisit after the mission has demonstrated a real workload that justifies the operational footprint.

## 4. Free-tier reality check (reviewed 2026-11-14)

### GitHub Actions
- Standard GitHub-hosted runners are free for public repositories.
- Scheduled workflows have a minimum five-minute interval, but high-load periods can delay or drop scheduled runs.
- Public-repository scheduled workflows are disabled after 60 days without repository activity.
- Therefore Actions is useful as burst execution and CI, but not a dependable real-time 24x7 scheduler or persistent daemon.

### Cloudflare Workers / Workflows / Queues
- Workers Free: 100,000 requests/day, 10 ms CPU per invocation, 128 MB memory, and up to five Cron Triggers per account (current Workers limits).
- Workflows Free: 10 ms CPU per step, 100,000 executions/day shared with Workers, 100 concurrent workflow instances, 1,024 steps per workflow, 100 MB persisted state, and three-day completed-state retention.
- Workflows pricing documentation states that from Aug 10, 2026, steps and storage are billable dimensions; Free includes 3,000 steps/day and 1 GB-month storage. Do not treat Workflows as unlimited free durable compute.
- Queues Free has 24-hour message retention; messages have limits and retention expiry deletes messages. Therefore long-term evidence and task state must live elsewhere.
- Best use: lightweight event intake, wake-up, queue signal and retry orchestration. Not Python model inference, large builds or the canonical evidence vault.

### Model APIs
- Gemini API free tier offers selected models and limited quotas, not a production capacity guarantee. Free-tier content may be used to improve Google products; do not send secrets, personal data, private customer records or sensitive business information without an approved data policy.
- Rate limits are model/project specific and can change. Build provider adapters with per-model RPM/TPM/RPD quota accounting, circuit breakers and WAITING_FOR_QUOTA state.
- No paid fallback. If every free provider is unavailable, tasks remain durable and the deterministic system continues safe non-model work.

### Supabase Free
- Current free plan includes two free projects and 500 MB database per project, but inactive projects may be paused after a week. Do not rely on it as the sole always-on 24x7 orchestrator or only copy of state.

### Ollama
- Ollama supports CPU and GPU inference and concurrent requests subject to available RAM/VRAM. Parallel requests increase memory use; overloaded requests queue and may return 503.
- With no dedicated GPU assumed, benchmark one small quantized model on the laptop before treating local inference as a worker pool. Keep local model optional, not required for cloud continuity.

## 5. Target agent workforce

Start with six active logical specialists, then expand to ten only when throughput and quality evidence justifies it. Logical agents are roles; they need not be separate servers or continuously running processes.

1. **Mission Orchestrator / Supervisor** — reads canonical objective, selects next eligible task, assigns budgets/quotas, enforces dependency graph and owner gates.
2. **Opportunity Scout** — scans permitted public sources for productized, self-serve revenue opportunities; excludes jobs/gigs/bounties.
3. **Evidence & Research Analyst** — gathers primary sources, timestamps, URLs, hashes, claim/evidence mapping and contradiction records.
4. **Market & Economics Analyst** — demand, competitor alternatives, pricing, contribution margin, conversion assumptions, payout eligibility and sensitivity analysis.
5. **Product Architect / Builder** — creates a small product only after portfolio selection and V5 build authorization; works in a sandbox branch.
6. **QA / Security / Compliance Critic** — adversarial review, prompt-injection tests, code tests, dependency audit, data policy, terms/payout gates.
7. **Growth & Distribution Agent** — SEO/content/distribution and self-serve funnel experiments only after product approval; no spam or platform abuse.
8. **Revenue Operations Agent** — tracks customer events, invoices, fees, refunds, settlement, payout evidence and reconciles realized PCNE.
9. **Portfolio Allocator** — compares validated opportunities and recommends where effort should go; cannot authorize spend.
10. **Independent Mission Auditor** — checks goal drift, evidence debt, false claims, PCNE non-regression and policy invariants.

Initial parallel fan-out: Scout + Research + Economics, then merge; Product Builder runs only after selection; QA/critic gates every deliverable; Growth and Revenue Ops activate only after authorized product release.

## 6. End-to-end autonomous revenue loop

```
Wake-up / Event
  -> Persist Event + Idempotency Key
  -> Mission Policy & Queue Eligibility
  -> Opportunity Scout
  -> Evidence Research (parallel)
  -> Market / Unit Economics (parallel)
  -> Independent Critic + V5 Qualification
  -> Portfolio Decision (no automatic spend)
  -> Product Specification
  -> Sandboxed Build + Automated QA/Security
  -> Owner Gate: account / terms / payment / public release
  -> Approved Distribution + Self-Serve Funnel
  -> Customer/Usage Events
  -> Revenue, Refund, Fee and Settlement Reconciliation
  -> Verified PCNE Ledger
  -> Learnings + Next Opportunity / Product Iteration
```

A model must never be allowed to self-certify revenue. PCNE is credited only from independently verifiable realized net receipts after applicable fees, refunds and settlement conditions under the mission's controlling definition.

## 7. Required architecture components

- Mission Constitution and immutable policy registry.
- Typed Task Contract, Task Result Contract, Evidence Contract, Run Contract, Provider Capability Contract.
- Deterministic dependency DAG and queue scheduler.
- Worker supervisor with process isolation, hard timeout/termination, resource limits and narrow filesystem/network permissions.
- Lease/heartbeat, idempotency, retry budget, exponential backoff, dead-letter and stale lease recovery.
- Durable run store with atomic checkpoint writes, schema versioning, checksums and append-only event journal.
- LangGraph graph registry with versioned graph definitions and explicit state schema.
- Provider-neutral LLM gateway: capability routing, quota ledger, provider health, circuit breaker, redaction, timeouts, model provenance and cost=0 guard.
- Evidence vault: source URL, retrieval timestamp, source type, SHA-256, claim linkage, verification status, contradiction handling.
- Agent evaluation harness: task success, factuality/evidence coverage, code test result, latency, token/quota usage and failure rate.
- Secret boundary: no secrets in prompts, model output, logs, public artifacts or Git history.
- Revenue ledger and payout reconciliation, separate from model-generated estimates.
- Mission drift detector: compares every proposed task with the ₹10 Cr mission, V5 acceptance criteria and prohibited revenue paths.

## 8. Autonomy policy: what can run without owner intervention

### Autonomous by default
- Public-source research and source extraction.
- Internal analysis, drafts, product specs and code in isolated branches.
- Unit tests, static analysis, dependency scans and synthetic tests.
- Task prioritization within approved queue and zero-spend quota.
- Retry, checkpoint, recovery and internal reporting.
- Draft SEO/content assets saved privately for review or in approved draft-only locations.
- Revenue ledger reconciliation from read-only verified records.

### Always owner-gated
- Spending or paid-plan activation.
- Creating external accounts, KYC, accepting terms or legal representations.
- Creating/rotating/accessing secrets or wallets.
- Publicly releasing a product or making binding customer promises.
- Sending bulk outreach, messages or campaigns.
- Payment setup, money movement, refunds, withdrawals and bank changes.
- Any irreversible or regulated external action.

Autonomy should be maximized inside safe boundaries; owner gates are not removed by a prompt or an agent vote.

## 9. Delivery roadmap and exit criteria

### Phase A — Architecture and repository alignment (this checkpoint)
- Preserve the previous B3 implementation and exact CI evidence.
- Commit this architecture decision and source register.
- Keep P59-003 as the only active task.
- Do not enable providers or production dispatch.

### Phase B4 — Durable execution foundation (next engineering phase)
1. Atomic versioned run store and append-only event journal.
2. Process-based worker pool with hard termination and resource/time limits.
3. Checkpoint/resume across runner termination and duplicate delivery.
4. Crash-window, replay, stale lease, corruption and idempotency tests.
5. Evidence/result persistence and schema migration tests.
6. Exact-HEAD GitHub Actions CI and Continuity Guard pass.

### Phase C — LangGraph integration spike
1. Add pinned LangGraph dependency in an isolated optional extra/lock file.
2. Build a graph with deterministic mock nodes only: supervisor -> three parallel specialists -> evidence aggregator -> critic -> final typed result.
3. Map LangGraph checkpoints to the mission run ID and durable store.
4. Test interrupt/resume, node retry, state merge conflicts, duplicate delivery, graph version migration and malicious tool output.
5. Compare graph state with mission queue state; mission control plane remains authoritative.
6. Do not configure a hosted model until mock graph passes.

### Phase D — Provider-neutral model gateway
1. Define model provider adapter contract.
2. Add free-tier provider(s) only after current terms, data policy and quotas are audited.
3. Add Ollama local adapter only after actual CPU/RAM benchmark.
4. Add per-provider quota, circuit breaker, cooldown, redaction and strict no-paid-fallback.
5. Provider failure must produce WAITING_FOR_PROVIDER / WAITING_FOR_QUOTA, never task loss.

### Phase E — 24x7 event-driven pilot
1. Cloudflare Worker webhook/wake-up proof-of-concept.
2. Cloudflare Queue for short-lived dispatch signals; durable mission store remains authoritative.
3. Cloudflare Workflow only if measured free step/storage quotas remain within limits and billing guard is tested.
4. GitHub Actions remains burst worker/CI fallback, with schedule limitations explicitly handled.
5. Heartbeat monitor detects missed wake-ups and stale tasks; recovery is event-driven and idempotent.
6. Run a 7-day soak test, then 30-day reliability test; record actual availability, queue age, recovery rate and provider quota availability.

### Phase F — Controlled revenue pilot
1. Resume P59-001 only after safe swarm handoff.
2. Re-evaluate and rank eligible revenue opportunities using verified market and payout evidence.
3. No product selection/build without V5 gate.
4. Run one narrowly scoped product pilot with self-serve distribution.
5. Verify actual customer payment and settlement before PCNE credit.
6. Scale only from realized unit economics and evidence, not forecast optimism.

## 10. Acceptance metrics

- 100% tasks have schema-valid task/run/result records.
- 100% external side effects are idempotency-keyed and owner-gated where required.
- 100% model-generated claims have evidence status; unverified claims cannot become verified PCNE.
- Zero paid API/provider fallback and zero unauthorized spend.
- Zero loss of acknowledged tasks in crash/restart tests.
- Every active lease either heartbeats, completes, retries or dead-letters within defined bounds.
- Worker timeout actually terminates the worker process, not merely labels a thread as timed out.
- 100% mission state changes pass Continuity Guard.
- 7-day and 30-day soak tests publish observed uptime and missed-wakeup metrics; do not claim SLA from a test alone.
- PCNE ledger cannot regress and counts only realized, reconciled net receipts.

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Free provider quota/terms change | Provider adapters, quota ledger, circuit breaker, durable wait state |
| GitHub scheduled run delay/drop | Treat Actions as burst compute; external wake-up/heartbeat and missed-run recovery |
| Cloudflare Workflows free steps/storage exhausted | Daily quotas, budget guard, minimal steps, no sole-source persistence |
| Public repository exposes secrets | Secret scanning, no secrets/data in repo, least privilege, redact artifacts |
| Prompt injection from public sources | Treat all retrieved content as data; typed envelopes, tool allowlists, no shell from model |
| Duplicate work/payment action | Idempotency keys, owner approval, transaction state machine |
| Model hallucination | Primary-source evidence, independent critic, deterministic validation |
| Local CPU model too slow | Benchmark before adoption; no dependency on laptop being online |
| Framework lock-in | Keep provider/graph adapters; control plane remains framework-independent |
| Goal drift toward gigs/jobs | Explicit deny-list and queue policy tests |

## 12. Research source register (official documentation)

- LangGraph overview: https://docs.langchain.com/oss/python/langgraph/overview and source mirror https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/overview.mdx
- n8n deployment choice: https://docs.n8n.io/get-started/choose-how-to-use-n8n/
- n8n queue mode: https://docs.n8n.io/hosting/scaling/queue-mode/
- n8n Sustainable Use License FAQ: https://support.n8n.io/article/can-i-use-your-license-for-my-use-case
- Temporal self-hosted guide: https://docs.temporal.io/self-hosted-guide
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workflows limits: https://developers.cloudflare.com/workflows/reference/limits/
- Cloudflare Workflows pricing: https://developers.cloudflare.com/workflows/reference/pricing/
- Cloudflare Queues limits: https://developers.cloudflare.com/queues/platform/limits/
- GitHub Actions billing: https://docs.github.com/en/actions/concepts/billing-and-usage
- GitHub Actions schedule semantics: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub Actions schedule troubleshooting: https://docs.github.com/en/actions/how-tos/troubleshoot-workflows
- Gemini API pricing/data-use tiers: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Supabase Free project pausing: https://supabase.com/docs/guides/platform/free-project-pausing
- Ollama concurrency and queue behavior: https://github.com/ollama/ollama/blob/main/docs/faq.mdx

## 13. Final architecture decision

**GO:** zero-cost-first hybrid swarm architecture, with LangGraph as the first agent-graph candidate, existing deterministic Python runtime as the sovereign mission control plane, process-isolated workers, durable run store, GitHub Actions for free burst compute, and Cloudflare event/wake-up services subject to explicit quotas and billing guards.

**NO-GO for now:** n8n as core scheduler; Temporal production deployment; always-on local laptop dependence; unrestricted multi-agent loops; model-controlled shell/account/payment actions; paid fallback; unverified revenue claims; production model inference before B4 and Phase C gates.

This decision extends, but does not erase, Phase 59.8B3. The prior B3 implementation and its exact-HEAD CI proof remain part of the canonical continuity chain.
