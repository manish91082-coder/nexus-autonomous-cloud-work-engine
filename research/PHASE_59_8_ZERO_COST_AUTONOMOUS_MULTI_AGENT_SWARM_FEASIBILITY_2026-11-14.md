# Phase 59.8 — Zero-Cost Autonomous Multi-Agent Research & Revenue Execution Swarm
**Date:** 14 November 2026  
**Authority:** MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V5.md  
**Mission:** ₹10,00,00,000 cumulative verified PCNE across eligible revenue streams  
**Task:** P59-001 remains IN_PROGRESS; P59-002 remains BLOCKED  
**Decision:** FEASIBLE AS A ZERO-COST-FIRST, BOUNDED, HYBRID AUTONOMOUS SYSTEM. NOT FEASIBLE TO PROMISE UNLIMITED, ALWAYS-ON, FULLY AUTONOMOUS AI REASONING OR GUARANTEED ₹10 CR WITH ZERO COST.  
**Current PCNE:** ₹0. **Authorized spend:** ₹0. **Product selected:** NONE. **Build authorization:** NO.

## 1. Executive decision

Yes. The project can and should evolve from serial chat-led research into an agentic research-and-execution system. The viable architecture is not a free-running swarm of dozens of independent LLMs. It is a deterministic, durable orchestration engine that dispatches bounded specialist-agent tasks in parallel, requires structured evidence, independently challenges important conclusions, and promotes only validated decisions.

The recommended design is a **hybrid swarm**:
- deterministic code handles queueing, deduplication, crawling, parsing, scoring, retries, budget enforcement, ledger reconciliation, CI and state transitions;
- LLM agents perform synthesis, hypothesis generation, competitor interpretation, counter-argument and code assistance when an allowed inference provider is available;
- independent evidence checks and deterministic acceptance tests decide whether output can change mission state;
- owner approval gates stop account creation, KYC, legal terms, paid spend, external publication, financial transactions and other irreversible actions.

A free API quota is not an infrastructure guarantee. A free tier can change, be rate-limited, suspend, or be unavailable. Thus the swarm must degrade gracefully to deterministic research and queued work rather than stop the mission or silently switch to a paid model.

## 2. Exact baseline preserved before this research

A separate pre-research checkpoint was committed first:
- `governance/PHASE_59_8_AUTONOMOUS_SWARM_PRE_RESEARCH_CHECKPOINT_2026-11-14.md`
- checkpoint commit: `a0d94141beb21dae8260f17bb3719ae4e8109c5d`
- continuity commit: `ccaa9fefae9e0d99be49e24a92494d3311dc4967`

The canonical state remains:
- V5 strategy and Phases 59.1–59.7 preserved.
- P59-001 IN_PROGRESS; P59-002 BLOCKED.
- No product selected, no build authorized.
- PCNE ₹0; spend ₹0.
- Existing mission state reports a bounded deterministic GitHub Actions worker and AI executor `WAITING_FOR_OWNER_CONFIGURATION`, inference calls 0. Therefore the current system must not be described as an active AI-agent swarm.
- Existing Phase 59.7 Gumroad result is a distribution-rail research lead only, not product selection.
- Existing asset and candidate NO-GOs remain candidate-specific.

Repository audit limitation: GitHub code-search calls returned no indexed file matches for the searched workflow/orchestrator terms. The mission-state and continuity records were inspected, but a complete source-level inventory of every workflow/script has not yet been established through the connected GitHub interface. Before implementation, enumerate the repository tree and inspect the actual worker, guard, workflow YAML, scripts and permissions. Do not rewrite existing workflows blindly.

## 3. Zero-cost resource audit (official published terms, 14-Nov-2026)

### 3.1 GitHub Actions — primary ephemeral compute
Official GitHub documentation states:
- Standard GitHub-hosted runners are free and unlimited for public repositories.
- Standard Linux `ubuntu-latest` runner: 4 CPUs, 16 GB RAM, 14 GB SSD; `ubuntu-slim`: 1 CPU, 5 GB RAM.
- Free plan standard GitHub-hosted concurrency: 20 jobs.
- Actions schedules can be delayed during high load; some queued jobs may be dropped. Scheduled workflows can stop when their associated actor account is suspended/deleted/deprovisioned.

