# Phase 29 Engineering Note — Zero-Cost Continuous Autonomous Worker
**Date:** 2026-11-12  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem V3  
**Status:** Architecture selected; worker implementation and provider authorization remain pending.

## 1. Live repository audit

Canonical branch: `master`  
Verified HEAD at audit: `942265bd9789b211fdba99aead3ae72d799a3b19`  
Latest commit message: `Link execution status protocol from repository front page`  
Commit time: 2026-11-12 03:13:34 UTC (08:43:34 IST).

Current mission state:
- Phase: `PHASE_29_CONTROL_PLANE`
- Verified realized net receipts: ₹0
- Authorized spend: ₹0
- Active build limit: 2
- Queue: P29-001 completed; P29-002 and P29-004 in progress; P29-005 through P29-008 blocked/dependent.
- Mission-state `last_verified_head` was stale at the time of audit and must be synchronized to the actual HEAD in the next state update.

Scheduler evidence:
- `Advance ₹10 Cr Mission`: enabled, daily 08:30 Asia/Kolkata; no recorded run at audit; next scheduled run 2026-11-13 08:30 IST.
- `₹10 Cr Progress Watch`: enabled, hourly condition-watch; no recorded run at audit; next scheduled check 2026-11-12 08:44 IST.
- `.github/workflows/mission-continuity-guard.yml`: committed, schedule 02:41 UTC daily and manual dispatch. No corresponding run appeared in the latest 20 workflow runs at audit; first scheduled execution is therefore unverified.
- Latest workflow runs included a successful legacy bounty-discovery run (43141971798) from 02:31 UTC. The current workflow file is now `workflow_dispatch` only, so this historical run does not establish an active recurring bounty schedule.
- Orbit Relay CI had several earlier failures and later successes; latest observed Orbit Relay run 43132045102 completed successfully at 01:05:35 UTC. This is product QA, not evidence of revenue or of the mission worker being active.
- No continuous mission worker is currently proven to be running.

## 2. Objective and terminology

The target is a recoverable, queue-driven cloud agent that makes safe progress without waiting for a user to type "next".

Do not call a cron schedule an always-on process. The zero-cost target architecture is **continuous operation by repeated bounded execution**:
1. Wake on schedule or event.
2. Acquire a single-worker lease/concurrency lock.
3. Read mission state and durable queue.
4. Select the highest-priority eligible task.
5. Execute one bounded unit of work.
6. Validate outputs and evidence.
7. Commit durable state/report.
8. Release the lease and exit.
9. Retry safely on the next wake-up after transient failure.

This gives near-continuous availability without a permanently running VM. It is not a hard real-time SLA; scheduled jobs can be delayed or dropped.

## 3. Selected zero-cost-first architecture

### A. Execution fabric — GitHub Actions
Use the existing public repository and standard GitHub-hosted Linux runners. Official GitHub documentation currently states that standard hosted runners are free and unlimited for public repositories. The shortest supported schedule interval is five minutes. However, GitHub explicitly warns that schedule events can be delayed or dropped during high load. Therefore:
- Start with a five-minute wake-up schedule, off the hour.
- Keep every run bounded (initial target: 8–12 minutes).
- Use concurrency groups to prevent overlapping queue consumers.
- Add `workflow_dispatch` and `repository_dispatch`/push triggers for immediate work.
- Persist state in committed JSON/Markdown and artifacts; never depend on runner-local disk surviving.
- Use idempotency keys, leases, bounded retries, exponential backoff and dead-letter status.
- Do not run empty AI calls when there is no eligible task.

Official references:
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- https://docs.github.com/en/actions/concepts/billing-and-usage

### B. AI inference — provider adapter with strict zero-spend cap
Candidate first adapter: Cloudflare Workers AI, using an eligible Free-plan model and a hard daily quota ceiling. Official pricing states 10,000 Neurons/day free allocation; some models require a paid plan. The worker must stop inference before any paid usage can occur.
- Do not enable paid billing.
- Do not select models requiring a paid plan.
- Store account ID/token only as GitHub Actions secrets after owner setup.
- Redact credentials from all logs and artifacts.
- Implement quota circuit-breaker, model fallback, daily usage ledger and fail-closed behavior.
- Treat the 10,000 Neurons allocation as a small inference budget, not unlimited AI compute.
- Provider adapter interface must permit additional genuinely free providers only after their current terms, commercial-use rights, quotas, India access and data-use policies are verified.

