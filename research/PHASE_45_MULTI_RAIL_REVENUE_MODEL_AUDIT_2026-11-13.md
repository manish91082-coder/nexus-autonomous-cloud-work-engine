# Phase 45 — ₹10 Cr मिशन: One-time-setup Revenue Models और Multi-Rail Audit
**Audit date:** 13 November 2026  
**Repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine` / `master`  
**Status:** Private research and control-plane update only. कोई account नहीं खोला गया, KYC नहीं हुआ, terms स्वीकार नहीं किए गए, product publish नहीं हुआ, कोई खर्च या fund movement नहीं हुआ।

## 1. Executive decision

**Mission goal unchanged:** ₹10,00,00,000 के लक्ष्य की गणना केवल verified, settled, controlled और reconciled net receipts से होगी। इस audit के समय ledger में **₹0 realized net receipts**, **₹0 authorized spend** और **0 evidenced paying customers** हैं।

इस audit में मौजूदा 34 opportunity candidates की पुनर्समीक्षा की गई और तीन अतिरिक्त rail/model candidates जोड़े गए:

1. **Getvik** — अभी भी सबसे तेज़ संभावित first-sale path और एकमात्र P1 first-cash pilot। Marketplace discovery मौजूद है, लेकिन हमारे Recruitment Agency Revenue Assurance Desk की demand सिद्ध नहीं है।
2. **Cashfree Direct INR Checkout** — P2 fallback: eligible new merchants के लिए 31-Mar-2027 तक ₹20 lakh sales cap पर advertised 0% promotional platform fee; default settlement T+2। यह checkout देता है, buyers नहीं।
3. **Paddle Billing** — P2 high-upside global SaaS/MoR route। India unsupported-country list में नहीं है; $100 minimum monthly payout, 5% + $0.50 checkout fee। Official methods list में **UPI Autopay** है, लेकिन ordinary one-time UPI payment की उपलब्धता current docs से सिद्ध नहीं होती।
4. **Lemon Squeezy** — P2 backup/hold। India bank payouts listed हैं, पर May 2024 से नए Indian Stripe accounts invite-only हैं; बिना pre-approval PayPal route, 13-day hold, $50 payout minimum और अतिरिक्त international/PayPal/payout fees।
5. **PayPal और Payoneer** — payout endpoints हैं, customer-acquisition models नहीं। इन्हें तभी activate करना है जब वास्तविक international payer या चुना हुआ platform payout route हो।
6. **Crypto/VDA** — अभी qualifying revenue rail नहीं। FIU-IND का activity-based PMLA framework, CDD, Travel Rule, monitoring, sanctions, records और transaction-specific legal classification इसे one-time setup से चलने वाला low-risk route नहीं बनाते। No-go/hold जारी।

**Execution rule:** Getvik first-sale experiment को parallel storefronts से dilute नहीं करना है। P44-004 owner gate पूरा होने तक कोई launch नहीं। उसके बाद भी first-sale evidence आने के बाद ही दूसरा channel चुना जाएगा।

## 2. “One-time human setup” की कसौटी

किसी model को तभी qualifying माना गया जब:

- product एक बार तैयार होने के बाद checkout, delivery/access control, renewal और basic reconciliation software से चल सकें;
- प्रत्येक sale के लिए manual proposal, negotiation, custom service या human fulfilment आवश्यक न हो;
- recurring human work सीमित और स्पष्ट हो: bug/security updates, customer support, refunds/chargebacks और compliance reviews;
- कोई paid API, hosting, domain, ads या subscription ₹0 spend सीमा तोड़े बिना आवश्यक न हो;
- platform eligibility, India payout और IP rights official source से जाँचे जा सकें।

“100% unattended” का दावा नहीं किया गया। किसी भी real software business में support, security और legal obligations शेष रहते हैं।

## 3. Revenue-model universe: क्या qualify करता है?

| Model family | Post-setup automation | First-sale risk | Settlement reality | Risk-adjusted verdict |
|---|---|---|---|---|
| Original digital downloads, spreadsheets, calculators, templates, reports | High: auto checkout + auto delivery | Marketplace traffic होने पर comparatively faster; product-specific demand अभी unproven | Getvik: ₹100 threshold, request के बाद सामान्यतः 2–3 business days; platform/gateway deductions अलग | **P1 first-cash** |
| Self-serve B2B SaaS / micro-SaaS | High: recurring billing + webhook-based access | Product approval और own distribution के कारण uncertain; no defensible day estimate | Paddle: $100 monthly threshold, payout by 15th, arrival up to 3 working days | **P2 high-upside** |
| Direct INR checkout / payment links | High if delivery webhook is built | Own traffic required; gateway does not create demand | Cashfree default T+2; optional instant settlement is paid | **P2 fallback** |
| API/data subscriptions | High after data pipeline, access control and monitoring | Demand, data rights and update reliability unproven | Cashfree/Paddle/other gateway terms apply | P2 conditional; current data-product niche not cleared |
| Software licenses, plugins and developer tools | High after approval and license delivery | Marketplace acceptance/install thresholds can delay sales | Platform-specific thresholds and payout cycles | P2/P3; GitHub Marketplace is not a first-cash route |
| Stock asset licensing | Medium-high after catalog upload; curation/review remains | Asset acceptance and search discovery uncertain | Adobe Stock payout threshold/first-sale wait already recorded in registry | P2/P3 long-horizon |
| Original eBooks / recorded courses | High delivery automation; editorial quality remains human | Audience/review discovery uncertain | KDP is a long royalty cycle, not rapid cash | P2/P3 long-horizon |
| HTML5 games / game assets | Medium-high after approval; patches and support remain | Discovery and platform approval uncertain | Platform-specific thresholds/holds | P3 |
| GitHub Sponsors / creator support / memberships | Low-medium as a one-time setup model: recurring value and audience cadence are required | Adoption/community-dependent | GitHub Sponsors, Buy Me a Coffee and Patreon terms already in payout registry | P2/P3, not first-cash |
| Affiliate / advertising / YouTube | Medium automation but requires continuing traffic/content and policy compliance | Threshold and audience growth make first payout slow/uncertain | Platform minimums and monthly payout cycles | P3 |
| Direct crypto, stablecoin, NFT or token licensing | Technically automatable, but legal/compliance work is not one-time | No verified buyer channel or lawful INR settlement path | No compliant end-to-end settlement route selected | **HOLD / NOT ACTIVATED** |
| Consulting, manual gigs, custom assignments | Not one-time; human delivery is the product | Sales may be quick but recurring labour is unavoidable | Client-specific | **Excluded from this mission’s automation criterion** |

## 4. Demand evidence: what it proves and what it does not

### 4.1 India payment-rail scale

NPCI's official UPI product statistics for **October 2026** show:

- 25,466.70 million UPI transactions;
- transaction value ₹31,52,929.46 crore;
- 758 banks live on UPI.

Source: https://www.npci.org.in/product/upi/product-statistics?financialYear=2026-27

यह बहुत बड़ा payment-rail market है, लेकिन इससे किसी specific software, spreadsheet या recruitment-finance product की demand सिद्ध नहीं होती। Rail scale को product-market fit नहीं मानना है।

### 4.2 Getvik category adjacency

Phase 44 के 13-November recheck में Getvik Discover पर Excel/Business/HR-adjacent products के platform-displayed sales counters देखे गए: उदाहरणतः 148 sales वाला Excel workbook, 51 sales वाला Excel Career Pack और 11 sales वाला HR-adjacent calendar product। ये platform counters हैं, independent audit नहीं। ये category adjacency दिखाते हैं, हमारे product के लिए willingness-to-pay नहीं।

Official pages:
- https://getvik.com/discover
- https://getvik.com/discover/business-finance
- https://getvik.com/about-us
- https://getvik.com/terms-of-service

**Demand verdict:** Recruitment Agency Revenue Assurance Desk के लिए अभी कोई verified buyer, paid order, buyer interview या account analytics evidence नहीं है। इसलिए कोई revenue forecast नहीं जोड़ा गया।

## 5. Rail-by-rail audit

### 5.1 Domestic INR / UPI / bank

| Route | Public economics | Settlement / minimum | Acquisition advantage | Decision |
|---|---|---|---|---|
| Getvik Free | 10% platform fee + उस fee पर 18% GST + Cashfree gateway charges; no monthly plan required | ₹100 settled balance; payout request के बाद सामान्यतः 2–3 business days; risk hold possible | Public Discover marketplace और automatic delivery | **Primary P1** |
| ownstreet | 0% platform fee; Razorpay gateway charges; free tier में 1 live product और 5 completed paid sales | Official help में अक्सर same day/T+1–2 working days; minimum public docs में नहीं मिला | Marketplace/storefront, पर traffic guarantee नहीं | Secondary validation |
| Topmate | Own-link sale 10%; marketplace sale 20%; INR gateway charge 2% minimum/actual gateway charge if higher; platform fee पर GST | First withdrawal first paid booking के 7 days बाद; request processing up to 7 days; ₹500 no-fee threshold | Creator audience/marketplace | Backup, Getvik के साथ parallel launch नहीं |
| Payhip + Razorpay | Payhip Free plan 5% + Razorpay processing | Merchant Razorpay settlement settings | Own storefront; discovery कम | Secondary |
| Cashfree Direct | Eligible new merchants के लिए promotional 0% platform fee up to ₹20 lakh sales, offer till 31-Mar-2027; published standard platform rate 1.95% when offer not applicable | UPI gateway default T+2; instant settlement within 15 minutes is optional/paid; public universal minimum not confirmed | Payment Links/checkout; **no marketplace discovery** | **P2 fallback** |

Cashfree official sources:
- Pricing: https://www.cashfree.com/payment-gateway-charges/
- UPI gateway and settlement: https://www.cashfree.com/upi-payment-gateway/

Promotional 0% fee को guaranteed नहीं मानना है। Owner को merchant category, new-merchant eligibility, ₹20 lakh cap, applicable GST, excluded payment modes और written offer terms अपने dashboard/agreement में verify करने होंगे। Paid instant settlement ₹0 spend rule के तहत activate नहीं करना है।

### 5.2 Paddle: global software/MoR

Official evidence:

- India current unsupported-country list में नहीं है; यह seller approval की guarantee नहीं है: https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle
- Payment methods list में cards, PayPal और **UPI Autopay** है: https://www.paddle.com/help/start/intro-to-paddle/which-payment-methods-do-you-support
- UPI Autopay को ordinary one-time UPI समझना गलत होगा; current public method list ordinary one-time UPI को स्पष्ट रूप से confirm नहीं करती।
- Paddle Checkout fee: 5% + USD 0.50: https://www.paddle.com/legal/terms
- Minimum payout: USD 100 (GBP/EUR balance पर equivalent threshold); monthly, balance 1st को assess, payment 15th तक send, arrival up to 3 working days: https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid
- Currency mismatch पर USD/EUR/GBP 15 SWIFT fee और bank charges लागू हो सकते हैं: https://www.paddle.com/help/manage/get-paid/is-there-a-fee-taken-for-payouts
- Paddle software-first है; pure consulting/human services, digital marketplaces, donations/sponsorships और कई high-risk categories allowed नहीं: https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle

**Product-fit gate:** Recruitment Agency Revenue Assurance Desk को केवल cash/commission/receivable/guarantee-event administration software के रूप में रखा जाए। Candidate scoring, ranking, automated hiring recommendations या people categorization जोड़ने पर Paddle AUP risk पैदा हो सकता है। Exact product approval Paddle का निर्णय होगा।

**Net economics:** USD 20 checkout पर 5% + USD 0.50 = USD 1.50 (7.5%) before payout FX/bank charges. USD 5 checkout पर यही fee USD 0.75 (15%) है; Paddle under-USD-10 products के लिए custom pricing कहता है। इसलिए low-ticket downloads के लिए यह first choice नहीं, higher-value recurring software के लिए अधिक उपयुक्त है।

**Verdict:** P2 high-upside global SaaS lane; first-cash नहीं। No marketplace traffic assumption.

### 5.3 Lemon Squeezy: conditional backup

- India bank payouts list में है, पर official docs के अनुसार May 2024 से नए Indian Stripe accounts invite-only हैं। Pre-approved Stripe account न होने पर PayPal payout route चाहिए: https://docs.lemonsqueezy.com/help/getting-started/supported-countries
- PayPal payout USD में; minimum payout USD 50; 13-day hold; payouts twice monthly; bank arrival 1–5 days: https://docs.lemonsqueezy.com/help/getting-started/getting-paid
- Fee 5% + USD 0.50; +1.5% international; +1.5% PayPal; +0.5% subscription; non-US PayPal payout fee 3% capped at USD 30: https://docs.lemonsqueezy.com/help/getting-started/fees
- Marketplace listing तभी eligible है जब own store में कम से कम 3 sales या USD 50 sales हो चुके हों: https://docs.lemonsqueezy.com/help/marketplace/guidelines

**Verdict:** Getvik/Paddle से पहले नहीं। भारत में Stripe pre-approval न होने पर PayPal route की total friction अधिक है।

### 5.4 PayPal और Payoneer: wallet economics

**PayPal India**
- India PayPal accounts केवल international payments support करते हैं: https://securepayments.paypal.com/in/business/paypal-business-fees
- International commercial receipt: 4.40% + currency-based fixed fee (USD 0.30 / INR ₹3): वही official fee page।
- India balance preferred bank में automatically daily transfer होता है; bank credit में up to 5 business days: https://www.paypal.com/in/cshelp/article/how-do-i-transfer-funds-to-my-bank-account-help394
- Conversion rate में PayPal का spread शामिल है; exact realized FX rate transaction-specific है: https://www.paypal.com/in/cshelp/article/where-can-i-find-paypals-currency-calculator-and-exchange-rates-help109

**Payoneer India**
- India customers के funds local Indian bank में automatically within 48 hours withdraw होने का दावा official India pricing page करता है।
- USD/EUR आदि balance से INR bank withdrawal पर 1%–4% fee; 12 consecutive months में USD 6,000 से कम receipts पर USD 29.95 annual account fee लग सकती है।
- Non-local currency receiving account पर 1% (minimum USD 1) लागू हो सकता है।
- Source: https://www.payoneer.com/en-in/about/pricing/

**Decision:** PayPal/Payoneer को बिना वास्तविक international payer या selected platform payout requirement के activate नहीं करना है। Low receipts पर Payoneer annual fee भी mission economics के विरुद्ध जा सकती है।

## 6. AI-generated content और IP policy gates

1. **Paddle:** Software business के लिए है, human services और digital marketplace नहीं। AUP में content generation की कई categories और automated decision-making/categorization of people प्रतिबंधित हैं। Recruitment-finance product को candidate decision engine में बदलना इस rail के लिए policy risk होगा।  
   https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle

2. **Gumroad:** AI services (जैसे बाहरी AI tools, chatbots, image/content-generation services की access/subscription) prohibited-products सूची में हैं; original work ही बेचें, resale/PLR/MRR से बचें।  
   https://gumroad.com/prohibited  
   https://gumroad.com/help/article/155-things-you-cant-sell-on-gumroad

3. **Adobe Stock:** Generative AI assets स्वीकार करता है, बशर्ते contributor के पास commercial submission rights हों, हर AI asset सही label हो, third-party IP/artist/real-person/fictional-character references न हों और identifiable people/property के लिए आवश्यक releases हों।  
   https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/generative-ai-content-guidelines.html

4. **Shutterstock:** Contributor AI-generated content स्वीकार नहीं करता। AI-generated assets को वहाँ submit करने का प्रयास नहीं करना है।  
   https://submit.shutterstock.com/help/en/articles/10594622-content-policy-updates-ai-generated-content

5. **Universal IP rule:** Model/tool licence, training/data provenance, fonts, stock elements, trademarks, model/property releases और customer data rights का evidence रखें। “AI ने बनाया” अपने आप commercial ownership या platform acceptance सिद्ध नहीं करता।

## 7. Crypto/VDA compliance: स्पष्ट hold

### FIU-IND framework

8-Jan-2026 FIU-IND AML/CFT/CPF Guidelines के अनुसार notified VDA service-provider activities में fiat/VDA exchange, VDA-to-VDA exchange, VDA transfer, safekeeping/administration और VDA offer/sale से जुड़ी कुछ financial services शामिल हैं। Notified activities करने वाले VDA SPs के लिए FIU-IND Reporting Entity registration mandatory है; obligations activity-based हैं और physical location से स्वतंत्र हो सकती हैं।

मुख्य obligations में:
- customer due diligence और PAN verification;
- ongoing transaction monitoring;
- sanctions screening;
- Travel Rule originator/beneficiary data;
- suspicious transaction reporting;
- कम से कम पाँच वर्ष के client/transaction records;
- unhosted-wallet transfers पर enhanced risk controls;
- smart contract द्वारा RE functions automate करने पर भी controlling parties की obligations समाप्त नहीं होतीं।

FIU-IND guidelines यह भी कहती हैं कि unhosted-wallet/P2P transfers significant risk रखते हैं और ICO/ITO-related activities strongly discouraged हैं।

Official guideline: https://fiuindia.gov.in/pdfs/downloads/VDA08012026.pdf

### Government status clarification

Lok Sabha Unstarred Question 5805, answered **30-Mar-2026**, कहता है:
- 09-Mar-2026 तक 54 VDA SPs FIU-India Reporting Entities के रूप में registered थे;
- 53 offshore VDA SPs के applications/URLs takedown निर्देशित किए गए;
- कोई public portal/list नहीं है; सरकार स्पष्ट करती है कि FIU registration को financial-sector licence, approval या endorsement समझना misleading होगा;
- Annexure में कुछ entities non-operational/wound-up और कुछ conditionally onboarded marked हैं।

Official Parliament answer: https://sansad.in/getFile/loksabhaquestions/annex/187/AU5805_lMTYNK.pdf?source=pqals

### Current Income-tax Act reference

Income-tax Department के Income-tax Act, 2025 materials में Section 194 के table में VDA transfer income के लिए 30% special rate और TDS Rates page में Section 393(1), Table 8(vi) के अंतर्गत VDA transfer consideration पर 1% TDS (specified thresholds/conditions सहित) दिखता है। किसी software/service sale के बदले VDA receipt का exact classification अलग legal/CA question है; यहाँ कोई tax treatment या declaration नहीं किया गया।

- https://wm.incometaxindia.gov.in/w/section-194-78
- https://www.incometaxindia.gov.in/hi/w/tds-rates

**Crypto verdict:** कोई crypto rail activate नहीं। FIU registration को licence न मानें। Direct wallet, P2P, stablecoin, NFT/token, smart-contract checkout या exchange conversion तभी पुनः evaluate होंगे जब Indian counsel + CA + AD bank लिखित रूप से exact transaction flow, VDA SP applicability, provider status, KYC/AML/Travel Rule, tax/TDS, custody और INR settlement स्वीकार्य बताएं।

## 8. Risk-adjusted priority order

| Rank | Candidate | First-sale potential | Settlement | Scalable net upside | Current action |
|---:|---|---|---|---|---|
| 1 | Getvik Free | Existing marketplace discovery; no guarantee | ₹100, 2–3 business days after request | Medium-high if niche demand appears | **P1 first-cash; owner gate only** |
| 2 | ownstreet | Marketplace/storefront, but demand unproven | Often T+1–2; minimum not published | Medium | P1 validation, only after Getvik experiment |
| 3 | Topmate | Existing audience helps; marketplace commission high | First 7-day wait + up to 7-day processing | Medium | Backup |
| 4 | Payhip + Razorpay | Own traffic needed | Merchant account T+2 settings | Medium | Secondary |
| 5 | Cashfree Direct | Own traffic needed; hosted checkout reduces friction | Default T+2; 0% eligible promotion through 31-Mar-2027 | High if recurring direct sales | P2 after first-sale proof |
| 6 | Paddle SaaS | Product approval + own acquisition | $100 monthly threshold; sent by 15th | **High** recurring/global upside | P2 high-upside |
| 7 | Lemon Squeezy | Own-store sales needed before marketplace listing | $50 threshold, 13-day hold, twice monthly | High but net payout friction higher | Backup/hold |
| 8 | GitHub Sponsors / BMAC / Patreon | Adoption/audience-dependent | Platform-specific; already in registry | Medium recurring, long ramp | Long-horizon |
| 9 | Adobe Stock / KDP / assets | Catalog and review required | Threshold/royalty cycles | Medium, long-horizon | Long-horizon |
| 10 | Ads / affiliate / YouTube | Traffic thresholds and continuing content | Delayed threshold payouts | Potentially high but weak first-sale speed | P3 |
| 11 | Crypto/VDA | No verified compliant buyer/settlement path | No controlled INR settlement proof | Uncertain | **HOLD / NOT ACTIVATED** |

इस ranking में “first-sale potential” कोई guaranteed time estimate नहीं है। Settlement speed केवल sale के बाद की clock है; वह buyer acquisition का substitute नहीं है।

## 9. Exact owner-action packets

### Packet A — P44-004 Getvik first-cash gate (next task)
Owner को स्वयं:
1. Getvik की current terms, payout declaration, refund policy और commercial listing licence पढ़नी है।
2. अपने device पर PAN/KYC पूरा करना है।
3. अपने ही नाम का bank account और UPI payout route verify करना है।
4. Product name, ₹499/₹799/₹999 price hypothesis, refund/support policy और licence की final approval देना है।
5. Explicitly publication approve करना है।
6. कोई paid plan या ad spend नहीं; first experiment 14 days, bounded और no-spend रहेगा।

Assistant कोई PAN, OTP, bank detail या legal acceptance नहीं करेगा।

### Packet B — Cashfree Direct (केवल Getvik experiment के बाद)
Owner स्वयं:
1. Business/merchant eligibility और KYC documents तैयार करे।
2. ₹20 lakh promotional cap, 31-Mar-2027 end date, mode exclusions, GST और settlement terms लिखित रूप में confirm करे।
3. Bank account verification और merchant agreement स्वयं करे।
4. T+2 default रखें; paid instant settlement न चुनें।
5. Product delivery webhook, refund flow और ledger reconciliation test के बाद ही checkout enable करे।

### Packet C — Paddle (केवल SaaS demand proof के बाद)
Owner स्वयं:
1. Current 6-Oct-2026 Master Services Agreement और AUP review करे।
2. Product scope को administrative finance software तक सीमित रखे; candidate scoring/ranking/automated people categorization न हो।
3. India seller onboarding approval, entity type और product/domain approval confirm करे।
4. UPI Autopay availability को ordinary one-time UPI न माने; target buyer country/method confirmation ले।
5. Wire vs Payoneer payout, $100 threshold, monthly schedule, possible $15 SWIFT fee, bank/FX and Payoneer costs compare करे।
6. Tax/sales-tax responsibilities और Indian inward-remittance documentation के लिए CA/AD bank से लिखित review ले।
7. Terms owner स्वयं स्वीकार करे; assistant account नहीं खोलेगा।

### Packet D — PayPal / Payoneer
- पहले वास्तविक international payer या selected platform payout requirement हो।
- PayPal India domestic collection के लिए नहीं; केवल international receipts।
- Payoneer की possible USD 29.95 annual fee और 1–4% withdrawal fee पहले calculate करें।
- PAN, bank, purpose code और KYC owner स्वयं complete करे।

### Packet E — Crypto/VDA
- अभी कोई wallet/account/contract/provider नहीं।
- Written Indian legal opinion, CA review, AD-bank acceptance और specific provider's current FIU status/terms के बिना आगे नहीं बढ़ना।
- No P2P, no self-custody collection, no private-key access, no signing, no conversion or movement.

## 10. Revenue ledger invariant

कोई sale, marketplace counter, pending balance, on-chain confirmation या payout instruction realized receipt नहीं है। Ledger में केवल:
1. customer payment captured;
2. platform/gateway fee, GST on fees, FX, bank fees;
3. refunds/reversals/chargebacks;
4. payout actually credited to the controlled bank account;
5. final net amount independently reconciled.

इसीलिए `control/revenue_ledger.json` को बिना transaction के नहीं बदला गया। Mission receipt total **₹0** ही है।

## 11. Next queued task

**P44-004 — Owner approval and secure platform onboarding for Getvik first-sale pilot** remains the next and only first-cash gate. P45-001 and P45-002 are completed. No new product build or parallel channel is justified before the first-sale experiment.

## 12. Primary-source register (captured 13-Nov-2026)

- NPCI UPI monthly statistics: https://www.npci.org.in/product/upi/product-statistics?financialYear=2026-27
- Cashfree pricing: https://www.cashfree.com/payment-gateway-charges/
- Cashfree UPI settlement: https://www.cashfree.com/upi-payment-gateway/
- Paddle supported countries: https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle
- Paddle payment methods: https://www.paddle.com/help/start/intro-to-paddle/which-payment-methods-do-you-support
- Paddle AUP: https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle
- Paddle supplier agreement: https://www.paddle.com/legal/terms
- Paddle payout schedule: https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid
- Paddle payout fees: https://www.paddle.com/help/manage/get-paid/is-there-a-fee-taken-for-payouts
- Lemon Squeezy India eligibility: https://docs.lemonsqueezy.com/help/getting-started/supported-countries
- Lemon Squeezy payouts: https://docs.lemonsqueezy.com/help/getting-started/getting-paid
- Lemon Squeezy fees: https://docs.lemonsqueezy.com/help/getting-started/fees
- Lemon Squeezy marketplace requirements: https://docs.lemonsqueezy.com/help/marketplace/guidelines
- PayPal India merchant fees: https://securepayments.paypal.com/in/business/paypal-business-fees
- PayPal India automatic bank transfer: https://www.paypal.com/in/cshelp/article/how-do-i-transfer-funds-to-my-bank-account-help394
- Payoneer India fees: https://www.payoneer.com/en-in/about/pricing/
- FIU-IND AML/CFT/CPF VDA Guidelines, 08-Jan-2026: https://fiuindia.gov.in/pdfs/downloads/VDA08012026.pdf
- Lok Sabha Unstarred Question 5805, 30-Mar-2026: https://sansad.in/getFile/loksabhaquestions/annex/187/AU5805_lMTYNK.pdf?source=pqals
- Income-tax Act, 2025, Section 194: https://wm.incometaxindia.gov.in/w/section-194-78
- Income-tax Department TDS Rates for Tax Year 2026-27: https://www.incometaxindia.gov.in/hi/w/tds-rates
- Adobe Stock generative AI guidelines: https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/generative-ai-content-guidelines.html
- Shutterstock AI contributor policy: https://submit.shutterstock.com/help/en/articles/10594622-content-policy-updates-ai-generated-content
- Gumroad prohibited products: https://gumroad.com/prohibited
- Gumroad originality / prohibited content: https://gumroad.com/help/article/155-things-you-cant-sell-on-gumroad

**Final mission truth:** ₹0 verified net receipts; ₹0 authorized spend; no account/KYC/terms/publication/money movement performed.

## 13. Evidence correction / stricter product-fit gate — 13-Nov-2026

### Cashfree: “0%” is not zero transaction cost

A further review of Cashfree's own offer explainer and instant-settlement pricing adds three important caveats:

1. The promotional 0% waives the platform fee for eligible domestic GMV, but **GST on the standard 1.95% platform fee may still be charged**. Cashfree's own example states ₹351 GST per ₹1 lakh of eligible GMV, before other charges. The route is zero setup/AMC per the published plan, not zero transaction cost.
2. Cashfree's general UPI gateway page says default **T+2**, while the current new-merchant offer page advertises **T+1** for eligible merchants. These public pages conflict. Use T+2 as the conservative model until the owner receives written account-specific terms.
3. International card pricing is published at **2.99% + GST** and is excluded from the domestic 0% offer. Optional instant settlement starts at **0.30% + GST**; it is not part of the ₹0 spend plan.

Sources:
- https://www.cashfree.com/blog/payment-gateway-offers/
- https://www.cashfree.com/upi-payment-gateway/
- https://www.cashfree.com/instant-settlements/

Cashfree also states on its official site that it holds an RBI-authorised PA- CB (E&I) route, accepts international payments in 140+ currencies and generates FIRA reporting. This is the provider's own representation; owner must verify current authorisation, product eligibility, exact currency corridor and written merchant terms before relying on it:
- https://www.cashfree.com/

### Paddle: product-category gate tightened

Paddle's current AUP explicitly prohibits regulated financial products/services, payment services, trading/financial advice, digital marketplaces, human services and certain content-generation/automated people-decision products:
- https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle

The Recruitment Agency Revenue Assurance Desk is designed as administrative receivable, commission and guarantee-event software, not as a payment processor, lender, investment/trading product or financial adviser. However, because the product is adjacent to financial administration, no inference of eligibility is safe. The Paddle candidate score is reduced from 66 to 63 and status changed from VALIDATION to **HOLD_FOR_EVIDENCE**. Obtain written Paddle pre-approval for the exact product description before account creation or integration. If Paddle classifies it as a prohibited financial service/payment service, remove Paddle from the plan.

This correction supersedes any earlier statement that Paddle was ready for ordinary validation. It remains a potential high-upside route only after written product-category clearance and the Getvik first-sale gate.
