# Phase 60 — Cloud-Native Autonomous Swarm Architecture Audit
**Date:** 2026-11-15  
**Mission:** P10CR — ₹10 Cr Autonomous Revenue Ecosystem  
**Authority:** MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V5.md  
**Canonical repository:** manish91082-coder/nexus-autonomous-cloud-work-engine  
**Research basis:** Official vendor documentation reviewed 2026-11-15; repository state fetched from GitHub during this session.  
**Decision status:** Architecture recommendation only. No cloud account, deployment, OAuth grant, paid resource, or production service was activated.

## 1. Executive decision

GitHub must remain the canonical source-code, version-control, CI/CD and audit-evidence system, but it should not be the only runtime or the sole memory/coordination substrate.

**Recommended target: Cloudflare-first durable cloud control plane, with a portable project-local agent runtime and independent long-term evidence archive.**

Proposed responsibilities:
- Cloudflare Workflows: durable, event-driven, multi-step orchestration, retries, waits and resumable workflow execution.
- Cloudflare Durable Objects (SQLite-backed): per-project coordination objects, serialized task claims, lease/fencing transitions and small strongly-consistent state.
- Cloudflare Queues: wake-up/event transport only, never the authoritative task database or long-term memory.
- Cloudflare D1: compact structured mission metadata, task indexes, quota counters and operational projections, subject to free daily/storage limits.
- Cloudflare R2: immutable evidence objects, run artifacts, snapshots, larger documents and backup exports, subject to included monthly storage/operation allowances.
- AI inference adapters: only explicitly allowlisted, verified zero-price model routes; Workers AI is one candidate, not an unlimited model supply.
- Agent reasoning: implement the initial specialist graph as portable TypeScript/JavaScript workflow activities if the goal is a Cloudflare-native zero-cost runtime. Keep LangGraph as a separately evaluated Python reasoning layer; do not assume a Python LangGraph server can execute inside the Cloudflare Workers runtime.
- GitHub: code, schemas, migration history, signed/hashed evidence manifests, CI and reviewable releases. Do not use Git commits as the high-frequency global lock database.

This is a staged recommendation, not a claim that Cloudflare is already connected or deployed. Account-level eligibility, dashboard state, binding setup, domains, quotas and deployments have not been inspected.

## 2. Repository baseline and continuity reconciliation

Files fetched from the canonical repository:
- `MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V5.md` — authoritative mission; ₹10 Cr cumulative portfolio PCNE, ₹0 new spend by default, one active product build, explicit owner gates.
- `control/mission_state.json` — phase is `PHASE_59_24_WORKER_CONTENTION_CRASH_RECOVERY_MERGED`; current task `P59-003`; next Phase 59.25 is controlled cloud execution/operational soak. It records zero verified earnings and zero authorized spend.
- `control/automation_queue.json` — current task remains P59-003; maximum one active product build; V5 sequencing remains authoritative.
- `federation/PROJECT_FEDERATION_REGISTRY.json`, `federation/CROSS_PROJECT_AGENT_SWARM_FEDERATION_PROTOCOL.md`, `federation/locks/registry.json` — separate project cells, lock protocol and activation boundaries.
- `PROJECT_CONTINUITY.md` — its leading section still labels Phase 59.11 and has older Phase 59.21 details. This is stale relative to mission_state's Phase 59.24.

GitHub recent-commit search returned latest checkpoint commit `986392a42e969454c5be5aa085c7ef4aaa80262c` (2026-11-15 08:13:34 UTC), “Synchronize final Phase 59.24 repository observation checkpoint”. The report must not treat older federation-registry or continuity fields as newer than mission_state without reconciliation.

The repository's Phase 59.24 tests are an 8-worker CAS contention/crash-recovery test harness. They are not proof of a deployed distributed lock service, cross-repository client enforcement, production cloud runtime or 24x7 live soak. The federation lock registry describes a prototype and explicitly says clients/quotas are not enabled. Preserve those boundaries.

## 3. Official platform findings

### 3.1 Cloudflare Workflows, Workers, Durable Objects, Queues, D1, R2

**Workflows**
- Available on Free and Paid Workers plans.
- Durable multi-step executions can persist state and run for minutes, hours, days or weeks; support retries and waiting for external events/approvals.
- Current Free limits documented: 10 ms CPU per invocation, 3,000 steps/day, 100,000 executions/day shared with Workers, 100 concurrent workflow instances, 100 MB maximum persisted state per workflow instance, 3-day completed-workflow state retention. These limits make it an orchestration layer, not an unlimited general-purpose compute server.
- Free queue message retention is 24 hours. Queues are transport/wake-up only; acknowledged work must already be recorded durably elsewhere.

