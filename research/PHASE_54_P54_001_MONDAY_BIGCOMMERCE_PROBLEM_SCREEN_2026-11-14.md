# Phase 54 — P54-001 Marketplace Buyer-Problem Screen: monday Failure Monitoring and BigCommerce Catalog Operations
**Captured:** 14 November 2026  
**Authority:** `MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md`  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Branch:** `master`  
**Task:** `P54-001` — buyer-problem discovery and product-gap adjudication  
**Status:** RESEARCH ONLY — no product selected  
**Authorised spend:** INR 0  
**Build / account / KYC / terms / publication:** none

## 1. Executive disposition

This screen tested four specific problems raised by the Phase 54 continuation:

| Candidate | Disposition | Controlling reason |
|---|---|---|
| monday.com Automation Failure Monitor | **REJECTED — current scope** | The user problem is real, but the stable API does not expose board-automation listing/management. Run History is a UI feature limited to 10 days; the newer automation tooling is preview/platform-MCP rather than a stable supported Marketplace-app data source. |
| BigCommerce webhook-delivery failure monitor | **REJECTED — generic scope** | BigCommerce already retries webhook delivery for up to roughly 48 hours, emits `store/hook/deliveryException` events and emails the registered notification address after exhausted delivery attempts/deactivation. |
| BigCommerce customer-spend tier auto-assignment | **REJECTED — exact incumbent** | Atom8 Automation already supports customer total-spend conditions followed by automatic assignment to a customer group. Its Marketplace listing is paid and shows 25 reviews in the current listing capture. |
| BigCommerce pooled category quantity tiers with SKU-specific fixed prices | **HOLD — not shortlisted** | A concrete merchant use case exists, but native category promotions and paid pricing/bundle apps overlap parts of the workflow. Direct gap, recurring buying cadence and India seller eligibility are not established. |
| BigCommerce variant-price import preflight / reconciliation | **HOLD — validation candidate only** | Two independent merchant problem reports describe variant-price import failures; however native modern CSV import, preview/error summary, and several import, field, pricing and rollback apps already cover adjacent workflows. A 10–15 direct/adjacent audit and India payout confirmation remain outstanding. |

No candidate clears the V4 hard gates. No MVP or proof-of-concept is authorised.

## 2. monday.com — Automation Failure Monitor

### Demand evidence
1. A monday.com feature request asks that automation-failure alerts reach board owners or a monitored email inbox, rather than only the automation owner's notification bell:
   https://community.monday.com/feature-requests/post/expanded-notifications-for-automation-failures-wyoub7zBMECRRH2
2. A separate monday.com user discussion describes a disconnected integration silently disabling automations:
   https://community.monday.com/ask-the-com/post/automations-are-not-working-after-disconnected-integration
3. monday's own support material documents scenarios in which automations can be deactivated and describes the existing Run History troubleshooting path:
   https://support.monday.com/hc/en-us/articles/360017254600-Automation-Run-history
   https://support.monday.com/hc/en-us/articles/7539673667218-Avoid-failed-automation-runs-due-to-multiple-competing-automations

These are credible problem signals. They do not yet establish a paid independent product gap.

### Native substitutes and technical hard gate
- Run History shows whether a run was successful, unsuccessful or in progress, and lets a user inspect failure details. It retains only the past **10 days** of data. It is documented as a board UI workflow, not a Marketplace app API.
- The official API coverage page says the stable API does not expose mutations to create, delete, update or list board automations; automations are managed through the monday UI:
  https://developer.monday.com/api-reference/docs/coverage-gaps
- The newer platform automation tooling is described separately as a development-preview / Platform MCP route. It is not evidence that a normal marketplace app has a stable, production-supported endpoint to enumerate all automations and failed runs. Some legacy automations may not appear through preview surfaces.
- The official error-handling SDK is for developers reporting errors from their own integration/automation action. It does not provide a general observer API for every third-party automation already configured in a customer's account:
  https://developer.monday.com/apps/docs/error-handling
- The official troubleshooting guide asks users to provide trigger IDs and timestamps so monday support can inspect its own logs; that is not a public monitoring API:
  https://support.monday.com/hc/en-us/articles/5320998647954-Troubleshooting-reporting-issues

### Decision
**REJECTED for the current proposed marketplace product.** The job-to-be-done is meaningful, but without a stable, permitted API for automation definitions and run-level failure events, a reliable cross-board monitor cannot be promised. UI scraping, private endpoints or an unstable preview surface are not acceptable foundations. Reopen only if monday releases supported stable list/run-history APIs with clear app permissions and retention.

## 3. BigCommerce — webhook-delivery failure monitor

BigCommerce's native webhook behavior materially covers the generic proposal:
- Webhooks require successful 2xx delivery and use a documented retry/backoff schedule extending to approximately 48 hours.
- The `store/hook/deliveryException` event reports delivery failures, exhausted retries/disabled hooks and blocked domains.
- After exhausted delivery attempts, the webhook can be disabled and the registered notification email is alerted. API-account configuration supports notification email addresses.

