# Phase 59.31 — Microsoft CSP SLA Credit Claim Assistant: Candidate Qualification

Date: 15-Nov-2026  
Task: P59-001  
Candidate ID: MSP-M365-CSP-CREDIT-CLAIM-ASSISTANT  
Status: HOLD — pain is real; price-bearing WTP and recurring economics are not proven  
PCNE: ₹0; authorized spend: ₹0.

## 1. Candidate definition

A self-serve, evidence-first claim preparation tool for Microsoft 365 CSP/MSP providers. It would:
- Track eligible service incidents across customer tenants.
- Map service, incident ID, customer tenant GUID and affected subscription.
- Collect customer impact evidence and tenant-domain confirmation.
- Track the one-month (non-Azure) / two-month (Azure) claim deadline.
- Generate a claim packet and a customer credit-allocation/reconciliation ledger.
- Keep a human approval and submission step; no automatic claim submission or credit entitlement decision.

This is a candidate workflow, not an approved product.

## 2. Official workflow evidence

Microsoft Partner Center's current credit guidance states:
- SLA credit applies only to the affected service and is prorated by service and outage duration.
- Azure claims must be filed within two months from the end of the billing month; other services within one month.
- Required items include customer tenant GUID, outage incident ID, evidence the customer was affected and requested credit, and confirmation that subscriptions were purchased through CSP.
- Supporting proof includes downtime duration, affected users/locations, troubleshooting attempts, and customer email from the affected tenant domain.
- Advisory incidents are generally not eligible.
- Approved credits appear on the next invoice and reconciliation data.

Microsoft Partner Center allows authorised partner roles to inspect customer service health. Microsoft Graph's Service Communications API exposes health overviews and messages, with least-privileged permission ServiceHealth.Read.All for work/school tenant access. This is a sensitive delegated/application permission, not a public anonymous feed.

Official references:
- https://learn.microsoft.com/partner-center/billing/request-credit
- https://learn.microsoft.com/partner-center/customers/check-service-health
- https://learn.microsoft.com/en-us/graph/api/servicehealth-get?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/service-communications-concept-overview

## 3. Two independent community pain signals

1. r/msp, 12-Nov-2026: 55 votes on a CSP question asking how Microsoft 365 outage credits can be claimed for organisations buying through CSP. Replies describe the hand-off through CSP/distributor and customer evidence requirements.
   https://www.reddit.com/r/msp/comments/1xurufn/m365_credits_for_ms_breaking_slas_as_a_csp/

2. r/msp, 13-Nov-2026: 226 votes on a post urging CSP partners to submit credit claims for customers. The post explicitly says the process is easy to forget amid normal MSP work and lists incident IDs, tenant GUIDs, customer proof, Partner Center ticket and deadline steps.
   https://www.reddit.com/r/msp/comments/1xv7wx3/dont_let_microsoft_off_the_hook_make_sure_you/

Additional signal / economic counter-evidence:
- A separate r/msp thread (63 votes) discusses a 25% credit scenario; comments include an MSP saying it is not worth spending hours for its customer base and another estimating about $600 for 1,200 seats. These are anecdotal estimates, not audited credits or willingness-to-pay.
  https://www.reddit.com/r/msp/comments/1xvm3n0/microsoft_credit_go_get_that_25/
- r/ITManagers has a separate report of a negotiated SLA penalty resulting in a credit note, but it is low-engagement and not software WTP evidence.
  https://www.reddit.com/r/ITManagers/comments/1xdf8pz/reality_check_am_i_expecting_too_much_from_our_msp/

Conclusion: two independent MSP discussions validate workflow friction and awareness, but they do not establish a recurring software budget.

## 4. Fifteen direct and adjacent substitutes

1. Microsoft Partner Center request-credit process — first-party manual support-ticket workflow.
2. Microsoft Partner Center customer service-health view — first-party tenant-by-tenant health.
3. Microsoft Graph Service Communications API — first-party health/communications data source; requires tenant permission.
4. Crayon CSP credit process — indirect-reseller route; for major outages exceeding eight hours, Crayon says it generally claims globally and distributes credits once received.
5. Pax8 outage-credit guidance — distributor-mediated claim route; published guidance is from 2021 and must be reconfirmed before reliance.
6. ServiceNow Vendor Management Workspace — tracks vendor service credits, breach counts/duration and redeemed/owed balances; enterprise workflow.
7. Aavenir Atlas / Obligationflow — service-credit recovery across supplier contracts, credit clauses, evidence and claim windows; early access / enterprise contract platform.
8. Qvery SLA Credit Calculation Agent — one-off contract/report upload and line-by-line credit calculation.
9. Mientha SLA Reporting and Service Credits — custom automation of contract registers, clock rules, credit formulas, reports and evidence packs.
10. Kestra SLA service-credit blueprint — open-source workflow for downtime merging, exclusions, tiered credits, approval gates, credit notes and period locking.
11. SLA Time and Report for Jira — real-time SLA monitoring, breach alerts, reports and compliance exports; 741+ installs / 136 reviews shown in Marketplace snapshot.
12. Super SLA: SLA History & Audit for Jira — breach ledger, recalculation history, approvals, monthly compliance pack and Rovo agent.
13. AI-Driven SLA Insights and Bottleneck for JSM — Jira SLA cycles, reports and Rovo summaries.
14. Motadata ServiceOps — SLA timers, business-hours calendars, escalations and breach notifications.
15. Excel / SharePoint / Power BI / distributor ticket process — current manual or configured substitute for smaller MSPs.

