# Phase 34 — Marketplace selection and private product packaging (2026-11-12)

## Executive decision
**First validation storefront: Getvik Free.**  
**Secondary distribution option: ownstreet Free, after one genuine paid sale.**  
**Do not activate paid plans, publish products, accept platform terms, or submit KYC without explicit owner approval.**

Getvik currently offers the best combination among the reviewed no-upfront options:
- public discovery marketplace with category browsing and visible product sales counters;
- Indian UPI/card checkout through Cashfree;
- automatic digital file delivery;
- ₹100 minimum settled balance for manual payout request;
- platform states payout usually completes within 2–3 business days;
- Free plan is ₹0/month, 10% sales fee + 18% GST on that fee, plus gateway charges and GST on gateway fees.

The current Terms are effective 9 November 2026. They require PAN, legal name, own-name UPI ID and bank account, and acceptance of a Payout Declaration before publishing and payouts. Registration/usage is legal acceptance of terms. Getvik also requires creators to own product IP and provide reasonable buyer support. This remains an owner-only legal/KYC gate.

## Marketplace demand observations
Public Getvik Discover pages currently show:
- ₹99 Big4 career guide: 416 sold
- ₹199 Excel Practice Workbook (100 real-world challenges): 148 sold
- ₹799 Excel Career Pack: 51 sold
- ₹199 Pivot Table Mastery Pack: 21 sold
- ₹19 RPSC Modern History PYQs: 65 sold

These are platform-displayed counts, not independently audited sales. They show that practical education and Excel workbooks have some buyer activity on the marketplace. They do **not** prove demand for a recruitment agency cashflow tool.

Getvik's Business & Finance category page has much weaker visible sales on its first page than the Learning/Excel examples. This is a material caution for our B2B recruitment product.

## Channel comparison

| Channel | Discovery | India payout | Fee model | Important gate | Decision |
|---|---|---|---|---|---|
| Getvik | Public Discover marketplace with displayed sales counters | UPI/bank; ₹100 settled threshold; usually 2–3 business days | Free: 10% + 18% GST on fee + Cashfree gateway fees | PAN/legal name/own-name UPI+bank; Payout Declaration; seller support obligations | First validation candidate |
| ownstreet | Public marketplace with 326 creator stores; listing after first paid sale | Bank payout batches often same day or T+1–2 working days | 0% platform fee; Razorpay gateway fees | Free plan 1 live product and up to 5 paid sales; marketplace requires first sale | Secondary after first sale |
| Topmate | Marketplace and storefront; first sales often from creator's own audience | INR request processed within 7 days; ₹500 minimum | 10% own link / 20% marketplace + at least 2% INR fee + GST on platform fee | First withdrawal 7 days after first paid booking | Secondary if audience-led |
| Qxel | Marketplace and storefront claims | 3–5 business days stated on pricing page | Standard 6%; temporary 2% anniversary promo until 17 Jan 2027; gateway/taxes extra | Public payout documentation link returned 404; minimum unknown | Hold |
| Srotabase | Marketplace and storefront | 7-day buyer-protection window stated; exact payout timing/minimum unclear | 4% own sales / 10% marketplace sales; UPI MDR above ₹2,000; GST/TDS may apply | Young platform; account terms and settlement unknown | Hold for evidence |
| Gumroad | Strong global marketplace but Discover fee is high | India local-bank INR payout; standard USD 100 threshold; 7-day hold | Direct 10% + USD 0.50 + processor fees; Discover 30% | High fixed fees at low ticket | International secondary |

## Getvik fee model — Free plan
Platform fee = 10% of sale price. GST on platform fee = 18% of that 10%, or 1.8% of sale price. Therefore, before Cashfree gateway charges and seller tax, estimated remainder is 88.2% of sale price.

