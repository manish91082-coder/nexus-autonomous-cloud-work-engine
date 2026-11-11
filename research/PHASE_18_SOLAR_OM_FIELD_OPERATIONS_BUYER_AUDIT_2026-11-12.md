# Phase 18 — Solar O&M and Field Operations Buyer Qualification
**Date:** 2026-11-12  
**Status:** Research complete; market need verified, no immediately qualified paid contract.

## Executive finding
Solar O&M has a clear recurring reporting burden: generation/inverter monitoring, cleaning and inspection logs, fault records, performance reporting, SLA/availability tracking and monthly evidence packs. However, reviewed public evidence does not establish a current buyer seeking to subcontract this reporting layer independently to our project. Public tenders are full-scope plant O&M/EPC procurements with material eligibility, capital, site manpower, safety and performance obligations. Marketplace solar opportunities were overcrowded, required unsupported specialist experience, or were full-time employment-style roles.

**Decision:** Do not bid on, register for, or attempt to prime any identified tender. Do not build a solar O&M product yet. Continue with a narrow reporting diagnostic only after a real buyer confirms data availability, ownership, acceptance criteria, budget and payment protection.

## 1. Primary-source demand evidence

### A. MAHAPREIT / National Cancer Institute, 3 MW Solar O&M, Wardha
Source: https://mahapreit.in/assets/uploads/tender-doc-1791181368.pdf
- RFP No. MAHAPREIT/NCI/O&M/RFP-2/2026-27.
- Five-year O&M service-provider contract for commissioned 3 MW plant at Kelapur, Wardha, serving National Cancer Institute, Nagpur.
- Submission deadline: **15-Oct-2026 15:00**; opening 16-Oct-2026 15:00. Closed as of 12-Nov-2026.
- RFP document fee ₹5,000 + GST; tender processing fee ₹10,000 + GST; EMD ₹1,00,000, with exemption only for qualifying MSMEs registered for solar-plant O&M and documentary evidence.
- Requires full O&M capability, site inspection, site manpower (site engineer, technicians, cleaning workers and security), tools/consumables/minor spares, SCADA support, safety, insurance, statutory compliance, local liaison and reporting.
- Decision: CLOSED and structurally unsuitable. Not a reporting-only subcontract request.

### B. PPCL / Pragati Power Station-III, Bawana, 2.904 MWp Floating Solar
Source: https://ipgcl-ppcl.gov.in/documents/tender/2026_11_06_Tender_Doc_Float_Solar_PV.pdf
Tender No. 1000014422/PPCL/FSPV/CAPEX/2026-27.
- Primary tender specifies site survey, design, engineering, supply, civil works, erection, testing, commissioning, warranty, insurance and comprehensive five-year O&M for complete 2.904 MWp floating solar plant.
- Full-capacity bid only; two-part techno-commercial/financial process.
- Vendor portal annual registration ₹5,000 + GST; tender processing fee ₹10,000 + GST; auction processing fee ₹10,000 + GST; EMD required (exact amount and full qualifying requirements require complete bid information review).
- Successful bidder must provide 1% security deposit and 10% performance bank guarantee, with PBG tied to five-year O&M plus claim period.
- Technical requirements include open API data acquisition, SCADA/remote monitoring, timestamped logs, 15-minute interval data push to owner cloud in XML/JSON, Excel-compatible date-wise tabular/graphical data, and monitoring of AC/DC electrical values, generation, irradiance and temperatures.
- This proves reporting/data-interface obligations exist inside a large solar EPC/O&M contract. It does **not** prove the owner will subcontract reporting independently.
- Decision: NO-GO as prime; capital-intensive and specialist-heavy. No registration, fee, bid or signature.

### C. SECI tender index
Source: https://www.seci.co.in/tenders
- Official SECI index lists current renewable procurements, including a 60 MW AC solar PV project at Gaya with O&M, listed bid end date 03-Dec-2026.
- These are developer/EPC-scale procurements, not a separable reporting services request based on the index.
- Decision: pipeline intelligence only; no bid.

## 2. Marketplace buyer-side qualification

### D. Solar EDA and KPI Identification
https://www.upwork.com/freelance-jobs/apply/Exploratory-Data-Analysis-EDA-and-KPI-Identification-for-Solar-Energy-Data_~022116214245104629323/
- Scope: clean solar consumption/installations datasets, EDA, trends, KPI identification, regional/time comparisons, charts and business recommendations.
- $11–35/hour; less than 30 hours/week; under one month; entry-level; one-time project.
- Activity: 50+ proposals; client last viewed two weeks ago; 1 hire, 0 interviewing; client joined Oct 27 2026, India, $18 total spend, 2 hires, 0 active.
- Decision: DEFER/NO BID. Solar domain alignment is useful, but crowded, stale client activity and minimal buyer spend. No demonstrated solar analytics portfolio to claim.

