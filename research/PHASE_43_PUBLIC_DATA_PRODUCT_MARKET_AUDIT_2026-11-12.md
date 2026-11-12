# Phase 43 — Public-Data Product Market Audit

**Date:** 2026-11-12  
**Task:** P43-002  
**Decision:** No immediate public-data product pilot. Continue research only; no data product build or paid listing.

## 1. Rights and licensing baseline
The Government Open Data License-India permits lawful commercial use, adaptation, derivative products and services for data covered by that licence, with explicit attribution to the provider/source and DOI/URL/URI. The licence does not automatically cover third-party copyrighted material; individual dataset metadata/licence and source rights must be checked per dataset. OGD portal terms also disclaim accuracy/completeness warranties, so products must preserve provenance and date stamps.
- Licence: https://www.data.gov.in/Godl
- Portal terms: https://www.data.gov.in/terms-of-use

## 2. Candidate evidence

| Candidate | Source and freshness | Existing market | Decision |
|---|---|---|---|
| District MSME intelligence | UDYAM registration catalog is district-wise, includes LG Directory district codes and MSME lists; catalog updated 11 Nov 2026 and offers API/download access | DataRankIndia already offers free district master file, paid state packs ₹299–799, sector packs ₹499–1,499, Pro data ₹999–2,999 and bespoke reports from ₹2,000 | **HOLD**. Data is current and relevant, but broad district/sector aggregation already has a paid competitor. API key and data access mechanics need further verification. |
| Tender discovery/alerts | Public tender sources are fragmented | TenderPulse ₹199–₹1,499/month with free plan; BidEasy ₹5,000/year; Mitra Tender ₹149/month and annual plans; other aggregators already compete | **NO-GO** for generic tender alerts. Requires a highly specific eligibility/price intelligence advantage, not another alert feed. |
| Tourism intelligence | Ministry of Tourism dataset has state/UT tourist arrival/visit resources and was updated 12 Aug 2026; district-level coverage is not consistent across India | Travel CRM and tourism data products exist; public figures are mostly annual/state-level | **HOLD**. Granularity and update cadence may not support a recurring operational decision product. |
| Renewable-energy intelligence | OGD includes state-level potential and installed capacity datasets; several specific records are old or sourced from parliamentary answers | Tender intelligence and renewable-energy data providers already exist | **HOLD**. Need a better live project/commissioning pipeline source; available public data is too fragmented or stale for a reliable paid feed. |
| Agriculture district/crop data | Crop production dataset contains district/crop/season/year values; catalog/resource update dates show annual/older data | Existing agritech data services and open sources; no verified buyer gap found in this pass | **HOLD**. Data recency and buyer value need deeper evidence. |

## 3. Demand and competitor evidence
- OGD portal reports 357,955 resources and 184,790 APIs on its current homepage, but this measures portal scale, not paid buyer demand.
- UDYAM registration catalog: https://www.data.gov.in/catalog/udyam-registration-msme-registration
- DataRankIndia public pricing and product: https://datarankindia.com/services/
- TenderPulse public pricing: https://www.tenderpulse.co.in/pricing
- Tourism data: https://www.data.gov.in/catalog/india-tourism-statistics
- Renewable energy datasets: https://www.data.gov.in/dataset-group-name/Renewable%20Energy

## 4. Conclusion
Open-data rights can enable commercial derivative products, but data availability alone is not a business. Generic tender alerts are already inexpensive. MSME district intelligence is directly served by a competitor. Tourism and renewable energy datasets do not yet show the required uniform granularity, freshness and buyer demand. No product should be built until a narrow, repeated buyer decision is identified and the exact data rights and source cadence are proven.

## 5. Next task
P43-003: validate original technical publishing as a long-horizon compounding lane. Verify KDP India payout/royalty rules, AI disclosure and content quality requirements, inspect actual competing products, and determine whether a genuinely original, technically useful manuscript can be made from existing verified research. This is P1, not a quick-cash assumption.
