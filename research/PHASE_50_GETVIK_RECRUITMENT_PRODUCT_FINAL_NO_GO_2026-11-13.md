# Phase 50 — Recruitment Agency Revenue Assurance Desk / Getvik Requalification: NO-GO

**Audit date:** 13 November 2026  
**Authority:** MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md  
**Queue task:** P50-001  
**Decision:** **NO-GO for a Getvik launch as a scalable ₹10 Cr revenue product under current evidence.**  
**Product disposition:** Preserve v0.3.0 privately as a reusable asset; do not add features, package a new release, onboard or publish.  
**Spend:** ₹0 authorised. No Getvik account, PAN/KYC, payout setup, Payout Declaration, terms acceptance, paid plan, public listing or test purchase was performed.

---

## 1. Executive verdict

The existing Recruitment Agency Revenue Assurance Desk v0.3.0 is technically functional and previously passed deterministic tests and Chromium/Firefox QA. That is engineering evidence only.

The current market and distribution evidence does not support a commercial GO:

1. **The core recruitment finance problem is real**, but several direct vendors now advertise placement invoicing, collections/receivables, recruiter commission splits, replacement guarantees and payment-linked commission controls.
2. **The strongest Indian substitutes include free entry tiers**: MoneyGence says its first two clients are free forever; WePlacement offers the first agency-owner seat at ₹0 forever; HireXL has a free solo ATS tier; IT Ways publishes ₹999–₹1,999/month plans.
3. **Our product is functionally narrower and technically less connected** than those alternatives. It is a single offline HTML app with local browser storage, anonymous references and no candidate PII. It has no invoice generation, bank reconciliation, cloud sync, multi-user collaboration, ATS integration, reminders, or automatic data capture.
4. The differentiator — offline, no-account, no-candidate-PII financial control beside an existing ATS — is plausible but not proven to be important enough to make buyers choose this app over free spreadsheets or broader free/low-cost products.
5. **Getvik's current Business & Finance discovery category is not a demonstrated recruitment-agency buyer channel.** Its visible results are primarily inexpensive generic business guides and budget sheets. The top visible Business & Finance product in the captured page showed 12 sales; nearby products showed 1–2, or had no counter displayed. This category snapshot is not a complete lifetime sales report, but it does not prove the specialised audience or volume needed.
6. Getvik itself explicitly says a storefront does not create demand. Its product-discovery surface exists, but its public guidance emphasises sharing the store with the creator's audience. This conflicts with the mission's no-cold-outreach/no-manual-sales/no-audience-assumption constraints.
7. At the proposed ₹499/₹799/₹999 one-time price points, the platform fee alone implies roughly **1.13 lakh–2.27 lakh independent paid orders** to reach ₹10 crore in platform-credited net earnings, before Cashfree gateway fees, gateway GST, refunds, affiliate commission and other costs. No acquisition evidence supports this order volume.
8. Therefore, launching the product simply because it is already built would create activity, not a credible path to the target.

**Final:** P50-001 is complete with NO-GO for Getvik publication in the current mission sequence. Keep the product private; do not destroy it. Move to the next ranked platform candidate, CrazyGames / Orbit Relay, and run its own evidence gate before any new build or publication.

---

## 2. Existing product: actual capability and limits

**Recruitment Agency Revenue Assurance Desk v0.3.0** is an offline-first single HTML application.

### What it genuinely does
- Anonymous placement/client/recruiter reference ledger.
- Installment-level cash receipt events.
- Outstanding placement fee calculation.
- Recruiter commission earned only from cash actually received.
- Recruiter commission paid/unpaid reconciliation.
- Guarantee claim, replacement and resolution event history.
- Invoice reference/date/due date and receivable ageing.
- User-configured late-payment and payment-linked guarantee flags.
- Client concentration and guarantee expiry watchlist.
- JSON backup/restore and Hindi user guide.

### What it does not do
- No ATS, candidate database, CV storage, sourcing or job-board functionality.
- No invoice creation, GST/TDS calculations, accounting, bank reconciliation or payment collection.
- No cloud sync, multi-user collaboration, central admin or mobile/cloud access.
- No email/WhatsApp reminders or external system integrations.
- No automatic verification of bank receipts, contractual clauses or legal guarantee validity.
- No technical licence-key enforcement in v0.3.0.

