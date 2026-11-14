# Phase 59.6 — Indian Manufacturing Job-work / Subcontracting Reconciliation Screen (14 November 2026)

**Authority:** V5 Master Constitution  
**Task:** P59-001 — IN_PROGRESS  
**Hypothesis:** self-serve job-work challan, material-at-subcontractor, WIP, scrap/shortage and ITC-04 reconciliation layer for Indian MSME manufacturers.  
**Decision:** **NO-GO for the generic job-work tracking / challan / ITC-04 reconciliation hypothesis as currently formulated.** Preserve the parent B2B vertical software source family.  
**Product selected:** NONE. **Build authorization:** NO.  
**PCNE:** ₹0. **Spend:** ₹0.

## 1. Why this vertical was screened

Job work/subcontracting creates recurring material-control and compliance obligations. The principal may send inputs or capital goods to one job worker and then onward to another; the principal remains responsible for keeping proper accounts. Section 143 of the CGST Act provides one-year return/supply timing for inputs and three years for capital goods (with statutory exceptions for moulds, dies, jigs, fixtures and tools). CBIC Rule 45 describes challan documentation and ITC-04 reporting; applicability and filing frequency must be checked against current notifications and the taxpayer's circumstances.

Primary legal references (read with later amendments and current notifications; not tax advice):
- CGST Act, Section 143: https://cbic-gst.gov.in/pdf/CGST-Act-2017-amended-01012022.pdf
- CBIC input tax credit / job-work rules: https://cbic-gst.gov.in/input-tax-credit-rules.html
- CBIC Circular 38/12/2018-GST: https://cbic-gst.gov.in/pdf/circularno-38-cgst.pdf

## 2. Buyer pain and current evidence

The recurring job is not just invoice creation. It can involve:
- customer-owned material at multiple subcontractors;
- partial returns against original inward challans;
- material sent from one job worker to another;
- process consumption, scrap, yield and rejection replacement;
- job-card/operation rate cards and cost attribution;
- challan ageing and time-limit monitoring;
- customer visibility and periodic GST reporting.

A March 2025 CRIER annual survey of Indian MSMEs focuses on digitalisation and enterprise development, but it does not by itself establish the prevalence of job-work challan reconciliation failures or price-bearing WTP for a dedicated product:
https://icrier.org/pdf/ES_Annual-Survey-MSMEs_India_2025.pdf

A 2026 ASUSE/PIB release reports 7.92 crore unincorporated non-agricultural establishments in India for Jan-Dec 2025 and 8.52% GVA growth in manufacturing vs 2023-24; this is a broad sector base, not an addressable count of job-work businesses:
https://www.pib.gov.in/PressReleasePage.aspx?PRID=2258362&lang=1&reg=3

Vendor-authored articles by Pentoggle and ERPDrive describe the same issues (partial returns, multi-stage subcontracting, scrap, challan balances and ITC-04), but these are problem statements published by vendors in the market, not independent prevalence or loss studies:
- https://www.pentoggle.com/industries/manufacturing/job-work-software
- https://erpdrive.in/blog/subcontracting-job-work-management-indian-manufacturers.html

## 3. Fifteen substitute / competitor screen

| # | Product | Publicly described overlap |
|---:|---|---|
| 1 | Pentoggle Job Work Software | Direct specialist: inward challans, operation job cards, multi-stage WIP, per-challan material reconciliation, scrap/loss/rejection, customer portal, ITC-04 |
| 2 | Pothera ERP (Bsquare) | Direct: outsource/insource job work, job worker balances, actual vs standard consumption, tolerance, scrap/finished returns, traceability, ITC-04 |
| 3 | managemate | Direct: job-work challans, partial receipts, unused material return, job charges, time limits and ITC-04 tables |
| 4 | ERPDrive | Manufacturing ERP with subcontracting/job-work workflow, challan, stock and compliance content |
| 5 | KreupAI / OptiForge | Job-work material tracking, multi-stage subcontractor chain, scrap, GST timelines and costing |
| 6 | MyRecords Cloud | Job cards, offline shop-floor screen, job-work challans, Rule 55, ITC-04 tables and custom implementation |
| 7 | ERPNext | Open-source manufacturing/subcontracting, stock movements and accounting; setup/configuration burden |
| 8 | Odoo Manufacturing | Manufacturing orders, subcontracting, work centres, quality and inventory; partner/configuration ecosystem |
| 9 | TallyPrime | Job Work In/Out, BOM/manufacturing journal and inventory; limited native multi-operation shop-floor control |
| 10 | BUSY | Job-worker records, job-work registers, manufacturing/stock journals |
| 11 | Zoho ERP | India manufacturing ERP launched in 2026; manufacturing orders, work centres, job cards, subcontract manufacturing and quality |
| 12 | SAP Business One | Production/MRP and partner-led manufacturing workflows |
| 13 | Microsoft Dynamics 365 Business Central | Production BOMs, routings, subcontracting and costing |
| 14 | Oracle NetSuite | Manufacturing, work orders and subcontracting in enterprise ERP |
| 15 | Katana | Cloud manufacturing/inventory for small manufacturers; fit for Indian job-work statutory detail needs verification |