Sources:
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- https://docs.github.com/en/actions/reference/limits
- https://docs.github.com/en/actions/how-tos/troubleshoot-workflows
- https://docs.github.com/en/actions/concepts/billing-and-usage

Implications:
- Public repo Actions are a credible zero-cost batch compute fabric for deterministic crawling, parsing, tests, report generation and bounded agent workers.
- Start with 3–5 concurrent specialist jobs, not 20. Concurrency is a platform ceiling, not a design target.
- Do not treat Actions as an always-on server or guaranteed scheduler. Use push/dispatch events for urgent work, staggered cron for periodic polling, and a watchdog/heartbeat that detects missed runs and requeues idempotently.
- Each hosted job is ephemeral. Persist all state and artifacts outside runner disk before exit.
- Public repo visibility means no secrets, private/customer data, personal information or proprietary unreleased assets may be written to logs/artifacts/commits.

### 3.2 Cloudflare Workers Free — optional lightweight control plane
Official docs (updated 13-Nov-2026) list Workers Free:
- 100,000 requests/day;
- 10 ms CPU time per invocation;
- 128 MB memory;
- 50 subrequests/request;
- 5 Cron Triggers/account;
- Cron Trigger and Queue Consumer wall-time limit 15 minutes;
- free Workers KV: 100,000 reads/day, 1,000 writes/day, 1 GB storage;
- SQLite-backed Durable Objects and D1 have separate free quotas.

Sources:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/kv/platform/limits/
- https://developers.cloudflare.com/d1/reference/faq/

Implications:
- Useful for a small webhook receiver, lease/heartbeat service, lightweight scheduler, status endpoint or queue dispatcher.
- Not suitable for CPU-heavy browser automation, local LLM inference or long research tasks inside one Worker invocation.
- Cloudflare is optional. It requires owner-controlled account setup and deployment; no account or deployment is authorized in this research phase.
- Free quotas are hard limits; exceeding them causes requests to fail or may require a paid plan. Keep Cloudflare out of the critical path initially.

### 3.3 LLM inference — optional, replaceable and quota-aware
Google's official Gemini API pricing/rate-limit docs confirm a Free tier with access to selected models and free input/output tokens under model-specific rate limits. The free-tier pricing table explicitly states that submitted content may be used to improve Google products; paid tier says it is not. Quotas vary by model and are visible in AI Studio. They can return 429 when exceeded.

Sources:
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/billing

Implications:
- Gemini Free may be an optional reasoning provider for public, non-sensitive research text only, subject to current terms and account-specific quotas.
- Do not send credentials, customer data, private code, personal data, confidential commercial information or unreleased proprietary IP to a free provider.
- Never rely on a free quota for continuous production uptime. Persist task state and retry later; do not silently fall back to paid models.
- AI Studio/API account and key creation are owner-controlled actions; not performed here.
- Model availability, free quota and content terms must be rechecked at runtime and logged with timestamp.

### 3.4 Local models — optional private fallback, hardware-dependent
Ollama's model library shows approximate artifact sizes: Llama 3.2 1B about 1.3 GB, 3B about 2.0 GB; Llama 3.1 8B about 4.7 GB. Its docs indicate at least 8 GB available RAM for 7B, 16 GB for 13B and 32 GB for 33B models. CPU-only inference is possible but may be slow.

Source:
- https://github.com/ollama/ollama/blob/main/docs/quickstart.md

Implications:
- User's Windows + WSL environment is a possible local fallback, but current RAM/CPU/GPU availability is not verified in this phase. No hardware suitability claim is made.
- A small quantized 1B–3B model can handle constrained classification/extraction, not be assumed equivalent to a strong research model.
- A public GitHub runner's 16 GB RAM could technically run some small models, but model download time, cold-start and throughput may erase the benefit. Benchmark before adoption.
- Do not make local inference a required dependency.