This boundary is important: do not describe it as accounting, receivable automation, a CRM, or a production SaaS.

---

## 3. Ground-level competitor audit

Public vendor pages were checked on 13-Nov-2026. Features and prices are vendor-published claims, not independent product tests or audited sales data.

| Competitor | Current public offer | Pricing / free tier | Overlap with our product |
|---|---|---|---|
| **MoneyGence — Recruitment Agency Cash OS** | Recruitment-specific client finance; placement fees, search retainers, contract staffing, invoicing, collections, receivables, payment reminders, bank reconciliation, client revenue/cash visibility and ageing | First 2 clients free forever; Starter ₹1,999/month; Growth ₹4,999/month; Scale ₹9,999/month | Very high on core client finance and ageing; broader financial workspace |
| **IT Ways Placement Agency CRM** | Placement GST invoices, client payment ageing/reminders, recruiter split ledger, commission on invoice clearance, 30/60/90-day replacement warranty countdowns, recruiter incentive ledger | Starter ₹999/month; Growth ₹1,499/month; Enterprise ₹1,999/month | Direct overlap in the exact three-way combination of invoicing, commissions and guarantee tracking |
| **WePlacement Recruitment Operating System** | First owner seat free forever; GST/TDS invoicing, 90-day guarantee alerts, sub-vendor split-fee portal, commissions held until client payment clears, workflow automations | First seat ₹0; additional recruiter seats ₹449/month + GST | Direct overlap in cash/payment-linked commission and guarantee workflows; stronger ATS/network distribution |
| **HireXL ATS for Agencies** | Placement/revenue tracking, recruiter commissions, invoice status per placement/client, client portal, multi-client pipeline and AI/ATS functions | Free 1-user tier; revenue tracking/commission features start on Growth at ₹14,999/month | Direct overlap in placement finance within a broader ATS |
| **CollectedHQ (international)** | Recruiting-firm commission tracking, complex tier/split accuracy, retained installments, guarantee tracking, invoice visibility, AR ageing, collection and recruiter payment workflows | Public pricing not displayed on reviewed page; free-start/demo path | Confirms that commission + retained installments + guarantee + AR is an established dedicated product category |

### Direct sources
- MoneyGence recruitment finance: https://moneygence.com/for-recruitment-agencies
- MoneyGence pricing: https://moneygence.com/
- IT Ways agency CRM: https://itways.in/placement-agencies-crm/
- WePlacement agency product: https://weplacement.com/for-agencies
- HireXL agency product: https://www.hirexl.ai/solutions/recruitment-agencies
- HireXL pricing: https://www.hirexl.ai/pricing
- CollectedHQ: https://www.collectedhq.com/

### Competitive decision

The existing feature set is not differentiated. Competitors explicitly offer the exact financial outcomes that motivated our build:
- money received vs outstanding;
- invoice ageing and reminders;
- commission earned or payable only when cash is collected;
- recruiter/team split ledger;
- guarantee countdowns and replacement windows.

Our unique claims are limited to offline storage, absence of candidate PII and no-account setup. Those may appeal to a small owner who wants an isolated local record, but no independent buying evidence proves that this advantage outweighs loss of collaboration, sync, invoices and integrations.

**No further feature development is approved to chase competitor parity.**

---

## 4. Getvik marketplace discovery: what is actually visible

### Category snapshot

The public Business & Finance category was accessible:
https://getvik.com/discover/business-finance

At the time of capture, the visible category was mainly:
- creator/business guides;
- trading and online-income ebooks;
- free or low-price budget templates;
- generic business playbooks;
- simple finance trackers.

Examples visible in that category included:
- “The First Users” at ₹5+ with 12 displayed sales;
- “Order Blocks + Trendlines” at ₹89 with 2 displayed sales;
- a free monthly budget template with 2 displayed sales;
- “Online Income Blueprint” at ₹49 with 1 displayed sale;
- “Your First ₹10K Online” at ₹49 with 1 displayed sale;
- a small-business mushroom guide at ₹49 with 1 displayed sale;
- other items without a visible sales count in the captured page.

These counters are displayed by Getvik and do not establish when the sales happened, monthly visits, conversion rates, repeat purchases, independent audit or demand for our product.

### Wider marketplace examples

