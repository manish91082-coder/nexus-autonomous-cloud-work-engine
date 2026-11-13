# Phase 48 — Microsoft Marketplace AI Apps & Agents: Ground-Level Product Qualification

**Date:** 13 November 2026  
**Authority:** MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md  
**Queue task:** P48-001  
**Decision:** **NO-GO for the generic AI automation / generic business agent product hypotheses audited.**  
**Platform decision:** Microsoft Marketplace remains a valid future channel, but no specific product from the current candidate set passed the self-serve, zero-cost and differentiated paid-gap gates.  
**Spend:** ₹0 authorised. No Partner Center enrollment, seller profile, Azure resource, app listing or public offer was created.

## 1. Executive conclusion

Microsoft Marketplace is a large B2B distribution channel. Its current AI Apps & Agents page advertises 4,000+ AI apps/agents, 11,000+ models and a 2× increase in AI solution purchases. This is evidence of platform activity, not demand for a new entrant's specific product.

A bounded ground-level review of more than 30 directly relevant Marketplace offers across finance/AP, document processing, HR, contracts, meetings, sales, task/project management, procurement, IT support, customer service and Power Platform governance found:

- Direct overlap in each broad product category.
- Several established products with review signals: Ada's AI Agent (4.7, 173 ratings), Draup for Sales (5.0, 20 ratings), XNODE Meeting AI Agent (5.0, 4 ratings) and Autopilot Accounts Payable AI (5.0, 4 ratings).
- Multiple products requiring an upstream vendor account or another vendor product before the Marketplace item can be used.
- Several offers are **Contact me** and priced as consulting / custom implementation, not self-serve transactable software.
- Existing Microsoft-native products and services (Microsoft 365 Copilot, Copilot Studio, Power Automate, Dynamics 365, Power Platform Admin Center and Entra) are strong substitutes.
- A transactable SaaS offer is not a static file or an inexpensive chatbot wrapper: Microsoft requires Entra/MSA sign-in, an always-available landing page, SaaS Fulfillment API lifecycle integration and a 24/7 connection webhook. Hosting, data isolation, monitoring, support, security, model use and tenant management create ongoing cost.

**The current repository has no production Microsoft connector, Entra SSO, SaaS Fulfillment integration, production-grade multi-tenant hosting, 24/7 webhook service or validated enterprise buyer demand.** Reusing an offline demo as though it were a transactable enterprise app would not pass the technical or commercial gate.

Therefore:
1. Do not build a generic Microsoft AI business automation reviewer.
2. Do not build a generic AP/invoice agent, HR policy bot, meeting summarizer, task agent, sales research assistant, procurement copilot or document OCR clone.
3. Do not create a Contact Me offer as a substitute for self-serve monetization; that would depend on manual sales/implementation.
4. Keep Microsoft Marketplace as a future platform option for a genuinely differentiated product, but move current execution to the next ranked platform: Apify Store.
5. The Apify workstream must likewise pass a real buyer-gap, legal source-rights, usage-cost and payout-revenue gate before any Actor build.

## 2. Platform and transaction facts

### Marketplace scale

Microsoft's current AI Apps & Agents page advertises:
- 4,000+ AI apps and agents;
- 11,000+ models;
- 2× increase in AI-solution purchases.

Source: https://www.microsoft.com/en-us/marketplace/business/ai-apps-agents

These are marketplace-level metrics. They do not establish average app revenue, customer acquisition cost, new entrant conversion or a specific category's unserved demand.

### Transactable SaaS requirements

Microsoft's Partner Center documentation specifies that a transactable SaaS offer must support:
- Microsoft Account and Microsoft Entra ID sign-in, including Entra SSO;
- a buyer landing/onboarding page;
- SaaS Fulfillment API integration for purchase resolution, activation, plan/quantity changes, suspend/reinstate and subscription lifecycle;
- a connection webhook for asynchronous subscription events;
- production availability of the landing page and connection webhook 24/7.

Microsoft's official SaaS webhook documentation states that it may retry webhook calls 500 times over an 8-hour period if they are not acknowledged. These integrations require a continuously available service and proper subscription-state reconciliation.

Primary sources:
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/plan-saas-offer
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/create-new-saas-offer-technical
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/pc-saas-fulfillment-apis
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/pc-saas-fulfillment-webhook