### 3.5 Agent frameworks and orchestration
- LangGraph is a low-level stateful orchestration runtime. Its docs describe deterministic and LLM-driven nodes in one graph, persistence/checkpoints, long-running state and human-in-the-loop pauses.
  Sources: https://docs.langchain.com/oss/python/langgraph/overview ; https://docs.langchain.com/oss/python/langgraph/persistence
- PydanticAI supports durable execution via Temporal, DBOS, Prefect, Restate, Airflow and other integrations; its step persistence can save/restore/fork runs. Its retry docs warn that retry layers multiply and can create far more model calls than expected unless every layer is bounded.
  Sources: https://pydantic.dev/docs/ai/capabilities/durable_execution/overview/ ; https://pydantic.dev/docs/ai/core-concepts/retries/
- n8n Community is free self-hosted under its Sustainable Use License for internal use, but n8n is fair-code/source-available, not OSI open source; certain customer-facing workflow-builder/hosted-service use cases require a commercial licence.
  Sources: https://support.n8n.io/article/can-i-use-your-license-for-my-use-case ; https://github.com/n8n-io/n8n

Decision:
- Do not add multiple frameworks. Start with a small Python deterministic orchestrator and JSON-schema contracts, using existing GitHub Actions. If graph complexity justifies it, adopt LangGraph OSS for state transitions/checkpointing. PydanticAI can be added later as a typed model-agent adapter, not as a second orchestration control plane.
- Do not adopt n8n as the mission's core engine; it adds hosting and licensing boundaries without solving the evidence/PCNE governance problem.

## 4. Recommended architecture — NEXUS REVENUE INTELLIGENCE & EXECUTION SWARM

### 4.1 Layered architecture

1. **Mission Constitution / Policy Layer**
   - V5 master plan, hard constraints, owner gates, one-active-build invariant, PCNE recognition rules.
   - Policy engine rejects unauthorized spend, account/KYC/legal acceptance, public release, unsafe scraping, spam, manual gig bidding and unsupported claims.

2. **Control Plane**
   - Deterministic orchestrator reads the queue, validates dependencies, leases tasks, sets deadlines, assigns worker roles, caps concurrency and resumes from checkpoints.
   - Idempotency keys prevent duplicate research/build/revenue events.
   - Every task has owner, status, evidence requirements, max attempts, max runtime and terminal disposition.

3. **Research Intake / Evidence Fabric**
   - Source registry for official docs, public web pages, marketplaces, open-source repositories, public buyer discussions and pricing pages.
   - Capture URL, title, publisher, observed_at, published_at if available, exact excerpt, source class, hash, rights/access basis, confidence and claim linkage.
   - Store raw snapshots separately from derived claims. Never treat model-generated summaries as primary evidence.
   - Respect robots, terms, rate limits, privacy, copyright and source access restrictions.

4. **Specialist Agent Pool**
   - Agents receive narrow typed tasks and return structured JSON, not free-form mission updates.
   - Agent roles below.
   - Each agent cites evidence IDs and marks unknowns explicitly.

5. **Independent Verification / Adversarial Review**
   - Claim checker verifies source-to-claim mapping and freshness.
   - Contrarian agent actively searches for incumbent features, native substitutes, counterexamples and legal/payout blockers.
   - Economics auditor recomputes all arithmetic independently.
   - A candidate cannot be promoted by majority vote alone; hard gates are deterministic.

6. **Decision Engine**
   - Weighted V5 score plus hard gates.
   - Candidate statuses: DISCOVERED → EVIDENCE_PENDING → QUALIFIED → DOSSIER_READY → OWNER_GATE (if needed) → BUILD_AUTHORIZED → BUILD → QA → RELEASE_GATE → EARNING → REPEATABILITY_PROVEN.
   - NO-GO is candidate-specific unless source-level evidence independently supports closure.

7. **Build / QA / Release Fabric**
   - One new product build active by default.
   - Coding agents may create isolated branches/patches; tests, static analysis, security checks and reproducible builds run deterministically.
   - Agent-generated code cannot self-approve, merge to master, publish, create accounts or enable billing.
   - Release Guardian requires all V5 gates and explicit owner authorization.

