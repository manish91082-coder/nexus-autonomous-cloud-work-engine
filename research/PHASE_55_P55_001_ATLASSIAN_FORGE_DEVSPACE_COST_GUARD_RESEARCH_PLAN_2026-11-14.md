# Phase 55 — P55-001 Research Plan: Atlassian Forge Developer Cost Guard
**Captured:** 14 November 2026  
**Authority:** `MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md`  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Branch:** `master`  
**Phase:** `PHASE_55_ATLASSIAN_FORGE_PRODUCT_GAP_RESEARCH`  
**Sole active task:** `P55-001` — qualify a recurring, evidence-backed buyer problem for Atlassian Forge Marketplace developers  
**Candidate:** `ATLASSIAN-FORGE-DEVSPACE-COST-GUARD`  
**Status:** **HOLD_FOR_EVIDENCE — research only**  
**Spend authorised:** INR 0  
**Build / account / KYC / terms / publication:** none

## 1. Why Phase 55 starts now

Phase 54 screened Zoho, Wix, monday.com, BigCommerce, Xero and Intuit. No candidate passed the V4 hard gates. The BigCommerce Variant Price Import Preflight is closed NO-GO because Hypa Shift already supplies existing-variant price import, ID mapping and pre-import validation. The other Phase 54 hypotheses were rejected or held as recorded in the Phase 54 final disposition.

V4 places Atlassian Marketplace / Forge first in the platform-level market-entry order because of its Marketplace scale and favourable Forge revenue share. Platform ranking is not a product decision. Phase 55 therefore reopens product discovery on Atlassian, not development.

## 2. Early product screens

### 2.1 Jira permission / access review — reject generic clone
The following existing products substantially cover permission matrices, effective access, snapshots, review sign-off and audit evidence:
- Clearance for Jira (released 9-Sep-2026; paid; weekly scheduled scans, permission matrix, access-by-group view, historical diffs, CSV evidence): https://marketplace.atlassian.com/apps/2391606881/clearance-for-jira-permission-audit-access-review
- Access Auditor for Jira (released 7-Oct-2026; paid; 12 risk rules, effective access by user/group/role, scheduled snapshots and CSV): https://marketplace.atlassian.com/apps/2492663306/access-auditor-for-jira-permissions-user-access-audit
- AccessRadar (read-only access review campaigns, snapshots, Keep/Revoke/Exception decisions and evidence): https://marketplace.atlassian.com/apps/3691498947/accessradar-access-review-permission-audit-for-jira
- AccessLens (permission audit, change snapshots and sign-offs): https://marketplace.atlassian.com/apps/4182244448/accesslens-permission-audit-access-review-for-jira
- Native Atlassian Marketplace App Trust / centralized app governance is an adjacent platform substitute.

**Disposition:** generic Jira permissions auditor/access review is REJECTED for shortlisting. Any different problem must demonstrate a non-overlapping buyer outcome.

### 2.2 Inactive-seat / license optimizer — reject generic clone
Atlassian's own Cloud licensing guidance exposes Last Active date and Maximum Quantity Billing rules. Third-party apps also cover reclaiming inactive seats, cost estimates and audit trails:
- Seat Reclaim: https://marketplace.atlassian.com/apps/1825851557/seat-reclaim-remove-inactive-users-free-licenses-for-jira
- License Audit: https://marketplace.atlassian.com/apps/3306033176/license-audit-inactive-users-unused-seats-for-jira
- Seats Reclaim for Jira: https://marketplace.atlassian.com/apps/3008187187/seats-reclaim-for-jira-inactive-users-unused-licenses
- Native licensing explanation: https://www.atlassian.com/licensing/cloud

**Disposition:** generic Jira inactive-seat/license optimizer is REJECTED for shortlisting. Do not clone Last Active reports, seat reclamation or cost-per-unused-seat calculators.

## 3. Candidate: Forge Developer Cost Guard

### 3.1 Buyer and job-to-be-done

**Buyer:** an independent Atlassian Marketplace vendor / Forge app developer, especially a small partner running one or more paid Forge apps across multiple customer installations.

**Job-to-be-done hypothesis:** understand app-level and customer-installation-level Forge usage costs, compare those costs against a vendor-defined monthly financial tolerance and Marketplace licensing income, and receive a clear warning before an unexpected monthly bill becomes material.

This is a developer-side business-control problem, not a Jira administrator end-customer problem. The first distribution and payment route is not yet selected.

### 3.2 Independent demand signals

