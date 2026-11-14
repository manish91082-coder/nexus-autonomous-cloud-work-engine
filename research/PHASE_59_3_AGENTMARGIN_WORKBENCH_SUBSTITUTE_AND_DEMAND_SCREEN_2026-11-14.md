# Phase 59.3 — AgentMargin Workbench Candidate and Substitute Screen (14 November 2026)

**Authority:** V5 Master Constitution  
**Task:** P59-001 — IN_PROGRESS  
**Candidate:** AgentMargin Workbench v0.1.2 (separate ₹1,000/day project)  
**Disposition:** **NO-GO AS A PAID PRODUCT IN ITS CURRENT GENERIC ONE-TIME CALCULATOR FORM; PRESERVE THE ASSET**  
**Parent source family:** AI software / B2B software remains OPEN. This decision does not close the source family.  
**₹10 Cr first product selected:** NO. **Build authorization:** NO.  
**PCNE:** ₹0.

## 1. Exact product being assessed

The user-controlled repository `manish91082-coder/daily1000-autonomous-revenue-engine` currently contains a browser-only calculator named **AgentMargin Workbench v0.1.2**. The current committed UI accepts monthly outcomes, LLM/tool cost per attempt, attempts per successful outcome, hosting, maintenance, human review minutes, hourly cost, target gross margin and setup effort; it calculates cost/outcome, monthly delivery cost and suggested price floors.

The repository's own `docs/DEMAND_VALIDATION_PROTOCOL.md` says demand, willingness to pay, user dissatisfaction, repeat use, acquisition cost and recurring revenue are unverified. Its `docs/RELEASE_STATUS.md` says the full 24-file audited source archive is not imported into GitHub main, browser visual QA is incomplete, and hosting/TLS/sales/refunds/support/payout are unverified. The committed repository prototype is therefore not the full audited package and is not a production release.

## 2. Material name-collision finding

A separate public project named **AgentMargin** exists at `github.com/rzkarsyad/agentmargin` and `agentmargin.dev`. GitHub identifies its owner as `rzkarsyad`, not the user's GitHub account. It is a separate, independently authored project and must not be represented as the user's product or repository.

That independent project targets customer-level AI inference cost and contribution analytics, uses TypeScript/PostgreSQL, publishes an MIT-licensed experimental alpha, and explicitly warns that it is localhost-only and not production-ready. It is more productized in the adjacent customer-level attribution category than the user's current calculator. The identical name creates brand/search confusion and a potential naming-rights issue. **Do not reuse the AgentMargin name for a commercial release without legal/trademark clearance; safest default is rename.**

Sources:
- https://github.com/rzkarsyad/agentmargin
- https://agentmargin.dev/
- https://agentmargin.dev/releases

## 3. Substitute and competitor screen (20 direct/adjacent alternatives)