8. **Revenue Evidence & PCNE Ledger**
   - Separate source-level and portfolio-level ledgers.
   - Import platform evidence only through authorized sources/connectors or owner-provided exports.
   - Count independent customer earnings once after platform share, refunds/reversals, fees and attributable runtime/delivery costs. Track held, withdrawable and bank-settled separately.
   - No estimated MRR, GMV, downloads, free credits or bank transfer double-counting.

9. **Observability / Recovery**
   - Run IDs, task IDs, correlation IDs, worker heartbeats, logs, evidence manifests, model/provider/version, tokens/requests where available, duration, retries, exit reason and cost.
   - Dead-letter queue for exhausted tasks; no infinite retries.
   - Watchdog requeues expired leases; state reconciliation compares queue, report and mission_state.

### 4.2 Expert agent roles (logical roles, not necessarily 15 simultaneously running LLMs)

| Role | Mandate | Output contract |
|---|---|---|
| 1. Portfolio Scout | Discover eligible source families and new opportunities | Candidate cards with buyer, job, revenue model |
| 2. Buyer-Pain Researcher | Find independent current buyer pain evidence | Claim/evidence matrix, signal independence |
| 3. Competitor Cartographer | Find 10–15 direct/adjacent substitutes and native features | Feature/pricing/position matrix |
| 4. Pricing & WTP Analyst | Separate published list price from real WTP | Buyer/budget evidence and confidence |
| 5. Distribution Analyst | Verify discovery and compliant self-serve acquisition | Reachable channel and conversion unknowns |
| 6. Platform/Payout Auditor | Verify seller geography, fees, payout thresholds and restrictions | Official policy gate |
| 7. Rights & Safety Auditor | Source rights, IP ownership, data rights, privacy and ToS | PASS/HOLD/FAIL with evidence |
| 8. Technical Architect | Assess implementation, integrations, deployment and maintenance | Feasibility and dependency graph |
| 9. Unit Economics Analyst | Recompute net margin, runtime, refunds, support and FX | Reproducible model and sensitivity |
| 10. Red-Team / Contrarian | Search for falsifying evidence and hidden incumbents | Counter-evidence and kill criteria |
| 11. Evidence Editor | Deduplicate sources, trace claims and produce dossier | Provenance-backed report |
| 12. Portfolio Judge | Rank candidates under V5 and identify next sequence | FIRST/NEXT/HOLD/NO-GO |
| 13. Coding Agent | Implement approved scoped changes in isolated branch | Patch, tests, build artefacts |
| 14. QA/Security Agent | Run deterministic tests, dependency/security checks | Test report and unresolved risk |
| 15. Revenue Auditor | Verify transactions and PCNE reconciliation | Ledger entry with evidence |

Do not create one LLM instance per role by default. A single model endpoint can service multiple stateless role prompts; deterministic tools perform most tasks. Parallelism is for independent tasks, not artificial agent count.

### 4.3 One research cycle — batch, not serial chat turns

For each cycle:
1. Load current mission state and all unresolved candidate cards.
2. Generate a bounded batch of 8–20 opportunity hypotheses from the source-family map and existing IP inventory.
3. Run deterministic deduplication and policy filtering.
4. Dispatch 3–5 concurrent scouts on different source families/problems.
5. For serious candidates, launch parallel buyer, competitor, pricing, distribution, technical, rights and payout work.
6. Run adversarial review against every promising candidate.
7. Run deterministic V5 score and hard-gate engine.
8. Produce one consolidated portfolio report, rejected-candidate register and next-action queue.
9. Commit evidence/report/state as one controlled update after schema validation and tests.
10. Continue automatically to next batch while budgets/quotas permit; pause on quota exhaustion, ambiguous rights or owner gate.

The cycle can return one consolidated result after many bounded research jobs. It must not generate dozens of unreviewed speculative ideas.

## 5. Model and execution routing

