# Phase 54 — P54-001 Marketplace Payout, India Eligibility and Economics Comparison
**Captured:** 14 November 2026  
**Canonical branch:** master  
**Pre-change HEAD observed:** 58ac9b3236d7eb2cdddae25af0d4f78ecfd10db6  
**Spend authorised:** INR 0  
**Product build / account / KYC / terms / publication:** none

## 1. Executive decision

This batch completes the platform-economics comparison for Zoho Marketplace, Wix App Market, monday.com, BigCommerce, Xero and Intuit/QuickBooks, and adds an Atlassian Forge control comparison because the V4 master ranking places Atlassian first for scalable B2B marketplace upside.

**No product is approved. No platform is cleared for an India-based seller payout solely from public evidence reviewed here.** The evidence supports platform-level economics, not a product-specific willingness-to-pay decision. The P54-001 acceptance gates still require two independent strong demand signals, a defensible unmet outcome, and a 10–15 direct-competitor audit for any selected product.

The existing payout registry already covers 22 providers across Indian bank transfer, UPI, international bank wire, PayPal, Payoneer, Skrill, other wallets, platform balances and an unresolved VDA route. This batch adds five platform-specific payout records (Atlassian, Zoho, Wix, monday.com and BigCommerce). It does not re-score or repeat the 22 previously researched rail records.

### Decision summary

| Platform | India seller / payout conclusion | Platform economics and timing | Current decision |
|---|---|---|---|
| Atlassian Forge | India-specific payout country list not found; agreement requires a valid bank account in the partner's name | Eligible Forge apps receive 100% gross revenue share up to USD 1M lifetime Forge revenue; after that the standard partner share is 83% from 1-Oct-2026. USD 500 profit remittance threshold; 30–60 days from sale; bank EFT; bank fees are partner's responsibility | **P1 platform; product HOLD** |
| Zoho Marketplace | Extension-specific India seller/payout eligibility remains unverified | Extension developer commission equals customer transaction value in Zoho's report; monthly processing when outstanding exceeds USD 100 (FAQ wording says >= USD 100); wire about 15 working days after explicit approval; PayPal by request | **HOLD** |
| Wix App Market | Tipalti lists India payee methods, but explicitly blocks payments to India from India-based payer entities; Wix's actual payer entity is not identified in the public developer material reviewed | First 12 months: 100% of revenue after 2.5% transaction fee and applicable tax; thereafter 80% after those deductions. USD 200 threshold per individual app. March revenue is paid at the beginning of May | **HOLD** |
| monday.com | Payoneer USD payout is documented; monday's own documentation does not publish an India-country allowlist or account-level threshold | New Marketplace apps must use monday monetization. Once lifetime app revenue reaches USD 200,000, the documented split is 85% developer / 15% monday for subsequent revenue. Monthly Payoneer payout; up to 60 days after invoice submission and finance approval | **P1/P2 platform; product HOLD** |
| BigCommerce | Partner application includes a country field and requests PayPal account ID; public material reviewed does not confirm India payout eligibility | Automated billing: 15% revenue share + 3% processing fee + payout fee; international PayPal 2% capped at USD 20, wire USD 20; monthly reports; reserves may be withheld. No public minimum or fixed remittance date found | **HOLD** |
| Xero App Store | Native subscription billing is currently for AU/NZ/UK sales regions; India seller/bank eligibility for that Stripe flow is not established | Starter developer tier is free for 5 connections; Core AUD 35, Plus AUD 245, Advanced AUD 1,445 monthly. App Store subscription payout to bank is weekly, seven days after receipt, in supported regions. Outside supported regions, commercial referrals can create a 15% ARPU fee payable by the developer, not platform revenue | **India native payout HOLD; direct-billing route only for further study** |
| Intuit / QuickBooks | Official App Partner Program country availability is US, UK, Australia and Canada (excluding Quebec); India is not listed | Builder tier is uncharged but geographically limited and subject to capped CorePlus API calls | **REJECT for India-based seller under current published programme** |

## 2. Risk-adjusted ordering

This is a platform-level ordering, not a first-sale forecast. Public catalogue size, a marketplace, or a platform revenue-share policy does not prove that a particular product will sell.

