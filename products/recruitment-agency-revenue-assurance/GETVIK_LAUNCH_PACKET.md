# Getvik Launch Packet — Recruitment Agency Revenue Assurance Desk v0.3.0

**Decision:** Getvik is the first channel to validate, not an approved/public launch.
**Current status:** Private package draft only. No seller account created, no KYC submitted, no terms accepted, no listing published.

## Why Getvik is first
- Public product discovery exists and displays completed-sale counters.
- India UPI/card checkout via Cashfree; automatic digital delivery.
- Free plan: no monthly charge; 10% platform fee + 18% GST on that fee + gateway charges.
- Manual payout request from ₹100 settled balance; platform says usually 2–3 business days.
- Public discovery examples include an Excel practice workbook with 148 displayed sales at ₹199 and an Excel career pack with 51 displayed sales at ₹799. These are platform-displayed counts, not independent audits and not proof of demand for this product.

## Product positioning
**Recruitment Agency Cashflow & Guarantee Control Desk**
A private, offline-first operational utility for recruitment agencies that need to reconcile placement-fee installments, recruiter commission earned only on collected cash, guarantee claims/replacements, receivable ageing and client concentration.

It is not an ATS, job board, candidate database, employment service or manual recruiting service.

## Proposed price experiment (not approved)
Test only after product and buyer-demand review:
- ₹499
- ₹799
- ₹999

No price is selected. Marketplace fee arithmetic below excludes Cashfree gateway charges and any seller tax:
- Getvik Free fee = 10% of sale + 18% GST on that fee = 11.8% of sale.
- ₹499: ₹440.12 before gateway charges.
- ₹799: ₹704.72 before gateway charges.
- ₹999: ₹881.12 before gateway charges.

Do not activate a paid Getvik plan. It is uneconomic before recurring sales evidence and violates the zero-upfront default.

## Owner-only gates before publication
1. Review Getvik Terms effective 9 November 2026. Account registration itself is legal acceptance.
2. Complete PAN, legal name, own-name UPI ID and bank details only through the platform's secure payout settings. Never send these details in chat or commit them to GitHub.
3. Review and accept the Payout Declaration and tax/IP/banking obligations.
4. Confirm the exact Cashfree gateway fee and GST shown for the account.
5. Approve a commercial internal-use license, refund policy, seller support channel and product price.
6. Approve publication explicitly.
7. Perform one genuine low-value test purchase only if the owner accepts the cost; no self-purchase, fake transaction or artificial review.

## Important platform obligations
- Getvik's current Terms require the creator to own or license all product IP and provide reasonable buyer support.
- Platform fee, 18% GST on the platform fee, Cashfree gateway fees and GST on gateway fees are deducted from proceeds.
- Minimum payout is currently ₹100 settled balance; platform may hold funds for fraud, chargebacks or compliance.
- Digital goods are generally final sale subject to consumer law and defects/non-delivery rules.
- Do not publish until support and license details are complete. This product is not technically license-key protected.

## Commercial unit-economics sensitivity (illustrative, not a forecast)

The figures below apply the documented 11.8% platform deduction only. Gateway charges, GST on gateway charges, seller tax, refunds, chargebacks and operating costs remain excluded until the seller dashboard and actual settlement statement provide exact amounts. These figures are therefore a contribution ceiling before the remaining deductions, not take-home income.

| Test price | Platform fee + GST on that fee | Balance before gateway/tax/refunds |
|---:|---:|---:|
| ₹499 | ₹58.88 | ₹440.12 |
| ₹799 | ₹94.28 | ₹704.72 |
| ₹999 | ₹117.88 | ₹881.12 |

Do not compare these balances with settled net receipts. Reconcile each actual order using:
- gross paid amount and currency;
- platform fee and GST on platform fee;
- payment-gateway fee and GST on gateway fee;
- refunds, reversals and chargebacks;
- seller taxes/withholding where applicable;
- amount credited to withdrawable platform balance;
- payout fee, if any, and amount actually settled to the owner's bank;
- attributable operating cost and final net INR.

No price or margin becomes approved merely because the arithmetic is positive.

## Pre-publication completeness gate

Before any public listing is enabled, ensure one owner-approved version of each item exists:
- product binary/package and SHA-256 checksum;
- final product title, version, screenshots and compatibility statement;
- commercial license text and license scope;
- refund/cancellation wording consistent with current platform terms and applicable consumer law;
- support channel monitored by the seller and a bounded support promise;
- exact price and complete seller-side deductions;
- privacy/data-handling statement (offline local storage, no candidate PII);
- truthful limitations (no ATS, cloud sync, accounting/GST/TDS computation, legal advice or license-key enforcement);
- final public listing preview and explicit publication authorization.

A missing item is a release blocker, not a detail to improvise after purchase.

## 14-day experiment measurement protocol

Start the clock only after the owner has completed secure onboarding and approved publication. No paid seller plan and no ad spend.

Daily record, using platform analytics/export where available:
- qualified product page views (define the platform's metric and avoid double-counting);
- checkout starts, if exposed;
- paid orders and distinct unrelated buyers;
- order gross, refunds/reversals and dispute status;
- platform/gateway/withholding deductions;
- withdrawable balance and payout request status;
- bank-settled amount and settlement date;
- support minutes and issue category.

Day 7: diagnose discovery vs conversion vs product objections; do not change multiple variables at once.
Day 14: decide continue/reposition/stop from observed evidence. A zero-order result is not fixed by inventing demand or buying traffic.

## Buyer-demand validation rule
A listing is not demand proof. The first gate is genuine completed paid orders from unrelated buyers. Track:
- qualified product page views
- checkout starts
- completed paid orders
- refunds/chargebacks
- net amount settled to bank
- support minutes per sale

Stop or reposition if 100 qualified product-page visits produce zero paid orders, or if support burden requires recurring manual work. This is a proposed experiment threshold, not a platform benchmark.


## Latest QA evidence
- Chromium + Firefox Playwright run: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43160901456 (SUCCESS).
- Checks include full placement/receipt/commission/guarantee journey, persistence, JSON backup/restore, financial-history deletion guard, labelled form controls, keyboard navigation, mobile overflow and no external network requests.
- Latest private package run: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43159877452 (SUCCESS).
- Latest verified private artifact ID: `13966678659` (package workflow run #34).
- Product ZIP SHA-256: `645dbd226c8f4802fc073a2a85fdcc449b08e8b317642652ae5b4ff9d218a405`.
- Artifact-wrapper digest: `sha256:805ba6aef321faf9ce2bdaab0656e98da02126c7c5c64330e7b1bdadc371727f`.

- Buyer FAQ: [CUSTOMER_FAQ_HI.md](CUSTOMER_FAQ_HI.md). It clarifies local storage, backups, receipt policy, commission calculation, guarantee event behavior and limitations to reduce recurring support.

- Latest package includes `CUSTOMER_FAQ_HI.md` and passed ZIP/CRC/checksum validation: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43159877452.


## v0.3.0 product differentiation gate
The product now records invoice reference/date/due date, uses due date for ageing, detects late receipts and shows a payment-linked guarantee risk flag only when the seller selects the signed-contract rule. It does not determine legal validity or void a guarantee. This is a stronger operational angle, but willingness-to-pay is still unproven.

- v0.3.0 formula/mission CI passed: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43160680889.
