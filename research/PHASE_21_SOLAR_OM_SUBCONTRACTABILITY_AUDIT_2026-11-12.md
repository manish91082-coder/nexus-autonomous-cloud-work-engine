# Phase 21 — Solar O&M Subcontractability and Live Buying-Trigger Audit
Date: 2026-11-12
Repository: manish91082-coder/nexus-autonomous-cloud-work-engine
Branch: master
Mode: public-evidence research only

## 1. Executive decision

Phase 20 established that operating solar portfolios have recurring reporting workloads but did not establish a buyer or subcontractable budget. Phase 21 tested the missing link: whether live project contracts permit subcontracting and whether a current award/tender creates a concrete reporting workload.

**Result:** one strong contractual route to a *possible* reporting sub-package was verified in an active SECI 60 MW Gaya solar EPC + five-year O&M tender. The contract expressly allows subcontracting subject to Owner/Employer information and written consent, while prohibiting 100% back-to-back subcontracting. The prime contractor remains fully liable. The technical tender separately requires SCADA/data acquisition, 1-minute/15-minute source data, daily generation records, monthly energy/downtime records and monthly O&M reports.

This is evidence that a bounded reporting/data-QA sub-package can be contractually possible under this particular tender, not evidence that SECI or the eventual EPC/O&M contractor has bought or offered that package to us.

**Qualified funded subcontract opportunities: 0.** No named prime contractor, approved subcontract, buyer budget, purchase order, funded milestone, data authorization or payment protection has been verified. No outreach, calls, proposals, registration, KYC, tender participation, paid tool use or customer-data access was performed.

## 2. Primary live contract evidence — SECI Gaya 60 MW

Official tender record:
- Tender: SECI/C&P/OP/11/0007/26-27
- Tender ID: SECI000284; CPPP ID 2026_SECI_852713_1
- Scope: design, engineering, supply, construction, erection, testing, commissioning and five-year O&M of a 60 MW AC / 84 MWp DC plant at Gaya, Bihar.
- Published: 30 September 2026.
- Online bid deadline: 3 December 2026, 18:00 IST; offline submission deadline: 7 December 2026, 18:00 IST.
- Tender processing fee: ₹25,000 + GST.
- EMD stated in the bid information sheet: ₹6,43,60,000.
- Official tender page: https://www.seci.co.in/tender-details/Ympz
- Contractual tender PDF: https://www.seci.co.in/uploads/tenders/Contractual_tender_document_60_MW_Gaya.pdf
- Technical tender PDF: https://www.seci.co.in/uploads/tenders/Technical_tender_document_60_MW_Gaya.pdf

### 2.1 Subcontracting clause — exact legal gate

Contractual document, GCC Clause 30, PDF pages 41–43 (printed GCC pages 41–43):
- Clause 30.1 says subcontracting other than labour engagement is permitted with information to the Owner/Employer.
- The same clause prohibits subcontracting 100% of the contract on a back-to-back basis.
- It also says no part/share/interest may be transferred, assigned or sublet without written consent of the Owner/Employer, except as provided in the clause.
- Subcontracts for temporary works are subject to written consent and notification to the Engineer-in-Charge/Project Manager.
- Contractor must provide the list of subcontractors and nature of work performed.
- Prime contractor remains solely responsible for quality, execution, subcontractor acts/omissions and statutory compliance.

**Interpretation:** do not treat this as blanket permission. Any proposed reporting/data-QA scope must be explicitly carved out in the prime contract, disclosed to the Owner, and receive the written consent required by the applicable clause. The prime remains accountable. Legal review of the complete contract and any amendments is mandatory before a commercial commitment.

### 2.2 Technical workload evidence

Technical tender, Sub-Section A:
- Sections 4 and 9 include SCADA, Power Plant Controller and data-acquisition/communications infrastructure for remote monitoring and transfer of real-time data.
- Operation/performance monitoring requires logging plant voltage, current, power factor, power and energy; failures, interruptions, relay trips, causes/duration; monthly energy output and downtime.
- Functional Guarantee Test Procedure requires 90-day raw-data submissions, including one-minute SCADA/weather/plant-generation data and 15-minute ABT meter data.
- Daily generation is recorded in 15-minute blocks and the daily report is signed by EPC Contractor and Owner.
- O&M Agreement requires accurate operating logs, records and monthly reports, plus continuous performance monitoring.

This creates a measurable reporting-control workload. It does **not** prove that the prime will outsource it or that the task is safe to perform without authorized engineering oversight.

## 3. Recent award signals and channel leads

### 3.1 Waaree Renewable Technologies — 360 MWp, five-year O&M
- Public exchange-related disclosure reports a five-year O&M agreement for a 360 MWp solar project; LOA/intimation date 31 October 2026.
- Awarding IPP is described but not named in the public summary.
- No reporting-only subcontract scope, subcontract permission, budget, or vendor intake was disclosed.
- Decision: **strategic channel lead only; not a qualified buyer or paid opportunity.**
- Sources:
  - https://www.solarbytes.info/india-bytes/waaree-renewable-technologies-five-year-om-360-mw-solar-project-india-12775514
  - https://www.bazaarwatch.com/announcement/269168/waaree-renewable-technologies-limited-bagging-receiving-of-orders-contracts

