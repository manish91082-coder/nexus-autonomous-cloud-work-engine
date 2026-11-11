# ₹10 Cr Revenue Engine — Operating Strategy v1 — 2026-11-11

## North Star
Target: ₹10,00,00,000 of cumulative realized net receipts. The project has ₹0 verified realized revenue at this checkpoint. No forecast is represented as income.

## Operating principle
Optimize for cash collected, not code shipped, listing count, nominal bounty totals, wallet balance screenshots, or theoretical market size. Accept bank, UPI, USD, USDC, USDT or other lawful payment rails where the receiving account is controlled, withdrawal is possible, and net value can be reconciled. Asset custody, exchange access, volatility, fees, tax/legal obligations and India-specific restrictions remain separate due-diligence gates.

## Portfolio allocation by execution attention
1. Immediate cash: small fixed-scope research, coding, QA, data cleanup, automation and documentation assignments with defined acceptance and payment milestones.
2. Recurring services: productized AI automation, reporting, data extraction, workflow integration and maintenance retainers.
3. Scalable products: only build after buyer evidence and distribution path; current Solar O&M evidence-pack idea remains a hypothesis, not yet validated demand.
4. Agent-native crypto markets: pursue only where AI agents are explicitly permitted, task-specific escrow is funded, and wallet/claim rules are affordable and secure.
5. High-value contracts: architecture, software implementation, AI system design, data/research and automation projects.

## Live marketplace findings — 2026-11-11
### BasedAgents
- Official skill v1.3.9 (updated 2026-10-07) allows autonomous agents, but identity registration requires generating and safeguarding an Ed25519 keypair.
- Bounty tasks require a payout wallet on the exact network. The wallet must be proven by a wallet signature.
- Every concurrent bounty claim requires a refundable 1 USDC bond slot; expiry or a disputed bounty can slash 1 USDC. This is capital at risk.
- Current public API GET /v1/tasks?status=open&min_usdc=5 returned an empty task list. GET /v1/tasks?status=open&category=code&min_usdc=1 also returned empty. The unfiltered feed contained newly created free reputation tasks and an older conditional 0.25 USDC task requiring real external deployment and at least 0.50 USDC of genuine attributable revenue across two UTC dates. That is not immediate clean cash and is excluded.
- Decision: no claim, no wallet provisioning, no bond, no registration. Recheck later; do not burn time on free tasks unless reputation demonstrably unlocks paid demand.

### Jobbi agent gig index
- Live feed generation timestamp: 2026-11-11T16:00:14.997Z. A 15-item $50+ USD feed showed 641 agent-lane indexed gigs and 25 human-lane gigs overall at generation.
- Candidate high-dollar listings include old GitHub issues with escrow reported by Algora, but acceptance requires maintainer merge and human review. Dates published were often 2021–2024 despite recent modified dates. Some have 13–188 comments or existing competition. Index first_seen and date_modified are not issue creation dates or proof that a task is fresh/unclaimed.
- RentAHuman entries may be human-only, require on-camera audition, physical presence, or account engagement. They are not autonomous-agent cash paths.
- Decision: no work starts until source issue is checked live for open status, competing PRs, eligibility, payout account availability and task-specific rules.

### Artisan
- Public site states jobs are funded in USDG on Robinhood Chain before work starts, 95% credited after acceptance or 72 hours of buyer silence, 5% fee; 3 agents per operator, 20 open bids per agent, job range 1–2,000 USDG.
- Agent inference requires Orbio CREDIT. India payout/withdrawal availability, seller onboarding, current live job availability and inference economics remain unverified.
- Decision: candidate for next read-only audit only. No bid, purchase, CREDIT top-up, account registration or wallet operation.

### India AI training / evaluation
- A third-party tracker refreshed 2026-11-11 reports 21 platforms with 629 India-open roles, with payment rails including PayPal, bank transfer, Stripe, Deel, Payoneer, Tipalti and Hyperwallet. The tracker itself warns that platform pages control final eligibility/payment terms.
- These are mostly human contractor roles, not autonomous AI-agent tasks. They may require identity checks, tests and human work; do not represent them as fully automated income.
- Decision: use only as an optional human-approved fallback if the user chooses it; not core automated engine.

## Current execution priorities
P0: Find paid tasks with real acceptance path and fast settlement; validate payout rail before coding.
P1: Read-only inspect Artisan live jobs, fees, USDG settlement and India owner-wallet withdrawal; reject if inference cost or withdrawal is opaque.
P2: Improve marketplace scanner freshness: preserve created_at, first_seen, updated_at separately; inspect source issue state and PR competition; distinguish task escrow from board-level payout grade.
P3: Find direct, productized contract opportunities with clear deliverables and payment milestones; prepare reusable proposals and delivery templates, but do not contact or submit without approval.
P4: Validate Solar O&M evidence-pack only after independent contractor-side pain evidence.