The general Discover page displayed:
- B.Com-to-Big4 guide: ₹99, 416 sales;
- Excel practice workbook: ₹199, 148 sales;
- Excel Career Pack: ₹799, 51 sales;
- employee leave/meeting calendar: ₹99, 12 sales.

The employee calendar is HR-adjacent, but it is a simple leave/meeting template, not recruitment-agency finance software. The ₹499 India Salary + UPI Budget Tracker showed 0 sales at capture. These examples show that low-ticket downloadable templates can transact on the platform, but they do not establish the specialised agency-owner market.

### Platform's own distribution warning

Getvik's About page explicitly states: **“A storefront does not create demand on its own.”** It advises creators to explain their offer and share it with their audience.

Official source: https://getvik.com/about-us

Getvik provides Instagram AutoDMs on the Free plan for up to 2,000 people reached per month, but those automations rely on a creator's existing Instagram professional account, audience activity and eligible comments/messages. The tool is not an autonomous source of new recruitment-agency buyers.

A configurable affiliate commission also exists, but no relevant recruitment/agency affiliate distribution network or committed affiliates were evidenced. Affiliate availability alone is not distribution.

**Discovery decision:** Getvik is a functioning storefront with public product discovery, but the current evidence does not show that its Business & Finance category can produce the required independent recruitment-agency buyer volume without an external audience or manual promotion.

---

## 5. Getvik current fee, payout and seller obligations

### Current Free plan pricing

Official pricing page:
https://getvik.com/pricing

- Free plan: ₹0/month.
- 10% platform sales fee.
- 18% GST on the platform fee.
- Cashfree gateway fees are additional, including GST on those gateway charges.
- Buyer checkout: UPI, cards and netbanking.
- Digital file delivery is automated.
- Creator can set a product affiliate commission; that commission is deducted from creator earnings.
- Paid Basic and Pro plans are not justified before meaningful recurring sales and are not authorised.

### Important term hierarchy / documentation issue

The current Getvik Terms are effective 9-Nov-2026:
https://getvik.com/terms-of-service

They calculate the platform fee on the total discounted sale price, then deduct platform fee, GST on that fee, gateway charges and affiliate commission before creator earnings are credited.

The Privacy Policy page captured in this audit shows a different older wording for the commission base (net amount after gateway fees), while the newer Terms and current Pricing page describe the fee on the sale amount. This is a platform documentation inconsistency. Before any future listing, the actual creator-dashboard transaction preview and written platform clarification should be treated as the final fee evidence.

### Payout / account obligations

The current Terms require, before publication and payout:
- PAN;
- legal name;
- own-name UPI ID;
- complete own-name bank account details;
- accepting the Payout Declaration.

The Payout Declaration includes tax, IP and banking confirmations. Getvik may delay payouts, place reserves or reverse earnings for fraud, disputes, chargebacks or legal requests. The current stated minimum manual payout request is ₹100 of settled balance. Getvik advertises typical 2–3 business day processing, but the Terms make balances conditional on receipt of cleared and settled processor funds.

No KYC or payout action was performed. The owner-only gates remain untouched.

### License and support

The Terms state:
- creators must own or have rights to all IP;
- creator must provide honest descriptions and product delivery;
- creator must maintain active contact channels and reasonable, timely buyer support;
- default buyer licence is personal/non-commercial unless the creator chooses a different licence type;
- refunds can be required for misdescription, non-delivery, malware or applicable legal rights;
- chargebacks and copyright removals can reverse balances and create larger creator liability.

The product's draft commercial single-organisation licence needs to be selected and made consistent with the actual Getvik listing licence option. v0.3.0 has no technical licence-key enforcement.

---

## 6. Net unit economics — one-time sale

Getvik Free platform fee + GST on the fee equals:

`10% + (18% × 10%) = 11.8% of the buyer's discounted sale price`

The following values are **before Cashfree gateway charges, GST on gateway charges, affiliate commission, refunds/reversals and creator's own tax liabilities**.

| One-time price | Platform fee | GST on platform fee | Earnings before gateway | Orders for ₹1 Cr PCNE* | Orders for ₹10 Cr PCNE* |
|---:|---:|---:|---:|---:|---:|
| ₹499 | ₹49.90 | ₹8.98 | **₹440.12** | 22,722 | 227,212 |
| ₹799 | ₹79.90 | ₹14.38 | **₹704.72** | 14,191 | 141,901 |
| ₹999 | ₹99.90 | ₹17.98 | **₹881.12** | 11,350 | 113,493 |

