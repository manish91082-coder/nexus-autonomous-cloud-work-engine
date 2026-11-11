# Multi-source agent marketplace verification — 2026-11-11

## Scope
Read-only verification of TaskBounty, ClawTasks, Claw Earn, MoltJobs, AgentPact, AgentHansa, Daydreams TaskMarket, and Jobbi's public payment audit. No account creation, bids, claims, wallet connections, signatures, paid credits, or submissions.

## Findings

### 1. TaskBounty — live funded inventory empty
- Public agent docs explicitly support REST API, Codex/Claude Code/MCP agents, GitHub PR or patch submissions, sandbox verification.
- GET https://www.task-bounty.com/api/v1/tasks returned `data: []`, `availability: empty`, message "There are currently no open funded tasks."
- Terms: standard bounty contributor share 80%, platform 20%; AI-generated code must be disclosed; sandbox pass does not guarantee selection/payment; winner selected by creator and admin award review. First approved solver award queued without $50 minimum; later solver withdrawals require $50 pending balance. Payout eligibility depends on jurisdiction/provider; operator is told to confirm before work. Terms expressly say USDC on Solana, ETH or BTC, and an Ethereum address does not establish Base USDC support.
- Verdict: HOLD / no task. Do not register until an actual funded task appears and India payout method confirmed.
- Sources: https://www.task-bounty.com/for-agents ; https://www.task-bounty.com/api/v1/tasks ; https://www.task-bounty.com/terms ; https://www.task-bounty.com/pricing

### 2. ClawTasks — paid work paused
- Official docs say platform is currently free-task only while reliability/review/worker quality is hardened. Paid bounty wind-down/cancel/refund process referenced.
- Historical paid model used 10% worker stake and 5% platform fee, but it is not currently a live paid earning channel.
- Verdict: REJECT for paid-revenue queue until paid tasks resume.
- Source: https://clawtasks.com/docs

### 3. Claw Earn — no available tasks at live check
- Public available-task page said "No available tasks right now."
- Official machine-readable manifest and docs describe Base USDC non-custodial escrow, agent API endpoints, 10% fee, 48-hour buyer auto-approval, task minimums and stake requirements. Human-flow new worker stake can be 30% for first task; A2A fast-flow minimum is 3 USDC and fee floor 0.5 USDC. Worker must use API/UI and locally sign transactions; no private key should be given to platform.
- Current inventory empty, and worker stake/wallet signing would require explicit approval and funded wallet. 
- Verdict: HOLD; monitor for future task inventory, do not create wallet or sign.
- Sources: https://aiagentstore.ai/claw-earn/ai-agent-tasks/available ; https://aiagentstore.ai/.well-known/claw-earn.json ; https://aiagentstore.ai/claw-earn

### 4. MoltJobs — real buyer posts, but current marketplace work is not funded
- Live stats as of 2026-11-11T17:30:05Z: 132 total jobs, 57 total completed, 46.3 USDC total volume, 3.8 USDC escrowed; ordinary marketplace subset 70 jobs, 15 completed, 42.3 USDC settled, 6 employers, only 1 funded employer; 7 agents ever paid. Totals include platform promotional/referral jobs, marketplace subset excludes them.
- Open-jobs page displayed 8 ordinary jobs: 5, 150, 150, 200, 20, 10, 5, 180 USDC. Larger current briefs included two landing pages ($150 each) and RWA / asset management research ($180/$200).
- Public API GET /v1/jobs?status=OPEN showed all actual third-party marketplace records as `status=OPEN` but `funded=false`, `escrowTxHash=null`, `escrowJobId=null`, and paymentStatus null. Therefore budgets are not task-specific funding. Some detail endpoints require login (401); public index still gives enough evidence to withhold work.
- Pricing: 5% platform fee; 10 free bid credits/month; operating costs separate. USDC escrow on Base, buyer approval/review terms apply.
- Verdict: strongest future candidate platform by buyer demand and agent-compatible API, but NO current task is economically qualified until funding flips true and acceptance criteria are fully inspectable. Do not register or bid yet.
- Sources: https://moltjobs.io/open-jobs ; https://api.moltjobs.io/v1/stats ; https://api.moltjobs.io/v1/jobs?status=OPEN ; https://moltjobs.io/pricing ; https://moltjobs.io/docs/api

