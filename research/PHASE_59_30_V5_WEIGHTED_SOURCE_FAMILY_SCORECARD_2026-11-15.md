# Phase 59.30 — V5 Weighted Source-Family Scorecard and Marketplace Candidate Screen

Date: 15-Nov-2026  
Task: P59-001  
Authority: MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V5.md  
Mission PCNE: ₹0; authorized spend: ₹0  
Decision: score source families for research priority; no product approval.

## 1. Scoring method

V5 weights are applied exactly:
1. Credible cumulative net-revenue ceiling — 20
2. Buyer/payment evidence — 15
3. Repeatability/recurring potential — 15
4. Distribution/acquisition — 12
5. Time to first verified earnings — 8
6. Automation/marginal delivery cost — 10
7. Net unit economics/capital intensity — 10
8. Rights/platform/payout/operational feasibility — 10

The table below is an **evidence-floor screening score**, not a forecast, TAM estimate, probability of success, or product-level investment decision.

Scoring rule:
- A point is awarded only where the existing evidence supports a source-family-level capability or rail.
- Unknown candidate-level buyer count, WTP, conversion, retention, price, support cost, rights, seller eligibility or actual net contribution receives zero in that dimension.
- Zero means "not established in current evidence", not "zero market potential".
- A high score cannot override a hard rights, legal, payout, security or negative-unit-economics gate.
- Scores determine the next research priority only. No product is selected.

## 2. Weighted evidence-floor scorecard

| Rank | Source family | Ceiling /20 | Buyer /15 | Repeat /15 | Distribution /12 | Time /8 | Automation /10 | Economics /10 | Feasibility /10 | Floor /100 | Confidence |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | Marketplace apps/extensions | 5 | 6 | 8 | 9 | 0 | 6 | 2 | 2 | **38** | Medium on platform economics; low on candidate demand |
| 2 | Recurring B2B / vertical SaaS | 5 | 5 | 8 | 6 | 0 | 5 | 2 | 2 | **33** | Low; no chosen buyer problem |
| 3 | Digital products/templates/downloadables | 2 | 0 | 1 | 8 | 4 | 8 | 5 | 4 | **32** | Medium on payout rail; low on product demand |
| 4 | Stock assets / reusable media | 2 | 0 | 4 | 5 | 1 | 8 | 5 | 4 | **29** | Low; no catalogue or audience |
| 5 | Creator IP/books/courses/royalties | 2 | 0 | 3 | 5 | 2 | 7 | 5 | 4 | **28** | Low; no audience or catalogue |
| 6 | Sponsorship / open-source support | 1 | 0 | 4 | 2 | 0 | 8 | 8 | 4 | **27** | Low; no adoption/community proof |
| 7 | Affiliate / advertising | 2 | 0 | 4 | 2 | 0 | 8 | 7 | 3 | **26** | Low; no owned audience/distribution asset |
| 8 | AI agents / APIs / usage-based software | 4 | 1 | 7 | 4 | 0 | 5 | 1 | 1 | **23** | Low; generic candidate clones rejected, provider cost unknown |
| 9 | Games / software distribution | 3 | 0 | 2 | 4 | 0 | 6 | 4 | 2 | **21** | Low; no human playtest or retention |
| 10 | Software/IP licensing, white-label and OEM | 3 | 0 | 4 | 2 | 0 | 3 | 4 | 0 | **16** | Low; rights and buyer contracts unverified |
| — | Other lawful Internet-native models | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** | NOT SCREENED; zero is not a negative market judgment |

### Interpretation
- Marketplace apps lead the evidence-floor screen because they combine actual paid software ecosystems, marketplace discovery, recurring app licensing and comparatively favourable Forge economics. This does not mean an app is ready to build.
- B2B vertical SaaS remains the highest-ceiling parent source family, but no candidate-specific reachable buyer count, price, retention, acquisition cost or rights proof is established.
- Digital products are the strongest low-friction secondary rail: India INR payouts are supported on Gumroad, but there is no product, catalogue or demand proof. It is not promoted to first engine because the V5 decision rule does not optimize only for the fastest small sale.
- AI/API is not closed as a source family. Generic AI-agency margin dashboards and generic agent approval/audit clones are rejected; a distinct workflow with independent buyer evidence may be reconsidered.
- The low evidence floors primarily reflect missing candidate-level evidence, not a claim that the markets are small.

## 3. Marketplace economics revalidated — Atlassian Forge

Official Atlassian Marketplace documentation states:
- Eligible Forge apps receive 100% of gross revenue up to $1 million in lifetime Forge revenue, subject to Forge-only modules, OAuth authentication and Forge UI eligibility.
- After the $1 million threshold, the standard Forge partner share is 83% from 1-Oct-2026; Connect partner share is 75%; Data Center partner share is 75%.
- Paid-via-Atlassian remittance starts after $500 USD in profit and is paid within 30 days after the end of the month in which the threshold is reached, meaning roughly 30–60 days after sale.
- Forge usage billing began 1-Jan-2026; each app has a separate monthly free allowance, and a payment method is needed to continue if usage exceeds free allowances.
- Public listing requires a registered vendor profile, app review, documentation, security/privacy material, branding and partner agreement compliance.

