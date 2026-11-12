# Phase 42 — Demand Validation and Revenue-Lane Rebalance

**Date:** 2026-11-12  
**Status:** IN PROGRESS

## Strategic decision
Stop adding Orbit Relay features until genuine user evidence exists. Automated browser tests verify implementation behavior, not market demand. Move effort to human usability validation and independent revenue-channel qualification.

## P42-001 completed: human playtest protocol
Prepared `products/orbit-relay/HUMAN_PLAYTEST_PROTOCOL.md`: neutral 10–15 minute session, 5–8 tester first cohort, anonymous observation fields, directional thresholds and privacy controls. Actual human playtest has not yet occurred. This cohort is for usability defect discovery, not statistical product-market-fit proof.

## P42-002 completed: channel revalidation
Official public pages rechecked on 2026-11-12:

| Channel | Current public terms | Discovery and constraints | Decision |
|---|---|---|---|
| Getvik | Free plan ₹0/month; 10% platform fee + 18% GST on fee + Cashfree gateway charges; ₹100 payout threshold; usually 2–3 business days after request | UPI/card checkout, automatic delivery, creator store link and Instagram AutoDM; PAN, legal name, own-name UPI and bank details required before publishing/payout | **Primary validation storefront** |
| Topmate | No monthly fee; 10% own-link or 20% marketplace commission; INR transaction charge at least 2%; ₹500+ payout no fee, below ₹500 flat ₹20; first payout opens 7 days after first paid sale, INR payout processed within 7 days of request | Digital products supported; Topmate states most first bookings still come from creator's own audience; marketplace discovery costs 20% commission | **Secondary validation channel** |
| Payhip + Razorpay | Payhip Free Forever 5% fee plus payment processor fees; Razorpay supports India sellers | Payhip marketplace requires at least USD 10 total sales, account review and individual product approval (aim up to 10 days); not a first-sale shortcut | **Backup** |
| itch.io Payouts | USD 5 payout minimum; transaction proceeds wait 7 days; payout review minimum 7 days, typically 10–14 days | Requires completed/validated tax interview and PayPal or Payoneer payout method; India account eligibility remains unverified | **HOLD for fast-revenue lane** |

### Selection logic
Getvik is the best first validation storefront among these four for a ₹0 monthly-cost India pilot because of INR UPI checkout, automatic digital delivery and the low ₹100 withdrawal threshold. It does not guarantee discovery or sales; a creator must still attract qualified buyers or use compliant discovery tools. Topmate is the independent second channel because it supports digital products and India bank payout without monthly subscription, but marketplace sales incur 20% commission and its own site says most first bookings come from creators' existing audience. Payhip remains a backup because marketplace eligibility is gated behind USD 10 prior sales plus review. itch.io is not rejected permanently; it is held because payout onboarding and India Payoneer/PayPal account readiness remain unresolved.

### Important fee caution
Getvik's gateway charges are additional and account/payment-method specific. Topmate's INR transaction charge may exceed 2% if gateway actuals are higher; GST applies to platform fees. Payhip's 5% excludes processor fees. These are not directly comparable net-receipt guarantees. No account-specific quote or test payout has been obtained.

## Evidence sources
- Getvik official storefront/pricing and payout: https://getvik.com/ ; https://getvik.com/privacy-policy
- Topmate fees: https://topmate.io/fees
- Topmate payout guidelines (effective 22 Oct 2026): https://topmate72420835211887570.freshdesk.com/support/solutions/articles/1070000141051-topmate-payout-guidelines
- Payhip free plan: https://help.payhip.com/article/102-billing-and-upgrading
- Payhip marketplace eligibility: https://help.payhip.com/article/307-marketplace
- Payhip Razorpay India integration: https://help.payhip.com/article/368-connect-your-razorpay-account
- itch.io payout policy: https://itch.io/docs/creators/payments

## Next task
P42-003: audit differentiated buyer demand and competing alternatives for Recruitment Agency Revenue Assurance Desk. Do not build another product or publish listings until the buyer problem, differentiation, distribution path and payout hard gates are supported by evidence.

## Owner gates and financial truth
No account creation, KYC, tax declaration, bank/UPI setup, terms acceptance, public listing, publication or spend performed. Orbit Relay remains private. Verified realized net receipts INR 0; authorized spend INR 0. Scheduled worker remains deterministic; provider-backed AI inference is not configured.


## P42-003 competitor audit result — 2026-11-12
- Direct competitors found: MoneyGence, IT Ways Placement Agency CRM, WePlacement and HireXL.
- MoneyGence publicly offers recruitment-agency client finance, invoice/collection/receivable workflows and a free first-two-client tier. IT Ways advertises placement invoicing, payment ageing, recruiter incentive ledger and replacement warranty tracking at ₹999–₹1,999/month. WePlacement advertises payment-linked commission release, GST/TDS billing and guarantee tracking with first owner seat free. HireXL offers revenue/placement and commission tracking with a free solo tier and paid tiers from ₹4,999/month.
- Decision: product remains PRIVATE_VALIDATION_HOLD. No additional feature development or paid listing. The only plausible differentiation hypothesis is offline/no-account/no-candidate-PII financial control beside an existing ATS, with installment-level cash receipts and cash-basis commissions. This is unproven.
- Detailed audit: [POSITIONING_AND_COMPETITOR_AUDIT.md](../products/recruitment-agency-revenue-assurance/POSITIONING_AND_COMPETITOR_AUDIT.md).
- P42-004 active: prepare private 5–8-owner problem validation pack and explicit kill criteria.