### 5. AgentPact — large needs count but substantial noise / low-value
- Public stats as of 2026-11-11T17:31:20Z: 3 paid external settled deals, $200 settled external volume, 54 practice deals, 539 open needs, 5,775 active offers. Platform explicitly excludes self-deals, own-fleet deals and quarantined deals from paid settlement stats.
- Public needs page includes multiple 0.01 USDC probes, free-tier/bootstrap/reputation-only needs, duplicate self-tests and low-value micro tasks; some research needs have $40–$80 budgets but require detail-level verification and escrow proof.
- API describes paid USDC escrow deals with acceptance tests and timeout refunds, but registration needs agent identity/API key; creating offers/needs or proposing deals is an external action. No account registration or deal proposed.
- Verdict: HOLD for targeted filtering; only inspect genuinely buyer-originated paid needs with a distinct buyer owner, funded escrow and substantive budget. Aggregate 539 count is not proof of demand.
- Sources: https://api.agentpact.xyz/api/stats/public ; https://agentpact.xyz/needs ; https://agentpact.xyz/

### 6. AgentHansa — no active quests; referral/social lane not autonomous enough
- Explore page showed 0 active quests and $0 total earned. Visible historic quests are settled. Personal tasks are pro-bono. Some collaborative tasks require public promotion/newsletter mentions or external social activity. Merchant offers have zero conversions in visible examples; social identity verification requires operator X/Reddit actions. Automatic payouts via FluxA and 5% fee are documented, but identity binding and external promotional work are not fully autonomous.
- Verdict: no current fully automated paid task. Reject social promotion/identity tasks; revisit only for software/research tasks with real current funded reward and no public-account actions.
- Sources: https://www.agenthansa.com/explore ; https://www.agenthansa.com/llms-full.txt

### 7. Daydreams TaskMarket — visible 1 USDC interoperability challenge already claimed
- Task page status was `claimed`; task asks to test wallet connection and any signing request. Reward 1 USDC. Wallet connection/signing explicitly out of scope without owner authorization; task already claimed.
- Verdict: reject.
- Source: https://taskmarket.dev/tasks/0x68ecbaa4287ed0608238904a1ca7b0cd8137e35a94bc127f59e19734a497a674

### 8. Jobbi public audit — market is small-ticket, many stale/unfunded boards
- Jobbi's Oct 15 public audit reports Agent Bounties A- but only 13 claimable bounties totaling 36.9 USDC, mostly maintainer-posted; BasedAgents B- and 25 cents to 2 USDC open bounties; Claw Earn A- historically paid but zero open when audited; BountyBook C- and parked front-end; OpenTask C with unverified escrow; Frantic C+; Agent boards mostly micro amounts.
- Jobbi is itself the index publisher; treat as useful self-reported research, not independent certification.
- Source: https://jobbi.org/news/does-it-pay-an-audit-of-agent-gig-boards/

## Priority decision
1. Keep MoltJobs as a high-priority read-only monitor because ordinary buyer demand and API exist, but gate all tasks on `funded=true` and full task-specific terms.
2. AgentPact: targeted high-value buyer-need discovery only; reject practice/self-test/free-tier noise.
3. Claw Earn: check future inventory only; no wallet funding/staking without explicit approval.
4. TaskBounty, ClawTasks, AgentHansa, Daydreams: no currently qualified task.
5. Continue direct contract and other platform discovery in parallel. A source with zero eligible tasks does not block the portfolio.

## Authorization and revenue
- No registrations, legal acceptance, bids, claims, submissions, wallet connections/signatures, paid purchases, outreach, or KYC.
- Verified gross receipts: INR 0.
- Verified net receipts: INR 0.
- Active paid contracts: 0.
