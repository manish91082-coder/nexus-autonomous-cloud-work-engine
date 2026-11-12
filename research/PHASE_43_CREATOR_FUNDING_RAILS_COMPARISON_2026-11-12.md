# Phase 43 — Creator Funding Rails Comparison

**Date:** 2026-11-12  
**Task:** P43-008 completed  
**Purpose:** Identify payout rails that can support open-source/community funding independently of domestic digital-product storefronts.

## 1. Decision matrix

| Rail | India eligibility | Fees | Payout minimum/timing | Best use | Decision |
|---|---|---|---|---|---|
| GitHub Sponsors | India is a supported receiving region | Personal account 0% GitHub fee; organization up to 6% | First payout 60 days after first sponsorship; then within 30 days after month-end; Stripe Connect generally 22nd; cross-border minimum may apply | Open-source developer funding | **Primary OSS rail** |
| Buy Me a Coffee | India explicitly supported through Stripe Express | 5% platform + Stripe 2.9% + USD 0.30 + 0.5% payout; international +1%; subscriptions +0.5% | USD 10 minimum; first payout review and transfer typically 7–14 days; after approval weekly Wednesday schedule, Stripe/bank transfer commonly 2–7 business days | International supporter tips/memberships | **Secondary creator-support rail** |
| Patreon | India local INR bank transfer listed via Payoneer | 10% platform fee for new creators + payment processing + possible 2.5% member currency conversion + payout fee | USD 10 or local equivalent minimum for bank transfer; 5-day payout hold after first method/first payment; automatic withdrawal on 5th; typically 1–5 days after initiation | Recurring memberships and digital content | **Optional, higher-fee** |
| Ko-fi | PayPal India can receive only international payments; Stripe needs full Stripe Connect account; Ko-fi does not support Stripe Express | 0–5% Ko-fi fee + provider processing/FX | No Ko-fi minimum; direct to PayPal/Stripe, provider/bank timing applies | International-only tips/shop if provider works | **Low-priority fallback** |

## 2. Domestic INR product sales remain separate
For self-serve products sold to Indian customers, retain:
- Getvik: domestic UPI/card checkout, ₹100 payout threshold, 10% platform fee + GST on fee + gateway charges; account KYC/payout still pending.
- Topmate: own-link digital products 10% commission, marketplace 20%, INR transaction charge at least 2%; first payout opens 7 days after first paid sale; INR request processed within 7 days subject to review.
- Payhip + Razorpay: 5% Payhip free-plan fee plus processor charges; marketplace discovery requires USD 10 prior sales and approval.

These storefronts are not replaced by creator-support pages. One-time product sales and voluntary recurring sponsorships should be tracked as distinct revenue categories.

## 3. Net-fee implications
- GitHub Sponsors is the lowest platform-fee route for a personal account, but it requires a real open-source project and community support; it is not a discovery engine.
- Buy Me a Coffee is the faster independent supporter rail among the reviewed platforms but its fee stack is materially higher than GitHub Sponsors.
- Patreon has richer membership and digital-product tools but the 10% platform fee plus processing and FX can materially reduce low-ticket net revenue.
- Ko-fi is not suitable as a domestic India primary rail because PayPal India cannot receive domestic payments and full Stripe Connect availability needs confirmation.

## 4. Recommended architecture (conditional)
1. Domestic self-serve product: Getvik first; Topmate second; Payhip+Razorpay backup.
2. Open-source community: GitHub Sponsors primary once an OSS repository has genuine users and account approval.
3. International supporter diversification: Buy Me a Coffee secondary after Stripe Express onboarding is confirmed.
4. Patreon only if a content/membership audience forms; do not activate merely to add another logo.
5. Ko-fi only if PayPal international receipt or Stripe Connect account is confirmed and international audience justifies it.

## 5. Owner gates
All rails require account-level identity, tax and bank details; some require Stripe/Payoneer onboarding and legal terms acceptance. No account creation, KYC, bank/tax submission, terms acceptance or public page creation occurred. Confirm exact INR fees, conversion, cross-border payout minimum and account eligibility during owner-controlled onboarding.

## Official sources
- GitHub Sponsors supported regions and fees: https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
- GitHub Sponsors additional terms and timing: https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms
- Buy Me a Coffee India Stripe Express country list: https://help.buymeacoffee.com/en/articles/6258038-supported-countries-for-payouts-on-buymeacoffee
- Buy Me a Coffee fees: https://help.buymeacoffee.com/en/articles/8105744-how-to-calculate-charges-on-your-payment
- Buy Me a Coffee first payout review: https://help.buymeacoffee.com/en/articles/6364717-when-are-payouts-processed
- Patreon fees: https://support.patreon.com/hc/en-us/articles/11111747095181-Creator-fees-overview
- Patreon international payouts and India INR bank transfer: https://support.patreon.com/hc/en-gb/articles/39694936541965-Payout-guide-for-creators-outside-the-US
- Ko-fi payout and fee model: https://help.ko-fi.com/hc/en-us/articles/115003980093-How-do-I-get-paid
- Ko-fi Stripe account limitation: https://help.ko-fi.com/hc/en-us/articles/360009265834-Can-I-use-Stripe-in-my-country
- PayPal India domestic vs international receipt: https://www.paypal.com/in/cshelp/article/can-i-use-paypal-to-receive-payments-from-indian-customers-help1049

**Financial truth:** realized net receipts INR 0; authorized spend INR 0.