Recommended inference priority:
1. Deterministic code and official-source retrieval; no LLM call if a rule/parser can solve it.
2. Optional free-tier API for public, non-sensitive synthesis only, with per-provider quotas and strict daily call/token budgets.
3. Optional local Ollama model for low-risk extraction/classification after hardware benchmark.
4. If all inference routes are unavailable, persist tasks as WAITING_FOR_MODEL_QUOTA and continue deterministic evidence collection. Never call a paid endpoint automatically.

Critical controls:
- No paid fallback configured in code.
- Provider allowlist, model pinning, max output tokens, timeout, request limit, daily hard cap and circuit breaker.
- Set retry maximums at every layer. PydanticAI docs explicitly warn that retries multiply across agent, SDK, transport and durable workflow layers.
- Avoid parallel calls to the same provider when rate-limits are shared per project.
- Record prompt/version, provider/model, timestamp and quota outcome; redact keys.
- Free-tier provider data-use policy must be accepted only after owner review. For Gemini free tier, treat content as potentially used to improve Google products; only public research material allowed.

## 6. Public repository security and data boundary

The canonical repository is public. This creates a strict boundary:
- Never store API keys, GitHub tokens, cookies, session state, payment information, customer personal data or confidential source files in repository content, artifacts, issues or logs.
- Use GitHub Actions minimal `permissions:`; default read-only. A separate write job should receive contents-write only after validated outputs.
- Pin third-party Actions to verified full-length commit SHAs; GitHub recommends full-SHA pinning as strongest reference protection absent dependency lockfiles.
- Never run privileged `pull_request_target` jobs against untrusted PR code or interpolate untrusted text into shell commands.
- Do not give research agents direct write permissions to `master`. They produce signed/hashed artifacts or branch patches; a deterministic validator and gated publisher commits.
- Protect mission files with schema validation, monotonic phase IDs, known state transitions and a no-regression test.
- Treat retrieved web pages, repository READMEs and user-generated content as untrusted input; prompt injection must never change tool permissions or mission policy.

Official source: https://docs.github.com/en/actions/reference/security/secure-use

## 7. Automation boundary: what can be fully automated?

| Workstream | Automation ceiling | Manual/owner gate |
|---|---|---|
| Public research, source capture, dedupe, competitor scan | High | Ambiguous source rights / blocked sites |
| Candidate scoring, financial scenarios, evidence audits | High with deterministic checks | Final risk appetite / disputed evidence |
| Code generation, tests, local packaging | High for bounded tasks | Architecture exceptions / destructive changes |
| Deployment to private test environment | High after approved credentials/environment | Account setup, credentials |
| Marketplace listing/public launch | Partially automatable | Terms, KYC, seller declarations, publication approval |
| Customer onboarding/self-serve delivery | High if product supports it | Sensitive customer exception |
| Support triage, docs, routine status | High | Refund/dispute/legal/safety exceptions |
| Pricing changes, ads, paid promotion, purchases | Not automatic by default | Explicit spend approval |
| Payment receipts and PCNE ledger | High if authorized data access exists | Missing/ambiguous payout evidence |
| ₹10 Cr achievement | Not controllable by software | Depends on market demand, retention, economics and external platforms |

"Fully automated" therefore means maximum autonomous operation within an explicitly bounded authority envelope, not bypassing owner/legal/platform approvals.

## 8. Recommended zero-cost-first stack

| Layer | First choice | Reason / boundary |
|---|---|---|
| Compute | GitHub Actions public runners | Free unlimited standard public-repo compute; ephemeral jobs |
| Queue/control | Existing JSON queue + Python dispatcher initially | Avoid introducing new infrastructure before source audit |
| Orchestration | Small deterministic Python state machine; LangGraph only if needed | Simpler and testable; no managed cloud required |
| Evidence store | Git-tracked public evidence metadata + compressed run artifacts; evaluate D1 only if needed | Never place secrets/private evidence in public repo |
| Structured data | SQLite/DuckDB in job + versioned JSON manifests | No server cost; artifacts must be persisted after job |
| Search/retrieval | Official public docs, permitted web search, GitHub API and licensed/public sources | Respect rate limits and access terms |
| LLM | Gemini free tier only after owner review; local small Ollama model as optional | No guaranteed capacity; free-tier data-use caveat |
| Validation | JSON Schema/Pydantic, pytest, Ruff, mypy, Bandit/Semgrep where feasible | Deterministic gates |
| Observability | JSONL logs, run manifests, GitHub Actions summaries/artifacts | Free, reproducible and auditable |
| Optional edge | Cloudflare Workers/D1/KV Free | Only for lightweight control plane; optional, not critical |