*Mathematical sensitivities only, using rounded displayed per-order earnings before gateway fees. Actual order requirements would be higher after gateway deductions, refunds, affiliates and other costs. No conversion rate, sales forecast or timeline is assumed.

### Scale test

The current product is a single-download, one-time licence. It has no recurring subscription, cloud service, usage billing or renewals. The order counts above are not impossible in the abstract, but no credible buyer acquisition, marketplace traffic, affiliate network, conversion or retention evidence supports them.

The visible Getvik examples prove that some downloadable products sell, not that a niche B2B recruitment finance utility can produce 100,000+ orders.

**Economic decision:** The current Getvik one-time-download model is not a defensible primary route to the ₹10 Cr target.

---

## 7. GO / NO-GO gate matrix

| Gate | Result | Reason |
|---|---|---|
| Product built and basic QA | PASS | v0.3.0 already exists and previously passed product/browser QA |
| Buyer problem exists | PASS | Multiple vendors and the product category address recruitment collections, commissions and guarantees |
| Defensible feature gap | FAIL | Direct vendors already cover the exact core workflows, often more completely |
| Offline/no-candidate-PII value | UNKNOWN / WEAK | Plausible preference but no buyer evidence showing it drives purchase |
| Getvik niche discovery | FAIL / UNPROVEN | Business category is small/low-counter in the visible snapshot; no recruitment-agency audience evidence |
| Self-serve distribution without external audience | FAIL / UNPROVEN | Getvik says storefront alone does not create demand; no proven affiliate channel or organic buyer funnel |
| High-scale economics | FAIL / UNPROVEN | 113K–227K orders needed before gateway and reversals; no acquisition evidence |
| Seller / support / licence readiness | PARTIAL | Terms, licence selection and active support contact remain owner/platform gates |
| Overall decision | **NO-GO** | No credible self-serve distribution or differentiated paid gap for the ₹10 Cr mission |

## 8. Final product disposition

**Recruitment Agency Revenue Assurance Desk v0.3.0**
- Status: `NO_GO_GETVIK_SCALE_AND_DIFFERENTIATION`.
- Keep the source, tests, guide and private package.
- No feature build, no public listing, no Getvik KYC, no seller terms, no payout declaration, no purchase test, no paid plan, no ads and no publication.
- The app may be reused later as an internal asset or as part of a materially differentiated product if stronger evidence emerges.
- Do not describe a future private or internal reuse as a paid product or as validated demand.

P50-001 is complete. P50-002 through P50-005 are cancelled because the current product failed the commercial gate.

---

## 9. Next lane: Phase 51 — CrazyGames / Orbit Relay qualification

CrazyGames is the next platform in the current V4 opportunity order. The existing Orbit Relay prototype is not automatically approved for more development.

Phase 51 must verify:
1. The exact Orbit Relay build, prior testing, originality and platform readiness.
2. Current CrazyGames SDK, game review and Basic Launch → Full Launch requirements.
3. Realistic game-engagement and retention hurdles; the Basic Launch documentation currently specifies at least 7 live days and 500 plays, then review against platform engagement benchmarks.
4. Advertising monetisation mechanics and current revenue-share terms; no revenue per play or CPM assumption without evidence.
5. Minimum payout currently €100; payout profile is handled by Tipalti and payment-method availability depends on country.
6. Whether India payout eligibility, KYC and tax forms can be completed without bypass or unsupported assumptions. Do not submit them.
7. Whether Orbit Relay's current gameplay is sufficiently differentiated among CrazyGames titles; no clone or reskin.
8. Whether a no-spend build/test path exists and whether the game can plausibly produce repeat playtime and retention.

Official CrazyGames sources:
- Requirements / launch stages: https://docs.crazygames.com/requirements/intro/
- Game ranking and engagement: https://docs.crazygames.com/faq/
- Monetisation: https://docs.crazygames.com/requirements/ads/
- Payouts: https://docs.crazygames.com/payouts/

**Next task:** P51-001 — qualify Orbit Relay for CrazyGames with originality, engagement, platform and revenue-economics evidence. No new feature build or publication until a GO decision and any owner gates are satisfied.

**Financial truth:** verified platform-credited net earnings ₹0; bank-settled net receipts ₹0; authorised spend ₹0.
