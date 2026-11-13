# Phase 49 — Apify Store Actor Niche Qualification: Final NO-GO

**Date:** 13 November 2026  
**Authority:** MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md  
**Queue task:** P49-001  
**Decision:** **NO-GO for the currently audited raw-data / extraction Actor niches. Do not build an Actor yet.**  
**Platform status:** Apify Store remains a future channel for a materially different, buyer-validated product.  
**Spend:** ₹0 authorised. No Actor run, paid plan, proxy, account setup, KYC, publication or usage credits were consumed.

---

## 1. Executive decision

A ground-level scan of **27 directly relevant Apify Store listings** was performed across:
- web/RAG extraction;
- PDF extraction and OCR;
- ClinicalTrials.gov data;
- SEC EDGAR / insider trades / filing monitors;
- Federal Register rules and industry signals;
- USAspending / SAM.gov contract awards and recompete data;
- domain registration data;
- ATS-board job postings.

The evidence produces five conclusions:

1. **Generic web/RAG extraction is dominated by Apify-maintained free/low-cost incumbents with substantial usage.** RAG Web Browser showed 212,000 total users, 30,000 monthly active users and 4.7/35 ratings; Website Content Crawler showed 177,000 total users, 12,000 monthly active users and 4.6/235 ratings.
2. **PDF extraction is a commodity race.** At least eight direct actors offer similar text/Markdown/OCR functions at roughly $1–$5 per 1,000 PDFs/results. Most of the recent listings showed only 1–2 total users, around 1 monthly active user and zero reviews.
3. **ClinicalTrials and SEC data are already wrapped by several near-identical Actors** using official public APIs, mostly at $1–$12 per 1,000 results, with minimal visible Store use and no reviews.
4. **Federal Register and US-government-contract data have multiple recent competing Actors.** One specialized Federal Register rule-signal Actor lists $70/1,000 signals, but its page showed 1 monthly user and zero ratings. That is a price hypothesis, not proof of paid demand.
5. **The public Actor user counters do not establish paid revenue.** Apify's official PPE calculation excludes activity from users on the Free plan. Only eligible paid-plan user revenue counts toward creator PPE profit. A listing with one monthly user may have earned nothing.

**Final result:** No candidate passed the V4 requirements for a repeatable buyer problem, evidence of independent paid demand, high scalable revenue potential, lawful source rights, and positive net economics. No Actor should be built from this audit.

---

## 2. The economics that govern this decision

For Pay-per-event Actors, Apify's official formula is:

`creator profit = (0.8 × paid event revenue) − platform usage costs`

Platform usage costs may include compute units, proxy usage, storage and related platform charges. Free-plan user activity is excluded from creator PPE revenue. Pay-per-usage is a different model where the customer pays platform usage and the developer does not add a separate event charge; multi-tenant Server Actors can leave the creator paying the platform usage cost.

Official sources:
- Pricing and cost formula: https://docs.apify.com/actors/monetize/pricing-and-costs
- Actor monetization models: https://docs.apify.com/actors/monetize
- Pay-per-event billing and passing platform costs: https://docs.apify.com/actors/monetize/pay-per-event
- Actors in Store pricing models and run charge caps: https://docs.apify.com/actors/running/actors-in-store

### Illustrative unit-economics arithmetic (not a forecast)

| Customer price | Creator share before platform cost | Paid results required for $10,000 creator share before costs |
|---:|---:|---:|
| $0.50 / 1,000 records | $0.40 / 1,000 | 25 million |
| $1.00 / 1,000 records | $0.80 / 1,000 | 12.5 million |
| $2.00 / 1,000 records | $1.60 / 1,000 | 6.25 million |
| $10.00 / 1,000 records | $8.00 / 1,000 | 1.25 million |
| $70.00 / 1,000 records | $56.00 / 1,000 | ~179,000 |

These figures exclude compute, proxies, storage, refunds, support and other attributable costs. They are arithmetic sensitivity examples, not expected sales. They show why a high number of raw low-price records is not automatically a large-revenue business.

---

## 3. Live competitor inventory — 27 listings

**Capture date:** 13-Nov-2026.  
**Interpretation:** Apify Store listing counters are snapshots. Total users / monthly active users are not paid-customer metrics. A zero rating means no public rating count was displayed; it does not necessarily mean a product is defective.

