# Phase 25 — Product Demand and Competitive Reality Check
Date: 2026-11-12
Product under review: CSV-to-Action / Job-to-Cash Control Utility
Scope: public competitor and demand evidence; no customer outreach or account activity.

## 1. Decision

**Do not launch the current MVP as a paid generic CSV checker or generic invoice tracker.** Keep it as a low-cost engineering pilot and potential free discovery utility, but hold paid listing and do not scale content production until a defensible product wedge is demonstrated.

Reason: the two adjacent categories are already crowded with capable free browser tools and low-cost invoice/payment trackers. A working MVP is not proof of demand, differentiation or willingness to pay.

## 2. Competitive evidence

### Generic CSV cleaning and validation is crowded
Examples of free local-first browser tools:
- BenchCove File & Data Workbench: CSV/Excel import, cleaning, comparison, profiling and export, local processing, no sign-up. https://www.benchcove.com/workbenches/file-data
- DataDoctor CSV Data Quality Checker: missing values, duplicates, formats, local browser processing. https://datadoctor.net/csv-data-quality-checker
- Inkwell Tools: CSV/Excel/JSON/Parquet conversion, cleaning, comparison and analysis, local processing. https://inkwelltools.com/data/
- Zoho DataPrep free analyzer: column-level type checks and data-quality report. https://www.zoho.com/dataprep/free-ai-data-quality-analyzer.html
- Data File Tool: broad suite of CSV validation, cleaning, compare and conversion utilities. https://datafiletool.com/online-csv-tools/

Implication: “private browser CSV checker” alone is not a paid product proposition. Our value must be a workflow outcome and a specific supported source format, not another parser.

### Invoice and payment follow-up templates are also crowded
Examples:
- RecordSplit free invoice tracker: partial payments, outstanding balances, due/overdue status and days overdue. https://www.recordsplit.com/templates/invoice-tracker
- Lekhiva free invoice/payment tracker: INR balances, partial receipts, due dates, follow-up dates and CSV export. https://lekhiva.com/tools/invoice-payment-tracker/
- Shilp Labs free payment follow-up register: next action date, promise date and follow-up owner. https://shilplabs.in/excel-formats/payment-follow-up-register
- PB Lab India: free and ₹19 Pro freelancer invoice/payment tracker, including GST/TDS-oriented workflow. https://pblab.in/templates/freelancer-invoice-payment-tracker
- Gumroad Small Business Finance Tracker: advertised at $14.99; seven linked tabs, invoice/partial/overdue status, inventory, profit calculator and 3,000+ formulas. Listing price and “first review” status do not prove sales. https://trinityamor.gumroad.com/l/SmallBusinessFinanceTracker
- Payhip Invoice Tracker & Accounts Receivable Aging Spreadsheet: advertised at $7.99 with partial payments and follow-up alerts. https://payhip.com/b/N2ajW
- itch.io Freelancer Invoice & Payment Follow-Up Command Center: advertised at $8 minimum. https://knit-of-shadows.itch.io/freelancer-invoice-payment-follow-up-command-center

Implication: a generic Job-to-Cash spreadsheet is not sufficiently differentiated. Existing products already cover partial payment, overdue ageing, follow-up queue, INR and downloadable templates.

### More valuable adjacent market: marketplace settlement reconciliation
Publicly marketed examples show an active commercial category:
- RecoSquare: Amazon India order-to-settlement matching; free basic report, ₹799 Plus and ₹999 Max per report. https://www.recosquare.com/
- ecommtools.in: Amazon/Flipkart/Meesho seller tools, including reconciliation; plans from ₹99/30 days and ₹999/180 days for monthly reconciliation. https://ecommtools.in/
- MarkRTD: local browser analysis of Meesho, Flipkart and Amazon payment files, seller fees, returns and SKU-level profitability. https://sellertool.markrtd.com/payment-reconciliation/
- Profimode: multi-marketplace reconciliation with published plans from ₹249/month. https://www.profimode.com/
- Amazon Seller Central itself provides downloadable payment reports and flat files. https://sellercentral.amazon.in/help/hub/reference/external/791?locale=en-IN

This is a genuine paid category signal, not proof that we can enter it. Competitors already exist and may have deeper format coverage. The category carries higher correctness, financial-data security, tax interpretation and support burden. We must not make tax claims, recovery guarantees or settlement accusations without evidence.

## 3. Demand evidence: what it does and does not prove

- An openly published 2026 dataset contains 1,008 US English Excel/Google Sheets template keywords. Its authors report estimated US monthly search volume of about 24,180 for bookkeeping/accounting keywords and 16,840 for invoice/PO/quote keywords. Dataset license is CC BY 4.0 and method is based on commercial keyword-tool snapshots. https://github.com/tresor4k/us-excel-template-demand
- This is US-only estimated search demand. It is not India search demand, not conversion evidence, not buyer count, and not proof that any particular product sells.
- Competitor advertised prices are asking prices, not verified transaction counts or net revenue.
- Free competitors can indicate real user utility and strong competition simultaneously.

## 4. Product decision and repositioning

Current CSV-to-Action MVP should remain a **free local-first pilot**, not a paid flagship.

Do not sell:
- a generic CSV cleaner;
- a generic invoice tracker;
- a generic small-business finance workbook;
- a claim that it verifies actual receivables or bank receipts.

Potential next product hypotheses, to be tested before coding:
1. **Source-specific marketplace report preflight**: validate a particular seller export schema and detect structural anomalies before reconciliation. This is lower risk than claiming to calculate profit or missing payments.
2. **Settlement reconciliation workbench**: only after choosing one marketplace and obtaining official sample schemas, public documentation and robust synthetic fixtures. It must show every formula and reconcile totals to source report control totals; no account credentials or seller API access in MVP.
3. **Developer data workflow tools**: investigate narrower paid problems where a small offline tool can outperform generic CSV validators.
4. **Reusable bilingual operational toolkits**: only where an identifiable recurring job is not already served by high-quality free alternatives.

No final product is selected from these hypotheses yet. Run a structured evidence comparison first.

## 5. Required gates before any paid launch

A product may advance only when:
- the exact target user and repeated problem are defined;
- at least 3–5 independent public demand signals exist, clearly separated from competitor claims;
- at least 5 direct competitors are mapped by features, price, audience and limitations;
- a meaningful gap is visible and can be demonstrated;
- original/synthetic test data and a reproducible QA suite exist;
- platform rights, India payout, fees and account-level onboarding are understood;
- the product can be delivered self-serve without manual support or bespoke services;
- no false accounting, tax, legal, financial or recovery claims are made.

## 6. CSV-to-Action security hardening

- Added CSV export formula-injection neutralization: cells beginning with formula-significant characters are prefixed before spreadsheet export.
- Added an automated regression test for formula-like cells.
- Current automated build status after this change is pending; do not call the security fix verified until the next GitHub Actions run completes successfully.

## 7. Next decision sequence

1. Finish and verify the latest CSV-to-Action CI run.
2. Keep this MVP as a free engineering/utility pilot; do not publish paid listing.
3. Conduct a cross-category opportunity scan: source-specific data tools, developer utilities, creator workflows, structured datasets, niche reference products and platform-native digital assets.
4. Score each using demand evidence, competitor gap, self-serve value, build time, policy fit, IP provenance, zero-cost feasibility, India payout and support burden.
5. Select one defensible product only after evidence comparison; stop weak candidates early.

Status: no paid listing, no account/KYC, no sales, no payout, no bank receipts. Verified revenue remains ₹0.