## Cash and safety gates
- No paid API/credit top-up, wallet bond, claim, bid, public submission, customer outreach, KYC, legal acceptance or transaction without explicit approval.
- Never paste credentials, seed phrases or private keys into chat or source code.
- Never represent escrowed, promised, pending, accepted or credited funds as received.
- Track gross receipts, payment date, rail, tx/reference, FX at receipt, fees, refunds, model/API/hosting costs and net realized value.
- No work starts if expected net value is negative or acceptance criteria are untestable.

## Scorecard
- Verified realized gross receipts: ₹0
- Verified actual costs: to be reconciled
- Verified realized net receipts: ₹0
- Active accepted paid tasks: 0
- Paid tasks with verified task-specific escrow currently found in BasedAgents filtered feed: 0
- Product buyer validation: pending

## Artisan follow-up verification — 2026-11-11
- Official docs confirm: owner wallet registration/signature is required; an agent API key is issued after registration. Agent actions do not sign transactions. Buyer-funded USDG is escrowed before work, 95% credited to agent balance on acceptance or 72-hour silent review, and only the registered owner wallet can withdraw. Fee is 5%. One task at a time per operator across agents and human profile.
- Official docs confirm the agent's inference runs on Orbio CREDIT. The public Orbio.ai domain fetch redirected to a GoDaddy parked-for-sale page; this does not establish that the CREDIT service is unavailable, but its live official product/pricing and inference costs could not be verified from that domain.
- Attempt to read Artisan public GET /api/v1/jobs/open returned HTTP 500. No actual open funded job list was retrieved. This is an API availability failure, not evidence that there are no jobs.
- Decision: Artisan is a promising architecture for escrow-backed agent work, but do not register, sign owner wallet, bid or incur CREDIT costs until the current live jobs feed, inference pricing, and withdrawal route are independently verified.

## OpenTask live inventory and trust audit — 2026-11-11
- OpenTask live tasks page sorted by closing returned 20 tasks, but the sort included stale deadlines and legacy items. Card presence is not proof of current eligibility or funded payment.
- Current-looking 3 USDC and 5 USDC tasks were posted 2026-11-02 by nonsynthetic armory. Both require creating a wallet on the requester's separate api.nonsynthetic.net, claiming a task there, and reporting wallet/task ID. These are self-referential onboarding tasks for the requester's own platform.
- Direct read-only GETs to api.nonsynthetic.net/api/v1/board/tasks and /api/v1/board/wallets returned HTTP 500. The root page and OpenAPI JSON loaded, but no public task feed or ledger was verifiable. Do not create wallet, receive wallet_secret, claim work, or treat the stated 3/5 USDC as funded until independent public ledger verification is available.
- A 1 USDC DAiL documentation audit and 1 USDC security review were posted Oct 9; the 1 USDC DAiL feasibility task Oct 11. They require registration on a separate DAiL API and are aged. Not selected.
- The 400 USDT Zero Bureaucracy KPI Framework task was posted 2026-02-09; requester profile shows no payment-confirmed reviews and no accepted community contributions. No current deadline, funded escrow, or payment proof visible. High alignment but too stale and unverified to start.
- CSV/JSON scripts at 50–100 USDC were posted May/June 2026, with no fresh deadline or task-specific funding evidence visible. Old items. Unpaid logo pilot and internal roadmap task excluded.
- OpenTask Trust & Protocol page checked Nov 11, 2026 states it is non-custodial, not escrow: task owner approves and sends payment from their wallet; platform verifies the matching event. A task listing or stated budget is not proof funds are reserved. Payment confirmation requires a matching confirmed blockchain event.
- OpenTask Terms: 18+ and legally able to contract; public profiles/listings/deliverables may be indexed and reused; operator responsible for agent automation; account/API use may require acceptance of terms and binds user; direct wallet transfers can be irreversible; platform is not employer, escrow or custodian; indemnity and Delaware governing law. No terms accepted, account created, bid submitted or public data posted.
- Decision: OpenTask is an interesting agent-compatible discovery venue but current inventory does not meet funded/fast-cash bar. No submission or registration until a specific buyer-funded payment is verified and account/legal terms explicitly approved.

## Updated opportunity verdict
- BasedAgents filtered paid feed: empty in latest checked API.
- Artisan: public task feed HTTP 500; owner-wallet and inference-credit economics remain unqualified.
- OpenTask: some paid-labelled tasks, but stale, self-referential, no escrow, or failed verification; no qualified immediate task.
- Jobbi: high-dollar entries mostly aged/crowded and maintainer-reviewed; no current winner selected.
- Verified realized revenue remains ₹0. Do not count stated task budgets, starter credits, tokens, escrow claims or indexer metadata as income.
