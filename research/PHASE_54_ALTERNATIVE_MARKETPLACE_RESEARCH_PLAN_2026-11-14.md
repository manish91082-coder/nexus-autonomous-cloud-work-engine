# Phase 54 — Alternative App Marketplace Research Plan
**Date:** 14 November 2026  
**Authority:** `MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md`  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Current task:** `P54-001` — compare alternative app marketplaces with zero-upfront entry and native recurring monetization.  
**Status:** IN PROGRESS — platform screening only; no product selected  
**Spend:** ₹0 authorised

## 1. Why Phase 54 exists

Phase 53 completed with NO-GO for its current WordPress, Google Workspace, HubSpot, Slack, Salesforce and Chrome product hypotheses. The conclusion was not that every platform is permanently unusable; it was that no specific candidate cleared V4's independent-demand, differentiation, recurring-value, rights, zero-cost and net-economics gates.

Phase 54 broadens distribution research to app marketplaces not yet exhausted in the mission:
1. Zoho Marketplace
2. Wix App Market
3. monday.com Marketplace
4. BigCommerce App Marketplace
5. Xero App Store
6. Intuit QuickBooks app ecosystem (India availability gate first)

This is a research order based on apparent entry friction and platform-managed monetisation. It is not a product GO or revenue forecast.

## 2. Initial platform screen

### A. Zoho Marketplace — first research priority

Positive verified signals:
- Zoho says Marketplace extensions can be listed at no cost, and the Developer Console is free for building and selling extensions.
- Public extensions can use Zoho checkout; developer-set prices may be one-time or monthly recurring. Private distribution and free extensions are also supported.
- Zoho's Marketplace commission report explicitly says that, for extension developers, the **total value paid by customers equals the commission reported for extension developers**. This is gross commission evidence, not net cash after remittance fees, FX, taxes, refunds or reversals.
- A monthly commission statement is sent when the outstanding amount exceeds USD 100. The developer must approve processing; a wire transfer may take about 15 working days after approval. PayPal can be requested by email.
- Official FAQ says review normally takes two business days; publishing guidance says 24–48 hours.
- Zoho advertises 60M ecosystem users. This is vendor-reported reach, not verified Marketplace buyer traffic, category installs or sales.

Hard unknowns:
- **India-based extension developer payout eligibility is not explicitly confirmed** by public extension payout guidance. The bank-details/wire-transfer process does not specify eligible countries, INR conversion, intermediary bank fees, FX spread, tax withholding or India documentation.
- Do not confuse the separate Zoho Reseller Store India commission threshold of INR 50,000 with Marketplace extension developer payouts. The INR 50,000 rule is for the reseller programme; Marketplace extension docs state the USD 100 threshold.
- Buyer discovery/search ranking for the exact category and product-specific paid demand remain unproven.
- Exact app edition compatibility and full review requirements must be checked for any eventual product.

Official sources:
- https://www.zoho.com/marketplace/faq.html
- https://www.zoho.com/developer/help/marketplace/payments.html
- https://www.zoho.com/developer/help/marketplace/faq.html
- https://www.zoho.com/developer/help/marketplace/listing-marketplace.html
- https://www.zoho.com/developer/help/marketplace/

Decision: **RESEARCH FIRST, NOT GO.** Best apparent fit for zero-fee entry and platform-handled payment, but unknown commission and India payout must be verified before product economics.

### Specific Zoho CRM candidate under evaluation — HOLD

**Hypothesis:** a read-only *Field Retirement Impact Preflight* that maps a custom field to references found in workflows, blueprints, field-update actions, webhooks, layouts and supported custom-function source code before an administrator renames or retires it.

Why this is not a generic CRM-cleanup clone:
- Zoho Admin Tools already filters and deletes selected stale configurations. The proposed gap is a reference/dependency map, not another last-used dashboard or delete screen.
- Zoho's free Configuration Logs Tracker records setup changes; it does not document a field-reference graph.
- The free Configs for Zoho CRM extension exports standard-layout field configuration to CSV; it excludes other layouts and unused fields and does not map dependencies.
- Adjacent free tools include Audit Tool for Zoho CRM (100+ installs; incomplete-record audit) and Data Guardian (data-health scoring/validation). A targeted Marketplace 'CRM governance' tag search surfaced only Configuration Logs Tracker (free, 0 visible ratings), but this is not a full catalog census.
- A Zoho community request dated 21-Oct-2026 explicitly proposes a field usage tab and dependency graph because renaming/deleting fields can break functions, workflows, blueprints, client scripts, Flow, Analytics and PDF templates. Independent CRM discussions describe similar hidden-dependency risk. These are problem signals, not evidence that customers will pay.
- Documented read-only APIs expose modules/fields/layouts, workflows and their conditions/actions, blueprints, mapped field dependencies, webhooks, functions/function source, custom views and field-update associations. This makes a **bounded** scanner plausible, but not universal.
- The scanner must mark unsupported/unscanned surfaces (for example any Client Script, Flow, Analytics report, external integration or template reference not proven accessible). Static code scans may miss dynamic field-name construction. No "all dependencies found" or "safe to delete" guarantee.