| Price | Platform fee | GST on platform fee | Remainder before gateway fees/tax |
|---:|---:|---:|---:|
| ₹499 | ₹49.90 | ₹8.98 | ₹440.12 |
| ₹799 | ₹79.90 | ₹14.38 | ₹704.72 |
| ₹999 | ₹99.90 | ₹17.98 | ₹881.12 |
| ₹1,499 | ₹149.90 | ₹26.98 | ₹1,322.12 |

Do not treat this as final net payout. Cashfree processing fee and GST on gateway fees are additional and account/payment-method dependent.

## Product-specific fit
Recruitment Agency Revenue Assurance Desk v0.2.0 is a real, original offline HTML utility. It is not an ATS or recruiting service. It handles installment cash receipts, commission on collected cash, commission paid, guarantee events, ageing and client concentration. It stores no candidate PII.

However:
- competitor platforms already offer placement fee/ledger features;
- Getvik marketplace data proves activity in Excel/learning downloads, not recruitment finance tools;
- the B2B product's willingness-to-pay is still unknown;
- offline-only storage limits multi-user/cloud collaboration;
- Getvik Terms require reasonable creator support, which creates a potential human-support burden.

Decision: prepare a private product package and test only after owner approves publication. Do not build another generic product or claim product-market fit.

## Private distribution package
- Packaging workflow: `.github/workflows/package-recruitment-product.yml`
- Build script: `scripts/package_recruitment_product.py`
- Artifact run: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43159154725
- Artifact: `recruitment-agency-revenue-assurance-v0.2.0-private`
- Artifact ID: 13916748314
- Artifact SHA-256: `8922555b32ab88ffabccff39ac33dfae9797b7528e6b445867ca17cc55b70b34`
- Artifact expiry: 12 Dec 2026 (30-day retention).
- Package includes app, README, Hindi guide and package instructions/manifest. It is explicitly marked PRIVATE_DRAFT_NOT_FOR_PUBLICATION.

## Proposed demand test
Only after explicit owner approval and secure owner-only KYC/legal steps:
1. Publish one product on Getvik Free; no paid plan.
2. Use an accurate niche description and a demo video/screenshot; no fabricated reviews or sales.
3. Observe genuine marketplace discovery and conversion for 14 days.
4. Record product-page views, checkout starts, completed paid orders, refunds, actual payout and support minutes.
5. Proposed stop rule: after 100 qualified product-page visits with zero paid orders, pause and reposition; if recurring support burden becomes material, stop or redesign.

This is an experiment threshold, not a platform benchmark or revenue forecast.

## Owner gates
- Account creation and legal acceptance of Getvik Terms.
- PAN, own-name UPI ID and bank details entered only by owner on platform.
- Payout Declaration / tax and IP obligations.
- Final commercial license, refund terms and support channel.
- Product price and public publication approval.
- Any genuine test purchase that creates a cost.

## Evidence and source links
- Getvik current Terms (effective 9 Nov 2026): https://getvik.com/terms-of-service
- Getvik payout/fee flow: https://getvik.com/sell-digital-products-upi
- Getvik public Discover catalogue: https://getvik.com/discover
- Getvik business/finance category: https://getvik.com/discover/business-finance
- Getvik current homepage / plans: https://getvik.com/
- ownstreet help and plan limits: https://ownstreet.in/help
- ownstreet marketplace and sales counters: https://ownstreet.in/marketplace
- Topmate current fees: https://topmate.io/fees
- Topmate payout guidelines: https://topmate72420835211887570.freshdesk.com/support/solutions/articles/1070000141051-topmate-payout-guidelines
- Qxel pricing: https://www.qxel.in/pricing
- Srotabase Terms: https://srotabase.com/terms
- Gumroad payout: https://gumroad.com/help/article/13-getting-paid
- Gumroad fees: https://gumroad.com/help/article/66-gumroads-fees

## Mission accounting
Verified realized net receipts: ₹0. Authorized spend: ₹0. No account created, no KYC submitted, no terms accepted, no product published.
