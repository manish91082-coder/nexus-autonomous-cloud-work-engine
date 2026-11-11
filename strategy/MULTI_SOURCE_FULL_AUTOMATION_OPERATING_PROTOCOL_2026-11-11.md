# Multi-Source Full-Automation Revenue Operating Protocol — 2026-11-11

## User mandate
The revenue engine must never depend on a single marketplace, platform, payment rail, product, or service. Discover across multiple sources continuously. Verify each opportunity independently. If it meets the full-automation criteria and does not cross an approval boundary, execute it immediately through completion, verify acceptance/payment, then advance to the next execution item. Continue discovery while execution is in progress.

## North star and accounting invariant
Target: INR 10,00,00,000 cumulative realized net receipts.
Recognized net income = funds actually received and controlled + withdrawable value, less platform fees, FX/withdrawal costs, refunds, payment reversals, infrastructure/API/model costs, and other attributable costs.
Never count budgets, token quotes, credits, escrow balances, pending invoices, promised payments, accepted-but-unpaid work, or marketplace aggregate totals as realized income.
Current verified gross receipts: INR 0. Current verified net receipts: INR 0.

## Full-automation eligibility
An opportunity is eligible for autonomous execution only if all are true:
1. Legal, ethical, within capability, and executable using authorized data/tools.
2. Real buyer intent, specific scope and testable acceptance criteria.
3. AI/agent execution explicitly permitted by platform and task rules.
4. Fresh, still open, not already claimed, not materially competed out, no hidden physical/human-only requirement.
5. Credible payment: task-specific escrow/funding proof or platform-backed payment protection appropriate to the task. A listing budget, platform pool balance, generic tx hash, or marketing claim is insufficient.
6. Payout rail usable by operator in India, with fees, minimums, KYC/terms and withdrawal restrictions understood.
7. Expected net value positive after fees, gas, model/API, hosting and execution costs. No paid credit, subscription, bond, Connects, deposit or purchase without explicit user approval.
8. No identity impersonation, fake reviews, spam, astroturfing, credential misuse, unsafe security testing, fabricated evidence, or unauthorized access.
9. No external action requiring human legal/financial identity, signature, KYC, account registration, terms acceptance, public bid/proposal, customer outreach, wallet signing/transaction, or paid purchase unless explicitly approved by user.
10. Deliverable independently testable and evidence archivable.

If any condition is unknown, classify as HOLD_FOR_VERIFICATION, not eligible. If it fails, REJECT with reason. One failed source never blocks other sources.

## Execution lifecycle
DISCOVERED -> SOURCE_VERIFIED -> TASK_VERIFIED -> ECONOMICALLY_QUALIFIED -> READY_FOR_AUTHORIZATION -> AUTHORIZED -> EXECUTING -> TESTED -> SUBMITTED -> ACCEPTED -> PAID -> RECONCILED
- READY_FOR_AUTHORIZATION is not implicit authorization.
- Surface human approval gates only when a concrete action needs them; do not interrupt read-only discovery or local preparation.
- Execute one bounded task per execution slot; maintain parallel source discovery and independent task queues.
- On completion, archive artifacts, source snapshot, acceptance evidence, payment proof and costs; then immediately pull next qualified item.
- If blocked, preserve work and move to the next qualified task rather than idling.

## Multi-source portfolio
A. Human contractor marketplaces: Upwork and alternatives; proposal/outreach/account actions are approval-gated.
B. Agent-native escrow marketplaces: BasedAgents, Riner, TaskForce, AgentBounties and verified successors.
C. Agent-to-agent services / standing service directories: only after API and real buyer orders verified.
D. Developer bounty boards: GitHub/Algora/IssueHunt and similar; check issue freshness, competing PRs, merge acceptance, AI permission, task-specific funding and India payout.
E. Direct buyer demand: current procurement, vendor/customer problem statements, public RFPs, tenders and buyer requests; distinguish research signal from permission to contact.
F. Productized digital deliverables: only when distribution and buyer demand evidence exist.
G. Paid data/research/evaluation/API services: only when payment and automation rules are verifiable.
H. Other emerging channels: add after read-only due diligence.

## Source status snapshot — 2026-11-11
- Upwork: live buyer requests exist for n8n/API workflow automation, RAG/CRM lead automation and reliability. Listings range from $20 to $1,500; high-value examples are crowded. No proposal/outreach submitted. Human contractor channel, not fully autonomous agent marketplace.
- Jobbi: live index reports 679 gigs; 155 USD-denominated gigs >=$50; $20 median among priced USD/USDC gigs. Aggregate stats are discovery signals only; task-level verification mandatory.
- BasedAgents: escrow-backed USDC marketplace; identity and wallet registration/signing are required. No wallet/registration/claim authorized. Prior direct feed filter showed no qualifying funded tasks.
- Riner: current visible board shows 6 tasks; visible $1/$2.7/$3 tasks include promotional engagement, account/agent registration, or simulated-use claims; reject for spam/astroturfing or low economics. Pentest item expired and requires explicit scope authorization. No task claimed.
- AgentsBay: visible board contains numerous spam-like, implausible $50m/month claims and low-quality listings; reject current inventory. No wallet/registration.
- TaskForce: advertises API-based agent workflows and milestone USDC escrow/0% fee; task-level inventory, live payment proof, API access, and India payout remain unverified. Hold for read-only verification; no registration/API key/claim.
- TaskPool: human physical-world execution marketplace; not eligible for full automation. Exclude from autonomous work queue.
- Artisan: API feed previously returned HTTP 500; wallet withdrawal/inference costs not verified. Hold.
- OpenTask: non-custodial, not escrow; stale/self-referential tasks and failed API verification. Hold/reject individual records.
- PACT: key absent; no agent registered; authenticated reads dormant. No bypass of secure provisioning.
- BountyBoard/Elgora: prior records blocked by physical work, academic integrity, owner wallet signature, or funding proof gaps. Re-check only when new qualified evidence appears.

## Execution priority
1. Continue multi-source read-only scans and preserve timestamp/source IDs.
2. Select only highest expected net value per hour with strongest payment and automation evidence.
3. Complete local message-to-action reliability demo and tests as reusable sales evidence; no paid APIs.
4. Build adapters only for sources with real current inventory and agent-compatible execution.
5. Keep Upwork/Contra/direct-client proposals prepared but do not submit, contact, or list without explicit approval.
6. Never claim a platform, workflow, demo, proposal, or payout is complete without observed proof.

## User approval boundaries
User has authorized research, local/cloud engineering, coding, tests, repo maintenance, and read-only browser/API inspection.
Explicit approval remains required for: account registration involving legal terms; KYC/identity attestations; acceptance of terms/NDA; public proposal/bid/submission; customer outreach; wallet creation/signing/transactions; paid credits, Connects, deposits, bonds, subscriptions, or API usage with cost; actions publishing personal/business information; irreversible actions.
Never ask for passwords, OTPs, seed phrases, private keys or API secrets in chat. Use secure supported secret provisioning only.

## Current checkpoint
No new task accepted or submitted. No new wallet, registration, purchase, paid credits or public outreach. Verified realized gross INR 0. Verified realized net INR 0. Active paid contracts 0.
