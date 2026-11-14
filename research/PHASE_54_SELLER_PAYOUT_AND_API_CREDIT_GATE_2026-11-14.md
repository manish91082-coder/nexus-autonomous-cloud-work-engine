# Phase 54 — Seller Payout and Zoho CRM API-Credit Gate
**Date:** 14 November 2026  
**Authority:** Master Constitution V4  
**Task:** P54-001  
**Status:** Research-only; no product approved  
**Authorised new spend:** ₹0

## 1. Executive outcome

This follow-up resolves several public-documentation questions but does not clear the India seller gate.

| Gate | Finding | Decision |
|---|---|---|
| Zoho extension payout mechanics | Zoho Marketplace pays developer commission through its Partner Commission/Zoho Store process; extension developer total customer value equals commission; monthly processing around USD 100 threshold; bank wire about 15 working days after approval; PayPal by request | **Mechanics documented; net remittance unresolved** |
| Zoho India seller eligibility | Marketplace extension payout docs do not list supported developer countries or confirm Indian extension publisher remittance. Broader Zoho Partner Store documentation refers to an India billing entity, INR invoices for India customers and PAN for India-based partners, but does not explicitly map those rules to Marketplace extension developers | **UNVERIFIED for this exact seller programme** |
| Zoho CRM V8 API budget | 24-hour rolling API credit limits are documented separately from concurrency; endpoint costs can be discovered via `/__apis` | **Documented; must use in any safe read-only architecture** |
| Wix paid-app payout setup | Wix requires Wix Partner onboarding plus Tipalti payout setup before a paid app can be published | **Provider and workflow confirmed** |
| Wix / India payee | Tipalti publishes India INR bank/local-transfer routes and USD wire/PayPal options, with a restriction for payments to India from India-based payer entities. Wix's payer entity for App Market developers is not identified in the public docs reviewed | **CONDITIONALLY SUPPORTED, exact Wix route not verified** |
| Demand/product | Neither platform payment capability validates the Zoho Field Retirement Impact Preflight or any Wix product idea | **NO PRODUCT GO** |

## 2. Zoho Marketplace extension-developer payout — exact public mechanics

### Extension-specific official documentation

1. Zoho's Marketplace FAQ says developers may list extensions at no cost; paid extensions can be purchased through Zoho's payment gateway; public extensions support one-time or monthly recurring prices set in USD; a 10-day trial can be offered.
2. The Marketplace payments page says the Partner Commission Report is updated daily. For extension developers, the reported **Total Value** (sum of customer payments) and **Commission** are equal.
3. The FAQ says monthly payment is made once accrued sales reach at least USD 100; the detailed payment page says the monthly statement is sent only when outstanding commission is **more than USD 100**. Treat the exact boundary as a documentation discrepancy and plan conservatively above USD 100.
4. The statement is issued on the first day of the month. The developer must approve “Process commission”; Zoho says wire transfer takes about 15 working days after approval. The developer may accumulate commission rather than process it each month.
5. PayPal can be requested by emailing Zoho Platform support with the PayPal email address. The public extension payout guide does not specify the PayPal country eligibility, fees or FX treatment.

Official sources:
- https://www.zoho.com/developer/help/marketplace/faqs.html
- https://www.zoho.com/developer/help/marketplace/payments.html
- https://www.zoho.com/developer/help/marketplace/pricing.html

### What is and is not established for India

**Established in the broader Zoho Partner Store material:**
- Zoho lists a Zoho India billing entity and says invoices for customers from India are paid in INR.
- The Partner Store commission audit guidance says partners located in India must submit PAN details and issue invoices against the applicable Zoho billing entity.
- The general Partner Store documentation describes entity-specific commission accounting and a maximum accrual period of six months.

Sources:
- https://www.zoho.com/store/partner/help/auditing-practices.html
- https://www.zoho.com/store/partner/help/commissions-menu.html

**Not established for Marketplace CRM extension developers:**
- The public extension payout page does not explicitly confirm India-based extension publishers are eligible to receive payouts.
- It does not specify whether an Indian developer is paid in INR, USD or another currency; which Zoho legal entity remits; what wire/intermediary/FX fees apply; what invoice format applies; or which tax documents are required specifically for Marketplace extension commission.
- The broader Partner Store India/PAN rules are supportive context but not conclusive proof that every Marketplace extension developer receives the same India treatment.
- Do **not** import the separate Zoho India Reseller Store's ₹50,000 commission threshold into Marketplace extension economics. The extension-specific documents instead use the USD 100 outstanding/sales threshold.

**Decision:** Zoho's gross earning mechanics are unusually favourable on paper, but India extension-publisher eligibility and actual net remittance remain **UNVERIFIED**. Do not open a seller account, submit KYC/PAN, accept terms or publish. A written answer from Zoho Marketplace/Partner Finance is required before this channel can pass the India payout gate.