### E. Solar PV & BESS Permitting / Utility Interconnection Specialist
https://www.upwork.com/freelance-jobs/apply/Solar-PV-BESS-Permitting-and-Utility-Interconnection-Specialist_~022118815466367980986/
- Buyer requests paid pilot with potential ongoing work, coordinating permits and utility approvals in Illinois; requires hands-on battery-only permitting and ComEd/Ameren interconnection experience.
- 6+ months, less than 30 hours/week, contract-to-hire; displayed $5–20/hour; 5–10 proposals, 0 interviewing.
- Buyer joined Upwork Dec 11 2018, $58K spend, 74 hires, 12,685 hours.
- Decision: NO-GO. Real buyer and lower competition, but jurisdiction-specific hands-on experience is required and not evidenced.

### F. Solar Administrative & Operations Assistant
https://www.upwork.com/freelance-jobs/apply/Solar-Administrative-Operations-Assistant-Full-Time-Mountain-Time_~022118779339695166906/
- Full-time long-term remote role for US residential solar company; includes permits, utility approvals, PTO, homeowner communication, CRM and weekly reports; US Mountain Time 8 AM–5 PM.
- This is explicitly full-time employment/contract-to-hire style work, not a project assignment.
- Decision: EXCLUDE under user's no-job preference.

## 3. Industry proof versus buyer proof
Tata Power's 11-May-2026 solar O&M vendor guide:
https://www.tatapower.com/blogs/7-factors-to-consider-when-choosing-a-solar-om-vendor-in-2026
- Describes outsourced O&M, real-time SCADA monitoring, preventive/corrective maintenance, automated fault detection, defined SLAs, performance reporting, sample monitoring reports, response times, safety/compliance and multi-site scalability.
- Useful for buyer vocabulary and evidence requirements, but vendor education/marketing, not an independent buyer request or subcontract award.
- Tata's page gives an indicative rooftop O&M price range of ₹3–₹7/W/year; vendor-published general guidance only, not a verified price for reporting-only services.

## 4. Offer hypothesis: Solar O&M Evidence Pack and Reporting QA
Potential bounded service, subject to buyer validation:
- ingest buyer-provided CSV/Excel/SCADA exports and technician forms;
- validate timestamps, missing values, duplicates, unit consistency and source references;
- produce generation/availability trend summaries only from supplied validated data;
- compile maintenance completion register and exception list;
- track open faults and owner-assigned follow-ups without technical diagnosis;
- prepare human-reviewed monthly report draft and invoice-supporting evidence index;
- preserve source lineage and audit log.

Explicit exclusions:
- no direct SCADA connection until API permission/security review;
- no remote control or dispatch of plant equipment;
- no electrical engineering judgement, fault diagnosis or safety sign-off;
- no field maintenance, cleaning, repairs, spares procurement or site attendance;
- no guaranteed generation, CUF, uptime or SLA outcomes;
- no statutory certification, regulatory filing or accounting entries;
- no plant data ingestion without written owner authorization and scoped access.

## 5. Qualification gate before any build or outreach
1. Named asset owner/O&M contractor and authorized buyer.
2. Confirmation reporting may be subcontracted independently under prime contract.
3. Written data ownership, access authorization and security requirements.
4. Redacted sample export and sample expected report.
5. Reporting cadence, data volume, sites/plants and exception definitions.
6. Acceptance criteria and reviewer.
7. Budget/rate and payment terms; first milestone funded/received before work.
8. Liability boundaries: reporting support only; technical decisions remain with qualified O&M personnel.
9. India payout, tax/withholding and platform/transfer fees known.
10. Written approval before outreach, proposal, vendor registration, terms, data access or spend.

## 6. Actions not taken
No tender bid, vendor registration, fee, EMD, PBG, DSC, KYC or terms acceptance. No buyer outreach, marketplace proposal or application. No paid tooling, API subscription or customer/plant data access. No claim of solar plant operation, SCADA integration, EPC delivery or production solar analytics deployment.

## 7. Scoreboard
- Verified gross receipts: ₹0
- Verified net receipts: ₹0
- Paid contracts/pilots: 0
- Proposals/outreach: 0
- Costs: not yet reconciled; tool credits are not income.

## Next phase
Phase 19: qualify actual reporting-only subcontract demand from O&M contractors and solar asset managers, using precise requirements identified in PPCL/MAHAPREIT documents. Search public buyer/vendor calls that explicitly permit reporting/SCADA data QA subcontracting, and identify regional O&M firms only as research leads, not assumed buyers. In parallel prepare a no-cost synthetic-only sample O&M report specification if it materially supports buyer validation; do not implement integration or contact firms until buyer and permission gates pass.