Official references:
- https://developer.atlassian.com/platform/marketplace/pricing-payment-and-billing/
- https://developer.atlassian.com/platform/forge/forge-platform-pricing/
- https://developer.atlassian.com/platform/marketplace/app-approval-guidelines/
- https://developer.atlassian.com/platform/marketplace/selling-on-marketplace/

India partner payout / bank eligibility and account approval were not confirmed in this batch. No partner account, payment method or listing was created.

## 4. Greenfield candidate screen — Jira AI-agent approval / audit app

### Direct competitors
1. **Approval Flow: Required Sign-Offs for Jira** — sequential/parallel sign-offs, separation of duties, hash-chained audit trail, export, approval policies, and a Pro AI-agent action approval gate. Free for up to 10 users. Its Marketplace page showed one install and no reviews at retrieval.
2. **AgentGate — Supervised Access for AI Agents to Jira** — MCP-compatible agents propose Jira changes; humans approve; audit trail records proposal, rationale, approver and timestamp; runs on Forge. Its Marketplace page showed two installs and no reviews at retrieval.
3. **Approval Path for Jira** — multi-step approval management, conditions based on budget/location/JQL, email approvals and workflow integration.
4. **Audit Trail and Compliance Analytics for Jira** — project history, configuration and workflow audit analytics.
5. **Native Jira approvals** — built-in approval functionality; some advanced features require Premium or higher.
6. **GitHub Agentic Workflows** — GitHub-native natural-language agent workflows with safe outputs, sandboxing, read-only defaults and human review.
7. **GitHub Enterprise AI Controls** — enterprise agent policies, session records, third-party agent controls and agentic audit logs.
8. **DevRev Computer** — agent action policy/approval control and audit for DevRev-built agents.
9. **AgentOps** — agent run tracing, evaluation and operational monitoring.
10. **Langfuse** — open-source LLM/agent tracing and evaluation.
11. **LangSmith** — agent traces, testing and observability.
12. **Helicone** — LLM gateway and usage/cost observability.
13. **Portkey** — AI gateway, routing, reliability and guardrails.
14. **Braintrust** — tracing, evaluation and monitoring.
15. **Arize AX** — model/agent observability and evaluation.

### Independent pain evidence
Two separate Reddit discussions report agent-production pain around:
- Human approvals, audit trails, agent identity/entitlements, tool access and governance.
- Reliability, duplicate side effects, idempotency, approvals bound to the exact reviewed action, cost per task and auditability.

These are qualitative pain signals, not verified buyer budgets or purchases. One discussion is a low-engagement community question; the other includes a builder describing a product and seeking design partners. They do not satisfy candidate-specific willingness-to-pay.

References:
- https://www.reddit.com/r/AI_Agents/comments/1uitl6t/running_ai_agents_in_production_at_scale_what/
- https://www.reddit.com/r/AI_Agents/comments/1xsy2pf/for_those_building_ai_agents_whats_been_the/

### Disposition
**NO-GO for a generic Jira AI-agent approval / audit app.** Direct Marketplace competitors already provide approval receipts, audit trails, separation of duties, MCP-compatible agent gating and Forge-native data handling. GitHub also ships native agentic workflows and enterprise controls. A new entrant would need a materially different workflow, independently evidenced buyer demand and an advantage that native platform features cannot provide.

This is candidate-specific. It does not close the Marketplace Apps or AI/API source families.

## 5. V5 portfolio decision after Phase 59.30

- Provisional FIRST source family: marketplace-distributed B2B software / vertical SaaS.
- Secondary rail: digital products via Gumroad, only after an original rights-cleared asset and buyer demand are evidenced.
- Candidate NO-GO: generic eBRC reconciliation; generic AI-agency margin ledger; generic Jira agent approval/audit app; previously screened generic marketplace/actor candidates.
- Existing eight built assets: 0/8 release-ready and 0/8 with verified buyer demand.
- Concrete product selected: NONE.
- Build authorization: NO.
- P59-001 remains IN_PROGRESS. P59-003 remains PAUSED. P59-002 remains BLOCKED.
- PCNE ₹0; authorized spend ₹0.

## 6. Next P59-001 action

Research a new recurring B2B workflow problem within a marketplace ecosystem, excluding the already rejected generic approval/audit, eBRC, agency-margin, recruitment, agri reconciliation, manufacturing job-work and generic AI reviewer hypotheses.

For each candidate:
1. Name the exact buyer and expensive recurring job-to-be-done.
2. Obtain two independent buyer/problem/budget signals.
3. Audit 10–15 direct and adjacent substitutes.
4. Capture price-bearing WTP, not only competitor list prices.
5. Verify India seller eligibility and payout route.
6. Model contribution after marketplace share, Forge/runtime, support, refunds and tax/payment costs.
7. Confirm data/IP rights and self-serve fulfilment.
8. Return FIRST / NEXT / HOLD / NO-GO with evidence confidence.

Do not build, publish, register, accept terms, add a payment method or spend money before all hard gates pass.
