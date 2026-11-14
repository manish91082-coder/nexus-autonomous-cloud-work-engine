# Phase 54 — P54-001 continuation evidence memo
**Observed:** 14 November 2026  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Branch:** `master`  
**Authority:** `MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md`  
**Task:** `P54-001` — alternative app marketplaces, seller remittance, recurring buyer problem, competitor and net-economics validation  
**Disposition:** IN PROGRESS / RESEARCH ONLY  
**Spend authorised:** ₹0  
**Product selected:** NONE

## 1. Scope and audit method

This is a dated addendum to the existing Phase 54 plan. It does not replace the prior Zoho or Wix research, reopen NO-GO decisions from Phases 46–53, or authorise an account, KYC, contractual acceptance, release, paid API credits, cloud spend or product build. Only public documentation, publicly visible marketplace listings and public community evidence were checked. No seller account or private payout console was accessed.

## 2. Zoho Marketplace — seller remittance gate remains unresolved

### Publicly documented facts
- Zoho Developer FAQ says Marketplace extensions can be listed at no cost, the Developer Console is free, and public Marketplace purchases are processed through Zoho. It says the developer is paid monthly when sales reach **at least USD 100**; unpaid balance rolls forward.
- Zoho's detailed payment guide says the monthly statement is sent only when outstanding commission is **more than USD 100**. The developer must explicitly approve processing. A wire transfer takes about 15 working days after approval. PayPal can be requested by email.
- Zoho says the extension developer's total customer transaction value equals the commission due in its commission report. This is a gross reported amount and is not evidence of post-FX, receiving-bank, tax, refund or chargeback net cash.
- Marketplace pricing guidance expressly allows one-time or monthly recurring charges, priced in USD.
- The public Marketplace extension payout documents reviewed do not identify a country eligibility list, Indian bank settlement details, INR conversion, intermediary-bank charges, FX spread or India withholding treatment. General Zoho partner/reseller documents are not proof of extension-specific remittance eligibility. The reseller programme's INR 50,000 rule must not be applied to Marketplace extension payouts.

### Conservative treatment
The official FAQ and detailed payout guide differ at exactly USD 100 (at least USD 100 versus more than USD 100). Until clarified, model the payout trigger as **strictly greater than USD 100**, not exactly USD 100. India-based Marketplace extension seller eligibility remains **UNVERIFIED**. A written answer from Zoho Marketplace/extension support is still needed before this gate can pass.

### Sources
- https://www.zoho.com/developer/help/marketplace/faqs.html
- https://www.zoho.com/developer/help/marketplace/payments.html
- https://www.zoho.com/developer/help/marketplace/pricing.html
- https://help.zoho.com/portal/en/kb/zoho-crm-platform/extensions-for-zoho-crm/faqs/articles/faqs-crm-extensions

## 3. Zoho CRM Field Retirement Impact Preflight — retain HOLD

### New technical evidence
- The Zoho CRM V8 Functions API now documents a read endpoint to list configured functions and a separate Download Function Code API to retrieve implementation source. The list response contains function metadata; access is scope- and edition-dependent. This improves technical feasibility for a local, opt-in scanner of custom-function source.
- The public Zoho Community post titled **“Metadata API Access to Functions”** describes a CRM team's need to crawl Deluge functions that update fields across modules and create a visual dependency model. This is a concrete problem statement, but it is one community post, and it does not demonstrate paid intent.
- The Functions API does not establish full coverage of Client Scripts, Zoho Flow, CRM Analytics, PDF templates, external systems, dynamically constructed field references or every tenant edition/data centre. The scanner must label unsupported surfaces **NOT SCANNED**, never “no dependency”.

### Updated competitor/substitute evidence
- **Configuration Logs Tracker for Zoho CRM** is a free Zoho-published extension. It records setup-level changes such as workflows, functions, custom buttons, schedules and layouts. Its public listing showed zero visible ratings. It is an adjacent governance substitute, not a field dependency graph.
- **Timeline Pro Record Management for Zoho CRM** is a paid extension with monthly/yearly pricing. Its marketplace page showed a USD 5 standard price in the listing capture and zero visible ratings. It proves monthly pricing exists in the category, not that this candidate has paying customers.
- **Data Guardian for Zoho CRM** is listed as paid and describes automated data scoring, validation, monitoring and scheduled health reports. The public listing did not expose a verifiable customer count or meaningful review evidence in the captured view; do not infer sales from the paid label.
- **PostgreSQL Smart Sync and Backup for Zoho CRM** is listed free and provides scheduled CRM data mirroring/backups. This is adjacent to recurring data-protection needs, not a direct field-retirement competitor.
- The previous 22-reference audit remains a bounded competitor review, not an exhaustive catalogue census.

