# Phase 55 — P55-001 Billing Attribution and Invoice-Reconciliation Audit
**Captured:** 14 November 2026  
**Authority:** `MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md`  
**Candidate:** `ATLASSIAN-FORGE-DEVSPACE-COST-GUARD`  
**Status:** HOLD_FOR_EVIDENCE — research only  
**Spend:** INR 0  
**Account/API token/onboarding:** none

## 1. New decisive architecture fact: billing scope differs from usage query scope

Atlassian's Developer Space Billing and Payments documentation (last updated 25-Aug-2026) explicitly says:
- Forge billing is managed at **Developer Space** level.
- All apps in one Developer Space contribute to the same Forge usage bill.
- Usage is aggregated in a billing/transaction account linked to the space.
- Invoices are generated monthly on the first day of each month for prior-month usage.
- If a valid payment method exists, autopay is attempted on the first day of the month.
- If total usage for the space remains within the free threshold, total monthly cost is USD 0.
- Developer Spaces / Forge pricing are not supported for Government Cloud or Isolated Cloud.

Official source: https://developer.atlassian.com/platform/forge/developer-space/billing-for-developer-spaces/

The Forge Engineering article adds that:
- Free quota is evaluated per app; overage events are calculated per app entitlement and meter.
- Commerce accumulates overage charges, applies pricing and generates one monthly invoice for the Developer Space with line items reflecting per-app overages.

Official source: https://www.atlassian.com/blog/how-we-build/engineering-the-forge-billing-platform-for-reliability-and-scale

**Interpretation:** two different attribution levels must be preserved:
1. **Usage attribution:** per app, resource meter, date, installation/site context and environment.
2. **Financial settlement:** one transaction/billing account and monthly invoice for the Developer Space, with app-level overage line items.

Do not treat the Developer Space invoice as one undifferentiated app bill, and do not sum app costs without reconciliation to the Developer Space invoice. The per-app vs Developer Space accounting distinction is now resolved by the current Forge pricing FAQ: **each app receives its own free usage allowance per month; allowances are not shared across apps**. Charges above each app's own allowance are calculated per app, while all app charges are consolidated into one monthly invoice for the Developer Space. Therefore, compute each app's overage independently, then sum the resulting charges and reconcile them against the Developer Space invoice. The Developer Space billing page's phrase 'combined usage ... within the free threshold' is consistent with the total bill remaining zero when all app-specific allowances are respected; it does not establish one pooled allowance shared between apps. Sources: https://developer.atlassian.com/platform/forge/forge-platform-pricing/ and https://www.atlassian.com/blog/how-we-build/engineering-the-forge-billing-platform-for-reliability-and-scale.

## 2. Usage API grain and rate limits

The official App Resource Usage Export documentation currently shows:
- Every request requires an `appId`.
- It accepts one `usageKey` per request.
- It supports filtering by date interval and `contextAris`.
- It supports grouping by `ENVIRONMENT_ID`, context ARI and pagination.
- The documented rate limit is **5 requests/minute**.
- The response example is daily resolution (`ONE_DAY`).
- The request is made using the Atlassian GraphQL Gateway.
- The Atlassian account making the request must own the Forge app.
- API token + `X-ExperimentalAPI` are required because the API remains experimental and subject to change.

Official source: https://developer.atlassian.com/platform/forge/developer-space/export-app-resource-usage/

This implies a multi-app Developer Space report may need many calls: at minimum, each app/resource-meter combination is a separate request, with pagination and context/environment queries adding more. The exact current number of usage keys/meters and app enumeration method must be measured before calling this “low effort” or near-real-time.

## 3. Data freshness and invoice reconciliation

- The Developer Console Usage and Costs dashboard refreshes daily at 12:00 UTC.
- The usage export sample returns daily periods; it is not a real-time event stream.
- The monthly invoice is created on the first day of the following month.
- A cost estimator or daily cost ledger therefore cannot be advertised as the final amount due before invoice generation.
- A future product would need at least three explicit financial states:
  1. observed resource consumption;
  2. estimated cost using a versioned published price schedule and free allowances;
  3. finalized Developer Space invoice amount and per-app line-item reconciliation, where supported.

Official dashboard source: https://developer.atlassian.com/platform/forge/monitor-usage-metrics/  
Official billing source: https://developer.atlassian.com/platform/forge/developer-space/billing-for-developer-spaces/