1. **19–21 August 2026 developer discussion:** multiple Forge developers describe the need for custom dollar budgets and budget alerts. One developer says the absence of configurable dollar thresholds is a meaningful vendor risk. Atlassian staff confirms that configurable percentage thresholds were not available in Developer Console at that time and that budget-based notifications were unsupported by the dependent platform; it points developers to usage and Commerce APIs as an interim path.
   https://community.developer.atlassian.com/t/forge-platform-usage-costs-alerts-limits/102240
2. **3 February 2026 developer discussion:** a Forge app builder describes a scenario where revenue from a 20-user app could be about USD 100 while Forge platform usage could reach about USD 120, and asks how to price against variable infrastructure cost.
   https://community.developer.atlassian.com/t/forge-app-pricing-vs-actual-platform-costs/100000
3. **15 January 2026 developer discussion:** a vendor asks whether development/staging environments contribute to billed Forge usage, and Atlassian explains that environment use contributes to app cost.
   https://community.developer.atlassian.com/t/forge-usage-costs-for-development-staging-environments/99000

These are developer pain signals, not independent paid procurement evidence. Before GO, obtain additional current evidence from vendor discussions, requests for budgets/cost visibility, and paid comparable products or buyer budget statements. Do not translate forum activity into a sales forecast.

### 3.3 Native Atlassian capabilities — the product gap must be narrow

At capture:
- Developer Console Usage and Costs dashboard shows resource consumption and costs by app and site.
- Developer Space Insights aggregates apps and usage signals; this is a native substitute for a general cross-app dashboard.
- Forge Cost Estimator models potential monthly charges from projected usage.
- Usage Alert documentation (last updated 8-May-2026) specifies fixed 50%, 75%, 90% and 100% resource-allowance thresholds. The page does not describe a configurable USD budget UI.
- Forge alert rules cover operational signals such as invocation count/errors/success and do not constitute a documented dollar budget policy.
- Atlassian Engineering blog dated 12-Apr-2026 says alerts are at 50/75/90/100% of an allowance or configured budget.
- However, the Atlassian staff response in the August 2026 developer discussion explicitly said configurable percentage alerts were not present and budget-based notifications were unsupported at that time.

**Evidence discrepancy:** the April blog's “configured budget” phrase is broader than the May 2026 Usage Alerts documentation and conflicts with the August 2026 staff clarification. Do not assume that an app vendor can currently configure an arbitrary USD budget in the Developer Console. Resolve this discrepancy with current written Atlassian support documentation before making a product claim.

Official sources:
- https://developer.atlassian.com/platform/forge/usage-alerts/
- https://developer.atlassian.com/platform/forge/monitor-usage-metrics/
- https://developer.atlassian.com/platform/forge/forge-platform-pricing/
- https://developer.atlassian.com/platform/forge/developer-space/export-app-resource-usage/
- https://developer.atlassian.com/platform/forge/developer-space/insights/
- https://www.atlassian.com/blog/atlassian-engineering/engineering-the-forge-billing-platform-for-reliability-and-scale

### 3.4 Technical feasibility — externally hosted/local vendor tool only, until proven otherwise

The official Export App Resource Usage API:
- exports Forge usage across installation sites;
- groups usage by environment and/or site context;
- permits one usageKey per request and paginated retrieval;
- rate-limits to 5 requests/minute;
- requires the Atlassian GraphQL Gateway;
- requires the Atlassian account making the request to be the owner of the Forge app;
- requires a user-generated Atlassian API token and the `X-ExperimentalAPI` header;
- is explicitly experimental and subject to change;
- is not supported for Government Cloud or Isolated Cloud.

Official source: https://developer.atlassian.com/platform/forge/developer-space/export-app-resource-usage/

The separate App Metrics Export API provides operational metrics in 15-minute intervals for up to 14 days, also at 5 requests/minute. It is not the same as billable resource-usage data and must not be substituted for cost evidence:
https://developer.atlassian.com/platform/forge/export-app-metrics/

The Forge resource-usage API returns consumption quantities. Atlassian says cost-based insights can be derived by using Commerce public APIs with Forge App Hosting offering ID `59f614dc-f9d0-4fad-924d-bb9d707d33ab`. But:
- Commerce REST calls require a generated access token.
- The invoice-list endpoint explicitly states Forge and OAuth2 apps cannot access that REST resource.
- Public docs reviewed do not prove that an independently operated third-party desktop/CLI product can retrieve all required per-app invoice data using only a developer owner's token.
- Commerce API permissions, transaction-account association, product/offering visibility and mapping of every usage meter to invoice line-items still require a reproducible, authorized test.