**Workers**
- Free plan documents 100,000 requests/day, 10 ms CPU per HTTP request, 128 MB memory, 50 subrequests/request and 5 Cron Triggers/account. Heavy reasoning, long CPU tasks and large builds do not belong in a single Free Worker invocation.
- Workers AI free allocation is 10,000 Neurons/day. Exceeding the free allocation fails closed unless a paid plan is enabled; some models require Workers Paid or prepaid credits. Therefore it is a bounded inference option, not unlimited AI compute.

**Durable Objects**
- SQLite-backed Durable Objects are available on Workers Free. Each named object provides private, transactional, strongly consistent storage and a natural place for serialized per-project coordination.
- Objects can hibernate/evict when idle; in-memory state is not durable. All authoritative state must be written to persistent storage.
- Alarms provide future wakeups and at-least-once execution with automatic retries. Alarm handlers must be idempotent.

**D1**
- Free tier: 10 databases/account, 500 MB/database, 5 GB total account storage, 5 million rows read/day and 100,000 rows written/day; daily overages cause query failures until reset. Each database is single-threaded. Use indexed, bounded queries and do not put huge unstructured evidence in D1.

**R2**
- Free allowance documented: 10 GB-month standard storage, 1 million Class A operations/month, 10 million Class B operations/month, no egress charge. It is suitable for evidence objects and snapshots if usage stays inside free allowances; crossing the allowance can incur charges, so billing alerts/spend controls and fail-closed limits are mandatory.

**Implication:** Cloudflare is the strongest zero-upfront candidate for durable event orchestration and coordination, but free-tier limits, model quota and service-level terms do not guarantee 24x7 production availability.

### 3.2 Restate
- Restate Cloud advertises a free plan with 100,000 durable actions/month, 1 GB virtual-object storage, one-day history retention and best-effort SLA.
- Restate is also open source and self-hostable.
- Strong alternative to Cloudflare Workflows for durable function execution and stateful virtual objects. Managed free plan is useful for prototype/benchmarking, not a permanent zero-cost production guarantee. Self-hosting still requires compute and persistence operations.

### 3.3 Temporal
- Temporal provides durable workflow execution backed by persisted event history and replay; excellent fit for long-running business processes, retries, timers and recovery.
- Temporal Cloud currently advertises $150 credits for 90 days and usage-based pricing thereafter. Self-hosting requires a continuously operated Temporal service and persistence database.
- Technically strong, but not the first choice under the strict ₹0-new-spend constraint.

### 3.4 LangGraph
- LangGraph checkpointers support thread-scoped state; stores support cross-thread long-term memory.
- In-memory savers do not survive process restart. Production requires a persistent checkpointer such as Postgres.
- LangGraph is the specialist-agent graph/reasoning layer, not by itself the durable 24x7 cloud scheduler, distributed lock service or hosting substrate.
- Python LangGraph must run in a compatible Python environment; do not assume it can be deployed directly inside Cloudflare Workers. For the first Cloudflare-native pilot, use a portable JS/TS task graph or call a separately deployed Python service only after its hosting and cost are verified.

### 3.5 n8n
- Queue mode separates main trigger process and workers using Redis plus a persistent database; workers scale independently.
- Good for SaaS/API integrations, notification flows and human-approval workflows. It does not replace mission constitution, long-term semantic memory, durable execution ledger or financial evidence controls.
- Self-hosted 24x7 queue mode requires continuously available compute, Redis and database. Not a zero-cost managed guarantee.

### 3.6 Database/vector alternatives
- Supabase Free provides 500 MB per project and two free projects, but free projects may pause after seven days of low activity; not suitable as the only 24x7 control-plane dependency.
- Neon Free currently advertises 100 CU-hours/project/month and scale-to-zero; useful for a low-duty-cycle Postgres checkpointer, not an always-on compute guarantee.
- Qdrant Cloud Free offers 1 GB RAM/4 GB disk but is prototype-oriented, has no uptime SLA and suspends after one week of inactivity (deletion after four weeks if not reactivated). Do not use as the sole authoritative memory.
- Vector memory is a retrieval index, not the source of truth. Canonical memory must retain structured records, provenance, versioning and raw evidence independently.

