# Phase 33 — India payout rail revalidation and net proceeds (2026-11-12)

## Decision summary
1. Topmate is a viable no-upfront storefront candidate, but it is not an instant-settlement rail. Current official payout guidelines dated 21 Oct 2026 say first withdrawal becomes available 7 days after first paid booking; INR withdrawals are processed within 7 days after request, with bank downtime/holidays potentially adding time. Minimum INR withdrawal is ₹500; below ₹500 attracts a flat ₹20 fee; ₹20 or less cannot be requested.
2. Gumroad provides India local-bank INR payouts, but its economics are materially less attractive for low-ticket products: 10% + USD 0.50 + card processing 2.9% + USD 0.30 for direct sales; 30% flat marketplace fee. Standard balance hold is 7 days; India bank payout is weekly (Tuesday) and bank processing can take 2–7 business days. Standard payout threshold is USD 100. Account-level onboarding and eligibility still need confirmation.
3. Payhip + Razorpay remains a credible India checkout alternative. Payhip Free adds 5% per sale; Razorpay online transaction fee is typically around 2% depending on payment method/region. Merchant KYC, exact account fee, refund/chargeback and settlement configuration remain account-level gates.
4. No platform account was created, no terms accepted, no product published and no payment was made.

## Topmate fee arithmetic — indicative only
Official pricing says 10% commission for own-link/profile sales and 20% for marketplace-discovery sales. INR transaction fee is at least 2%, or the higher actual gateway charge. Official payout guidance states 18% GST applies to Topmate's fee on INR payments. The table below assumes exactly 2% gateway/transaction fee and 18% GST on the combined platform commission + transaction fee. It excludes higher gateway fees, refunds, seller income tax and any other adjustments.

| Customer price | Own-link net before seller tax | Marketplace net before seller tax | Withdrawal treatment |
|---:|---:|---:|---|
| ₹499 | ₹428.34 | ₹369.46 | Below ₹500: ₹20 withdrawal fee if withdrawn alone |
| ₹999 | ₹857.54 | ₹739.66 | Above ₹500 minimum |
| ₹1,499 | ₹1,286.74 | ₹1,109.86 | Above ₹500 minimum |
| ₹2,999 | ₹2,574.34 | ₹2,220.46 | Above ₹500 minimum |

Calculation: own-link platform charge = 10% + 2%; marketplace = 20% + 2%; GST = 18% of that fee. Net = price − fee − fee-GST. The withdrawal deduction for ₹499 assumes a standalone withdrawal below ₹500; aggregating multiple sales can change this.

**Implication:** do not choose ₹499 as a default Topmate price without considering the minimum withdrawal friction. ₹999 is a more efficient test point mathematically, but is not a recommended final price until buyer willingness-to-pay is established.

## Platform comparison
| Channel | India payout / fee evidence | Settlement friction | Current status |
|---|---|---|---|
| Topmate | India bank payout supported; 10% own link / 20% marketplace; INR transaction fee at least 2%; GST on platform fee | First payout after 7 days from first paid booking; request processing within 7 days; ₹500 minimum | Strong candidate for a first storefront test, but account KYC pending |
| Gumroad | India bank payout in INR; direct 10% + $0.50 + 2.9% + $0.30 card processing; Discover 30% | 7-day balance hold; India bank payout weekly Tuesday; 2–7 business days; standard USD 100 threshold | Better for global digital goods, weaker low-ticket economics |
| Payhip + Razorpay | Payhip Free 5% + Razorpay processing, typically ~2% depending on method | Merchant KYC and Razorpay settlement/risk settings apply; confirm in account | Potential India-first checkout; account gate remains |

## Source evidence
- Topmate fee schedule: https://topmate.io/fees
- Topmate payout guidelines, modified 21 Oct 2026: https://topmate72420835211887570.freshdesk.com/support/solutions/articles/1070000141051-topmate-payout-guidelines
- Topmate payout methods and bank support: https://topmate72420835211887570.freshdesk.com/support/solutions/articles/1070000111278-payouts
- Gumroad fee schedule: https://gumroad.com/help/article/66-gumroads-fees
- Gumroad India payout and hold schedule: https://gumroad.com/help/article/13-getting-paid
- Payhip Free plan fee: https://payhip.com/features/sell-online
- Payhip + Razorpay India integration and gateway fee: https://help.payhip.com/article/368-connect-your-razorpay-account

## Hard-gate status
- India eligibility: documented from official platform pages; individual account eligibility still pending.
- KYC / tax declarations / legal terms: owner-only, untouched.
- Product demand: not yet verified.
- Realized net receipts: ₹0.
- Authorized spend: ₹0.
- No revenue forecast is made from platform-reported sales counts or fees pages.