## 3. Zoho CRM V8 API credits — correction to the earlier technical note

The earlier dependency audit documented edition concurrency limits (5–25) but said daily API credit limits needed further verification. The current Zoho CRM V8 API Limits page now supplies an explicit 24-hour rolling API-credit schedule. **Concurrency and daily credits are separate controls.**

### API credit limits (CRM V8)

| Edition | Allowed credits per rolling 24h | Maximum |
|---|---:|---:|
| Free | 5,000 | 5,000 |
| Standard / Starter | 50,000 + (user licences × 250) + add-ons | 100,000 |
| Professional | 50,000 + (user licences × 500) + add-ons | 3,000,000 |
| Enterprise / Zoho One | 50,000 + (user licences × 1,000) + add-ons | 5,000,000 |
| Ultimate / CRM Plus | 50,000 + (user licences × 2,000) + add-ons | Unlimited |

Examples of documented API credit costs:
- List Modules: 1 credit.
- Get Field Metadata: 1 credit.
- Get Module Metadata: 1 credit.
- `/__apis` discovery endpoint: 1 credit.
- Other APIs may have higher costs; the discovery response exposes minimum/maximum credits per operation where supported.
- The credit window is rolling 24 hours from the API call. Zoho exposes `X-API-CREDITS-REMAINING` in responses once usage reaches 50% or above of the daily available credit limit (excluding add-on credits).
- Extra API credits can be purchased and billed monthly on a pay-as-you-go basis. A zero-spend product must never trigger this automatically.

Official source:
- https://www.zoho.com/crm/developer/docs/api/v8/api-limits.html

### Separate concurrency limits

| Edition | Concurrent API calls per org/app |
|---|---:|
| Free | 5 |
| Standard / Starter | 10 |
| Professional | 15 |
| Enterprise / Zoho One | 20 |
| Ultimate / CRM Plus | 25 |

A further sub-concurrency limit of 10 applies to certain resource-intensive API families. These concurrency limits are not daily request quotas.

### Discovery and least-privilege design

- `GET /crm/v8/__apis` uses `ZohoCRM.apis.READ`, consumes 1 credit and returns available endpoints with method, OAuth scope, and min/max credit metadata.
- `GET /crm/v8/__features` uses `ZohoCRM.features.READ` and returns current org features/limits by edition. The public documentation reviewed does not state an explicit credit cost for this endpoint; do not assume one.
- The scan should discover the exact endpoint/scope set for the user's data centre and edition before requesting anything beyond the initial discovery scopes.
- Metadata reads such as module/field metadata are documented at 1 credit. Other endpoint costs must be read from `/__apis` and budgeted.
- Scan only with explicit admin consent and read scopes. Show the estimated credit budget before execution; stop before crossing the user's configured credit ceiling. Never buy add-on credits or trigger paid overage automatically.
- Do not execute CRM Functions. Function execution has its own separate credit system and is not required merely to inspect metadata.
- Downloaded Function source is sensitive customer IP. It must be opt-in, read-only, processed locally where possible, and never uploaded to an external LLM by default.
- Every inaccessible API or surface due to edition, permission, scope, data centre, API credits or unsupported endpoint must be recorded as `NOT_SCANNED`, not `NO_DEPENDENCY`.

Sources:
- https://www.zoho.com/crm/developer/docs/api/v8/list-available-rest-apis.html
- https://www.zoho.com/crm/developer/docs/api/v8/get-features.html
- https://www.zoho.com/crm/developer/docs/api/v8/api-limits.html
- https://www.zoho.com/crm/developer/docs/functions/limits-quotas.html

### Separate Function execution credits

These apply to actually executing CRM Functions, not to ordinary REST metadata reads:
- Standard: 5,000 free + user licences × 200, maximum 15,000; Functions only through Extensions.
- Professional: 5,000 free + user licences × 200, maximum 20,000; Functions only through Extensions.
- Enterprise / Zoho One: 20,000 free + user licences × 500 + add-ons, maximum 400,000.
- CRM Plus / Ultimate: 20,000 free + user licences × 1,000 + add-ons; limit depends on user count and can be configured.
- Individual function response cap 10 MB; 200,000 executed lines; timeouts vary by trigger category (10 seconds, 30 seconds or 15 minutes).

Source:
- https://www.zoho.com/crm/developer/docs/functions/limits-quotas.html

**Technical implication:** the read-only candidate is technically more plausible than if concurrency were its only documented limit, but it consumes the customer's CRM API-credit budget. The design must provide a bounded, incremental, opt-in scan with no write scopes and no paid API-credit overage. This does not address unsupported component coverage or buyer willingness to pay.