## 4. Recommended architecture

```text
Owner approval / provider OAuth (scoped, time-limited)
                  |
                  v
       Cloudflare Edge Control Plane
  Workers API + Workflows + Watchdog/Events
                  |
          +-------+-------+
          |               |
          v               v
  Project Cell DOs    Shared Resource DO
  locks/leases/       quotas/fairness/
  fencing/state       duplicate dispatch
          |
          v
       Durable Workflow DAG
  discover -> validate -> decide -> build
  -> QA -> owner gate -> publish -> reconcile
          |
     +----+---------------------+
     |                          |
     v                          v
AI/model adapters          Tool adapters
allowlisted free routes    GitHub/marketplaces/
with hard caps             storage/provider APIs
     |                          |
     +------------+-------------+
                  |
                  v
        Durable Memory Fabric
  D1: structured state, task index, ledgers
  R2: append-only evidence, artifacts, snapshots
  DO: serialized coordination and small state
  GitHub: code, schemas, audit manifests, CI
                  |
                  v
        Observability + Recovery
  health, heartbeat, DLQ, replay, backup,
  budget guard, alerts, approval packets
```

### Memory architecture: five distinct stores
1. **Working memory:** current workflow context, bounded and ephemeral.
2. **Episodic memory:** append-only events, task/run history, tool results and decisions.
3. **Semantic memory:** validated entities, relationships, facts and embeddings/retrieval index.
4. **Procedural memory:** versioned playbooks, task graphs, prompts, tool schemas and policies.
5. **Evidence memory:** immutable source captures, timestamps, hashes, licences and provenance.

Never let an LLM response directly overwrite canonical memory. Model output is an untrusted proposal; validators and evidence rules decide what becomes durable knowledge. Keep raw evidence and derived summaries separately.

### Multi-project isolation
- One Project Cell per mission/repository.
- Separate task IDs, queues, state, budgets, credentials, evidence and revenue ledgers.
- A shared resource arbiter grants only bounded reservations.
- A single authorized publisher per project control-plane path.
- Workers use idempotency keys and monotonically increasing fencing tokens.
- If Cloudflare is unavailable, project-local durable queue snapshots remain exportable and resumable. No global controller may erase project-local authority.

## 5. Comparison and decision

| Platform | Durable execution | Agent reasoning | Free-start evidence | Decision |
|---|---|---|---|---|
| Cloudflare Workflows + DO | Native | Build via JS/TS activities or external inference | Free bounded quotas | Primary pilot |
| Restate Cloud | Native | SDK/tool activities | 100k actions/month, 1-day history | Benchmark alternative |
| Temporal Cloud | Native | Activities/SDKs | $150/90-day credits | Defer: ongoing cost |
| LangGraph | Checkpoint/store, not full scheduler | Native strength | Open-source, hosting separate | Optional reasoning layer |
| n8n | Workflow automation/queue | Limited agent features | Self-hosting infra required | Integration layer only |
| Oracle Always Free VM | Host-dependent | Can host Python agents | Capacity conditional; idle reclaim risk | Standby experiment only |

## 6. Hard constraints and failure modes

- No free-tier provider offers a contractual 100% uptime guarantee on the cited free tiers.
- “24x7” must mean continuously eligible for event-driven execution and resumable after failure, not a process guaranteed to remain in RAM.
- Cloudflare Workflows free CPU/step/concurrency limits and Workers AI daily Neurons cap can stop execution. On quota exhaustion, persist the task and enter WAITING_FOR_QUOTA; never auto-upgrade.
- Queue messages can expire after 24 hours on the Free plan; do not store the only copy of a task in a queue.
- D1 daily limits can reject queries; maintain exportable snapshots and idempotent replay. D1 is not a substitute for large evidence storage.
- R2 usage above included monthly limits may be billable. Enforce usage caps before upload and stop before any chargeable overage.
- Restate/Temporal managed free credits/tiers are bounded. Self-hosting transfers the reliability burden to our compute/database operations.
- Supabase/Qdrant free inactivity pauses/suspension mean they cannot be the only authoritative memory store.
- AI inference is not free merely because an orchestration engine is free. Model, token, rate, data-use, region and account eligibility must be verified separately for each adapter.
- Free resources can be changed, rate-limited, suspended or withdrawn by vendors. Keep portability and export paths.
- No account rotation, artificial activity to evade idle policies, hidden billing, paid fallback, KYC bypass or credential sharing.