1. **Atlassian Forge — strongest scalable net upside, but not fastest assured cash.** The first USD 1M lifetime Forge incentive is unusually favourable. The USD 500 threshold, 30–60 day remittance window, 30-day refund exposure, India payout-country uncertainty and product-gap requirement materially reduce near-term certainty. Forge usage above monthly free allowances is billable; Forge LLM input/output and container services have no free allowance. A zero-spend product must use deterministic logic and remain inside published free usage.
2. **monday.com — attractive recurring SaaS distribution and Payoneer settlement.** Native monetization, subscription webhooks and monthly reporting are useful for self-serve operation. The USD 200,000 lifetime trigger, vendor registration, app review, security questionnaire and up-to-60-day finance cycle make it a later execution lane. No product-specific buyer gap is proven.
3. **Zoho Marketplace — potentially shorter settlement after the threshold, but India eligibility and buyer cadence remain unresolved.** The approximately 15-working-day wire period begins only after the developer explicitly approves processing; it is not a guaranteed 15-day sale-to-cash cycle. The >USD 100 conservative threshold and the lack of India extension-specific payout confirmation keep it on HOLD.
4. **Wix App Market — attractive first-year economics, weaker India payer certainty and slower cash cycle.** USD 200 is per app, not an aggregate account threshold. Tipalti's India payee-method table does not override its payer-entity restriction.
5. **BigCommerce — useful B2B ecommerce audience, but fee stack and remittance uncertainty are material.** The 15% share and 3% processing fee apply before payout-method charges; a reserve can further defer usable cash. No minimum or fixed payout schedule was found.
6. **Xero — valuable accounting ecosystem, but the native subscription and payout regions are AU/NZ/UK.** The free Starter tier is limited to five connections. A commercial-billing referral outside the supported subscription regions is a cost to the developer (15% of ARPU for qualifying referrals), not a marketplace payout.
7. **Intuit / QuickBooks — exclude from India-first execution until official programme geography changes.** Do not infer that global API access makes the App Partner Program available to an India-based publisher.

### Time-to-first-sale versus time-to-settlement

No official source reviewed gives a defensible time-to-first-sale for a new, unproven app on these platforms. We therefore do not invent one. The settlement facts below begin only after a sale or payout threshold is reached:

- Zoho: monthly statement once the conservative >USD 100 balance condition is met; about 15 working days after the owner approves commission processing.
- Wix: USD 200 accumulated per app; monthly payout; example published by Wix is March revenue arriving at the beginning of May.
- monday.com: monthly payout through Payoneer; after invoice submission and finance approval, up to 60 days; no public minimum identified.
- BigCommerce: monthly reporting, but no public payout threshold or fixed payment date in the reviewed Automated Billing Appendix; reserve may be retained.
- Atlassian: USD 500 profit threshold; approximately 30 days after month-end, minimum 30 and maximum 60 days after sale; 30-day refund window.
- Xero: weekly bank payout seven days after payment received only for supported AU/NZ/UK subscription regions; not an India-native payout path.
- Intuit: no India programme eligibility under the current published list.

## 3. Platform evidence

### 3.1 Atlassian Marketplace / Forge

Official pricing documentation states that, from 1 October 2026, the standard share for Jira, Jira Service Management and Confluence apps is 83% to eligible Forge partners, 75% for Connect and 75% for Data Center. Separately, qualifying Forge apps receive 100% of gross Forge revenue up to USD 1 million in lifetime Forge revenue. Eligibility requires no Connect modules/scopes, OAuth authentication and Forge UI (UI Kit or Custom UI). The incentive is aggregated across the partner's Forge apps and counts qualifying lifetime revenue.

The remittance threshold is USD 500 profit. Once reached, payment is due within 30 days after the end of the month in which the threshold was accrued, meaning roughly 30–60 days from sale. The partner must provide a valid bank account in their own name; bank wire fees are borne by the partner. The agreement permits offsets for refunds/chargebacks and a 60-day withholding period on termination.

Forge platform pricing is consumption-based. Monthly free allowances include 200,000 GB-seconds of Forge Functions, 0.1 GB KVS reads, 0.1 GB KVS writes, 1 GB log writes, 100,000 SQL requests, 1 hour SQL compute, 730 GB-hours SQL storage and 5,000 Object Store requests. LLM input/output has no free allowance; container services use a separate paid reservation model. Therefore an initial product must not depend on paid Forge LLM or containers, and must enforce hard usage budgets before any paid overage.

India-specific partner payout availability was not found in the public country documentation reviewed. A valid bank account in the partner's name is not proof that India is supported. Obtain written confirmation from Marketplace support before product-specific investment or account setup.

Sources:
- https://developer.atlassian.com/platform/marketplace/pricing-payment-and-billing/
- https://www.atlassian.com/legal/archives/partneragreement/partneragreement-20251130
- https://developer.atlassian.com/platform/forge/forge-platform-pricing/
- https://developer.atlassian.com/platform/marketplace/atlassian-developer-terms/

### 3.2 Zoho Marketplace