## 4. Hard unresolved Commerce API gate

The Resource Usage guide points to Commerce public APIs using Forge App Hosting offering ID `59f614dc-f9d0-4fad-924d-bb9d707d33ab` for cost-based insights:
https://developer.atlassian.com/platform/forge/developer-space/export-app-resource-usage/

But the Commerce REST documentation explicitly says the invoice-list endpoint is not accessible to Forge and OAuth2 apps:
https://developer.atlassian.com/platform/commerce/rest/api-group-invoices/

The Commerce APIs also use their own generated access-token model:
https://developer.atlassian.com/platform/commerce/rest/

**Unresolved question:** can an external local/self-hosted tool, authenticated under the Developer Space owner's explicit authority (not as a Forge app or OAuth2 app), obtain the billing account's finalized invoice and per-app line-item records? If not, the product can only estimate usage-based cost and cannot claim invoice reconciliation. Do not try to bypass the restriction or use private endpoints.

## 5. Product and security implications

A defensible architecture, if all further gates pass, must:
- maintain per-app/per-meter/per-site/per-environment usage ledgers;
- roll up all apps to their Developer Space and transaction account;
- preserve the official free allowance and price schedule version used for every estimate;
- treat late usage events and pricing changes as corrections, not silently overwrite history;
- distinguish forecasts, estimated overage, invoiced amounts and actually paid invoices;
- identify when an app is transferred between Developer Spaces or changes transaction-account association;
- run under the Developer Space owner's local/self-hosted process;
- store credentials locally only and never upload them to ChatGPT or GitHub;
- emit delayed, clearly labelled external alerts; no hard billing stop or real-time guarantee;
- avoid customer issue data, end-user personal data and external LLM processing.

## 6. Updated decision

The problem still has vendor pain signals, but the billing aggregation/API mismatch makes the product more demanding than a simple “cost dashboard”. The external owner-token / Commerce invoice route is not proved. Data is daily, not real time. No India Marketplace partner eligibility or allowed distribution/payment route is established.

**Status remains HOLD_FOR_EVIDENCE; no build.** The preliminary 65/100 score is not raised. The next evidence gate is a written Atlassian answer or reproducible documentation confirming owner-operated external-tool access to Developer Space Commerce invoices and line items, followed by a no-credential API contract proof. Do not request or create an API token during this research phase.

## 7. Exact next action

Continue P55-001:
1. Verify whether per-app free allowances, total Developer Space free threshold, and Developer Space invoice roll-up can be modelled without double-counting.
2. Clarify whether the owner's external local tool may query Commerce invoice and pricing data, and the precise identity/token requirements.
3. Calculate request count and refresh latency for a hypothetical Developer Space with multiple apps, resources, contexts and environments.
4. Obtain current written answer about configurable USD budget and alert policy.
5. Continue direct/adjacent substitute audit and buyer willingness-to-pay validation.
6. Verify India partner enrollment/EFT eligibility and allowed distribution path.

**Resume token:** `PHASE_55 / P55-001 / FORGE DEVSPACE COST GUARD = HOLD_FOR_EVIDENCE`.


## 8. Additional enforcement exposure — all apps share Developer Space billing state

The Developer Space Billing and Payments page (last updated 25-Aug-2026) adds an operational risk that a single-app cost dashboard would miss:
- The transaction account is linked to the Developer Space, and all apps contribute to the same monthly bill.
- If usage exceeds the free allowance and there is no valid payment method, invoice generation/payment can fail and a **14-day pre-dunning period** begins, with notifications and up to five retry attempts.
- If unresolved after pre-dunning, enforcement applies to **all apps in that Developer Space**, not merely the app that generated the charges, because the apps share one invoice (co-invoicing).
- If a payment method exists but payment fails, a separate **21-day dunning period** applies, with up to five retries.
- Billing admins can inspect subscriptions, usage, invoices and payment status in the Billing Console. The public API path for an external tool to read these records remains unverified.

Official source: https://developer.atlassian.com/platform/forge/developer-space/billing-for-developer-spaces/

**Product implication:** the potential value is not only developer cost forecasting. There may be a broader Developer Space billing-continuity risk: an unresolved billing issue can affect every app inside the space. However, the candidate must not claim it can prevent Atlassian enforcement or suspend only one app. It can only send a timely warning if the required billing-state data is exposed through a supported authorized interface. That interface is not yet verified.
