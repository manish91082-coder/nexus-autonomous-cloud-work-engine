# Marketplace Expansion Audit — 2026-11-11

Repository scope: this destination copy only. All observations below were read-only. No registrations, claims, wallet connections, bids, submissions, gas requests, transfers or payments were performed.

## Decision summary

| Platform | Live evidence observed | Economic / operational findings | Decision |
|---|---|---|---|
| AgentBadge (Agent Venue on Arc) | Public GET /api/venue/jobs?status=open returned 1 job: `durability probe`, budget 0.01 USDC, created 2026-11-06; no chain transaction evidence in the returned record | Public economics endpoint reports 250 bps take rate. Job appears to be a regression/test probe, not commercial paid work. | EXCLUDE current listing; keep a low-frequency read-only watch only |
| Moltask | Public GET /api/tasks returned 8 unique records (API reported total 7, including duplicated/near-duplicated task records); all listed rewards are MOLT | Official docs state 2.5% fee and payout in MOLT on approval. Official homepage explicitly warns beta contracts are unaudited. The observed listings were created 2026-01-30/31, many promotional/referral-like, and detail URLs tested returned 404. | EXCLUDE from production earning pipeline; high token/contract and stale-feed risk |
| AgentBounties | Commonworld Atlas reported 73.348679 USDC lifetime payout volume and 58 settled rounds as of 2026-11-01, but these are operator/API-sourced metrics; direct metrics endpoint returned HTTP 503 in this audit | Activity evidence is better than a bare landing page but current live tasks, task-level escrow, worker rules and India payout path were not verified. | DEFER; retry public API when service is healthy, no onboarding yet |
| Agoragentic | Atlas page states paid execution and platform custody were paused while interchange work continued (last verified 2026-10-17) | Free catalogue/receipt routes remain, but paid execution paused | EXCLUDE until operator confirms paid execution resumed |
| Agent Venue activity history | Atlas snapshot from 2026-10-15 reported 7 jobs and 1.85 USDC all-time volume; current live page says no activity yet; current API returns only a 0.01 USDC durability probe | Old snapshot is not current liquidity proof | Current API snapshot overrides old activity claims |

## Official / primary sources

- Moltask homepage: https://www.moltask.com/ (states beta contracts unaudited)
- Moltask API docs: https://www.moltask.com/docs (public GET endpoints; MOLT payout; 2.5% fee)
- Moltask live tasks: https://www.moltask.com/api/tasks
- AgentBadge market: https://agentbadge.xyz/market
- AgentBadge open jobs: https://agentbadge.xyz/api/venue/jobs?status=open
- AgentBadge economics: https://agentbadge.xyz/api/venue/economics
- AgentBounties public platform metrics: https://api.agentbounties.app/v1/metrics/platform (HTTP 503 during audit)
- AgentBounties QA profile: https://commonworld.one/atlas/platforms/agent-bounties/
- Agent Venue QA profile: https://commonworld.one/atlas/platforms/agentbadge-agent-venue/
- Agoragentic QA profile: https://commonworld.one/atlas/platforms/agoragentic/

## India and autonomy filter

Human contributor platforms such as Mercor, Mindrift, OneForma, Prolific, Toloka and similar programs may accept Indian residents for some roles, but acceptance is task/role-specific and does not establish permission for autonomous agent execution. Many roles require human identity, human judgement, KYC, interviews, or manual performance. These must not be presented as fully automated revenue sources. They may be maintained as a separate human-assisted opportunity list only if the user later chooses that route.

## Implementation

- Added `cloud-work-engine/marketplace_radar.py`, a standard-library-only, read-only monitor for AgentBadge and Moltask.
- Added `cloud-work-engine/tests/test_marketplace_radar.py`.
- Added the radar to `.github/workflows/nexus-funded-job-scan.yml`.
- Risk rules deliberately exclude AgentBadge test/micro-value probes and Moltask's unaudited token-beta/stale feed.
- No new marketplace write adapter was enabled.

## Cloud verification

- GitHub Actions run: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43043131458
- Run ID: `43043131458`
- Conclusion: SUCCESS
- Full test suite: 135 tests passed.
- Marketplace radar output: AgentBadge 1 record, excluded as test/micro-value; Moltask 8 unique records, all excluded as unaudited token/stale feed.
- Artifact: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43043131458/artifacts/13864759846
- No income recognized; no write operations.

## Next priority

1. Re-check AgentBounties public API and discover its task feed/escrow endpoints when its 503 clears.
2. Expand the radar across the agent-native marketplace catalogue, but require current public API, non-test task volume, independently verifiable funded payout, explicit agent permission, and viable India withdrawal route.
3. Do not spend time integrating human-first contributor platforms into the autonomous execution path.
4. Continue counting income only after a cleared receipt is reconciled net of every fee and cost.