Sources:
- https://developer.atlassian.com/platform/commerce/rest/
- https://developer.atlassian.com/platform/commerce/rest/api-group-invoices/
- https://developer.atlassian.com/platform/commerce/rest/api-group-pricingplans/

### 3.5 Data freshness and safety boundary

The official Usage and Costs dashboard refreshes daily at **12:00 UTC** (17:30 IST). Resource-usage export examples return daily periods and support grouped usage by site context. Therefore:
- no real-time spend warning;
- no guarantee that a warning arrives before overage occurs;
- no claim of a billing hard-stop or automatic platform suspension;
- no false promise that it can prevent a runaway bill.

A safe future product claim could be limited to: “owner-controlled, delayed usage-to-cost estimates and configurable external alerts using the vendor's own Atlassian developer account.”

An optional app-side feature-flag/runbook might allow the vendor to reduce non-production workloads in its own app, but only if the vendor implements that control. A separate monitoring product cannot force Atlassian billing or terminate customer usage.

### 3.6 Proposed architecture hypothesis — not authorised for implementation

If technical and commercial gates pass, the least-risk design would be:
- local-first CLI/desktop or self-hosted service controlled by the Marketplace vendor;
- customer/owner generates and stores the Atlassian API token locally; token is never sent to our hosted service or committed to Git;
- daily scheduled pull of the owner's Forge app resource usage and site/environment groupings;
- cost calculation based on an auditable snapshot of official price tables and, only where permitted, Commerce API responses;
- budgets per Developer Space, app and site/environment; actual-vs-estimated usage, monthly run-rate and alert history;
- email/webhook alerts emitted by the local/self-hosted tool;
- a clear distinction between observed billable usage, estimated cost and finalized invoice amount;
- no customer issue content, project data or end-user personal data required;
- no external LLM, no paid inference and no cloud runtime in the zero-cost default.

Before any build, prove that a single owner can obtain all necessary usage data and pricing data with permitted owner-authenticated APIs; test data freshness, error handling, missing meter cases, historical corrections and reconciliation to a real statement. No token or seller account has been requested or used.

### 3.7 Competitor / substitute screen — 15 references

This is a bounded substitute landscape, not 15 direct Forge-specific competing products:

| # | Capability | Overlap with hypothesis |
|---:|---|---|
| 1 | Forge Developer Console Usage and Costs | Native app-level usage/cost dashboard |
| 2 | Developer Space Insights | Native multi-app usage overview |
| 3 | Forge Cost Estimator | Native projected usage-cost estimation |
| 4 | Forge Usage Alerts | Native 50/75/90/100 allowance alerts |
| 5 | Forge operational alert rules | Native invocation/error/success alerts, not dollar budgets |
| 6 | Forge App Resource Usage API | Native usage data export; requires owner API token |
| 7 | Commerce REST API | Pricing/offering/invoice data; endpoint access restrictions apply |
| 8 | Custom GraphQL/API scripts | DIY solution using usage and Commerce APIs |
| 9 | Datadog / general observability | Third-party dashboard/alerting for exported telemetry |
| 10 | Splunk Observability Cloud | Third-party signal detectors and alert thresholds |
| 11 | Grafana + Prometheus | Open-source metric storage, dashboards and alert rules |
| 12 | OpenTelemetry pipeline | Open instrumentation/export standard; needs custom billing/price mapping |
| 13 | Google Cloud Billing Budgets | Adjacent budget/actual/forecast alerts; not Forge data out of the box |
| 14 | AWS Budgets | Adjacent actual/forecast cloud-spend alerts; not Forge data out of the box |
| 15 | Infracost CI | Infrastructure-as-code cost diffs and CI guardrails; not Forge runtime usage |

Sources:
- https://developer.atlassian.com/platform/forge/developer-space/export-app-resource-usage/
- https://developer.atlassian.com/platform/forge/usage-alerts/
- https://developer.atlassian.com/platform/forge/forge-platform-pricing/
- https://developer.atlassian.com/platform/commerce/rest/
- https://grafana.com/docs/grafana-cloud/observe-and-act/connect-externally-hosted/data-sources/prometheus/alerting/
- https://help.splunk.com/en/splunk-observability-cloud/create-alerts-detectors-and-service-level-objectives/create-alerts-and-detectors/create-detectors-to-trigger-alerts
- https://docs.cloud.google.com/billing/docs/how-to/budgets
- https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html
- https://github.com/infracost/ci