Sources:
- Pentoggle: https://www.pentoggle.com/industries/manufacturing/job-work-software
- Pothera: https://www.bsquare.in/job-work-management-software.html
- managemate: https://managemate.in/features/job-work
- ERPDrive: https://erpdrive.in/blog/subcontracting-job-work-management-indian-manufacturers.html
- KreupAI: https://www.kreup.ai/blog/india-job-work-material-tracking
- MyRecords: https://myrecords.cloud/resources/guides/how-to-choose-erp-for-manufacturing-india/
- ERPNext: https://docs.frappe.io/erpnext/user/manual/en/manufacturing
- Odoo: https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/subcontracting.html
- Tally: https://help.tallysolutions.com/job-work/
- BUSY: https://busy.in/
- Zoho ERP: https://www.zoho.com/erp/
- SAP Business One: https://www.sap.com/india/products/erp/business-one.html
- Dynamics 365: https://www.microsoft.com/en-us/dynamics-365/products/business-central
- NetSuite: https://www.netsuite.com/portal/products/erp/manufacturing.shtml
- Katana: https://katanamrp.com/

This is a public-feature screen. It does not establish market shares, customer counts, or that each competitor has equal depth in every workflow.

## 4. Product gap test

The most promising-looking edge initially appeared to be messy real-world reconciliation: multiple job-worker hops, partial returns, retained scrap, process loss, rejection replacement and material/customer traceability. But the direct specialist Pentoggle explicitly describes these cases and offers a dedicated job-work product. Pothera also describes outsource/insource tracking, tolerance reconciliation, scrap/finished returns and ITC-04. managemate lists partial receipts, unused goods returns, challans, time limits and ITC-04. General ERPs can be configured for adjacent cases.

Thus the proposed generic job-work ledger is not demonstrably differentiated.

Potential future gaps (NOT selected; require evidence):
- interoperability/reconciliation layer for a narrowly defined legacy ERP + subcontractor network where each party already uses a different system;
- a specific sector's quality/traceability workflow where generic job-work products do not model the necessary process;
- evidence-backed principal-to-subcontractor portal with low-cost adoption and no bespoke integrations.

No two independent buyer signals, customer invoices, renewal evidence, paid WTP or measurable loss data for such a narrower gap were found in this screen.

## 5. Economics and self-serve risk

A generic job-work SaaS would need master-data setup, BOM/process/routing configuration, job-worker onboarding, opening WIP reconciliation, challan migration, user permissions, mobile/offline operations and GST reporting validation. This is likely to create implementation and support load. Partner-led ERP implementations are already common; that is inconsistent with the mission's no-manual-fulfilment and zero-upfront constraints unless a genuinely self-serve wedge is proven.

No verified price-bearing WTP or reliable customer acquisition path has been established. Do not derive a ₹10 Cr forecast from India's total MSME count.

## 6. Decision

**NO-GO** for a generic job-work challan/material reconciliation/ITC-04 SaaS product in the current form.

This does not close manufacturing software as a source family. It closes this current product hypothesis until a materially different, independently evidenced buyer gap appears.

## 7. Next P59-001 action

Return to the V5 portfolio-wide source map. Do not continue serially cloning adjacent vertical ERP features. Compare remaining source families and look for a higher-value recurring problem with:
1. two independent current buyer signals;
2. 10–15 substitutes and a defensible missing workflow;
3. a named budget owner and price-bearing WTP;
4. evidence-backed loss/revenue consequence;
5. self-serve acquisition and delivery without cold outreach or manual implementation;
6. legal, rights, India payout and zero-spend gates.

Keep Tech Cloud ERP source/ownership/module inventory audit open; do not assume it includes job-work modules. P59-002 remains BLOCKED. No build, listing, KYC or spend. PCNE ₹0.