Do not add Supabase, paid hosting, vector database, paid browser automation or managed agent runtime unless a concrete bottleneck is measured and owner authorizes spend. A public Git repository is not a private database.

## 9. Phased implementation plan and acceptance tests

### Phase A — existing automation forensic audit (first)
- Enumerate all repository paths, workflows, scripts, dependencies, triggers, secrets references and workflow permissions.
- Fetch latest workflow run histories, guard/worker logs and current exact HEAD.
- Map deterministic worker, queue poller, AI executor stub, owner gates and all state writes.
- Identify duplicated schedules, stale queue entries, unbounded retries, missing heartbeat and any write permissions.
- Deliver a source-level architecture diagram and risk register before code changes.

Acceptance:
- 100% of `.github/workflows/**` and mission runtime source files inventoried.
- Every scheduled trigger and write-capable workflow documented.
- AI provider configuration status evidenced, not inferred.
- No secrets exposed in public paths/logs.
- No existing working automation overwritten without test and rollback.

### Phase B — swarm foundation (no LLM dependency)
- Define candidate, evidence, claim, task, run and ledger JSON schemas.
- Build deterministic dispatcher, lease/heartbeat, dedupe, bounded retries, dead-letter queue and checkpoint/resume.
- Build one generic worker interface and 3 sample deterministic workers.
- Add provenance and immutable run manifests.
- Add schema/continuity/PCNE no-regression tests.

Acceptance:
- Restart after simulated failure resumes without duplicate work.
- Duplicate task delivery is idempotent.
- Queue cannot exceed concurrency cap.
- Max attempts and run duration are enforced.
- Missing evidence never promotes a candidate.
- PCNE cannot increase without transaction evidence.
- Unauthorized owner-gated action is rejected.

### Phase C — LLM specialist pool
- Add provider abstraction, quota detection, model allowlist and zero-paid-fallback rule.
- Add scout, competitor analyst, pricing analyst, red-team and evidence editor roles.
- Use structured output schemas and evidence IDs.
- Compare two independent agent analyses against a deterministic reference set.

Acceptance:
- Invalid schema output is rejected/retried within a strict budget.
- Unsupported claims are flagged.
- Prompt-injection test cannot alter policy or execute tools.
- Provider 429/outage pauses inference and preserves queue state.
- No private data is sent to free-tier provider.

### Phase D — autonomous portfolio research
- Batch source-family discovery and candidate research in parallel.
- Build competitor and pricing registries.
- Automatically produce V5 evidence dossiers and candidate-specific NO-GO/HOLD decisions.
- Run adversarial review and economics recomputation.

Acceptance:
- Every material claim has source URL, retrieval date and evidence excerpt.
- Every serious candidate has 10–15 substitutes or explicit evidence-debt status.
- Two independent demand signals are required; same syndicated article/vendor source does not count twice.
- Published price is not mislabelled as WTP.
- Candidate score is reproducible from stored inputs.
- No source-family closure from candidate-level NO-GO.

### Phase E — one-product engineering and earning loop
- Select highest-ranked candidate only after V5 hard gates.
- Coding worker creates isolated branch, tests and deployment package.
- QA/security worker independently reviews.
- Owner approves account/KYC/terms/public release.
- Self-serve delivery and permitted transaction evidence feed PCNE ledger.

Acceptance:
- Independent customer paid transaction.
- Platform/provider credited net earning verified.
- Fees, refunds, runtime and delivery costs reconciled.
- Positive fully-loaded unit economics.
- Repeatability/retention signal measured.
- Only then add next build while earlier validated engine remains active.

