# Phase 55 P55-001 — Substitute, API Feasibility and Buyer-Gap Audit
**Audit date:** 14 November 2026  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Candidate:** Forge Developer Cost Guard  
**Decision:** **HOLD_FOR_EVIDENCE — NO BUILD / NO TOKEN / NO ACCOUNT / NO SPEND**  
**Preliminary score:** 65/100 (unchanged; not a GO score)

## 1. Executive decision

P55-001 remains the sole active mission task. The candidate is **not approved for implementation**. The evidence confirms a genuine Forge-developer problem around configurable USD cost alerts and spending controls, but it does not yet establish a differentiated, technically complete and commercially validated product.

The decision remains HOLD for four reasons:

1. **Demand is real but incompletely qualified.** One directly relevant 2026 Atlassian Developer Community thread contains multiple developer comments requesting dollar-based budget alerts and hard cost limits. This establishes pain, not paid willingness-to-pay (WTP). Two additional thread URLs retained in earlier repository notes could not be independently reopened in this audit, so they are not counted as verified independent current signals.
2. **The generic dashboard proposition is already covered.** Developer Space Insights aggregates cross-app resource/cost visibility. Forge also provides app-level Usage and Costs, a cost estimator and fixed usage-alert emails. A generic dashboard or fixed-alert clone is rejected.
3. **The critical billing data path is not proved.** The App Resource Usage API is experimental, owner-account scoped, rate-limited and one usage key per request. The documented Commerce invoice-list endpoint explicitly excludes Forge and OAuth2 apps. A separate external local/CLI client may have a different permitted authentication route, but that has not been proved. Invoice, payment-method, payment-state and pre-dunning/dunning API access remain unverified.
4. **Commercial/distribution gates remain open.** No direct buyer budget or WTP signal was found. A Marketplace third-party-integration listing path exists, but classification/payment model for this particular developer-side utility is unresolved. India partner eligibility and own-name EFT payout have not been confirmed by an India-specific official source.

**Disposition:** do not build P55-002. Do not create an Atlassian account, API token, Partner profile, billing method, Marketplace listing, external service or paid test. The Atlassian support clarification packet remains a draft and must not be sent without explicit owner approval.

## 2. Alert-document discrepancy: best-supported current interpretation

Three evidence layers must be kept separate:

- The April 2026 Atlassian engineering article says fixed alerts fire at 50%, 75%, 90% and 100% of an app's allowance or configured budget. It also confirms app-level entitlements and a single Developer Space invoice with per-app overage line items.
- The Usage Alerts documentation, last updated 8 May 2026, describes standard 50%, 75%, 90% and 100% **resource-allowance** thresholds and the information in those emails.
- In a 20 August 2026 Atlassian staff reply in the Developer Community, Atlassian explicitly says configurable percentage thresholds were not present in the Developer Console and budget-based notifications were not supported by the dependent platform at that time. The reply points to FRGE-2252 and FRGE-2253.

For qualification, custom percentage/USD-budget alerts are treated as **NOT NATIVELY SUPPORTED as of the latest explicit public staff clarification located (20 August 2026)**. The April article remains a source discrepancy, not silently overwritten. No direct Atlassian support confirmation dated after 20 August has been obtained.

The Forge limits documentation, last updated 6 November 2026, says the consumption-based pricing model replaced most strict usage quotas with charges beyond free allowances. Fair-use controls remain; Atlassian retains the ability to contact, throttle or suspend apps that threaten platform stability. These platform reliability controls are **not a customer-defined USD spend cap** and must not be marketed as one.

## 3. Fifteen direct and adjacent substitutes