### 3.2 Solarium Green Energy — 50 MW AC / 65 MW DC EPC + O&M subcontract
- Public reporting states Solarium received an LOA as a subcontractor for end-to-end EPC and three-year O&M services for a 50 MW AC / 65 MW DC Maharashtra project under MAHAGENCO; reported order value approximately ₹186.525 crore excluding GST.
- This is direct evidence that subcontract delivery structures are used in the sector.
- It does not establish that Solarium can further subcontract reporting, that it has an active reporting backlog, or that it has a budget/approval for our proposed service.
- Decision: **subcontract-chain precedent and strategic channel lead only; no outreach or qualification as buyer.**
- Sources:
  - https://www.business-standard.com/markets/capital-market-news/solarium-green-energy-bags-contract-worth-rs-186-52-cr-126062400347_1.html
  - https://www.pv-magazine-india.com/2026/06/24/solarium-green-wins-epc-contract-for-65-mw-dc-solar-project-in-maharashtra/

### 3.3 REIL — AI/ML/DL integration for PV monitoring
- A secondary tender index reports GeM bid GEM/2026/B/8251647 for AI/ML/DL integration services for a PV monitoring system, published 6 November 2026, closing 27 November 2026, disclosed estimate approximately ₹4.42 crore, EMD ₹8.5 lakh and 5% ePBG.
- The same index reports three years' experience. The primary GeM bid document and all eligibility clauses were not independently retrieved in this audit.
- Decision: **watch only; not an actionable opportunity.** Do not infer eligibility, subcontract permission or a reporting-only scope from the index summary.
- Source (secondary index): https://tenders.infralens.in/gem/ai-machine-learning-and-deep-learning-integration--8251647

## 4. Narrow service package to validate with a future prime

**Working name:** Solar O&M Reporting QA and Evidence Pack.

Permitted bounded work hypothesis:
1. Receive only buyer-authorized, preferably redacted CSV/XLSX exports and a buyer-approved data dictionary.
2. Validate timestamps, timezone, intervals, units, site/meter identifiers, duplicates and missing intervals.
3. Reconcile source totals across approved inverter/plant/ABT meter exports without altering raw data.
4. Create an exception register with file/sheet/row/time-block references.
5. Calculate only buyer-defined KPIs/formulas and clearly label unresolved exceptions.
6. Generate draft daily/monthly reporting tables and source-linked reviewer checklists in the buyer's approved template.
7. Maintain a reproducible run log and hand over for qualified prime/O&M engineer review.

Explicit exclusions:
- No SCADA/PPC control, plant commands, grid operation or remote intervention.
- No electrical diagnosis, fault root-cause determination, field O&M, maintenance, safety sign-off or engineering certification.
- No generation, PR, availability or financial-settlement guarantees.
- No interpolation/imputation or changing source records without written methodology.
- No plant/customer data access without written owner/prime authorization and security controls.
- No direct owner representation or subcontracting that bypasses the prime.

## 5. Mandatory qualification gates before any work

A future lead becomes actionable only after all are documented:
1. Named prime contractor and authorized commercial decision-maker.
2. Specific live plant/portfolio, reporting period, data volume and cadence.
3. Prime's authority to subcontract this exact scope and required Owner/Employer written consent.
4. Prime-approved scope, data-processing authorization, NDA/security/IP terms and liability boundary.
5. Redacted sample exports, template, data dictionary, timezone, meter hierarchy and formulas.
6. Named technical reviewer and objective acceptance tests.
7. Fixed fee/rate, currency, tax/withholding, platform/bank/FX charges and payment due date.
8. Advance, funded milestone or escrow before work begins; no unsecured pay-when-paid.
9. Prime's payment obligation independent of owner payment, or a legally reviewed and adequately protected alternative.
10. Positive net receipts after all actual costs.

## 6. Phase 21 decisions and scoreboard

- Primary contract clause verified: SECI Gaya GCC Clause 30.1.
- Technical reporting workload evidenced: yes.
- Current named prime contractor for Gaya: not yet identified; award pending.
- Owner consent for any subcontract: not obtained.
- Reporting-only budget/rate: unknown.
- Qualified funded subcontract assignments: **0**.
- Buyer requests / outreach / proposals: **0**.
- Accepted work / submissions / settlements: **0**.
- Verified gross receipts: **₹0**.
- Verified net receipts: **₹0**.
- Costs: not reconciled.
- All activity in this phase: public-evidence research only.

## 7. Next phase — Phase 22

1. Monitor SECI Gaya tender amendments, bid opening and award; identify the successful prime only from an official award/LOA.
2. Audit the awarded prime's public subcontract/vendor onboarding and any written scope split. Do not infer it from the tender alone.
3. Continue public research on Waaree's 360 MWp O&M award and Solarium's subcontract chain; seek evidence of vendor intake or reporting/data QA procurement, not generic company contacts.
4. Expand beyond solar only where the same evidence chain exists: live buyer trigger → separable scope → AI-permitted execution → India-compatible payout → funded/secured payment.
5. Keep marketplace opportunity scoring as a parallel revenue-acquisition lane. The deterministic evidence-first ranker is already implemented at `cloud-work-engine/opportunity_ranker.py` and is invoked in `.github/workflows/nexus-funded-job-scan.yml`; do not rebuild it. Ranking is not acceptance probability or submission authorization.

No outreach, bid, application, registration, KYC, contract acceptance, payment or data access without the relevant owner authorization and verified legal/commercial gates.