Zoho's extension pricing documentation permits one-time or monthly recurring pricing. Its payment documentation says extension developers' total customer transaction value and commission are equal in the commission report. A monthly statement is sent when outstanding commission exceeds USD 100; the developer must explicitly approve processing. Wire transfer takes about 15 working days after approval. PayPal can be requested by emailing the platform support address.

The CRM extension FAQ uses >= USD 100 wording, while the detailed payments page says more than USD 100. Continue to model > USD 100 conservatively until Zoho resolves the discrepancy in writing. Public Marketplace extension payout documentation does not explicitly establish India extension-developer eligibility, payout currency or India-specific fees. General Zoho Partner Store references to India billing/PAN do not automatically prove the separate Marketplace extension payout route.

Sources:
- https://www.zoho.com/developer/help/marketplace/payments.html
- https://www.zoho.com/developer/help/marketplace/pricing.html
- https://www.zoho.com/developer/help/marketplace/faqs.html

### 3.3 Wix App Market and Tipalti

Wix's official Payments and Billing FAQ states that the first 12 months retain 100% of revenue after a 2.5% transaction fee and applicable sales tax; after the first year the split is 80% developer / 20% Wix, calculated after those deductions. The USD 200 accumulated payout threshold is per individual app. Earnings below it roll forward. Wix posts the upcoming payout around the middle of the following month and says bank payment arrives at the beginning of the next month; its example is March revenue paid at the beginning of May.

Tipalti's current official USD-funded coverage table lists India INR local bank transfer, INR wire (T+2 to T+3), USD wire (T to T+1), check and PayPal options. Critically, the same table footnote says **payments to India are not available for India-based entities**. Therefore an India payee route exists only when the payer entity is eligible; the public Wix developer documentation reviewed does not identify the actual Tipalti payer entity. Do not classify Wix as India payout-cleared until that entity is confirmed.

Sources:
- https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/payments-and-billing-faqs
- https://help.tipalti.com/hc/en-us/articles/31314361313815-Payment-methods-coverage-US-ROW

### 3.4 monday.com Marketplace

All new Marketplace apps must use monday's native monetization rather than an external checkout. The app must check subscription status at runtime, enforce plan entitlements, prompt through the SDK and handle subscription changes. monday documents a USD 200,000 lifetime accumulated-revenue trigger; after it is reached, 85% of subsequent app revenue goes to the developer and 15% to monday. The source does not clearly state the exact pre-trigger split, so do not model a 100% pre-trigger share without the signed partner agreement.

Developers receive monthly USD payouts via Payoneer. After an invoice is submitted and approved by monday finance, payment may take up to 60 days. No public minimum payout threshold was found. New apps also require Marketplace approval; the partner programme's Bronze tier lists a USD 5,000 minimum marketplace ARR, an app review, security questionnaire, listing agreement and under-48-hour support SLA. Treat those partner-tier requirements separately from basic app-listing approval.

India-specific vendor/Payoneer eligibility and account-level withdrawal fees must be verified before activation. Existing Payoneer India account-level fees and RBI status remain governed by the separate payout registry; a marketplace payout wallet is not equivalent to permission to operate an independent Indian payment aggregator.

Sources:
- https://developer.monday.com/apps/docs/monetization
- https://developer.monday.com/apps/docs/subscriptions-payments-and-billing
- https://developer.monday.com/apps/docs/partner-program
- https://developer.monday.com/apps/docs/implementing-monetization

### 3.5 BigCommerce App Marketplace

An approved Technology Partner account is required to submit an app to the Marketplace; developers may build and test without partner approval. The public application asks for company/country details, app portfolio, current merchant count, business model and a PayPal account ID. A contact with the Billing/Financial role is required for submission.

For Automated Billing, BigCommerce takes 15% of Net Revenue plus a 3% processing fee. Payout method charges are: no disbursement fee for ACH or domestic PayPal; USD 20 for wire; international PayPal 2% capped at USD 20. Monthly reporting is provided through Impartner. BigCommerce may retain a monthly reserve for chargebacks, reversals or other liabilities. The public appendix reviewed does not state a payout minimum or fixed remittance date. The account application contains a country field but does not itself prove India partner approval or India payout support.

The partner must provide customer support and clearly disclose recurring subscription title, term, price, privacy policy and terms of use. The partner is responsible for disputes with its app customers. This is not a low-risk route until the exact agreement, country eligibility and reserve policy are confirmed.

Sources:
- https://docs.bigcommerce.com/developer/docs/integrations/becoming-a-partner
- https://partners.bigcommerce.com/English/register_tech.aspx
- https://docs.bigcommerce.com/developer/docs/integrations/apps/unified-billing/overview