Detailed report: `research/PHASE_54_ZOHO_CRM_CONFIGURATION_DEPENDENCY_AUDIT_2026-11-14.md`.

Competitor audit expanded (14-Nov): 22 named native/direct/adjacent references: 13 Zoho-native/Marketplace features and 9 Salesforce cross-CRM analogues. The Salesforce analogues demonstrate category maturity and commercial alternatives, not Zoho buyer demand. Elements.cloud lists $6,800/year at 100 Salesforce users; Jetstream Professional $25/month; SchemaForce Pro $149/month and Business $399/month; FieldRat is free. A Zoho CRM governance tag search found only one free extension but is not exhaustive. Zoho Functions full access: Enterprise/CRM Plus/Ultimate/Zoho One; Standard/Professional only through Extensions. Function READ scopes exist but source is sensitive. API concurrency 5–25 by edition is not daily quota.

Edition-specific technical screen:
- Free: Workflows are available with limited actions; Blueprint is not listed; full Functions entitlement is not documented.
- Standard: Workflows available; Blueprint unavailable; Functions only through Extensions.
- Professional: Workflows and Blueprint available; Functions only through Extensions.
- Enterprise/Ultimate: Workflows, Blueprint and full Functions access.
- Zoho One/CRM Plus: full Functions access is documented, but verify the actual CRM org entitlements.
Use `/__features` and `/__apis` for each tenant. API concurrency (5,10,15,20,25 by edition) is not a daily request quota. Every missing component must be labelled NOT SCANNED, never “no dependency.” Source code must be opt-in and not sent to external LLMs by default. See the full edition matrix in `research/PHASE_54_ZOHO_CRM_CONFIGURATION_DEPENDENCY_AUDIT_2026-11-14.md`.

Additional Zoho Marketplace adjacent tools: Workflow Studio (cross-module field updates), Logs for Zoho CRM (free runtime logs), Multi-Blueprint (free), Module and Field Clone (free, 300+ installs), and Google Sheets Magic Lookup (200+ installs). None is a documented full field-dependency graph. Zoho CRM Extension FAQ says payment monthly if ≥USD100 generated; private install URLs are Enterprise+ only; overall Marketplace approval FAQ says 2–3 weeks while older extension FAQ says 48h, so budget longer. Public payout docs still do not confirm India seller bank eligibility, FX or tax treatment.

Zoho says Marketplace has 900+ CRM extensions and 2,000+ total extensions. The 22 named references are a targeted substitute scan, not an exhaustive catalogue census. Field retirement may be infrequent; a subscription requires evidence of repeat scans/schema changes or recurring governance work. No cadence or willingness-to-pay is established.

**Disposition: HOLD — no MVP or account setup.** Problem evidence exists, but paid purchase volume, recurring budget, verified India seller payout and complete technical coverage remain unproven. The next P54-001 work is a targeted 10–15 direct/substitute audit and stricter payout/permission verification.

### B. Wix App Market — second research priority

Positive verified signals:
- Supports recurring subscription pricing, usage-based pricing or a combination.
- Wix handles checkout and marketplace payments.
- New apps receive 100% of revenue share for the first 12 months; afterward the developer receives 80%, calculated after a 2.5% transaction fee and applicable sales tax.
- Payout threshold is USD 200. Wix says March app revenue is paid at the beginning of May, so effective payout is later than simply "net 30 from month-end".
- Primary app prices are set in USD and payout reporting is shown in USD; regional pricing can vary.

Hard unknowns:
- India-specific App Market developer onboarding and bank payout eligibility are not explicitly confirmed in the public App Market developer docs. Do not treat Wix Payments merchant availability for Indian website owners, or a separate Wix Studio Partner country-exclusion note, as definitive proof of India App Market developer payout eligibility.
- Exact app acceptance/product review requirements for the target category.
- Competitor concentration and real buyer purchase signals in the chosen niche.
- Actual tax, FX, bank fees and payout treatment for an India-based app publisher.

Official sources:
- https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/about-monetizing-your-app
- https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/payments-and-billing-faqs

Decision: **RESEARCH SECOND, NOT GO.** Revenue share and subscription rails are promising, but India seller/payout eligibility and specific product demand remain unverified.