| # | Substitute | Category / overlap | Public commercial signal |
|---:|---|---|---|
| 1 | AI Agency Calculator — aiagencycalculator.com | Direct browser calculator for agency project setup, retainer, workflow count, model cost and margin | Free, no sign-up; no verified price for this calculator |
| 2 | AICostKit AI Automation Agency Pricing Calculator | Direct calculator: runs, AI/tool cost, retries, failure buffer, subscriptions, labour and retainer | Free browser utility; no verified paid tier |
| 3 | Fiscallion AI Inference Cost Calculator | Direct worksheet for cost/request, cost/customer and price floor | Free worksheet/calculator; no verified paid tier |
| 4 | AI Cost Lab Unit Economics Calculator | Direct AI cost/customer, contribution margin and break-even calculator | Free calculator; no verified paid tier |
| 5 | LLMcosts.dev Cost-per-Customer Calculator | Direct per-customer token usage, model price, cache, power-user and subscription sensitivity | Free calculator; no verified paid tier |
| 6 | SubscriptionPlaybook AI Agent Pricing Calculator | Direct seat/conversation/resolution pricing and margin stress test | Free calculator; no verified paid tier |
| 7 | Spendline AI Gross Margin Calculator | Direct customer-level AI gross-margin methodology and calculator | Free tool/content; paid product terms not established |
| 8 | Margined (GitHub: pushkalkumar/margined) | Direct AI SaaS unit economics, cost per customer/feature and Stripe revenue join | Public source project; commercial terms not established |
| 9 | AgentMargin (GitHub: rzkarsyad/agentmargin) | Direct customer-level AI inference cost + revenue contribution analytics; identical name | MIT-licensed experimental open-source project; hosted SaaS not offered in its README |
| 10 | Langfuse | LLM/agent tracing, token and cost tracking, user tracking, custom API and dashboards | Official pricing: free Hobby; Core $29/mo; Pro $199/mo; Enterprise $2,499/mo |
| 11 | LangSmith | Agent tracing, evaluation, observability and usage pricing | Official pricing: Developer free; Plus $39/seat/mo plus usage; Enterprise custom |
| 12 | Helicone | LLM observability/gateway, request cost, alerts and reports | Official pricing: free Hobby; Pro $79/mo; Team $799/mo plus usage |
| 13 | Portkey | AI gateway, request logs, cost observability, routing, retries and guardrails | Official pricing: free 10k logs/mo; Production $49/mo; overage listed |
| 14 | Braintrust | Tracing, evaluation, processed-data and score-based analytics | Official pricing: Starter free; Pro $249/mo plus usage |
| 15 | Arize Phoenix / AX | Open-source self-hosted tracing plus paid observability/evaluation | Phoenix free/self-hosted; AX Pro $50/mo |
| 16 | Weights & Biases Weave | LLM traces, evaluation, production monitoring and usage | Official W&B plans include 1 GB/month Weave ingestion on Free and 1.5 GB on Pro, with additional usage pricing |
| 17 | LiteLLM | Open-source proxy, provider routing, budgets and spend tracking | Open-source self-hosting; Enterprise commercial tier |
| 18 | AgentOps | Agent sessions, events, tracing and cost telemetry | Public free/paid tiers reported; exact current price not used for scoring |
| 19 | Flexprice | Usage metering, entitlements and billing for AI products | Commercial usage-billing alternative; current India payout/price not evaluated |
| 20 | CloudZero | Enterprise cloud/AI cost attribution and FinOps | Enterprise commercial alternative; not a low-end agency calculator |

Official pricing evidence:
- Langfuse: https://langfuse.com/pricing
- LangSmith: https://www.langchain.com/pricing
- Helicone: https://www.helicone.ai/pricing
- Portkey: https://portkey.ai/pricing
- Braintrust: https://www.braintrust.dev/pricing
- Arize: https://arize.com/pricing
- W&B: https://wandb.ai/site/pricing/

Direct calculator references:
- https://www.aiagencycalculator.com/
- https://aicostkit.com/ai-automation-agency-pricing-calculator/
- https://www.fiscallion.io/blog/ai-inference-cost-calculator
- https://token.scerp.cloud/unit-economics-calculator/
- https://llmcosts.dev/tools/llm-cost-per-customer-calculator/
- https://www.subscriptionplaybook.com/tools/ai-agent-pricing-calculator/
- https://www.spendline.ai/guides/ai-gross-margin-by-customer/

This is a substitute screen, not a complete feature-by-feature procurement audit. Free calculator pages and open-source projects can still compete for the same user attention even without paid pricing.

## 4. Buyer-problem evidence

### Stronger evidence that the problem exists (not proof of candidate WTP)