This screen found many substitutes for metrics export, alert delivery and cloud budgets, but no dedicated Forge-specific budget product was verified in this bounded search. Absence from a bounded search is not proof that no such product exists. A full 10–15 direct/adjacent product audit, including any current Marketplace listings and DIY examples, remains required.

### 3.8 India payout and distribution are not cleared

Atlassian Marketplace Partner Agreement states:
- Paid-via-Atlassian revenue share is paid in USD by EFT to a valid bank account in the partner's name;
- payment threshold is USD 500 (net of withholding);
- approximately 30 days after month-end for the relevant sale, subject to threshold and other terms;
- bank wire fees are the partner's responsibility;
- refunds/chargebacks can reduce or offset revenue.

Forge revenue-share rules:
- qualifying Forge apps receive 100% of gross Forge revenue up to USD 1 million lifetime Forge revenue under the published eligibility conditions;
- after that, standard Forge share is 83% effective 1-Oct-2026;
- the app must contain no Connect modules, use OAuth authentication and Forge UI.

Sources:
- https://www.atlassian.com/licensing/marketplace/partneragreement
- https://developer.atlassian.com/platform/marketplace/pricing-payment-and-billing/

The public Marketplace Partner Agreement reviewed does not identify India-specific payout-country eligibility. A valid bank account requirement is not proof that an India-based partner can enroll or receive EFT. Keep India seller eligibility **UNVERIFIED** until official written confirmation.

The product may also be better suited to an external local/CLI tool than a normal Marketplace Forge app because it needs the app-owner's developer-account token. The Marketplace agreement restricts Paid-via-Vendor models for Forge apps. The eventual distribution and payment model must therefore be selected only after an explicit platform/legal review. No external payment rail has been established for this candidate.

### 3.9 Preliminary score — platform/product hypothesis only

Using the opportunity registry's 100-point dimensions:
- Buyer demand signals: 20/25
- India payout certainty and speed: 5/20
- Automation: 15/20
- Zero-spend net economics: 10/15
- Distribution/differentiation: 8/10
- Legal, security and operational risk: 7/10
- **Preliminary total: 65/100**

This is a low-confidence research score, not approval. The hard gates override the score. India payout, distribution route, Commerce API access, custom-budget discrepancy and a full competitor audit all remain unresolved.

## 4. P55-001 acceptance criteria

P55-001 can become GO only when all are complete:
1. Reconcile current Atlassian Usage Alerts documentation with the April 2026 engineering blog and August 2026 staff clarification. Get written clarification on whether developers can configure arbitrary USD budgets today.
2. Complete a 10–15 direct/adjacent competitor and substitute audit with current features, pricing, update cadence, privacy model and any visible adoption signals.
3. Test the owner-authenticated resource usage API with a non-production developer-owned app, one app, at least two installation sites and multiple environments. No credential should enter chat or GitHub.
4. Test the Commerce API token, transaction-account mapping and permitted invoice/pricing access. Explicitly establish what is unavailable to Forge/OAuth clients and whether an external tool can use the APIs under the owner's authority.
5. Measure daily data freshness, corrections, site attribution, missing-resource behavior, price-table changes and estimated-versus-finalized invoice variance.
6. Establish two or more independent current buyer signals from Forge vendors that refer to the same specific problem and obtain at least one evidence of budget or willingness to pay, not only feature requests.
7. Verify India Marketplace seller eligibility, remittance method, threshold, withholding and whether the intended external/Marketplace distribution route is allowed.
8. Show a zero-spend self-hosted/local execution design, token security, data minimisation, no external inference and bounded update/support burden.
9. Model recurring PCNE with sourced fees and conservative usage assumptions; no invented MRR or conversion forecasts.

Until all gates pass: **HOLD, NO BUILD, NO ACCOUNT, NO KYC, NO TERMS, NO PUBLICATION, NO SPEND.**

## 5. Exact next action

Continue `P55-001` with:
- resolve the budget-alert documentation discrepancy;
- verify the Commerce API authentication and invoice-access boundary for an owner-operated external tool;
- complete the direct/adjacent competitor audit;
- prepare (but do not send) a concise support question asking Atlassian to confirm: (a) custom USD budget configuration in Developer Console, (b) programmatic usage/Commerce access for an external vendor tool, (c) India Marketplace Partner enrollment and EFT country eligibility, and (d) permitted listing/payment model for a developer-side cost-management tool.

No product build or owner action is authorised.

**Resume instruction:** fetch actual `master` HEAD at every continuation. Continue `PHASE_55 / P55-001 / ATLASSIAN-FORGE-DEVSPACE-COST-GUARD = HOLD_FOR_EVIDENCE`.