Wix App Market clarification from the current developer FAQ and July-2026 payout-account changes:
- Every individual app must independently reach the USD 200 payout threshold; earnings across multiple apps do not combine toward one app's threshold.
- Payout account setup is required at account level before publishing a paid app. A one-time Tipalti setup is used; payout and materialized invoice APIs show USD amounts and statuses.
- The payment schedule is monthly, but the FAQ example says March earnings arrive at the beginning of May. This is later than simply "net 30 EOM".
- After first 12 months, developer share is 80% after the 2.5% transaction fee and applicable sales tax; first-year share is 100% under current terms.
- Public App Market documentation still does not explicitly confirm India-based developer payout eligibility through Tipalti. Wix Payments merchant gateway availability in India is a different product and cannot be used as proof.
- An individual app that cannot reach $200 may keep accruing but will not be paid; sibling apps do not top up the threshold.

Official sources:
https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/payments-and-billing-faqs
https://support.wix.com/en/article/developer-request-calculating-payout-threshold-per-partner
https://dev.wix.com/changelog?featureType=Build+Apps
https://dev.wix.com/docs/api-reference/account-level/studio-workspace/earnings/introduction


### C. monday.com Marketplace — third

Verified signals:
- Apps must go through a product, engineering, security, privacy, legal, support and listing review.
- New marketplace apps must be monetised through monday.com's native app monetisation process.
- monday's revenue-sharing program activates after USD 200,000 in lifetime accumulated revenue; thereafter the documented split is 85% developer / 15% monday.com.
- Apps must contain real code in the Developer Center. Primarily no-code or AI-generated “vibe code” apps are not eligible for marketplace approval.
- monday specifically warns that multi-tool automation apps, Microsoft integrations and Google integrations are saturated as of Q1 2026.

Official sources:
- https://developer.monday.com/apps/docs/submit-your-app
- https://developer.monday.com/apps/docs/subscriptions-payments-and-billing
- https://developer.monday.com/apps/docs/documentation-and-support
- https://developer.monday.com/apps/docs/product

Unknowns: pre-$200K commercial treatment for a specific plan, India payout eligibility, competitor purchase evidence and product-specific buyer demand.

Decision: **RESEARCH THIRD, NOT GO.**

### D. BigCommerce App Marketplace — fourth

Verified entry requirements:
- Active Technology Partner account and Partner ID.
- Accepted Technology Partner Agreement.
- Billing/Financial role on the partner account.
- Marketplace team approval against technical, security, support and listing standards.

Official sources:
- https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/approval-requirements
- https://docs.bigcommerce.com/developer/docs/integrations/apps/guide/publishing-apps

Unknowns:
- India eligibility and partner account cost.
- App billing/settlement mechanism and commission.
- Market size for the exact buyer niche and competing paid apps.
- Two independent demand signals.

Decision: **HOLD FOR TERMS AND DEMAND.** Do not assume the partner route is free or that marketplace approval creates customers.

### E. Xero App Store — fifth

Verified entry constraints:
- Xero's current partner model uses tier-based developer pricing, replacing the prior revenue-share/commercial-billing model.
- Xero's current developer platform says an app partner needs ten customers for certification.
- An App Store listing is required for Xero Enterprise tier; optional/recommended for Plus and Advanced, and not available for Starter/Core tiers.
- Premium Journals, Xero Practice Manager and Bulk Connections require an initial and annual security assessment and use-case approval.
- Xero advertises access to 4M+ small business customers and 200K+ accountants/bookkeepers; this is platform reach, not proof of product-specific demand.

Official sources:
- https://developer.xero.com/pricing
- https://developer.xero.com/faq
- https://developer.xero.com/documentation/xero-app-store/app-partner-guides/building-and-growing-your-app/
- https://developer.xero.com/

Decision: **DEFER.** Ten real customers are required before certification and tier/usage costs need detailed modelling. A pre-existing customer acquisition path is not yet evidenced.

### F. Intuit QuickBooks App Partner Program — sixth / eligibility gate

Verified facts:
- Intuit's App Partner Program FAQ was updated 29 October 2026.
- The program launched in the United States in July 2025 and expanded to the United Kingdom, Australia and Canada (excluding Quebec) in November 2025.
- Intuit says geographic availability varies and partner tiers can involve platform service fees.

Official source:
- https://static.developer.intuit.com/output_html/qbo/docs/get-started/partner-faq.html

Decision: **HOLD — INDIA ELIGIBILITY UNVERIFIED.** Do not create accounts or design an app against an unconfirmed seller/API path.

## 3. Preliminary platform ranking

| Priority | Marketplace | Why it ranks here | Key blocker |
|---|---|---|---|
| 1 | Zoho Marketplace | No development fee stated; native checkout; monthly payout documented | Commission and India seller/payout details |
| 2 | Wix App Market | Recurring/usage pricing, platform checkout, 100% first-year then 80% revenue share | India payout eligibility and product demand |
| 3 | monday.com | Native monetisation and broad customer ecosystem | Code/review/support requirements; verify seller economics |
| 4 | BigCommerce | Mature commerce app distribution | Partner costs, seller economics and demand unknown |
| 5 | Xero | Large accounting customer base and certified app ecosystem | Ten-customer certification; tier pricing/security |
| 6 | Intuit QuickBooks | Large accounting ecosystem | India program availability not evidenced |