## 10. Risks and limitations

1. **Free-tier fragility:** quotas, models, rate limits, account availability and terms can change. The system must be useful even with zero LLM calls.
2. **Public repo risk:** a public Actions workflow can expose data through logs, artifacts, permissions or malicious PR inputs. Public research only; secrets isolated.
3. **Research hallucination:** multiple agents can agree on the same false premise. Primary sources, source independence and deterministic validation outrank consensus.
4. **False demand signals:** social complaints, downloads and list prices are not price-bearing WTP. Require budget-owner evidence or real paid usage.
5. **Agent cost explosion:** retries and parallel subagents multiply model calls. Every layer must have a shared task budget and hard stop.
6. **Legal/IP risk:** public data is not automatically free to scrape, redistribute or use commercially. Copyright, privacy, ToS, database rights and software licences need candidate-specific review.
7. **Platform dependency:** one platform can change seller eligibility, payout or API access. Diversify products and distribution rails without double-counting revenue.
8. **Revenue uncertainty:** system automation cannot create buyer demand or guarantee ₹10 Cr. It can increase research throughput and execution discipline, not guarantee market success.
9. **Human gate:** KYC, legal declarations, banking, spend and release approval remain owner actions.
10. **Compute ceiling:** free public runners are ephemeral batch workers, not permanent servers. Do not design a 24/7 daemon around them.

## 11. Final recommendation

**GO for staged architecture implementation, beginning with Phase A forensic audit and Phase B deterministic swarm foundation.** This is an architecture GO, not a product build GO and not authorization to create external accounts or spend.

Recommended target shape:
- 1 deterministic orchestrator;
- 3–5 concurrent workers initially;
- 10–15 logical expert roles, reused over bounded tasks;
- 1 independent red-team pass for every serious candidate;
- 1 deterministic evidence/economics gate;
- 1 portfolio judge;
- 1 isolated coding worker only after product selection;
- 1 independent QA/revenue auditor;
- owner approval gates for irreversible actions.

The system should complete one full batch of portfolio research in a single automated run, store the evidence and resume later without losing context. It should not wait for a new ChatGPT response to decide the next research task. ChatGPT becomes the strategic supervisor and exception handler, while GitHub Actions executes the bounded recurring workload.

**Critical next step:** perform Phase A source-level audit of the current canonical repository before modifying workflows. Existing mission state proves the bounded deterministic worker exists and AI executor is waiting for provider configuration; it does not prove the entire workflow tree has been audited. No AI provider has been configured or called in this phase.

## 12. Official references
1. GitHub Actions billing: https://docs.github.com/en/actions/concepts/billing-and-usage
2. GitHub hosted runner specs: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
3. GitHub Actions limits: https://docs.github.com/en/actions/reference/limits
4. GitHub schedule reliability: https://docs.github.com/en/actions/how-tos/troubleshoot-workflows
5. GitHub Actions security: https://docs.github.com/en/actions/reference/security/secure-use
6. Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
7. Cloudflare pricing / free quotas: https://developers.cloudflare.com/workers/platform/pricing/
8. Cloudflare D1 FAQ: https://developers.cloudflare.com/d1/reference/faq/
9. Gemini API pricing/data-use: https://ai.google.dev/gemini-api/docs/pricing
10. Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
11. Ollama model sizes / RAM: https://github.com/ollama/ollama/blob/main/docs/quickstart.md
12. LangGraph overview: https://docs.langchain.com/oss/python/langgraph/overview
13. LangGraph persistence: https://docs.langchain.com/oss/python/langgraph/persistence
14. PydanticAI durable execution: https://pydantic.dev/docs/ai/capabilities/durable_execution/overview/
15. PydanticAI retries: https://pydantic.dev/docs/ai/core-concepts/retries/
16. n8n Sustainable Use License: https://support.n8n.io/article/can-i-use-your-license-for-my-use-case

---
**Status truth:** This is a research/architecture decision document only. No swarm code was deployed, no AI provider was configured, no account was created, no spend occurred, and no revenue was earned in this phase.