Official documentation:
- https://docs.bigcommerce.com/developer/docs/integrations/webhooks
- https://docs.bigcommerce.com/developer/docs/integrations/webhooks/events
- https://docs.bigcommerce.com/developer/docs/integrations/webhooks/overview

**Decision: REJECTED for a generic failure monitor.** A possible future product would need a clearly different operational outcome (for example cross-provider incident correlation or verified customer-impact reconciliation), but no such demand evidence or gap is established here.

## 4. BigCommerce — automated customer-spend tier assignment

### Use case and incumbent
A BigCommerce merchant implementation guide describes manually maintained YTD-spend tiers and a nightly process that calculates customer spend and assigns customer groups. It reports that the prior manual wholesale quoting/order workflow took 30–45 minutes per order and that automated segmentation reduced time. This is a merchant-authored case example, not an independent audited performance study:
https://cdn11.bigcommerce.com/s-m56ojccku0/content/bigcommerce-b2b-pricing-setup.html

The exact automation is already documented by **Atom8 Automation by GritGlobal**:
- Trigger: a new order is placed.
- Condition: customer total spending is greater than or equal to USD 1,000.
- Action: assign customer to group Gold.
- The vendor also publishes tiered spending examples and customer segmentation workflows.

Sources:
- https://gritglobal.io/blog/customer-group-in-bigcommerce/
- https://www.bigcommerce.com/apps/atom8-automation/

The current BigCommerce Marketplace listing capture shows Atom8 as a paid product with 25 reviews; listing metrics are marketplace engagement indicators, not independently verified revenue.

### Decision
**REJECTED — exact incumbent already solves the core job.** Do not build a spend-threshold-to-customer-group clone. Native BigCommerce customer groups and APIs provide the underlying primitives, but Atom8 already supplies the automation layer. A genuinely new margin-aware, refund-net, multi-company or cohort-governance outcome would need separate demand proof before reconsideration.

## 5. BigCommerce — pooled category quantity tiers with SKU-specific fixed prices

### Problem signal
A March 2026 merchant request asks for a quantity threshold counted across all items in a selected category while applying a different fixed unit price to each SKU. The post gives an example where product A's unit price falls to USD 5 at a combined quantity of five and product B's becomes USD 6:
https://www.reddit.com/r/bigcommerce/comments/1rkhfr2/bigcommerce_category_wide_quantity_tier_pricing/

A separate older Stack Overflow discussion asks for quantities across products/variants to be counted together for bulk discounts:
https://stackoverflow.com/questions/71038714/bigcommerce-bulk-pricing-for-products-across-categories

### Native and app substitutes
- BigCommerce automatic promotions can apply category-based quantity thresholds and fixed/percentage discounts:
  https://support.bigcommerce.com/s/article/Automatic-Promotions
  https://docs.bigcommerce.com/developer/docs/admin/marketing/promotions/overview
- Native product bulk pricing is generally scoped to a product and its variants; native Price Lists can hold variant-specific price records but do not by themselves prove an aggregate category counter with a separate SKU-specific tier schedule.
- PricePilot supports bulk tiered pricing, scheduled sales, CSV import/export and one-click undo:
  https://www.bigcommerce.com/apps/pricepilot/
- Flowsplus Bundle Builder supports mix-and-match bundles and quantity tiers:
  https://www.bigcommerce.com/apps/bundle-builder-by-flowsplus/
- The adjacent marketplace contains other quantity/pricing utilities (for example Sale/Discount Scheduler & Bulk Price Editor, Pricewave, product-discount apps and B2B pricing tools).

### Decision
**HOLD — not shortlisted.** The workflow is specific, but the exact native-promotion boundary and app-level substitutes need a deeper direct audit. The two demand signals are separated in time and do not establish current recurring paid intent. Do not build a generic bulk-discount app or bundle clone.

## 6. BigCommerce — variant-price import preflight / reconciliation

### Two independent merchant problem signals
1. A BigCommerce customer post dated 13 August 2026 describes variant sale prices not importing as intended where size/colour SKUs require different sale prices; the merchant had to correct prices manually:
   https://support.bigcommerce.com/s/question/0D5UG000010EQGl0AO/product-csv-file-not-uploading-sale-prices-against-products-with-different-skus-why-is-this-happening
2. A separate, newer BigCommerce customer post asks why edited existing variant rows still inherit the product default price after a Modern Product Import/Export run. A partner response points to possible field-mapping omission, altered Item/Variant IDs (including spreadsheet scientific notation), or malformed price text:
   https://support.bigcommerce.com/s/question/0D5UG000012l9hk0AA/why-are-my-variant-prices-being-overridden-by-the-product-default-price

These are distinct customer reports. They establish a real import-integrity failure mode, not customer willingness to pay.

### Native capability and limitations
- Modern Product Import/Export supports variant-level attributes and separate Price / Sale Price fields on variant rows. It previews the first product and provides an import summary and error list:
  https://support.bigcommerce.com/s/article/Modern-Import-Export-Overview?language=en_US
  https://support.bigcommerce.com/s/article/Importing-Complex-Attributes?language=en_US