1. **Digiday, 3 March 2026:** interviewed agency leaders from Merge, Big Spaceship, Silverside AI, RPA, Horizon Media, Pencil and others about whether AI token costs should be absorbed, included, passed through or billed by usage. This is direct operator evidence that AI cost treatment is a real commercial decision. It also shows there is no single accepted billing model. Source: https://digiday.com/marketing/agencies-grapple-with-economics-of-a-new-marketing-currency-the-ai-token/
2. **n8n Community, 20 July 2026:** a thread asks how agencies allocate API costs across clients; replies describe Google Sheets logging, separate client keys, nested-workflow attribution problems and runaway loops. Source: https://community.n8n.io/t/how-do-you-track-which-clients-workflows-are-burning-your-api-credits/303931
3. **n8n Community, 2 November 2026:** a second thread asks how to split and rebill AI costs across clients and whether usage is passed through, marked up or included in a retainer. The author explicitly says they are exploring a small read-only tool, so this is both problem evidence and a competing-build signal, not neutral survey evidence. Source: https://community.n8n.io/t/building-n8n-automations-for-several-clients-how-do-you-split-and-rebill-the-ai-costs/326041
4. **Reddit r/n8n, 30 September 2026:** one operator reports a single workflow accounting for 75% of their LLM bill and a reduction after tracing executions. Anecdotal and self-reported; useful as a failure mode, not prevalence data. Source: https://www.reddit.com/r/n8n/comments/1wu5xjg/one_workflow_was_75_of_my_llm_bill_how_i_measured/
5. **Takat AI, 10 November 2026:** practitioner article describes the need to connect client/project records, model and messaging costs, billing and bot monitoring. It is operator-authored/vendor-adjacent content, not an independent buyer survey. Source: https://www.takat.ai/insights/ai-agency-operations-stack

### Commercial evidence boundary

Paid adjacent platforms publish prices (e.g., Langfuse Core $29, LangSmith Plus $39/seat, Portkey Production $49, Helicone Pro $79, Arize AX Pro $50 and Braintrust Pro $249). This demonstrates willingness to pay for observability, gateways, evaluation and telemetry among some AI teams. It does **not** prove willingness to pay for a one-time agency quote calculator, nor does it establish price, conversion or retention for this candidate.

No independent paid transaction, customer cohort, verified renewal, or qualified price-bearing WTP for AgentMargin Workbench was found. The two n8n discussions and Digiday article validate problem salience, not this product's commercial fit.

## 5. Product-level economics and structural weakness

The current Workbench is a static browser calculator. It does not continuously ingest actual client usage, reconcile provider invoices, attribute events from live workflows, connect revenue/billing, or maintain recurring customer-level margin records. Its output is primarily a one-time planning estimate based on manually entered assumptions.

Consequences:
- The current product has weak natural subscription retention; recurring value is not established.
- The direct free calculators materially reduce the defensibility of a one-time paid calculator.
- A subscription would require a recurring workflow/data source, not merely more fields or a nicer dashboard.
- The current feature set is vulnerable to being copied into a spreadsheet or a free browser tool.
- The public AgentMargin name collision adds avoidable discoverability and rights risk.

Illustrative sales arithmetic only (not a forecast): ₹10 Cr gross at ₹999 would require about 100,101 purchases before platform/payment fees, refunds and costs; at ₹1,499 it would require about 66,712 purchases. There is no evidence of a distribution channel capable of this volume. Do not present these unit counts as an achievable sales forecast.

## 6. Decision

**NO-GO for the current generic, one-time AgentMargin Workbench calculator as the first paid ₹10 Cr engine.** Preserve the existing code and tests; do not add features, connect payment, publish, or spend money for this hypothesis.

Do not close the parent AI/B2B software source family. A materially different candidate could still be researched:
- live, privacy-safe cost/revenue reconciliation for a narrow workflow platform or vertical;
- high-confidence per-client contribution ledger with usage and invoice provenance;
- a specific integration gap that existing observability/gateway products do not solve;
- or a different high-value recurring vertical software problem.

Any successor must demonstrate a distinct buyer job, 2+ independent buyer signals, 10–15 substitutes, price-bearing WTP, a lawful/zero-spend data path, measurable recurring use, and positive fully-loaded economics. It must not simply clone Langfuse, LangSmith, Portkey, Helicone, AgentMargin or Margined.

## 7. Next P59-001 action

Return to the broader first-source ranking rather than iterating this calculator. In parallel:
1. Continue a narrow vertical SaaS buyer-problem screen using evidence of repeat frequency, economic consequence and budget owner.
2. Keep Tech Cloud ERP in the asset-audit queue until its actual source tree, ownership and module inventory are supplied or located.
3. Compare a verified ERP-derived vertical candidate with a greenfield candidate and the AgentMargin alternative only if a genuinely differentiated recurring gap emerges.
4. Keep P59-002 BLOCKED. No build, listing, KYC, account terms or spend.

**PCNE remains ₹0. This candidate NO-GO does not close the AI software source family or change the ₹10 Cr portfolio target.**
