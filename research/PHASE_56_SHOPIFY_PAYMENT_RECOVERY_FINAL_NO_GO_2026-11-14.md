# Phase 56 — Shopify Payment-Captured / Missing-Order Product Qualification
**Date:** 14 November 2026  
**Authority:** `MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md`  
**V4 platform rank:** #2 — Shopify App Store  
**Decision:** **NO-GO for a generally deployable automatic recovery app under the currently documented public API path**  
**Narrow technical lead:** custom/headless Razorpay Magic Checkout correlation only; no self-serve product selected  
**Spend / account / build / outreach:** ₹0 / none / none / none

## 1. Mission alignment
This evaluates a distinct problem, not the already rejected Shopify Flow Action Reliability Gateway. The problem is a customer payment captured by an external gateway while Shopify has no corresponding order. The mission requires self-serve, repeatable software, not bespoke merchant implementation or manual reconciliation.

## 2. Independent problem evidence
Three independent time-separated merchant reports describe this failure class:
- **5-Apr-2021, Shopify Community:** Razorpay merchant reports funds deducted while Shopify order creation failed; Shopify staff explains off-site gateway confirmation failures can leave partial data/abandoned checkout: https://community.shopify.com/t/payment-deducted-order-not-captured-happening-for-a-lot-of-orders-please-help/41957
- **12-Sep-2024, Shopify Community:** merchant reports two Razorpay test payments debited without reaching the completed page; checkout records appeared under Abandoned checkouts: https://community.shopify.com/t/payment-is-done-but-order-not-showing-in-my-store/357712
- **16-Jul-2026, Shopify developer community on Reddit:** developer reports captured Razorpay payment but missing Shopify order, and describes manually comparing Razorpay Dashboard to abandoned checkouts and creating draft orders: https://www.reddit.com/r/shopifyDev/comments/1uxd8w7/trying_to_understand-how-store-owners-handle/

Shopify's own help pages confirm that an off-site payment provider may capture payment while the required confirmation does not reach Shopify; the merchant must verify the gateway transaction and may recreate a draft order or seek reversal:
- https://help.shopify.com/en/manual/promoting-marketing/create-marketing/abandoned-checkouts
- https://help.shopify.com/en/manual/checkout-settings/troubleshooting-checkout-payments

These support a real failure mode, not market-wide incidence or willingness-to-pay. Any reported percentage is an individual merchant claim, not a population rate.

## 3. Direct and adjacent substitutes — capability boundaries
- **Fincile:** advertises unmatched-payment detection (Stripe/PayPal sync; Shopify Payments and other gateways via payout CSV upload), duplicate charges, refund mismatches and settlement reconciliation; paid plans from $29/month. This is a meaningful reconciliation substitute, but its public scope does not establish automatic Razorpay callback replay or universal order recovery: https://www.getfincile.com/
- **Rokda Payout Reconciliation:** matches Razorpay settlement CSV entries to Shopify orders/payments by payment ID and highlights amount differences, duplicates, refunds, fees and GST. This is a CSV settlement-reconciliation substitute, not documented webhook replay/order completion: https://apps.shopify.com/rokda-payout-reconciliation
- **A2X and Synder:** adjacent payout/accounting reconciliation products, not proof of this exact callback-recovery capability: https://www.a2xaccounting.com/ ; https://synder.com/
- Shopify abandoned-checkout investigation and Razorpay Dashboard remain manual operational substitutes.

**Disposition:** do not clone a generic payout/order reconciliation dashboard, CSV matcher or exception alert. Do not overstate incumbent scope as universal automatic callback recovery.

## 4. General Shopify App Store API feasibility
The public GraphQL `AbandonedCheckout` object documents checkout identity, customer, line items, pricing, timestamps and recovery URL. Its documented field list does not include a gateway transaction ID or payment timeline. An ordinary app therefore cannot assume it can join a Razorpay capture event to an abandoned checkout using this object alone:
https://shopify.dev/docs/api/admin-graphql/2026-01/objects/AbandonedCheckout

Shopify's Payments Apps API is restricted to approved Payments Partners. The Partner Program Agreement imposes additional approval and revenue-share requirements; it is not a general permission available to every new App Store developer:
- https://shopify.dev/docs/api/payments-apps/2026-07
- https://www.shopify.com/partners/terms

## 5. Razorpay Magic Checkout — documented but narrow
Razorpay's custom/headless Shopify guide describes a specific correlation route:
1. Create a Shopify cart and retain `shopify_checkout_id`.
2. Create the Razorpay order using that checkout ID.
3. Complete the Magic Checkout payment flow.
4. In the successful-payment callback, call `POST /1cc/shopify/complete` with Razorpay payment/order IDs; the response includes Shopify order details.

Official guide: https://tfs.np.razorpay.in/docs/payments/magic-checkout/shopify/custom/web-integration-nextjs

**Constraints:** this is for a custom React/Next.js headless storefront. Magic Checkout must be enabled and Razorpay's integration team must connect the merchant store/MID and authorize access. The public guide does not document an idempotency key or guaranteed safe replay after an uncertain timeout. It is not a universal replacement for the standard Shopify Razorpay plugin.

## 6. Technical and commercial decision
| Question | Finding |
|---|---|
| Is the failure real? | YES — three time-separated merchant reports plus Shopify guidance |
| Does AbandonedCheckout expose a documented payment transaction ID? | NO |
| Can an ordinary app assume Payments Apps API access? | NO — approved Payments Partner only |
| Does Fincile cover part of unmatched-payment reconciliation? | YES — published unmatched-payment feature; gateway coverage differs |
| Does Rokda cover Razorpay settlement reconciliation? | YES — CSV workflow, not documented callback replay |
| Is a Razorpay correlation route documented? | YES — custom/headless Magic Checkout only |
| Is replay/idempotency guaranteed in the public guide? | NOT ESTABLISHED |
| Qualified price-bearing WTP? | NOT ESTABLISHED |
| General automatic recovery app | **NO-GO** |

A merchant-specific headless integration would be bespoke implementation, outside the mission's self-serve model. A future read-only export matcher can only be reconsidered with a fresh product dossier, 10–15 substitute audit, qualified WTP, safe matching/error bounds and supported data path.

## 7. Financial and owner gates
No Shopify Partner/App Store or Payments Partner account created; no API credentials; no merchant outreach; no test payment, refund, PII processing, draft-order creation or automation. Developer registration fee remains unauthorized. PCNE ₹0; bank-settled receipts ₹0; authorized spend ₹0.

## 8. Final disposition
Close the generally deployable automatic recovery-app hypothesis as **NO-GO**. Retain Razorpay custom/headless Magic Checkout only as a technical research note. This does not permanently reject Shopify as a platform; it rejects this product hypothesis.