This ranking is about research priority and entry feasibility, not total addressable revenue or expected earnings.

## 4. Required P54-001 execution

1. Verify official India-based developer eligibility, account requirements, payout rails, thresholds, commission, taxes/FX/holds and all compulsory fees for Zoho and Wix first.
2. Select concrete marketplace categories only after reading current listings and buyer discussions.
3. Audit at least 10–15 direct competitors for every shortlisted problem; record price, rating/reviews, installs where visible, update cadence, feature coverage and limitations.
4. Collect at least two independent strong demand signals from different sources. Paid competitor activity is a substitute signal, not proof that our proposed gap will sell.
5. Identify the precise buyer, job-to-be-done and measurable result; check whether native platform features and free incumbents already solve it.
6. Calculate net unit economics from the actual commission and payout terms. Distinguish vendor-reported customer counts from addressable buyers.
7. Select one candidate only if all V4 gates pass. Otherwise record NO-GO and continue to the next platform.

## 5. Queue and gates

- P54-001: marketplace and candidate research — IN PROGRESS.
- P54-002: one private product MVP — BLOCKED until P54-001 GO.
- P54-003: deterministic QA, rights, privacy, security and net-economics — BLOCKED.
- P54-004: owner-approved seller onboarding and public release — OWNER GATE.
- P54-005: verify independent paid transactions and platform/provider-credited net earnings — BLOCKED.

One active build at a time; no build is open in Phase 54.

## 6. Mission and financial truth

- Mission goal: ₹10,00,00,000 verified net earnings.
- Platform/provider-credited net earnings: ₹0.
- Bank-settled net receipts: ₹0.
- Revenue ledger entries: 0.
- Authorised new spend: ₹0.
- No platform account created, no KYC submitted, no terms accepted, no public release, no paid subscription and no new marketplace build authorised by this plan.


## 7. Follow-up gate — seller remittance and API credits (14-Nov-2026)

Detailed addendum: `research/PHASE_54_PAYOUT_AND_API_CREDIT_GATE_2026-11-14.md`.

### Zoho Marketplace extension sellers
- The extension-specific commission report says total value paid by customers equals gross commission due to the extension developer. The detailed payment page sends a monthly statement only when outstanding commission is **more than USD 100**; FAQ says payment occurs once accrued sales reach **at least USD 100**. Use >USD 100 conservatively due to the boundary discrepancy.
- Developer must approve processing. Wire transfer takes about 15 working days after approval; PayPal can be requested.
- Public extension payout docs do not list supported developer countries or India remittance details. Separate Partner Store material identifies a Zoho India billing entity/INR invoices and PAN for India-based partners, but it does not explicitly say those details apply to CRM Marketplace extension developers. The separate reseller ₹50,000 threshold is not the extension threshold.
- **India extension seller status remains UNVERIFIED.** No account/KYC/terms action.

### Zoho CRM V8 API budget correction
The API documentation now explicitly lists 24-hour rolling credit limits, distinct from edition concurrency:
- Free: 5,000.
- Standard/Starter: 50,000 + 250 per user licence, capped at 100,000.
- Professional: 50,000 + 500 per user licence, capped at 3,000,000.
- Enterprise/Zoho One: 50,000 + 1,000 per user licence, capped at 5,000,000.
- Ultimate/CRM Plus: 50,000 + 2,000 per user licence, no fixed maximum in the table.
- Concurrency remains 5/10/15/20/25 by edition, plus sub-concurrency controls.
- `/__apis` costs 1 credit and returns endpoint method, OAuth scope and min/max credit cost. `/__features` uses `ZohoCRM.features.READ`; its request credit cost is not explicitly published in the docs reviewed.
- Add-on credits are paid monthly; a zero-spend scan must never trigger these automatically. Any limit risk must stop the scan.

### Wix App Market paid-app payouts
- Paid app publication requires Wix Partner onboarding plus a Tipalti account; account setup is required before paid-app publication.
- $200 threshold applies **per individual app**, with no aggregation across apps. March revenue is paid at the beginning of May.
- Year one: 100% of app revenue after 2.5% transaction fee and applicable tax. Thereafter: 80% of the amount after those deductions.
- Tipalti's country table shows India local INR bank-transfer coverage and USD wire/PayPal options, but footnote says payments to India are not available for India-based payer entities. Wix's public developer docs do not identify the payer entity used for an India-based App Market developer.
- **India Wix payout remains conditional/unverified** until the actual Wix payer entity and India payee onboarding are confirmed.

No product selected; Zoho candidate remains HOLD. Platform payout ability does not establish buyer demand or recurring economics.
