# Phase 31 — Revenue-first pivot, payout evidence and first product MVP
**Date:** 2026-11-12  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem V3  
**Status:** Research registry expanded; first offline product MVP committed; private draft only.

## Executive decision
Stop allowing infrastructure work to consume the mission. Keep the five-minute GitHub worker as a low-cost control/QA layer, but make revenue-source validation and product creation the primary workstream.

Current portfolio evidence:
- 27 candidates across 16 categories in `control/opportunity_registry.json`.
- 11 documented platform payout routes in `control/payout_registry.json`.
- The registry deliberately retains account-level unknowns and HOLD states. A platform's published payout documentation is not proof that the owner's account is approved or has received a payout.
- Verified realized net receipts remain INR 0. No forecast is treated as cash.

## Channel findings (official sources captured 2026-11-12)

### 1. Topmate — first India-first storefront validation
- Official pricing: 10% commission on own-page/link sales, 20% for marketplace-discovery sales, plus transaction charge at least 2% for INR and 3%-6% for international payments; no monthly plan or signup fee.
- Topmate's own November 5, 2026 blog reports 30,700 paid digital-product sales by 1,694 creators in October 2026. This is a platform-reported demand signal, not independently audited and not proof that our product will sell.
- Unknown: precise seller payout settlement timing and account-level KYC. Do not mark payout rail as fully verified until tested.
Sources: https://topmate.io/fees ; https://topmate.io/blog/how-to-sell-digital-products-in-india

### 2. Gumroad — global storefront and secondary channel
- India appears in the official local-bank payout country table and payouts are in INR.
- Standard minimum is USD 100; sales have a 7-day hold and bank payouts commonly take 2-7 business days.
- Direct sales fee is 10% + USD 0.50 plus card processing (2.9% + USD 0.30); marketplace-discovery sales carry 30%.
- Implication: do not price tiny files too cheaply because fixed fees materially erode net receipts.
Sources: https://gumroad.com/help/article/13-getting-paid ; https://gumroad.com/help/article/66-gumroads-fees

### 3. Payhip + Razorpay — viable alternative checkout, not yet activated
- Payhip documents Razorpay availability for sellers in India and UPI/card methods.
- Payhip free plan carries 5% platform fee; Razorpay processing fees and merchant KYC/settlement rules are additional.
- Implication: useful as a second India payment route if Razorpay account is already eligible; no account setup or paid activation performed.
Source: https://help.payhip.com/article/368-connect-your-razorpay-account

### 4. itch.io — low threshold for the existing HTML5/game lane
- Collected-by-itch payouts support PayPal or Payoneer; USD 5 minimum; transaction earnings wait 7 days; payout review takes at least 7 days and typically 10-14 days.
- A USD 3 tax-identity fee applies. India Payoneer account eligibility and actual payout must be checked.
- This is a better fit for the existing Orbit Relay game than for the MSME toolkit.
Source: https://itch.io/docs/creators/payments

### 5. Adobe Stock — royalty lane, not first-cash priority
- USD 25 minimum and 45 days after first sale before first payout request; PayPal, Payoneer or Skrill availability varies by region.
- Adobe accepts properly labelled generative-AI assets, but the creator must have commercial submission rights and comply with release/IP/quality rules. Do not submit near-duplicate spam.
Sources: https://helpx.adobe.com/stock/contributor/payments-earnings/payment-taxes/payment-requirements.html ; https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/generative-ai-content-guidelines.html

### 6. Creative Market — India payout documented, admission and fees remain
- India is listed for ACH/eCheck and wire; PayPal is not listed for India. USD 20 payout minimum; wire and FX fees may apply.
Source: https://support.creativemarket.com/hc/en-us/articles/115004067573-Which-payout-methods-are-available-in-my-country

### 7. Patreon — recurring digital-content lane
- India appears in the official payout guide's local-currency country list; international creators can use Payoneer-backed bank transfers. Fee depends on currency/method; USD-to-local conversion fee documented.
- Requires an audience and recurring value; not the fastest first-receipt lane.
Source: https://support.patreon.com/hc/en-gb/articles/39694936541965-Payout-guide-for-creators-outside-the-US

### 8. Canva Creators, Pond5, Udemy, Freepik, Instamojo, Getvik and Qxel
- Official payout or fee information has been captured in the registries.
- These remain HOLD/VALIDATION because creator admission, India-specific account payout, exact settlement, rights, marketplace reach or operating history still need evidence.
- Shutterstock does not accept AI-generated contributor submissions; it is retained only as a possible original human-created asset lane, not an AI asset lane.
Sources:
  - Canva: https://www.canva.com/help/set-up-payout-details/
  - Pond5: https://www.pond5.com/help/en/articles/10086161-how-do-i-get-paid-for-earnings
  - Udemy: https://support.udemy.com/hc/en-us/articles/229604008-Instructor-Payment-Overview
  - Freepik: https://www.freepik.com/ai/contributors/payment-information
  - Instamojo: https://instamojo.zendesk.com/hc/en-us/articles/209153605-How-to-sell-products-online
  - Getvik: https://getvik.com/
  - Qxel: https://www.qxel.in/
  - Shutterstock AI policy: https://submit.shutterstock.com/help/en/articles/10594676-ai-generated-content-on-shutterstock-contributor-faq

## First product MVP: MSME Ops Desk Lite
Location: `products/msme-ops-desk-lite/`

Built as a single-file offline-first HTML tool with:
- unit contribution, margin, break-even and target-surplus calculator;
- cash runway estimator;
- inventory reorder-point planner;
- receivables register and ageing;
- daily sales log and CSV export;
- local JSON backup/restore;
- local browser storage only; no external scripts, telemetry, server or network requests.

Why this product:
- It can be produced and delivered as a digital download without recurring human fulfilment.
- It uses the user's existing ERP/business operations domain knowledge without pretending to be a full ERP.
- It is useful as a low-friction starter product and can later lead to higher-value software licences, but the product-market fit is not yet proven.
- It deliberately avoids tax, accounting, legal and investment advice. It is an operational planning tool only.

## Distribution plan
1. First validation channel: Topmate digital product storefront, subject to seller payout timing confirmation.
2. Secondary international channel: Gumroad, with INR local bank payout; account-level KYC and $100 threshold must be accepted.
3. Alternative: Payhip + Razorpay only if merchant activation is already possible without upfront spend.
4. Existing Orbit Relay game is a separate candidate for itch.io and CrazyGames; do not let it consume the two-build limit before the first product test is complete.

No accounts were created, terms accepted, payout details entered or products published. Public release remains an owner gate.

## Next work
1. Run automated HTML smoke tests and inspect workflow result.
2. Add formula-level unit tests and cross-browser/accessibility checks.
3. Improve product packaging, user guide and demo data reset.
4. Compare Topmate vs Gumroad net proceeds at ₹299, ₹499, ₹999 and international USD pricing.
5. Verify payout timing, refund terms, seller KYC and legal entity details from the selected platform account before publication.
6. Create a public launch package only after explicit owner approval.

## Guardrail
The digital-products market-level data is not a sales forecast. Do not report projected revenue as earned income. Revenue ledger remains zero until real settled receipts and fees are reconciled.