References:
- Crayon process: https://operations-apac-knowledgebase.zendesk.com/hc/en-us/articles/8160216560796-Claiming-SLA-Credit-for-Microsoft-Service-Outages
- Pax8 process: https://www.pax8.com/blog/microsoft-outages
- ServiceNow: https://www.servicenow.com/docs/r/xanadu/it-service-management/vendor-management-workspace/service-credits-configurable-workspace.html
- Aavenir: https://www.aavenir.com/use-cases/service-credit-recovery/
- Qvery: https://qvery.ai/sla-credit-calculation-agent/
- Mientha: https://mientha.com/en/solutions/sla-reporting-and-service-credits/
- Kestra: https://kestra.io/blueprints/sla-service-credits-calculation
- Jira SLA Time and Report: https://marketplace.atlassian.com/apps/1220741/sla-time-and-report-for-jira-sla-management-compliance
- Super SLA: https://marketplace.atlassian.com/apps/998308328/super-sla-sla-history-audit-for-jira-service-management
- JSM AI SLA insights: https://marketplace.atlassian.com/apps/1236317/ai-driven-sla-insights-and-bottleneck-for-jsm-itsm-help
- Motadata: https://www.motadata.com/blog/sla-breach

## 5. Economics and risk gates

### Positive
- A one-month deadline for non-Azure services creates a real deadline-management problem.
- Multi-tenant evidence collection is repetitive and can be structured.
- Microsoft publishes service-health APIs, so an authorised integration is technically possible.
- MSPs have a direct reason to preserve customer trust and pass through eligible credits.

### Negative / unresolved
- Major incidents may be claimed centrally by a distributor such as Crayon; a standalone tool adds little in that case.
- Small customer claims may be worth only a few dollars per seat; one MSP explicitly says the work is not worth it for its base.
- Claims can take months; one third-party report describes six-to-eighteen-month experiences, not an official SLA.
- Credit amounts are service-specific and prorated, not a refund of the entire Microsoft 365 plan.
- Microsoft Graph access requires ServiceHealth.Read.All and customer/partner authorisation; this is a material security and onboarding gate.
- The Partner Center request process is a support ticket; no public claim-submission API was established in this research.
- No published price was found for the direct/adjacent tools; no MSP stated willingness to pay for this proposed product.
- A single outage is episodic; recurring annual value and retention are not established.
- India-specific CSP partner eligibility, distribution, payout, and local market demand were not verified in this batch.

## 6. Unit-economics decision

No credible price, addressable paying MSP count, claim frequency, average recovered credit, acquisition cost, support cost or churn data exists. A numeric revenue forecast would be fabricated.

The candidate cannot yet pass:
- Price-bearing WTP.
- Recurring value / retention.
- Positive fully-loaded unit economics.
- Partner and customer permission model.
- Self-serve onboarding without privileged credential collection.

## 7. Decision

**HOLD — do not build.**

The problem is real and supported by two independent MSP community discussions, but the commercial case is not established. Distributor automation, first-party Partner Center tools, enterprise service-credit products, open-source workflows and manual spreadsheets are credible substitutes. Low per-seat credit value and long processing times may make a standalone recurring subscription unattractive for small MSPs.

Reopen only if a narrowly defined MSP segment demonstrates:
1. Repeated missed claims or manual labour across many tenants and multiple providers.
2. Two or more MSPs willing to pay a stated monthly/annual price or provide a paid pilot commitment.
3. A workflow gap not already handled by the distributor or existing PSA/contract tools.
4. A least-privilege Microsoft permission model and documented customer consent.
5. Net value to the MSP materially exceeding the proposed subscription and support cost.

No build, Microsoft app registration, tenant permission request, Partner Center account action, KYC, listing, customer data import or spend is authorised.