### Commercial decision
A field-retirement event can be episodic. A recurring subscription would require ongoing schema/dependency-drift monitoring or periodic change governance. Public research has not established an adequate admin cadence, repeated budget, paid buyer cohort, conversion rate or defensible willingness to pay. Free/native adjacent tools further weaken the case for a generic admin-audit product.

**Disposition: HOLD — no build.** The Functions API improves technical feasibility but does not fix missing paid-demand proof, recurring cadence, full-coverage limitations or India payout uncertainty.

### Sources
- https://www.zoho.com/crm/developer/docs/api/v8/functions-list.html
- https://www.zoho.com/crm/developer/docs/api-directory.html
- https://help.zoho.com/portal/en/community/topic/metadata-access-to-functions
- https://marketplace.zoho.com/app/crm/configuration-logs-tracker-for-zoho-crm
- https://marketplace.zoho.com/app/crm/timeline-pro-record-management-for-zoho-crm
- https://marketplace.zoho.com/app/crm/data-guardian-for-zoho-crm
- https://marketplace.zoho.com/app/crm/postgresql-smart-sync-and-backup-for-zoho-crm

## 4. Wix App Market — payer identity narrowed, not cleared

### Contract and payout evidence
- The Wix App Market Partner Agreement currently identifies **Wix.com Ltd. together with its affiliated companies** as “Wix”; the agreement version is effective 30 June 2026.
- Unless an app is expressly Partner Billed, Wix processes customer purchase, billing, collection, cancellation and refund actions on the partner's behalf.
- The agreement states 100% of Net App Revenues to the partner for the first 12 months after app launch, then 80%; the 2.5% transaction fee is deducted before the share and applies to Wix-conducted billing actions.
- The agreement says revenue share is payable within 30 days after month-end once the partner balance reaches USD 200; balances below USD 200 roll forward. Payment is USD-only by wire or another method chosen by Wix, against a lawful tax invoice; applicable withholding and FX adjustments may apply.
- Wix documentation requires a Wix Partner account and account-level Tipalti payout setup before a paid app can be published.
- Tipalti's public coverage table lists India payee options including INR local bank transfer and USD wire. Its footnote states payments to India are **not available for India-based payer entities**.

### Payer-entity conclusion
The agreement identifies the contractual counterparty group and says Wix generally collects App Market revenue, but the public payout setup material does not identify which exact legal entity funds the Wix Tipalti account for an individual partner. The Tipalti restriction is payer-entity-specific, not a blanket restriction on all Indian payees.

**Classification: INDIA PAYOUT CONDITIONALLY SUPPORTED; ACTUAL TIPALTI PAYER ENTITY UNVERIFIED.** Do not treat Wix as cleared until a written Wix answer or owner-authorised onboarding evidence identifies the payer entity and confirms the India payee route. No Partner/Tipalti account creation or KYC.

### Indicative payout-threshold math (not a forecast)
Assuming a USD 10/month app, no sales tax, no refunds and no extra direct cost:
- During the first 12 months, net app revenue after 2.5% transaction fee is USD 9.75 per subscriber-month. 21 subscribers would generate USD 204.75 and cross the USD 200 threshold; 20 would generate USD 195 and not cross it.
- After the first 12 months, the partner's 80% share of USD 9.75 is USD 7.80 per subscriber-month. 26 subscribers would generate USD 202.80; 25 would generate USD 195.
This ignores tax, refunds, chargebacks, hosting, support, FX, withholding and settlement fees. It is threshold arithmetic only. It does not imply expected conversions or actual revenue.

### Sources
- https://dev.wix.com/app-market-partner-agreement
- https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/payments-and-billing-faqs
- https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/set-up-your-payout-account
- https://help.tipalti.com/hc/en-us/articles/31314361313815-Payment-methods-coverage-US-ROW

## 5. Initial Wix buyer-problem screen — no candidate selected