A Contact Me listing has lighter technical requirements, but it produces leads rather than self-serve transactions. It is not accepted as the primary revenue model because it introduces manual sales and bespoke delivery.

### Platform fee and maturity

Microsoft's current Marketplace payout FAQ states:
- store service fee: 3% for applicable transactions;
- USD $50 payout threshold;
- credit-card earnings mature after a 30-day hold;
- payments are released after earnings become payable, according to the maturity schedule.

Sources:
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/payout-faq
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/payment-thresholds-methods-timeframes

Tax/payout optimisation remains deferred, but seller eligibility, verification, mandatory terms and marketplace requirements cannot be skipped.

## 3. Competitor inventory — 34 Marketplace offers

Listing text, prices and ratings below are as observed on the public Marketplace pages/search snapshots. These are publisher-authored descriptions. Marketplace rating counts are not the same as independent paying-customer counts. Where a price is not displayed, it is marked as undisclosed or Contact me rather than inferred.

### A. Accounts Payable, finance, expenses and procurement

| # | Offer | Published capability / visible commercial signal | Competitive implication |
|---:|---|---|---|
| 1 | [Agentic AP — Intech Systems](https://marketplace.microsoft.com/en-us/product/intechsystems.ap_agentic) | AI invoice intake, extraction, three-way PO/receipt matching, approvals, audit trails; Contact me | Direct AP agent competitor |
| 2 | [Accounts Payable Automation with AI — Intech](https://marketplace.microsoft.com/en-us/product/saas/intechsystems.accountspayable_automation) | Power Platform invoice capture, digitisation, tracking and compliance; Contact me | Direct overlap |
| 3 | [Autopilot Accounts Payable AI](https://marketplace.microsoft.com/en-us/product/office/WA200006314) | Teams/Copilot invoice upload, extraction, approvals, reminders, dashboards; 5.0 (4 ratings); 10 invoice requests free then subscription | Self-serve trial and paid substitute already exists |
| 4 | [Botminds AI — Automated Invoice Processing](https://marketplace.microsoft.com/en-us/product/botmindsaitechnologiespvtltd.botminds_invoiceautomation) | No-code AP/AR invoice extraction, classification, PO matching and approvals; Get it now | Direct, established document-finance platform |
| 5 | [Xtract — Synapx](https://marketplace.microsoft.com/en-us/product/synapx.xtract_azure_app) | Email/API document extraction, confidence scores, approval, audit history, ERP connectors; dedicated Azure SQL/Blob deployment billed through Marketplace | Advanced direct substitute; deployment cost is not zero |
| 6 | [Document Intelligence — EnkayTech](https://marketplace.microsoft.com/en-us/product/enkaytech.document_intelligent) | OCR/AI extraction for invoices, POs, PODs, shipping documents and reports; free-trial offer | Direct document-automation substitute |
| 7 | [Extract Filer — Foundation AI](https://marketplace.microsoft.com/en-us/product/foundationai1604099767103.foundation_extract) | AI document sorting, extraction and filing into CMS/DMS; Contact me | Adjacent document-intelligence incumbent |
| 8 | [WorkFusion Digital Worker — Document Extraction](https://marketplace.microsoft.com/en-us/product/workfusioninc1661866983341.wf_custom_extract_dw) | AI document classification, extraction, enrichment and ML models | Broad direct substitute |
| 9 | [Staple AI Platform](https://marketplace.microsoft.com/en-us/product/stapleai1591952469773.staple) | Enterprise document extraction in 190+ languages; invoice and operational document processing | Direct category competitor |
| 10 | [Papirolog](https://marketplace.microsoft.com/en-us/product/dunavnet.papirolog) | Invoice, receipt and delivery-note extraction | Direct category competitor |
| 11 | [Invoice Analyzer Agent — Sonata Software](https://marketplace.microsoft.com/en-us/product/sonata-software-ltd.invoice_analyzer_agent) | Pre-validates invoices for Dynamics 365 Finance & Operations, identifies posting/dimension errors | Narrow finance niche already served |
| 12 | [Expense 365 AI Agent](https://marketplace.microsoft.com/en-us/product/WA200011281) | Natural-language expense record, approval, reimbursement and spend interaction in Copilot/Teams | Adjacent finance operations agent |
| 13 | [Agentic AI Finance Workflow — Concentrix](https://marketplace.microsoft.com/en-us/product/concentrixcorporation1717086605714.ai_finworkflow) | Month-end close, submission chasing, file collection, reconciliation and CFO package; published price $15,000 | High-value but Contact Me / implementation-oriented, not a plug-and-play zero-cost app |
| 14 | [PwC Predictive Spend Analytics & Cost Optimisation Agent](https://marketplace.microsoft.com/en-us/product/saas/pwc_global.agent_finance_spend_analytics_cost_optimization) | Spend analytics, forecasting and unauthorised/non-compliant spend detection; Contact me | Enterprise procurement/finance incumbent |
| 15 | [LiveRoute Procurement AI Agent Suite](https://marketplace.microsoft.com/en-us/product/liveroutefz-llc1591718376679.lr_procurement_ai_agent) | SOW/SLA drafting, bid match, vendor compliance and contract-law agents; Get it now | Direct procurement agent competitor |
| 16 | [UST AIPro ProcureIQ](https://marketplace.microsoft.com/en-us/product/ust-global-1679429.d365_procureiq) | Free listing for D365 F&O procurement agent; supplier ranking, sourcing and purchase requisitions; Contact me | Free/lead-gen substitute for procurement workflows |

### B. HR, employee operations and contracts

| # | Offer | Published capability / visible commercial signal | Competitive implication |
|---:|---|---|---|
| 17 | [Onboarding 365 AI Agent](https://marketplace.microsoft.com/en-us/product/WA200011838) | Copilot/Teams onboarding assistant, progress tracking and HR answers; requires Employee Onboarding 365 SharePoint app | Not standalone; incumbent suite |
| 18 | [HR AI Agent — Apps 365/HR365](https://marketplace.microsoft.com/en-in/product/WA200011022) | HR policy Q&A, tasks and onboarding; requires HRMS SharePoint deployment; 14-day trial | Direct HR assistant |
| 19 | [AI Agent HRMS — Compusoft](https://marketplace.microsoft.com/en-us/product/compusoft.aiagenthrms) | Leave, policies, employee data, case management, approvals, RBAC and audit trail; Contact me | Direct HR suite |
| 20 | [HR Agent: Conversational HR & PTO](https://marketplace.microsoft.com/en-us/product/ctp.hrptoagent) | Copilot Studio HR policy and leave workflows; displayed price $10, Contact me | Existing small self-serve-priced agent, but lead/contact gate |
| 21 | [AI Powered HR Management — Folio3](https://marketplace.microsoft.com/en-us/product/folio3software.ai-powered-hr-management-with-microsoft-copilot) | Copilot/Azure HR policy, onboarding and HR requests; Contact me | Enterprise implementation competitor |
| 22 | [CLM365 AI Agent](https://marketplace.microsoft.com/en-us/product/saas/wa200010851) | Contract search, lifecycle, expiry and status assistant; requires CLM365 SharePoint deployment | Direct contract assistant |
| 23 | [PwC Contract Management & Compliance Agent](https://marketplace.microsoft.com/en-us/product/web-apps/pwc_global.agent_finance_contract_management_compliance) | Clause extraction, policy validation, KPI/expiry monitoring and audit reports; Contact me | Enterprise contract compliance incumbent |
| 24 | [Agentic AI HR Workflow — Concentrix](https://marketplace.microsoft.com/en-us/marketplace/consulting-services/concentrixcorporation1717086605714.ai_hrworkflow) | Recruitment pipeline, resume review, ranking, interviews, offer and onboarding; published price $15,000 | Implementation/consulting, not eligible as a self-serve core lane |

### C. Meetings, sales, task/project management and operations

| # | Offer | Published capability / visible commercial signal | Competitive implication |
|---:|---|---|---|
| 25 | [BA Agent — XIONTECH](https://marketplace.microsoft.com/en-us/product/wa200011053) | Teams meeting/chat requirements extraction, project grouping, export and admin portal | Direct meeting-to-requirements assistant |
| 26 | [XNODE Meeting AI Agent](https://marketplace.microsoft.com/en-us/product/WA200008165) | Teams transcripts, meeting summaries, insights and output preparation; 5.0 (4 ratings) | Direct meeting intelligence competitor |
| 27 | [Data-Driven Sales Agent](https://marketplace.microsoft.com/en-us/product/office/WA200010832) | Meeting analysis, opportunity detection and Dynamics 365 updates | Direct sales workflow agent |
| 28 | [Draup for Sales](https://marketplace.microsoft.com/en-us/product/office/WA200010751) | Sales account research, qualification and competitive context; 5.0 (20 ratings) | Established data-backed sales agent |
| 29 | [Task 365 AI Agent](https://marketplace.microsoft.com/en-us/product/WA200012807) | Natural-language task creation, assignment, status, priorities and due dates | Generic task agent category already served |
| 30 | [Project Management Agent — Deutsche Telekom MMS](https://marketplace.microsoft.com/en-us/product/t-systemsmultimediasolutionsgmbh1632899193599.project_management_agent) | Meeting transcription → decisions/actions/deadlines → Jira/Confluence updates | Direct meeting-to-work automation competitor |
| 31 | [Traba Neo](https://marketplace.microsoft.com/en-in/product/wa200011762) | Live staffing/warehouse operations questions in Teams; requires Traba account | Vertical operations agent, tied to existing data platform |

### D. IT support, customer service and governance

| # | Offer | Published capability / visible commercial signal | Competitive implication |
|---:|---|---|---|
| 32 | [Neo AI Agent](https://marketplace.microsoft.com/en-us/product/WA200009699) | MSP IT ticket triage, assignment, troubleshooting and routine resolution in Teams; requires Neo account | Direct service-desk automation competitor |
| 33 | [Ada's AI Agent](https://marketplace.microsoft.com/en-IN/product/adasupportinc1726764000854.adagenerative) | Cross-channel customer-service AI, performance analytics and APIs; 4.7 (173 ratings) | Strong established customer-service competitor |
| 34 | [Zendesk AI Agent](https://marketplace.microsoft.com/en-in/product/WA200011563) | Zendesk-grounded employee support inside Teams; requires Zendesk messaging | Direct support assistant |
| 35 | [Governance for Power Platform — Rencore](https://marketplace.microsoft.com/en-us/product/rencoregmbh.powerplatform_governance) | Inventory, policies, risk, compliance and remediation across Power Apps, Power Automate, Power BI, Copilot Studio; 951 policies and 361 reports in listing description | Strong direct governance incumbent |

This competitor set is not a complete crawl of Microsoft's 4,000+ AI apps. It is a bounded selection across the product families with closest fit to the existing revenue-engine and business-automation ideas.

## 4. What the evidence says about product categories

### Accounts payable / invoice processing
High-value problem, but crowded:
- multiple invoice capture/extraction products;
- AP approval and 3-way matching;
- ERP integrations;
- dedicated Azure-hosted deployments;
- AI invoice pre-validation;
- free trials and marketplace purchase paths.

A new general AP agent would need a very narrow ERP/industry gap and real customer evidence. None has been established.

### HR / employee self-service
Also crowded:
- several Copilot/Teams HR agents;
- onboarding products tied to HRMS/SharePoint suites;
- leave/PTO workflows;
- HR case management;
- enterprise implementation providers.

A generic HR policy bot or onboarding agent is rejected.

### Meetings / sales / tasks
Microsoft 365 Copilot already provides broad meeting and productivity capabilities. Marketplace competitors add requirements extraction, account research, sales opportunity detection, tasks and Jira updates. Review signals on Ada/Draup etc. indicate actual category activity, but not a gap for a new generic assistant.

### IT support / service desk
Ada, Zendesk and Neo already provide agentic support experiences. This is a high-cost, high-security, integration-heavy product family.

### Power Platform governance
Rencore's catalogue claims hundreds of reports/policies/automations, while Microsoft provides native Power Platform admin capabilities. A basic flow inventory/security/reviewer is not a defensible new product.

## 5. Transactable self-serve vs Contact Me

A large proportion of the reviewed offers are labelled **Contact me** or require an existing vendor account/underlying product:
- Intech Agentic AP and AP Automation;
- Compusoft AI Agent HRMS;
- Folio3 HR Copilot;
- PwC contract/spend agents;
- Concentrix finance/HR workflows;
- UST ProcureIQ;
- Neo AI Agent;
- Traba Neo;
- BA Agent / XIONTECH account;
- Onboarding365 and HR365 dependencies.

These may be commercially valuable businesses, but the seller's model can include implementation, partner sales, or a pre-existing contract. Those features do not prove a one-click, self-serve, recurring Marketplace product.

The few offers with immediate Get it now/free-trial pathways have established product vendors, external dependencies, or infrastructure that is not free:
- Ada's AI platform;
- Autopilot AP;
- Xtract's dedicated Azure SQL/Blob per deployment;
- Botminds document platform;
- EnkayTech document automation.

We do not treat a Contact Me listing as equivalent to a paid customer or a self-serve revenue route.

## 6. Product selection decision

No current candidate passes all V4 gates.

| Candidate hypothesis | Market signal | Competitive saturation | Self-serve / zero-cost fit | Decision |
|---|---|---|---|---|
| Generic AI Business Automation Reviewer | Problem exists | High; native and third-party tools | Weak | NO-GO (Phase 46) |
| Generic AP/invoice AI agent | Strong buyer pain | Very high; multiple Marketplace products | Hosting/model/integration cost high | NO-GO |
| Generic HR/employee Copilot agent | Strong buyer pain | Very high; several Copilot/Teams/SharePoint agents | Existing HRMS dependency and security burden | NO-GO |
| Meeting/requirements/sales assistant | Strong buyer activity | High; Copilot + direct competitors | Model and data-access cost; privacy | NO-GO |
| Generic IT support AI agent | Strong buyer pain | Strong incumbents and complex integration | High operational/security burden | NO-GO |
| Generic Power Platform governance/reviewer | Clear need | Rencore + Microsoft admin center | Enterprise support/security costs | NO-GO |
| One narrow industry/ERP agent | Potentially valuable | Not yet mapped exhaustively | Unknown | NOT SELECTED; insufficient evidence |

**Final Phase 48 decision:** NO-GO for the generic Microsoft AI app/agent categories reviewed. This is not a permanent rejection of Microsoft Marketplace. A future highly specific product could re-enter only with primary buyer demand and a unique paid outcome.

## 7. Why the current mission should move to Apify Store

Apify Store has a materially different model:
- any developer can publish an Actor;
- creators can charge Pay-per-event or Pay-per-usage;
- the published creator share is 80% of event revenue before platform usage costs;
- platform usage costs are deducted from creator profit;
- the free plan includes a small monthly platform usage allowance for experimentation;
- paid customer activity can be observed through Actor store signals such as users, monthly active users, runs, reviews and price points.

This is a more direct self-serve usage-revenue model, with a lower barrier to a private prototype and Store publication than a full transactable Microsoft SaaS offer. It is still not easy income: broad scraping niches are crowded, source rights are mandatory, proxies/compute can destroy margin, creator payout needs KYC and the platform's fee model must be modelled.

Apify is platform rank #4. It becomes the next qualification lane, not an automatic build decision.

Primary sources:
- Actor monetisation: https://docs.apify.com/actors/monetize
- Actor Store publishing: https://docs.apify.com/actors/running/actors-in-store
- PPE margin formula: https://docs.apify.com/actors/monetize/pricing-and-costs
- Creator share/cost warning: https://help.apify.com/en/articles/8684010-make-money-publishing-actors-on-apify-store
- Free plan / platform usage: https://apify.com/pricing

## 8. Current truth and next exact task

- Microsoft Marketplace product build: none.
- Microsoft Partner Center enrollment: none.
- Paid cloud/AI/API infrastructure: none.
- Public listing: none.
- Verified platform-credited net earnings: ₹0.
- Authorised spend: ₹0.
- P48-001 is complete with NO-GO for the generic category hypotheses.
- P48-002..P48-005 must be cancelled.
- Next queue task: P49-001 — ground-qualify a high-value Apify Store Actor niche using live competitor user/run/price/review signals, current platform fee and usage costs, lawful source/rights checks, buyer job-to-be-done and unit economics. No build until P49-001 GO.

**Decision principle:** Marketplace scale is not a product. A product is selected only when the buyer gap, right to data, net economics, self-serve path and distribution are supported by evidence.