| # | Substitute | Existing capability | Gap relative to proposed product |
|---:|---|---|---|
| 1 | **Developer Space Insights** | Aggregated Forge-app view for logs, errors, alerts, performance and resource/cost visibility; top-three resource chart over 30 days. | No verified programmable custom USD-budget policy or external billing-state API. Generic portfolio dashboard is not differentiated. |
| 2 | **Forge Usage and Costs dashboard** | Per-app resource consumption/cost view, date filtering and cost context; daily data refresh documented at 12:00 UTC. | Does not establish custom-dollar thresholds or hard cost stop. |
| 3 | **Forge Usage Alerts** | Native email alerts at 50%, 75%, 90%, 100% of allocated resource usage; contributors and billing admins receive alerts. | Fixed thresholds, not documented user-defined USD budgets or custom escalation workflows. |
| 4 | **App Resource Usage API** | Owner-authenticated export of per-app resource usage across sites; environment grouping and pagination. | Experimental; one usage key/request; 5 requests/minute; requesting Atlassian account must own the app. Not evidence of invoice/payment-state access. |
| 5 | **Developer Space Billing Console** | Authorised billing users can review subscriptions, usage, invoices, payment methods and paid/unpaid invoice status. | Human console is documented; external API/webhook access to billing states is not established. |
| 6 | **Forge Cost Estimator** | Previews potential monthly charges from projected app usage. | Estimate is not live budget enforcement, final invoice reconciliation or custom notification routing. |
| 7 | **Forge Feature Flags** | Atlassian staff points to feature flags to control selected app behaviour such as invocations or logs. | Application behaviour toggles are not a financial budget ledger, guaranteed spend cap or billing-status monitor. |
| 8 | **AWS Budgets** | Configurable cost/usage budgets and alert/action workflows for AWS billing scopes. | No documented native access to Forge invoices or Developer Space billing; adjacent cloud-cost substitute only. |
| 9 | **Azure Cost Management** | Budget alerts at supported scopes; action groups can automate actions to reduce or stop further Azure charges. | Targets Azure subscriptions/resource groups, not Atlassian Forge charges. |
| 10 | **Google Cloud Billing Budgets** | Email and programmatic Pub/Sub budget notifications; Pub/Sub can feed automated responses. | Monitors Google Cloud billing, not Forge Commerce data. |
| 11 | **CloudZero Budgets** | User-defined thresholds in 10% steps and email/Slack/Google Chat notifications, plus cost/anomaly views. | General cloud-spend intelligence; no verified Forge invoice connector or Forge billing-account permissions. |
| 12 | **Grafana Cloud Cost Management & Billing** | USD usage alerts with chosen thresholds and contact points for Grafana Cloud products. | Covers Grafana Cloud spend, not Forge publisher hosting bills. |
| 13 | **Tempo Financial Manager for Jira** | Jira project financial management with costs, revenue, billing, budgets and portfolios; listing showed 2,988 installs and 47 reviews at time checked. | Project/team financials, not Forge publisher platform-consumption charges. |
| 14 | **Burnrate: Project Cost Tracking & Budgets for Jira** | Project/epic budgets and burn-rate forecasts from logged time/hourly rates; listing showed 1 install and no reviews at time checked. | Jira project cost tracking, not Forge runtime billing. |
| 15 | **Cost Tracker: Financial Budget, Rates and Profit for Jira** | Worklog-derived project costs, budgets, revenue, margins and XLSX reports; listing showed 1 install and no reviews at time checked. | Project economics, not Developer Space resource costs, invoice or payment state. |

The scan did not verify an existing Marketplace app dedicated to a Forge publisher's own Developer Space hosting bill. That absence is **not** proof of an open market: native Atlassian coverage, exported-API workflows, general cloud FinOps tools, manual Billing Console review and spreadsheets remain meaningful substitutes.

## 4. Buyer-demand and WTP scorecard

### Verified problem signal

The directly inspected 19–20 August 2026 thread, “Forge Platform Usage Costs: Alerts & Limits”, includes:
- a developer describing the absence of alerts/hard cost limits as a risk of unexpected cost escalation;
- another developer explaining that notifications stop at free resource thresholds and do not notify on additional dollar charges;
- Atlassian staff explicitly confirming configurable percentage alerts and budget-based notifications were not available at that time;
- additional developers requesting monthly USD budgets, configurable thresholds, hard caps or the ability to disable non-production environments.

This is a credible problem signal and a platform-employee confirmation of the feature gap.

### Evidence still missing

| Required evidence | Audit result |
|---|---|
| Two independent, current buyer-demand signals | **Not passed.** Multiple people contributed to one directly verified thread. Two other URLs in older repository notes could not be independently reopened and are not counted here. |
| Buyer budget or willingness-to-pay signal | **Not found.** No verified purchase intent, price acceptance, preorder, exact-problem paid competitor or transaction evidence. |
| Repeatability beyond one thread | **Insufficient.** The addressable paying segment and severity distribution remain unmeasured. |
| Adjacent paid demand | Jira project-finance tools demonstrate a different paid job. They do not prove WTP for Forge hosting-cost control. |

