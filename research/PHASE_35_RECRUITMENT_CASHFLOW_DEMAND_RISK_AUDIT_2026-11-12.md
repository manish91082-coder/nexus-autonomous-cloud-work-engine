# Phase 35 — Recruitment cashflow product demand and competitive risk audit (2026-11-12)

## Decision
Do not publish Recruitment Agency Revenue Assurance Desk v0.2.0 as a paid product yet. Its engineering quality is materially improved, but direct willingness-to-pay for this exact tool remains unproven and several competitors already cover overlapping features.

Getvik remains the preferred zero-upfront distribution channel for a future validation test, not evidence of demand for this particular B2B product.

## Evidence of real operational pain
- A June 10, 2026 Reddit discussion in r/recruiting asks how to get contingent-search clients to pay invoices on time; replies mention repeated follow-ups and retained/engagement fees as a way to reduce payment risk. This is anecdotal, not a representative survey.
- A November 17, 2023 r/recruiting discussion describes a placement invoice with 10-day payment terms and a 90-day replacement guarantee. The client delayed payment and disputed liability after the placed worker left; commenters discussed contract language that voided the guarantee if payment was late. This illustrates the specific operational interaction between receivables and guarantee obligations, but one discussion cannot quantify market size or demand.

## Competitive overlap
- WePlacement publicly advertises placement fee, GST/TDS 194J invoicing, replacement guarantee tracking, commission payout guarded until the client invoice clears, and related agency workflows.
- IT Ways lists a ₹1,499/month Growth Agency plan with placement GST invoicing, replacement guarantee tracker and recruiter incentive/split ledger; Starter is ₹999/month.
- HireMitra publicly lists placement fee and collection tracking within a broader agency CRM/ATS.
- EnlistIndia offers agency and recruiter plans with earnings, invoices and ledger; a free plan charges 10% per closed deal, with paid agency plans from ₹1,999/month.
- These public feature/pricing claims are vendor statements, not independent quality or sales audits.

## What remains differentiated in our v0.2.0
- Offline single-file utility, no server, subscription or external dependencies.
- No candidate PII, making it a separate finance-control layer beside an existing ATS.
- Installment-level cash receipt history and commission payable/paid reconciliation.
- Guarantee claim/replacement event history.
- Local JSON backup and restore.
- Low-friction, self-serve download rather than a full ATS.

## Weaknesses / commercial risk
- Offline localStorage is single-device and single-browser; no team collaboration, cloud backup or cross-device sync.
- No invoice due date in v0.2.0; ageing currently uses placement date as a proxy.
- Guarantee status is operational, not a contract interpretation engine.
- Competitors already offer guarantee and fee tracking as part of a broader suite.
- Getvik's visible demand counters are strongest in education/Excel products; its Business/Finance category has weaker visible first-page sales. This does not prove demand for recruitment agency finance software.
- Getvik Terms require creators to provide reasonable buyer support. A low-cost download may still create support work; the Hindi FAQ reduces but does not eliminate this obligation.

## Product decision and next differentiation hypothesis
Keep v0.2.0 private. Before publication, consider one focused v0.3.0 enhancement:
1. Capture invoice reference, invoice date and contractual due date.
2. Calculate receivable ageing from due date rather than placement date.
3. Flag payments received after due date.
4. Add a user-configured guarantee-payment clause flag (e.g. payment must be on time / guarantee independent of payment / manual contract review).
5. Show an operational guarantee-risk flag based on dates and recorded receipts, while explicitly refusing to interpret legal contracts.

This would address the observed pain more directly: the link between client payment timing and guarantee exposure. It must remain a user-configured operational warning, not legal advice or an automated conclusion that a guarantee is void.

## Go/no-go gates
Do not publish until:
- the due-date/guarantee-risk feature is either built or explicitly excluded from the product promise;
- product-specific demand is tested with genuine unrelated buyers;
- license, refund terms and support channel are approved;
- Getvik KYC, Payout Declaration and account fees are reviewed by the owner;
- the owner explicitly approves public release.

## Sources
- Reddit late contingent-search invoice discussion (10 Jun 2026): https://www.reddit.com/r/recruiting/comments/1u24n37/ontime_payment/
- Reddit placement invoice / 90-day guarantee discussion (17 Nov 2023): https://www.reddit.com/r/recruiting/comments/17x52hl
- WePlacement agency software: https://weplacement.com/for-agencies
- IT Ways placement agency CRM/pricing: https://www.itways.in/placement-agencies-crm/
- HireMitra agency CRM: https://hiremitra.in/agencies
- EnlistIndia agency pricing: https://agency.enlistindia.com/pricing

## Accounting
No seller account created. No KYC or legal terms accepted. No product published. No spend. Realized net receipts ₹0.