- Existing variant updates depend on correct IDs, Item types and exact field mapping; the legacy importer has additional variant sale-price restrictions:
  https://support.bigcommerce.com/s/article/Updating-via-Import?language=en_US
- BigCommerce recommends exporting a backup before major edits. Its modern preview is not a full semantic before/after reconciliation of every variant's expected price:
  https://support.bigcommerce.com/s/article/Exporting-Your-Products?language=en_US
- Excel scientific notation, blank/invalid field values, parent-price inheritance and SKU/ID mismatches are plausible preflight checks, but must be proven with a test corpus before claiming full prevention.

### Bounded competitor/substitute screen
| Product / substitute | Observed overlap |
|---|---|
| BigCommerce Modern Product Import/Export | Native first-product preview, error summary, variant-row price fields |
| BigCommerce legacy CSV importer | Export/import and bulk edits, but documented variant-level limitations |
| Firebear Import & Export Tool | CSV/XML/XLSX/Google Sheets, field mapping, scheduled profiles, FTP/Google Drive |
| Alterify Inventory Sync | CSV/URL/FTP, SKU/barcode mapping, scheduled inventory and price sync |
| Bulk Product Editor | Bulk edit stock, visibility and four price fields; USD 50/month listing |
| PricePilot | Bulk price rules, CSV, snapshots and one-click undo; about USD 19.99/month |
| Custom Field Populator | Custom-field CSV import/export, rules, schedules and activity history; USD 10/month |
| Inline Metafields | Metafield CSV import/export with dry-run for its field domain |
| Inskeep Inventory Intelligence | Products/variants/orders workspace, controlled inventory and price sync; USD 399/month |
| BigCommerce Catalog API | Variant price update path; custom implementation is a substitute |
| BigCommerce product export/backup | Native catalogue export for backup and rollback |
| BigCommerce bulk editor | Native in-control-panel editing for selected product attributes |

This is a **bounded 12-reference landscape screen**, not a completed 10–15 direct-competitor audit: several items are platform primitives or adjacent data tools rather than direct preflight competitors. Do not claim the selected problem has no competitors.

### Decision
**HOLD — validation candidate only.** The specific job could be a read-only, offline-first CSV/variant consistency preflight plus post-import reconciliation report, but no app design or build is approved. Required next tests:
1. Obtain a larger sample of independent current merchant incidents and evidence of repeat frequency.
2. Complete a 10–15 direct/adjacent product audit with verified current prices, features, reviews, update dates and gaps.
3. Prove exactly which import defects a local deterministic validator can detect without BigCommerce credentials.
4. Confirm whether API read-only reconciliation can be done with permitted scopes and zero paid usage; no write/import action in the first version.
5. Verify India-based Technology Partner approval and payout conditions before any product-specific economics or launch decision.
6. Establish recurring value (supplier catalog cadence, weekly price updates, repeated variant assortment changes) rather than assume a one-time tool warrants a monthly subscription.

No pricing, revenue forecast or ROI is assigned.

## 7. Marketplace and payout gate

BigCommerce's existing platform-level payout record remains unchanged:
- India Technology Partner eligibility and India payout route are **unconfirmed**.
- Public Automated Billing terms describe 15% revenue share plus 3% processing fee, payout-method charges and possible reserves; minimum remittance and exact payment date were not established in the reviewed public appendix.
- No new account, PayPal/Tipalti/Payoneer connection or partner application was created.

The platform-level comparison remains in:
`research/PHASE_54_P54_001_MARKETPLACE_PAYOUT_COMPARISON_2026-11-14.md`.

## 8. Final P54-001 disposition from this batch

- monday.com automation failure monitor: **REJECTED for current scope** (stable API hard gate).
- BigCommerce generic webhook failure monitor: **REJECTED** (native retries, exceptions and notifications).
- BigCommerce customer-spend group auto-assignment: **REJECTED** (Atom8 exact incumbent).
- BigCommerce pooled category tiers: **HOLD / not shortlisted**.
- BigCommerce variant-price import preflight: **HOLD / validation candidate only**.
- No product selected; P54-001 remains IN PROGRESS.
- P54-002 remains BLOCKED.
- Verified platform-credited net earnings remain INR 0; bank-settled net receipts remain INR 0; authorised spend remains INR 0.

## 9. Exact next work

1. Complete the 10–15 competitor audit and frequency/demand test only for the BigCommerce variant-price import preflight candidate. Stop if native importer + existing tools cover it or seller payout fails.
2. In parallel, keep monday.com and BigCommerce product ideas closed as recorded; do not repeat the rejected ideas.
3. Re-verify India payout evidence for Zoho, Wix, monday.com and BigCommerce through public official materials; prepare precise owner support questions but do not send them or create accounts.
4. Finish the Phase 54 comparison by retaining Xero as India native subscription HOLD and Intuit as rejected under current published geography.
5. Select no product until V4's independent demand, differentiation, India payout, rights, security, recurring-value and zero-spend gates all pass.

**Resume instruction:** fetch actual `master` HEAD first; continue at `PHASE_54 / P54-001`. No build, account, KYC, terms, publication or spend.