Feature requests and comments are not purchase orders. The problem is evidenced; the economic buyer, price and conversion are not.

## 5. API, data freshness and economic feasibility

### Resource usage path

The official App Resource Usage API documentation establishes:
- the requesting Atlassian account must be the same account that owns the Forge app;
- Basic authentication uses the owner's email/API token and the `X-ExperimentalAPI` header;
- the API is experimental and subject to change;
- one `usageKey` per request;
- `ENVIRONMENT_ID` grouping and pagination;
- five requests per minute;
- unsupported use in Government Cloud and Isolated Cloud.

The API covers resource usage across sites for a given Forge app; it is not a verified all-app billing-account API. No owner token was created or used in this audit.

Illustrative lower-bound request capacity (not an assertion about the actual number of billable meters):

`requests = owned apps × usage keys per app × pages per query`

- 10 apps × 8 keys × 1 page = 80 requests, at least 16 minutes at 5 requests/minute.
- 100 apps × 8 keys × 1 page = 800 requests, at least 160 minutes at 5 requests/minute.

Actual completion can take longer due to pagination, retries and context/environment queries. Daily-resolution usage data means the proposed tool cannot claim real-time spend protection.

### Cost and invoice reconciliation path

The Commerce REST `GET /v2/invoices` endpoint explicitly states that Forge and OAuth2 apps cannot access the invoice-list resource. It requires the `X-transaction-account` header. The corresponding detail and PDF invoice endpoints carry the same restriction.

This does **not** prove that every external owner-operated local/CLI client is barred. It does mean a Forge/OAuth2 app cannot simply call the documented invoice-list route. A supported external identity/token model and explicit owner-authorised access to invoice line items, payment method status, failed autopay and pre-dunning/dunning state remain unverified.

Any MVP, if later authorised, must label usage-derived amounts as **estimates** until reconciled to final invoices. It must not claim bill accuracy, bill prevention or invoice-state alerts without evidence.

### Billing exposure

Official Developer Space billing guidance says all apps in the space contribute to the shared bill; invoices are generated on the first day of each month for the previous month; autopay is attempted when a valid payment method exists. It describes a 14-day pre-dunning period where no valid payment method exists and a 21-day dunning period where a saved payment method fails. Unresolved billing can result in enforcement across all apps in the Developer Space.

The engineering billing article clarifies that allowances are assessed per app and per meter, then app overages are aggregated into one Developer Space invoice with per-app line items. This is not a single pooled free allowance to distribute between apps.

## 6. Marketplace distribution and India payout

A documented Atlassian Marketplace route exists for a third-party integration that does not install an artifact into the customer's Atlassian instance: the publisher can select **“My app isn't directly installable”**, provide a binary URL or information URL, and submit a test instance for Marketplace review.

This is a possible listing/discovery path for a desktop/CLI utility, not proof that this particular product will be accepted or that a paid distribution model is available.

The current Marketplace Partner Agreement says Paid-via-Vendor Apps may not be Cloud Apps, Data Center approved apps, or apps developed using Forge or Connect unless Paid-via-Atlassian is unavailable for that product or Atlassian permits it in writing. The Agreement also describes Paid-via-Atlassian payments by EFT to a valid bank account in the partner's own name, approximately 30 days after month-end, with payment withheld until net amounts due reach USD 500 and bank wire fees borne by the partner.

The Agreement is generic and does **not** by itself prove India-based partner eligibility, bank acceptance, tax/KYC requirements or direct-sale classification for a non-installable developer-side tool. India-specific seller and payout eligibility remains unverified.

## 7. Permissible product boundary if reconsidered

Only a zero-spend local/self-hosted, owner-operated read-only utility is presently conceivable. Even that is conditional on official access rights and actual owner-authorised API testing.

Potential functions, only after passing the gates:
- store the owner's credential locally using an OS credential store; never transmit it to us, commit it to Git or place it in chat;
- read daily per-app/usage-key data and preserve source timestamps;
- calculate clearly labelled estimates using published pricing;
- let the owner set local USD alert thresholds and notification recipients;
- maintain a separate, manually imported or officially API-reconciled invoice ledger;
- show data freshness, pagination completeness, missing keys and authentication/rate-limit failures.

Explicitly excluded claims:
- real-time spend monitoring;
- guaranteed bill cap or automatic spend stop;
- prevention of Atlassian suspension/enforcement;
- guaranteed invoice or payment-state access;
- complete all-app bill reconciliation until the data path is proved.