| # | Niche | Actor / published price | Visible Store signal at capture | Assessment |
|---:|---|---|---|---|
| 1 | Web / RAG | [Apify RAG Web Browser](https://apify.com/apify/rag-web-browser) — $1.33/1,000 pages | 212K total users; 30K MAU; 4.7 (35) | Dominant direct incumbent; do not clone |
| 2 | Web / RAG | [Apify Website Content Crawler](https://apify.com/apify/website-content-crawler) — pay per usage | 177K total users; 12K MAU; 4.6 (235) | Dominant direct/free-tier substitute; do not clone |
| 3 | PDF | [One Dollar Store PDF Extractor](https://apify.com/one_dollar_store/pdf-text-extractor-scraper) — $1/1,000 | 2 total users; 1 MAU; 0 ratings | Commodity pricing |
| 4 | PDF + OCR | [Brasspage PDF Extractor](https://apify.com/brasspage/pdf-text-extractor) — $0.002/PDF + $0.005/OCR page | 2 total users; 1 MAU; 0 ratings | Direct OCR substitute; OCR adds cost |
| 5 | PDF | [IntelScrape PDF Extractor](https://apify.com/intelscrape/pdf-text-extractor) — $0.002/PDF + run/page charges | 2 total users; 1 MAU; 0 ratings | Direct text-layer substitute |
| 6 | PDF / RAG | [Teddythebuilder PDF Extractor](https://apify.com/teddythebuilder/pdf-text-extractor) — $1.65/1,000 | 3 bookmarks; 2 total users; 2 MAU; 0 ratings | Direct Markdown/RAG substitute |
| 7 | PDF / RAG | [Best APIs PDF Extractor](https://apify.com/best_apis/pdf-text-extractor) — $1/1,000 | 2 total users; 1 MAU; 0 ratings | Direct PDF-to-RAG substitute |
| 8 | PDF | [Faglez PDF Extractor](https://apify.com/faglez/pdf-text-extractor) — $3/1,000 | 2 total users; 1 MAU; 0 ratings | Direct bulk extraction substitute |
| 9 | PDF | [Channacorp PDF Text Layer](https://apify.com/channacorp/pdf-text-layer) — $5/1,000 | 1 total user; 0 MAU; under maintenance | Not an active competitive product |
| 10 | PDF / RAG | [Promur PDF Extractor](https://apify.com/promur/pdf-text-extractor) — $2/1,000 | 2 total users; 1 MAU; 0 ratings | Direct text/chunk substitute |
| 11 | Clinical trials | [RecordsData Clinical Trials Scraper](https://apify.com/recordsdata/clinical-trials-scraper) — $12/1,000 studies | 2 total users; 1 MAU; 0 ratings | Broad study/site/results data; no traction proof |
| 12 | Clinical trials | [Manageable Gully ClinicalTrials API](https://apify.com/manageable_gully/clinical-trials-scraper) — $1/1,000 studies | 2 total users; 1 MAU; 0 ratings | Direct low-price official API wrapper |
| 13 | Clinical trials | [ResearchData Clinical Trials Search](https://apify.com/researchdata/clinical-trials-search) — $1.40/1,000 | 2 total users; 1 MAU; 0 ratings | Direct search wrapper |
| 14 | SEC insider trades | [SFOLN SEC Insider Trading Tracker](https://apify.com/sfoln/sec-insider-trading) — $1.80/1,000 transactions | 2 total users; 1 MAU; 0 ratings | Direct Form 4/5 transaction feed |
| 15 | SEC filings | [Data Scrapers SEC Filings Scraper](https://apify.com/datascrapers/sec-filings-intelligence) — $1.02/1,000 company records | 2 total users; 1 MAU; 0 ratings; under maintenance | Direct EDGAR/XBRL wrapper |
| 16 | SEC filings | [Moment Data SEC EDGAR Filings Feed](https://apify.com/moment-data/sec-edgar-filings-feed) — $3/1,000 | 2 total users; 1 MAU; 0 ratings | Direct filing feed + new-since-last-run |
| 17 | SEC filings | [Apivault SEC Filing Watchlist](https://apify.com/apivault_labs/sec-filing-watchlist) — $1/1,000 | 2 total users; 1 MAU; 0 ratings | Direct ticker/CIK watchlist |
| 18 | SEC fundamentals | [SEC Company Financials & Filings](https://apify.com/calculating_kitchen_h0b/sec-company-financials) — $4/1,000 | 2 total users; 1 MAU; 0 ratings | XBRL company financials wrapper |
| 19 | US government contracts | [Federal Recompete Radar](https://apify.com/cprussin/federal-recompete-radar) — $10/1,000 | 2 total users; 1 MAU; 0 ratings | Higher value per record, no proven paid adoption |
| 20 | US government contracts | [Federal Recompete Finder](https://apify.com/paramount_torch/federal-recompete-finder) — $4.50/1,000 | 2 total users; 1 MAU; 0 ratings | Direct recurring recompete feed |
| 21 | Regulatory intelligence | [Federal Register Rule Signals](https://apify.com/mdcurt/federal-register-rule-signals) — $70/1,000 | 2 total users; 1 MAU; 0 ratings | Highest price per signal in this set; no demand proof |
| 22 | Regulatory data | [Aurenic Federal Register Scraper](https://apify.com/aurenic/federal-register-scraper) — $1.30/1,000 | 2 total users; 1 MAU; 0 ratings | Direct rules/notices wrapper |
| 23 | Regulatory data | [BidData Federal Register Scraper](https://apify.com/biddata/federal-register-scraper) — $2/1,000 | 2 total users; 1 MAU; 0 ratings | Direct keyword API wrapper |
| 24 | Regulatory data | [Pushbuild Federal Register API](https://apify.com/pushbuild/federal-register) — $0.50/1,000 | 2 total users; 1 MAU; 0 ratings | Lowest-price direct substitute |
| 25 | Gov contracts | [Apex B2B SAM.gov / USAspending](https://apify.com/apex-b2b-data/sam-gov-federal-contracts-opportunities) — $1.05/1,000 | 2 total users; 1 MAU; 0 ratings | Direct contract/award/lead-score wrapper |
| 26 | Domain intelligence | [Xtracto Domain RDAP Lookup](https://apify.com/xtracto/domain-rdap-lookup) — $2/1,000 | 2 total users; 1 MAU; 0 ratings | Commodity lookup; easy substitutes |
| 27 | Job-board data | [Cynix ATS Boards Extractor](https://apify.com/cynix_dev/job-postings-ats) — $0.17/1,000 | 2 total users; 1 MAU; 0 ratings | Low unit price; exclude from core mission |

### What this inventory proves — and what it does not

- The two Apify-maintained web/RAG products clearly show real platform usage and ratings. Their success makes a generic web/RAG clone a poor decision.
- The narrower public-data/PDF Actors have many near-identical recent entries, commonly at $0.50–$12 per 1,000 results, with one specialized Federal Register signal at $70/1,000.
- Most of these recently listed Actors showed only 1–2 total users, around 1 MAU and zero reviews.
- **None of these public counters proves that the one visible monthly user was a paid-plan customer.** Apify explicitly excludes Free-plan user events from creator PPE profit.
- Listing price and a published Actor do not prove paid usage, retention, customer acquisition or positive net margin.

---

## 4. Niche-by-niche assessment

### A. Web extraction and RAG

**NO-GO.** The official Apify RAG Web Browser and Website Content Crawler together show hundreds of thousands of total users and substantial monthly usage, with public ratings. A new generic crawler, fetcher, HTML-to-Markdown or RAG ingestion Actor would have to beat those established offerings on quality, coverage or cost. No specific unserved workflow with paid buyer evidence was found.

### B. PDF extraction and OCR

**NO-GO.** At least eight direct text/OCR/Markdown/RAG extractors were identified, with prices from approximately $1 to $5 per 1,000 records and only 1–2 total users on most new pages. The cost to produce reliable OCR/table extraction and handle varied PDFs is materially higher than text-layer extraction. A new basic parser would enter a price race without a known buyer segment.

### C. ClinicalTrials.gov

**NO-GO.** At least three recent Actors use the same official ClinicalTrials.gov API. Published pricing ranges from $1 to $12 per 1,000 records; all observed pages had zero ratings and about one monthly user. The official API itself is freely accessible. No repeat paid customer workflow, data-quality gap or buyer commitment is established.

### D. SEC EDGAR / financial data

**NO-GO for raw wrappers.** At least five direct actors offer company data, filings, Form 4 insider transactions, watchlists or feeds from the same SEC public endpoints. Published prices are roughly $1–$4 per 1,000 records/companies. Observed new listings generally had 0 ratings and about one monthly user. A genuinely valuable financial research product would require licensed/defensible analysis, reliability and buyer differentiation, none of which has been demonstrated.

### E. Federal Register / regulatory intelligence

**NO-GO for current raw or simple classified feed.** At least four direct Actors were found. The specialised Rule Signals Actor is priced at $70/1,000, but its public snapshot showed only 1 total user/1 MAU and 0 ratings. A higher price per event without actual usage is not evidence of a successful business. Regulatory classification must also avoid legal-advice claims.

### F. Federal contracts / SAM.gov / USAspending

**NO-GO for generic contract/opportunity extraction.** At least three recent Actors cover award data, expiring recompetes, UEI, agency, value, NAICS/PSC and lead scoring. Public prices range roughly $1–$10 per 1,000 results; snapshots showed 0 ratings and around 1 MAU. The public datasets and free official portals are substitutes. A high-value bid/capture workflow may exist, but no buyer evidence or data/product gap was established.

### G. Domain RDAP and ATS job postings

**NO-GO.** Basic domain metadata is a commodity lookup. ATS job extraction is priced at only $0.17/1,000 results. These are too low-value and have no evidence of paid traction. Job-related lead sourcing also risks drifting into the prohibited manual-prospecting/gig model.

---

## 5. Why the Apify Store is not automatically a high-revenue shortcut

- **PPE is not 100% creator revenue:** only 80% of eligible paid event revenue remains before platform usage costs.
- **Free users are not PPE revenue:** a visible user count or MAU is not automatically a paid buyer.
- **Usage costs matter:** compute, proxies, data transfer and storage can turn apparently positive event pricing into zero/negative contribution.
- **Payout eligibility is an owner gate:** Apify requires creator billing details and identity verification before payout. No account or KYC was activated.
- **Store publishing obligations apply:** current Publishing Terms were last updated 15-Sep-2026; the General Terms are effective 09-Jul-2026; the Acceptable Use Policy prohibits illegal or third-party-rights-infringing uses. Do not copy another Actor's code, descriptions or assets.
- **Business-use-only terms:** Apify's July 2026 General Terms say platform services are intended for business use.

Sources:
- Store monetization / free-user exclusion: https://docs.apify.com/actors/monetize/pricing-and-costs
- Current Store publishing terms (15-Sep-2026): https://docs.apify.com/legal/store-publishing-terms-and-conditions
- General Terms (effective 09-Jul-2026): https://docs.apify.com/legal/general-terms-and-conditions
- Acceptable Use Policy (last updated 20-Feb-2026): https://docs.apify.com/legal/acceptable-use-policy
- KYC and payout requirements: https://docs.apify.com/actors/monetize/monthly-payouts

### Incentive / prize check

The Apify $1M Challenge is **over**; the current challenge page says so and lists past winners. It is not a current immediate revenue source. The separate Write for Apify program advertises $500 for a selected article, but it requires original manual writing and editorial acceptance; it is not a scalable self-serve product and is outside the active mission's core execution model.

Sources:
- https://apify.com/challenge
- https://apify.com/resources/write-for-apify

---

## 6. Final P49 decision

| Gate | Result | Reason |
|---|---|---|
| At least 20 competitors audited | PASS | 27 relevant listings reviewed |
| Evidence of real buyer pain | PARTIAL | Broad needs exist, but no narrow underserved job is supported by strong buyer evidence |
| Independent paid demand | FAIL | Public counters mostly tiny; no paid-customer proof; free-plan runs excluded from PPE earnings |
| Differentiation | FAIL | Generic web/PDF/SEC/clinical/regulatory/contract actors already exist |
| Rights / source legality | PARTIAL | Some official APIs are suitable, but each source would still require individual rights/terms and data handling checks |
| Scalable economics | FAIL / UNPROVEN | Most raw data prices are pennies per 1,000 records; no validated volume, retention or paid run-rate |
| Zero-spend production path | UNPROVEN | Free usage may support limited tests, not a reliable commercial service |
| Decision | **NO-GO** | No candidate justified a build |

**P49-001 is complete with NO-GO for the current Apify niche set.** No Actor is selected, built, run, registered, published or monetized.

---

## 7. Next revenue lane

Move to the next platform in the descending order: **Getvik digital products (rank #5)**.

There is already one private asset in the canonical repository: Recruitment Agency Revenue Assurance Desk v0.3.0. It has passed deterministic and Chromium/Firefox QA, but its buyer demand and willingness to pay remain unproven. Competitor audits previously found feature overlap with recruitment agency systems and free/low-cost tools.

Phase 50 must not assume that the existing product should launch. It must:
1. Re-check Getvik's current public marketplace demand and seller terms.
2. Re-check the product's exact competitors, price bands, feature coverage and gaps.
3. Determine whether the offline/no-candidate-PII, cash-basis commission and guarantee-event-control niche has a buyer outcome strong enough to command a price.
4. Compare a one-time digital download with existing free tools and specialist SaaS; calculate contribution after Getvik platform fee, GST on fee and gateway costs from official sources.
5. Decide launch, reposition or NO-GO before any publication.
6. Do not require cold outreach, live demos, manual consulting, or unpaid human interviews as the primary acquisition mechanism. Use public buyer evidence and platform-native discovery metrics only; explicitly label uncertainty.
7. Keep the product private until all commercial license, refund, support, KYC, terms and public-release owner gates are resolved.

**Next task:** P50-001 — qualify the existing Recruitment Agency Revenue Assurance Desk as a Getvik self-serve digital product, or reject it and move to the next ranked opportunity. No build or public launch until the evidence gate passes.

**Financial truth:** verified platform-credited net earnings ₹0; verified bank-settled receipts ₹0; new spend authorised ₹0.