## 7. Phased implementation recommendation

**Do not replace or interrupt Phase 59.25.** First complete the existing P59-003 controlled cloud execution/operational soak gate, with exact-head evidence and explicit stop conditions.

Then:
- **P60-A — Account and quota preflight (read-only):** verify Cloudflare account access, plan, billing state, Workers AI model eligibility, D1/R2/DO availability and current quotas. Do not activate billing or create chargeable resources.
- **P60-B — Architecture proof of concept:** build a disposable test namespace with one Workflow, one Project Cell Durable Object, one D1 table and one R2 test object. Set strict hard ceilings; delete only after export and explicit test completion.
- **P60-C — Durability tests:** kill/redeploy between steps, duplicate events, retry, alarm replay, workflow wait/approval, queue expiry, D1 quota failure, R2 limit guard and model 429/403/5xx.
- **P60-D — Memory export/restore:** reconstruct project state from D1 + R2 + GitHub manifest; verify checksums and no double-application of events.
- **P60-E — Mock specialist graph:** deterministic roles first; AI calls disabled. Verify task routing, policy gates, idempotency and evidence requirements.
- **P60-F — Free inference pilot:** activate only an owner-approved provider/scope; enforce per-model/day token and neuron ceilings, no paid fallback and immediate WAITING_FOR_QUOTA on unknown cost.
- **P60-G — One project-cell canary:** P10CR only, read-only/isolated branch initially. Other projects remain untouched. Cross-project clients only after separate approval and soak.
- **P60-H — 7-day then 30-day soak:** report availability, workflow completion, recovery, state consistency, quota use, cost, duplicate suppression and owner intervention count. Do not claim production autonomy before passing.

## 8. Acceptance criteria

1. A task survives Worker/Workflow restart and resumes from the last durable step.
2. Duplicate dispatch produces one canonical side effect.
3. Stale lease/fencing token cannot mutate project state.
4. At least 100 concurrent claims yield exactly one winner per identical task key.
5. Owner approval waits durably and resumes only after authenticated provider event.
6. Project A cannot read/write Project B state without explicit capability.
7. AI/model quota exhaustion causes safe pause, never paid fallback.
8. All task events and revenue/evidence changes have immutable IDs, source timestamps and hashes.
9. Full project state can be exported and restored without depending on chat history.
10. No local laptop/WSL/desktop runtime dependency.
11. No public publication, legal acceptance, KYC, billing, money movement or irreversible action without owner approval.
12. Zero new spend is demonstrated by provider usage/billing evidence, not inferred from code configuration.
13. 7-day and 30-day soak evidence is recorded before claiming 24x7 production readiness.

## 9. Current decision

**GO for Cloudflare-first architecture research and a bounded proof-of-concept after P59.25. NO-GO for immediate production migration.**

Do not remove GitHub. Do not switch mission authority. Do not deploy all project swarms at once. Keep current P59-003 and Phase 59.25 sequence intact. No provider accounts have been connected or deployed in this research session.

## 10. Official sources reviewed

- Cloudflare Workflows overview: https://developers.cloudflare.com/workflows/
- Cloudflare Workflow limits: https://developers.cloudflare.com/workflows/reference/limits/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
- Durable Object storage: https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/
- Durable Object alarms: https://developers.cloudflare.com/durable-objects/api/alarms/
- Cloudflare Queues limits: https://developers.cloudflare.com/queues/platform/limits/
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare D1 free-limit enforcement: https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Restate pricing: https://restate.dev/pricing
- Temporal durable execution: https://docs.temporal.io/temporal
- Temporal workflow replay: https://docs.temporal.io/workflows
- Temporal Cloud pricing: https://temporal.io/pricing
- LangGraph persistence: https://docs.langchain.com/oss/python/langgraph/persistence
- n8n queue mode: https://docs.n8n.io/hosting/scaling/queue-mode/
- Supabase free project pausing: https://supabase.com/docs/guides/platform/free-project-pausing
- Neon plans: https://neon.com/docs/introduction/plans
- Qdrant Cloud tiers: https://qdrant.tech/documentation/cloud/
- Oracle Always Free and idle reclamation: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

**Research integrity:** Official documentation establishes product features and published quotas, not this owner's actual account entitlement, availability, billing configuration or deployed service health. Those remain UNVERIFIED until account-level preflight and live tests.