## 8. V4 gate disposition

| V4 hard gate | Disposition |
|---|---|
| Exact buyer/job and recurring trigger | Partially supported: Forge publisher/developer cost uncertainty |
| Two independent demand signals | NOT PASSED |
| Paid WTP / buyer budget evidence | NOT PASSED |
| Defensible gap vs native tools and substitutes | Narrow gap plausible, not sufficiently defensible |
| Supported read-only data access | Partial experimental usage API; invoice/payment-state access unverified |
| Accurate cost-to-final-invoice reconciliation | NOT PASSED |
| India partner/EFT and compliant distribution | NOT PASSED / unverified |
| Zero-spend feasibility | Possible only as local tool; not tested |
| Release/security/privacy evidence | Not started; build remains blocked |

**Decision: HOLD_FOR_EVIDENCE.** Generic dashboard is NO-GO. The narrow cost-governance hypothesis remains unqualified, not selected and not approved. Preliminary score stays 65/100.

## 9. Next exact work

1. Keep P55-001 active; do not start P55-002.
2. Obtain two independently verifiable buyer-demand signals and one genuine buyer budget/WTP signal through lawful, owner-approved validation. Do not treat a community feature request as WTP.
3. Resolve external local-client identity and invoice/payment/dunning API access through official written documentation or an owner-approved support request. The existing Atlassian support packet remains **NOT SENT**.
4. Obtain written clarification on India partner onboarding, own-name EFT, and whether a non-installable developer-side tool can be listed and paid through an allowed route.
5. Re-run V4 gates. If any essential data path or India distribution/payment route is unavailable, or no paying-buyer signal emerges, mark P55-001 NO-GO and move to the next ranked platform. Do not force a Forge product.

## 10. Source register (reviewed 14 November 2026)

### Official Atlassian
- Usage Alerts (8 May 2026): https://developer.atlassian.com/platform/forge/usage-alerts/
- Forge limits and usage (6 November 2026): https://developer.atlassian.com/platform/forge/platform-quotas-and-limits/
- Developer Space Insights: https://developer.atlassian.com/platform/forge/developer-space/developer-space-insights/
- Export App Resource Usage (6 August 2026): https://developer.atlassian.com/platform/forge/developer-space/export-app-resource-usage/
- Forge billing and payments: https://developer.atlassian.com/platform/forge/developer-space/billing-for-developer-spaces/
- Forge platform pricing: https://developer.atlassian.com/platform/forge/forge-platform-pricing/
- Commerce invoice API: https://developer.atlassian.com/platform/commerce/rest/api-group-invoices/
- Forge billing engineering article: https://www.atlassian.com/blog/how-we-build/engineering-the-forge-billing-platform-for-reliability-and-scale
- Marketplace third-party integration listing: https://developer.atlassian.com/platform/marketplace/knowledge-base/listing-a-third-party-integration-on-the-atlassian-marketplace/
- Marketplace Partner Agreement: https://www.atlassian.com/licensing/marketplace/partneragreement

### Buyer signal and adjacent substitutes
- Forge Platform Usage Costs: Alerts & Limits (19–20 August 2026): https://community.developer.atlassian.com/t/forge-platform-usage-costs-alerts-limits/102240
- AWS Budgets: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html
- Azure Cost Management: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/overview-cost-management
- Google Cloud programmatic budget notifications: https://docs.cloud.google.com/billing/docs/how-to/budgets-programmatic-notifications
- CloudZero Budgets: https://docs.cloudzero.com/docs/budgets
- Grafana Cloud billing alerts: https://grafana.com/docs/learning-paths/grafana-cloud-onboarding/setup-billing-alerts/
- Tempo Financial Manager: https://marketplace.atlassian.com/apps/1221748/financial-manager-jira-project-cost-tracking-tempo?hosting=cloud&tab=overview
- Burnrate: https://marketplace.atlassian.com/apps/1734115109/burnrate-project-cost-tracking-budgets-for-jira
- Cost Tracker: https://marketplace.atlassian.com/apps/2743016176/cost-tracker-financial-budget-rates-and-profit-for-jira

**Audit limitation:** public material reviewed here does not substitute for a live owner-account API test, written Atlassian support decision, buyer interview or completed payout onboarding. No external account, owner token, paid service, legal agreement, outreach, listing or funds movement was performed.
