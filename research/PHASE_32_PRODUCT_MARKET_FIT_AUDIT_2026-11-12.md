# Phase 32 — Product-market fit audit and differentiated product direction
**Date:** 2026-11-12  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem V3  
**Decision:** Do not sell generic operations calculators as a premium product without differentiation. Preserve first MVP as a free/low-friction lead magnet candidate and focus the second product on recruitment-agency cash realization and guarantee exposure.

## 1. Competitive evidence: generic MSME toolkit is commoditized
- Zoho Books advertises a free plan with invoicing, expenses, inventory, GST reports and up to 1,000 invoices/year under its stated free-plan turnover threshold. Source: https://www.zoho.com/in/books/pricing/
- Vyapar advertises a lifetime-free mobile plan and paid desktop/mobile tiers. Source: https://billing.vyaparapp.in/free/inventory-management-software
- PBLab offers a free stock-register spreadsheet and a Pro variant shown at ₹19 (discounted from ₹99). Source: https://pblab.in/templates/inventory-stock-register
- EudoSoft advertises 16 Excel business templates for ₹99. Source: https://eudosoft.com/toolkit/
- Qxel lists a small-business operations workbook, “Dukaan Saathi”, at ₹199. Source: https://bytesizedvault.qxel.in/dukaan-saathi

**Decision:** MSME Ops Desk Lite's current calculator/register scope overlaps free or very low-priced alternatives. Do not position it as a ₹499-₹999 standalone paid product yet. Keep it as a free sample/lead magnet candidate or expand only if user feedback proves a differentiated unmet need.

## 2. Recruitment-agency product research
Evidence found:
- A Payhip listing offers an HR recruitment tracker for ₹199. Source: https://payhip.com/b/EsOzm
- A recruitment-agency placement, pipeline and fee tracker is listed at $5.99 and advertises billed/collected fees, recruiter commission and guarantee status. Source: https://notionmarkethub.com/product/recruiting-agency-placement-fee-tracker/
- A dual-sided recruitment-agency CRM spreadsheet is listed at €39. Source: https://viasheet.com/en/products/recruitment-agency-crm/
- A more general hiring pipeline tracker is available free. Source: https://arumsoft.com/resources/excel/recruiting-kpi-pipeline-tracker
- EnlistIndia publishes a free recruiter tier with a 10% fee per closed deal and paid recruiter tier at ₹499/month; agency tiers include ₹1,999 and ₹4,999/month with different platform fees. This is a platform's published price structure, not verified sales or market share. Sources: https://agency.enlistindia.com/pricing?for=individual and https://agency.enlistindia.com/pricing

**Decision:** Generic candidate pipeline templates are also crowded. Our product must not be another ATS or another basic candidate tracker.

## 3. Chosen differentiation hypothesis
Build a narrow **Recruitment Agency Cashflow & Guarantee Control Desk**:
- Recognize booked fees separately from cash actually collected.
- Model installment-level client collections, dates and overdue aging.
- Calculate recruiter commission only on cash received, with separate payable/paid status.
- Track guarantee/replacement windows and claim events.
- Show fee cash-conversion, client concentration, outstanding receivables and near-expiry guarantee exposure.
- Use anonymous internal IDs only; no candidate PII, CVs or contact data.
- Export auditable CSV/JSON reports and preserve local-only storage.

This is not an ATS, job board, employment service or recruiter marketplace. It is a self-serve operational control product for agency owners. It does not provide legal, tax or accounting advice.

## 4. Current product status
- `products/msme-ops-desk-lite/`: functional offline starter MVP, Hindi guide and listing draft. Candidate role: free sample/lead magnet until differentiated.
- `products/recruitment-agency-revenue-assurance/`: offline MVP with placement fees, cash collections, recruiter share, guarantee expiry and watchlist; Hindi guide and listing draft. Candidate role: private validation prototype, not ready for sale.
- Both products are unpublished and have no connected platform accounts.
- The recruitment MVP intentionally excludes candidate personal data.
- Product-market fit and willingness-to-pay remain unproven.

## 5. Pricing and channel discipline
Do not infer willingness-to-pay from competitor list prices alone. Run small controlled validation only after:
1. formula and data integrity tests;
2. usability testing with synthetic records;
3. a real problem/interest signal from the intended buyer segment;
4. payout/KYC/fee/settlement verification for at least two storefronts;
5. owner approval for public publication.

Topmate, Gumroad and Payhip+Razorpay remain candidate channels, not activated sellers. No paid setup or subscriptions.

## 6. Next build tasks
1. Extend recruitment MVP to installment-level receipts and payment ageing.
2. Add recruiter commission payable/paid reconciliation.
3. Add guarantee claim event log, replacement status and exposure dashboard.
4. Add client concentration and monthly cash conversion report.
5. Run synthetic end-to-end tests and privacy/security checks.
6. Prepare a polished product bundle and platform-neutral ZIP only after the core logic passes.

## 7. Revenue integrity
The ₹10 Cr target remains the mission ambition, not a guarantee. Product listings, downloads, views, unpaid balances or platform-reported creator sales do not count as our revenue. Only settled, controlled and reconciled net receipts count. Revenue ledger remains ₹0.