## 4. Wix App Market — Tipalti payout route and threshold detail

### App-specific requirements and payout

- Before publishing a paid app, Wix requires the developer to become a Wix Partner and set up a Tipalti account.
- The setup is account-level; it is required before paid-app publication and requires the Manage Earnings permission (normally held by the workspace owner).
- Wix App Market app prices are set in USD; local display prices may be adjusted by territory.
- For the first 12 months on the platform, the developer keeps 100% of revenue **after the 2.5% transaction fee and applicable sales tax**. After that, revenue share is 80/20 on the amount remaining after those deductions.
- Payout threshold is USD 200. March revenue is paid at the beginning of May; payouts below threshold roll over.
- The threshold applies to **each individual app**; earnings across multiple apps do not aggregate to meet one app's threshold.

Official sources:
- https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/set-up-your-payout-account
- https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/payments-and-billing-faqs
- https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/about-monetizing-your-app
- https://support.wix.com/en/article/developer-request-calculating-payout-threshold-per-partner

### India payout interpretation — conditional, not confirmed

Tipalti's published payment-coverage table lists India payees with INR local bank transfer and other methods, including USD wire and PayPal. However, a footnote says payments to India are unavailable for India-based payer entities. Wix's App Market developer documents require Tipalti but do not publicly identify which Wix legal/funding entity is the payer for an India-based developer.

Sources:
- https://help.tipalti.com/hc/en-us/articles/31314361313815-Payment-methods-coverage-US-ROW
- https://help.tipalti.com/hc/en-us/articles/30607242003223-Payees-FAQs

General Wix Studio payout guidance currently excludes banks in Russia and Pakistan, but does not by itself prove the separate App Market developer payout path is enabled for every Indian bank/account.

Source:
- https://support.wix.com/en/article/wix-studio-tracking-your-payouts

**Decision:** India appears technically supported by Tipalti when the paying entity and route qualify, but exact Wix App Market eligibility is **CONDITIONALLY SUPPORTED / NOT VERIFIED** until the Wix payer entity and onboarding flow confirm India-based payees. No account or Tipalti onboarding was attempted.

### Simple threshold sensitivity (not a sales forecast)

For a USD 20 monthly app:
- First 12 months: $20 × 97.5% = $19.50 before applicable tax; approximately 11 paid account-months are needed to reach $200.
- After the first 12 months: $20 × 97.5% × 80% = $15.60 before applicable tax; approximately 13 paid account-months are needed to reach $200.

This is threshold arithmetic only. It does not prove buyer demand, revenue retention, acquisition or profit.

## 5. Phase 54 platform gate status

| Marketplace | Seller/payout conclusion | Current research status |
|---|---|---|
| Zoho Marketplace | Extension payout India still not explicitly verified; broader Partner Store documentation is supportive but not conclusive | First priority; exact written confirmation needed |
| Wix App Market | Tipalti has India payout coverage with payer-entity restriction; Wix's actual payer entity / India onboarding remains unresolved | Second priority; conditional, not GO |
| monday.com | India payouts and pre-threshold economics remain unverified | Not yet screened deeply |
| BigCommerce | India eligibility, partner fees and monetization remain unknown | HOLD |
| Xero | Ten-customer certification and tier pricing; India acquisition/payout economics unverified | Defer |
| Intuit QuickBooks | India app-partner eligibility unverified | HOLD |

## 6. Exact next P54-001 actions

1. Maintain the Zoho CRM Field Retirement Impact Preflight as **HOLD**, not GO. No product build.
2. For Zoho, the public evidence does not close the India seller gate. Before any seller account, ask Zoho Marketplace/Partner Finance for written confirmation specific to **CRM Marketplace extension developers based in India**: eligible seller legal form, required PAN/GST/invoice documents, payout entity, INR/USD settlement, wire/PayPal availability, fees, FX, tax withholding, minimum threshold and accrual expiry.
3. For Wix, confirm which Wix legal/funding entity pays App Market developers through Tipalti and whether an India-based individual/company can complete the payee onboarding under that payer entity; obtain exact bank-transfer currency, fees, FX and tax requirements.
4. Continue product problem research only after the relevant platform rail is understood. Zoho CRM candidate remains weak on recurring usage cadence; no budget or subscription willingness evidence exists.
5. Keep all product build, account creation, KYC, terms, publication and spend blocked.

## 7. Mission and financial truth

- Platform/provider-credited net earnings: ₹0.
- Bank-settled net receipts: ₹0.
- Revenue ledger entries: 0.
- Authorised new spend: ₹0.
- No account creation, KYC, marketplace terms, publication, code build or paid API credit purchase was performed by this report.