### 3.6 Xero App Store

From 2 March 2026 Xero moved to connection/API-usage tiers and stopped the prior revenue-share model for the relevant developer programme. Published monthly tiers are Starter (free, 5 connections), Core (AUD 35), Plus (AUD 245), Advanced (AUD 1,445) and Enterprise (quote). The free Starter tier is the only zero-spend route and caps connections at five.

Xero explicitly prohibits use of API data to train or contribute to AI/ML models and prohibits bots/browser extensions that undermine security controls or simulate user actions. Do not use Xero tenant data to train any model.

Xero App Store subscriptions are documented for AU, NZ and UK sales regions. The developer must create a new Stripe account based on the company's legal residence, complete KYC, add a bank account and configure the supported regions. For these supported subscription sales, payouts go to the bank account weekly, seven days after payment is received. Outside AU/NZ/UK, Xero's commercial-billing referral route can charge the app partner 15% of ARPU for a successful referral; a successful referral requires the user to connect for at least 65 days after a 30-day trial. This is a fee owed by the developer, not a payout from Xero.

India-first native subscription monetization is therefore not cleared. A separate own-checkout product could be researched, but the Xero referral cost and the five-connection free-tier cap must be included.

Sources:
- https://developer.xero.com/faq/pricing-and-policy-updates
- https://developer.xero.com/documentation/xero-app-store/app-partner-guides/xero-app-store-subscriptions/
- https://developer.xero.com/documentation/xero-app-store/app-partner-guides/xero-app-store-referrals-and-billing/

### 3.7 Intuit / QuickBooks

Intuit's official App Partner Program FAQ, last updated 29 October 2026, says the programme launched in the US and expanded to the UK, Australia and Canada (excluding Quebec). India is not included in the published geographical list. Builder tier is uncharged but has capped CorePlus API calls; additional programme tiers and benefits require onboarding and may have fees or eligibility conditions.

Decision: reject as an India-based seller channel under the current published programme. Reopen only if Intuit officially expands eligibility or confirms an India-based legal entity can participate.

Sources:
- https://static.developer.intuit.com/output_html/qbo/docs/get-started/partner-faq.html
- https://developer.intuit.com/app/developer/qbo/docs/

## 4. Bank, UPI, wallet and crypto rail reconciliation

The existing payout registry's 22 records remain the source of truth for the previously audited direct rails:

- **Indian bank / UPI:** existing domestic storefront and gateway options remain account-level pending where KYC, merchant category, payout account or risk review is required.
- **International bank / wire:** existing publishing, software and marketplace routes remain subject to country, minimum threshold, FX and bank fees.
- **International wallets:** PayPal and Payoneer are platform payout methods, not automatic India merchant-acquiring permissions. PayPal India is limited to international commercial receipts and automatic bank withdrawal under its India terms. Payoneer India must be evaluated as a platform payout/withdrawal service, not assumed to be an independently authorised payment aggregator.
- **Crypto / VDA:** no new platform route qualifies. The existing direct VDA/stablecoin candidate remains NOT ACTIVATED because the transaction-specific legal classification, FIU-IND reporting-entity obligations, provider onboarding, custody, conversion, AD-bank acceptance and bank reconciliation are unresolved. On-chain confirmation is not a settled INR receipt. No private keys, signing or transfers are permitted.

A rail is not a revenue model. A model is counted only after a real buyer pays for a lawful product, platform deductions and reversals are known, the payout is controlled, and the net amount is settled and reconciled to the bank ledger.

## 5. AI, IP and data-rights guardrails

- Use original code, original documentation and assets with a documented commercial licence. Do not copy marketplace competitors' code, UI, text, images or proprietary workflows.
- Xero's API-data AI/ML training prohibition is explicit and must be enforced technically. Treat customer tenant data from every platform as purpose-limited and non-training by default unless a platform's current terms and the customer's lawful consent explicitly permit another use.
- Do not use customer secrets, OAuth tokens, source code, financial records or personal data in external LLM prompts.
- Prefer deterministic static analysis, local processing, explicit data minimisation, redaction, audit logs and least-privilege OAuth scopes.
- Do not use platform APIs to simulate user actions, evade rate limits, scrape private data or bypass app review.
- Before any product GO, capture current platform developer terms, marketplace listing policy, security requirements, IP ownership clauses, data-processing obligations, AI-specific restrictions and customer support SLA.

## 6. Owner-only confirmation packet (not submitted)

Before any account, KYC or agreement action, obtain written answers from the relevant platform support team:

1. **Zoho:** Can an India-resident individual or India-incorporated entity publish paid CRM extensions and receive commission in INR or USD? What is the exact minimum, wire fee, PayPal availability, tax documentation and current review route?
2. **Wix:** Which legal entity is the payer for Wix App Market revenue share? Does that payer entity qualify for India payments under Tipalti's India rule? Which method, currency, minimum and FX/transfer fees will be offered to an India-resident payee?
3. **monday.com:** Can an India-resident developer/vendor complete the Zip + Payoneer vendor setup and receive monthly USD payments? What is the exact pre-USD-200,000 share, minimum invoice, withholding, chargeback and payout fee?
4. **BigCommerce:** Is an India-based Technology Partner eligible for Automated Billing? Which payout method is available to an Indian legal entity, what reserve percentage/period applies, what is the payout minimum and when is remittance due?
5. **Atlassian:** Is India supported for Marketplace Partner registration and EFT payouts to an Indian bank account? What currency conversion, bank documentation and withholding forms apply?
6. **Xero:** Can an India-based entity use the native App Store subscription Stripe flow, or only commercial referrals with its own billing? Confirm all applicable costs and the AI/API data-use restrictions for the exact app category.

These questions are prepared for the owner. No support ticket, account creation, KYC, terms acceptance or publication was performed.

## 7. Next task and stop conditions

**P54-001 remains IN_PROGRESS and research-only.** The next unblocked work is demand-first: select no product until a specific recurring buyer problem is supported by at least two independent strong demand signals; then audit 10–15 direct competitors and platform-native substitutes. Do not spend time implementing adapters, integrations or a listing until the platform's India payout route is confirmed.

If a platform cannot confirm India payout eligibility or the product cannot show recurring buyer demand and defensible differentiation, record NO-GO and move to the next platform in the V4 order. The Intuit India programme is already rejected on published geography.

**Financial state remains:** INR 0 settled/reconciled receipts; INR 0 authorised spend; no new account, KYC, agreement, public listing or crypto activity.

## 8. Research source register

All sources below are first-party platform or payout-provider documentation, captured on 14 November 2026 unless the page itself shows an earlier update date.

- Atlassian pricing, revenue share and payout: https://developer.atlassian.com/platform/marketplace/pricing-payment-and-billing/
- Atlassian partner agreement: https://www.atlassian.com/legal/archives/partneragreement/partneragreement-20251130
- Atlassian Forge usage pricing: https://developer.atlassian.com/platform/forge/forge-platform-pricing/
- Atlassian developer terms: https://developer.atlassian.com/platform/marketplace/atlassian-developer-terms/
- Zoho extension payments: https://www.zoho.com/developer/help/marketplace/payments.html
- Zoho extension pricing: https://www.zoho.com/developer/help/marketplace/pricing.html
- Zoho Marketplace FAQ: https://www.zoho.com/developer/help/marketplace/faqs.html
- Wix payment and billing FAQ: https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/payments-and-billing-faqs
- Tipalti payment-method coverage and India payer restriction: https://help.tipalti.com/hc/en-us/articles/31314361313815-Payment-methods-coverage-US-ROW
- monday monetization: https://developer.monday.com/apps/docs/monetization
- monday subscriptions and payouts: https://developer.monday.com/apps/docs/subscriptions-payments-and-billing
- monday Partner Program: https://developer.monday.com/apps/docs/partner-program
- monday monetization implementation: https://developer.monday.com/apps/docs/implementing-monetization
- BigCommerce partner requirements: https://docs.bigcommerce.com/developer/docs/integrations/becoming-a-partner
- BigCommerce automated billing appendix: https://partners.bigcommerce.com/English/register_tech.aspx
- BigCommerce unified billing: https://docs.bigcommerce.com/developer/docs/integrations/apps/unified-billing/overview
- Xero pricing and AI policy: https://developer.xero.com/faq/pricing-and-policy-updates
- Xero App Store subscriptions: https://developer.xero.com/documentation/xero-app-store/app-partner-guides/xero-app-store-subscriptions/
- Xero referral billing: https://developer.xero.com/documentation/xero-app-store/app-partner-guides/xero-app-store-referrals-and-billing/
- Intuit App Partner Program FAQ (updated 29-Oct-2026): https://static.developer.intuit.com/output_html/qbo/docs/get-started/partner-faq.html
- Intuit developer start: https://developer.intuit.com/app/developer/qbo/docs/
- GitHub Actions workflow-run API limitations/reference: https://docs.github.com/en/rest/actions/workflow-runs

No forecast, tax declaration, or receipt has been created from these platform-level findings.
