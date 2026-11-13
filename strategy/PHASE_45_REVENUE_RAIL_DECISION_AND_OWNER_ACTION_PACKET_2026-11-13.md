# Phase 45 — Revenue Rail Decision & Owner Action Packet
**Date:** 13-Nov-2026  
**Status:** Private. No action in this document authorizes account creation, KYC, legal acceptance, public publication, spending or fund movement.

## Decision in one page

- **Do next:** P44-004 Getvik Free owner onboarding and explicit listing approval. It remains the fastest potential first-cash route because it combines INR/UPI checkout, auto delivery, a ₹100 payout threshold and a populated Discover marketplace. Buyer demand for our exact product is still unproven.
- **Do not launch in parallel:** Cashfree Direct or Paddle until the Getvik experiment produces first-sale evidence.
- **Prepare as second rail:** Cashfree Direct if domestic UPI/bank collection is needed after demand validation; Paddle if a higher-value recurring software product and international buyer demand are proven.
- **Backup only:** Lemon Squeezy if Stripe India pre-approval exists or the PayPal route remains acceptable after all fees.
- **Wallets:** PayPal and Payoneer are payout endpoints, not acquisition models.
- **Crypto:** Not activated. Written legal, CA and AD-bank review is mandatory before re-evaluation.

## Owner packet A — Getvik (P44-004, next gate)

1. Review current seller Terms of Service, payout declaration, refund policy and commercial licence directly on Getvik.
2. Complete PAN/KYC personally on the platform.
3. Add only an own-name bank account and own-name UPI payout route.
4. Verify creator display/legal name matches payout identity.
5. Review the product listing, price hypothesis, support contact, refund terms and delivery promise.
6. Explicitly approve publication.
7. Keep plan at ₹0/month and ad spend at ₹0.
8. After publication, run the existing bounded 14-day experiment; record qualified views, checkout starts, independent paid orders, refunds/reversals, all deductions, withdrawable balance, bank settlement and support minutes.

No PAN, OTP, bank detail or password should be sent in chat or committed to GitHub.

## Owner packet B — Cashfree Direct (deferred)

- Verify the exact business category and new-merchant eligibility.
- Obtain written confirmation of the 0% promotional platform fee, ₹20 lakh sales cap and 31-Mar-2027 end date.
- Confirm excluded payment modes, GST treatment, chargebacks, risk reserves and default T+2 settlement.
- Do not select paid instant settlement.
- Complete merchant KYC and bank verification personally.
- Enable only after the primary experiment; direct gateway does not provide customer discovery.

## Owner packet C — Paddle (deferred global SaaS lane)

- Read the current Master Services Agreement (last updated 6-Oct-2026) and AUP.
- Confirm India supplier approval and exact account/entity eligibility.
- Confirm the product is bona fide software; no consulting, marketplace, sponsorship or automated candidate scoring/ranking/people categorization.
- Confirm whether the buyer use case supports UPI Autopay; do not assume ordinary one-time UPI.
- Confirm 5% + USD 0.50 checkout fee, USD 100 monthly payout threshold, monthly schedule and potential USD/EUR/GBP 15 SWIFT fee.
- Compare wire vs Payoneer route and total bank/FX costs.
- Have CA/AD bank confirm the Indian inward-remittance and documentation process.
- Owner alone accepts terms and completes account verification.

## Owner packet D — Lemon Squeezy (backup only)

- Verify whether an existing Stripe India account is pre-approved. New India Stripe accounts are invite-only since May 2024.
- If not pre-approved, use only a verified PayPal account if the owner accepts USD settlement and the full 5% + USD 0.50, international/PayPal surcharges and 3% non-US PayPal payout fee.
- Confirm USD 50 minimum, 13-day hold, twice-monthly payout and marketplace requirement of 3 own-store sales or USD 50 before listing.
- No store creation or integration until Getvik's first-sale gate is resolved.

## Owner packet E — PayPal / Payoneer

- Activate only when a real international payer or selected platform requires it.
- PayPal India supports international payments only; automatic daily bank transfer may take up to 5 business days.
- Payoneer India withdrawal may take up to 48 hours, with 1%–4% withdrawal fee and a possible USD 29.95 annual account fee below USD 6,000 received over 12 consecutive months.
- Owner completes KYC, PAN, bank and purpose-code details directly with the provider.

## Owner packet F — Crypto/VDA (hold)

Before any crypto acceptance is reconsidered, obtain:
1. Indian counsel's written classification of the exact merchant acceptance, transfer, custody and conversion flow;
2. CA's written view on Income-tax Act 2025 VDA provisions and transaction-specific TDS scope;
3. AD bank's written confirmation of the intended INR settlement route;
4. provider-specific FIU-IND reporting-entity verification and current operating status;
5. documented CDD/PAN, sanctions, Travel Rule, transaction monitoring, STR and recordkeeping controls where applicable.

No self-custody wallet, P2P transfer, stablecoin payment, NFT/token issue, smart-contract payment, private-key handling, signing or conversion is authorized.

## Mission accounting

Count only the net amount actually credited to the controlled bank account after platform fees, processor fees, GST on fees, FX/bank charges, refunds and reversals. Pending balances, marketplace counters and on-chain confirmations do not count.

**Current baseline:** ₹0 verified realized net receipts; ₹0 authorized spend; 0 evidenced paying customers.

## Evidence correction — 13-Nov-2026

### Cashfree offer economics and settlement
- 0% waives the eligible domestic platform fee only; GST on the standard 1.95% platform fee may still be charged. Cashfree's official example is ₹351 per ₹1 lakh eligible GMV.
- General UPI page states T+2; new-merchant offer page advertises T+1 for eligible merchants. Use T+2 until the signed/owner-visible merchant terms confirm T+1.
- International card rate is 2.99% + GST and is outside the domestic promotion.
- Instant settlement starts at 0.30% + GST; do not enable under the ₹0 spend rule.

### Paddle category clearance
Paddle AUP explicitly prohibits regulated financial services/advice and payment services. The recruitment-agency receivable/commission product must receive written category approval from Paddle before account creation or integration. If the product is classified as a prohibited financial service/payment service, do not use Paddle. The candidate is HOLD_FOR_EVIDENCE, not approved for validation.


## Paddle UPI confirmation — 13-Nov-2026

Paddle's official Developer Docs confirm that Indian buyers can pay with UPI for **one-time purchases and subscriptions**, processed in INR, without the seller needing a local Indian bank account or separate UPI merchant account:
https://developer.paddle.com/concepts/payment-methods/upi/

Do not confuse this with seller payout. The seller still receives money through wire transfer or Payoneer, subject to the USD 100 minimum monthly payout threshold and the 15th-of-month schedule. This improves buyer checkout convenience but does not create marketplace traffic. The written product-category approval gate under Paddle's AUP remains mandatory.