Official references:
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/

### C. Durable state and memory
GitHub repository remains the canonical memory:
- `control/mission_state.json`: mission phase, receipts, spend, current focus, worker heartbeat.
- `control/automation_queue.json`: task graph, priority, dependencies, lease, retries, terminal states.
- `control/opportunity_registry.json`: candidate models and evidence.
- `control/payout_registry.json`: provider/rail eligibility, fees, thresholds, holds, settlement.
- `control/revenue_ledger.json`: only settled, controlled, reconciled net receipts.
- Per-run report: timestamps, task ID, provider/model, quota used, source URLs, tests, commit, failures and next action.

### D. Supervisor and alerting
- ChatGPT daily scheduled agent remains the strategic research/supervisor layer.
- Hourly condition-watch remains a notification layer, not a worker.
- GitHub Actions run status and repository heartbeat are the machine evidence.
- A run is productive only if it completes a queue item or creates inspectable evidence/code/test/report and checkpoints it.

## 4. Why Cloudflare Cron alone is not the execution engine

Current official Workers Free limits list 10 ms CPU per Cron Trigger invocation and 15-minute wall time. This is suitable for lightweight dispatch/health checks, not a general-purpose autonomous research/coding process. Workers AI can provide remote inference, but its free allocation is finite. Therefore the GitHub-hosted runner should do the longer bounded orchestration while Cloudflare AI is only a metered-by-quota inference endpoint.

Official reference: https://developers.cloudflare.com/workers/platform/limits/

## 5. Worker safety and revenue gates

The worker may autonomously:
- Research public sources and record evidence.
- Rank opportunities using the V3 rubric.
- Generate/test code and private product assets.
- Build QA reports, landing pages and draft listings.
- Run read-only payout reconciliation and prepare owner-action packets.
- Commit reversible, tested changes to the canonical repository.

The worker must pause only the affected task for:
- KYC, tax declarations, legal acceptance, account ownership.
- Bank/wallet connection, private-key access, wallet signing or funds movement.
- Public release, paid spend, irreversible publication or contractual submission.
- Any API/service requiring payment or nonzero billing.

No fake engagement, spam, policy bypass, IP infringement, unauthorized financial activity or manual-labour business model.

## 6. Implementation sequence

1. Reconcile stale mission HEAD and make the continuity guard produce an observable run.
2. Build a deterministic queue consumer with lease/idempotency/retry/dead-letter and machine-readable heartbeat.
3. Add the five-minute bounded GitHub Actions worker workflow, initially in safe dry-run mode.
4. Add a provider-neutral inference adapter and strict zero-cost quota circuit-breaker.
5. Prepare the one-time Cloudflare owner setup packet; do not request credentials in chat or commit them.
6. Enable AI execution only after secrets are stored securely and a zero-billing test passes.
7. Add event-triggered wake-ups on queue changes and worker recovery after failure.
8. Run a 24-hour soak test; report actual run count, productive run count, queue throughput, failed/delayed runs, quota use, and verified spend.
9. Increase concurrency only after idempotency, evidence integrity and payout gates pass.

## 7. Acceptance criteria for calling this an autonomous worker

Do not declare success until all are true:
- A schedule or event wakes the worker without a user prompt.
- It consumes an eligible queue item and produces a durable output.
- It validates output before state transition.
- It commits/checkpoints its work.
- It recovers from runner termination without duplicate side effects.
- It records heartbeat, run ID, task ID, start/end, retries and failures.
- It enforces zero-spend and owner-action gates.
- It completes a 24-hour soak test with measured evidence.
- AI quota and provider failure do not corrupt or lose queued tasks.

**Current conclusion:** scheduler and repository control plane exist, but continuous autonomous execution is not yet deployed or proven. The selected route is a five-minute GitHub Actions queue worker plus a strictly quota-limited free inference provider, with ChatGPT as strategic supervisor.