### Generic SEO and website-health tools
- Wix's SEO app category showed roughly 168–171 apps in the current marketplace capture.
- Established visible listings included Rabbit SEO Optimizer & Booster (4.9 rating, about 2,297 reviews), Google Reviews & SEO Booster (4.9, about 814 reviews), and other high-rated free-plan SEO tools.
- This indicates an established and crowded category with several strong incumbents and free tiers. Review count is a visible engagement signal, not verified paying-user count or revenue.

**Decision:** generic SEO booster, generic AI SEO writer, generic site-speed optimiser or generic website-audit clone is **NO-GO for shortlisting** absent a narrowly evidenced unmet outcome.

### Accessibility monitoring
- Wix provides a native Accessibility Monitor and Accessibility Wizard. Wix explicitly cautions that use of these tools does not guarantee compliance with regional accessibility laws; users are advised to consult an accessibility expert.
- Third-party Wix listings already include scheduled and recurring accessibility monitoring:
  - SkynetAccessibility Scanner lists a 10-day trial; monthly plans visible at USD 7.50 for 25 pages, USD 15.84 for 250 pages, USD 74.16 for 1,000 pages and USD 165.83 for 2,500 pages; no public reviews were visible in the retrieved listing.
  - Inclusify Accessibility lists paid automation with scheduled re-scans, score history and crawls; monthly plans shown at USD 32.50 (Starter) and USD 82.50 (Pro), with no public reviews visible.
  - ADA Accessibility Checker lists a free 3-page scan and paid plan shown at USD 7.60/month in the captured offer; no public reviews visible.
- These products demonstrate that accessibility monitoring can be positioned as recurring software, but list prices and free trials do not prove actual sales. Native Wix capability plus multiple direct offerings make generic accessibility checker/toolbar cloning unattractive. Accessibility output must never claim legal compliance or replace expert review.

**Decision:** generic accessibility checker/toolbar is **NOT SHORTLISTED**. A narrowly differentiated regression-monitoring/evidence workflow could only be reconsidered after independent buyer evidence and a 10–15 competitor audit.

### Sources
- https://www.wix.com/app-market/collection/seo
- https://www.wix.com/app-market/skynetaccessibility-scanner
- https://www.wix.com/app-market/e9557fdd-998d-4668-aa0d-48bf58c181b1
- https://www.wix.com/app-market/certified-code-ada-accessibility-checker
- https://support.wix.com/en/article/accessibility-checking-site-accessibility-with-the-accessibility-monitor
- https://support.wix.com/en/article/accessibility-about-the-accessibility-wizard

## 6. CI and repository integrity

- The latest pre-addendum code/control HEAD inspected was `c70b00907c1107eb2da4a5092c2c773435ff1f14`.
- GitHub combined commit status returned zero status contexts for that HEAD, and the commit-workflow lookup returned zero associated pull-request-triggered workflow runs. This lookup does not inventory all push/manual Actions runs.
- Therefore **exact-HEAD CI is NOT VERIFIED**. The last evidenced bounded worker run remains #176 on `910b4db6940a32d3ee3e51de36bdceba146fc81b`; it is not evidence that the newer Phase 54 research/control HEAD passed.
- Research-only files and state updates do not alter product runtime. Do not report code tests as passed unless an actual exact-HEAD run is located and checked.

## 7. Decision and exact next action

1. Keep `P54-001` as the only active task.
2. Keep Zoho India extension remittance **UNVERIFIED**; seek exact programme-specific written evidence before relying on it.
3. Keep Wix payout **CONDITIONAL** until the actual Tipalti payer entity is identified for India partner remittances.
4. Keep Zoho CRM Field Retirement Impact Preflight **HOLD**. No MVP build.
5. Keep generic Wix SEO and generic accessibility checker ideas out of the shortlist. Continue searching Wix for a specific recurring buyer problem where native capability, free substitutes and existing paid competitors leave a documented unmet outcome; do not shortlist until there are at least two independent strong demand signals and a 10–15 competitor audit.
6. After the bounded Zoho/Wix screening, compare monday.com, BigCommerce and Xero seller entry/payout rules; keep Intuit/QuickBooks on HOLD until India eligibility is verified.
7. No account creation, KYC, terms acceptance, publication, paid API credits, spend or funds movement.

**Resume instruction:** continue at `PHASE_54 / P54-001` from this memo. Re-fetch actual `master` HEAD first. No product has been selected, no new revenue has been earned and no spend is authorised.
