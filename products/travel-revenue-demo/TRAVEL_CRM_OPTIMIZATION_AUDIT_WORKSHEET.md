# Travel CRM Optimization — Technical Audit & Discovery Worksheet
**Version:** 1.0 | **Prepared:** 2026-11-11 | **Private working document; not sent to any buyer**

## Purpose
A low-risk, fixed-scope diagnostic for an existing travel CRM. The goal is to identify the highest-impact defects and produce a prioritized remediation plan before committing to integrations or production changes. This is not a claim that any particular buyer's CRM has been inspected.

## 1. Evidence required before diagnosis
Request read-only access or sanitized exports for:
- Current CRM architecture, version, hosting and user roles.
- Lead-source inventory: Meta Lead Ads, WhatsApp Business, web forms, calls, manual imports.
- Field dictionary and lifecycle stages.
- 100–500 masked lead rows with source/campaign IDs and timestamps.
- Duplicate rules and current duplicate examples.
- Routing rules, destination expertise mapping and owner roster.
- Existing quotation/PDF workflow and API documentation.
- Razorpay integration diagram/webhook documentation, if in scope.
- WhatsApp Business Platform provider, template/consent flow and webhook documentation.
- Current dashboard screenshots and one month of aggregate funnel metrics.
- Known incidents: missing leads, duplicate leads, delayed assignment, failed webhooks, quote errors, payment reconciliation gaps.

Never request live passwords or customer PII in ordinary chat/email. Use buyer-managed least-privilege access, sandbox credentials and masked data.

## 2. Audit workstreams
### A. Lead-source integrity
- Can every record be traced to source, campaign, ad/form and source event ID?
- Is webhook ingestion idempotent?
- Are retries safe and bounded?
- Are timezone and event timestamps normalized?
- Are missing source fields visible as exceptions rather than silently defaulted?

### B. Identity and deduplication
- Which identifiers are reliable: phone, email, source lead ID, customer ID?
- Are phone numbers normalized to E.164 where possible?
- Are multiple enquiries by one customer preserved as separate opportunities?
- Does deduplication avoid merging different family members or trips?
- Is there an audit trail for merge/unmerge?

### C. Consent and WhatsApp controls
- Is consent provenance recorded with timestamp, channel and purpose?
- Are opt-outs applied across all pending sequences?
- Are approved templates and business-initiated conversation rules respected?
- Does human takeover stop automated messages immediately?
- Are delivery failures and webhook retries observable?
- No outbound messaging test without buyer approval and sandbox/authorized channel.

### D. Routing and ownership
- Are destination skills and owner assignments explicit?
- Is there a fallback queue?
- Can ownership change without losing history?
- Is workload balancing measured or merely round-robin?
- Are SLA timers paused for customer waiting, holidays or closed states?

### E. Quotation integrity
- Does every quote reference a versioned approved package and catalogue timestamp?
- Are taxes, inclusions, exclusions, validity and currency explicit?
- Are API retries idempotent?
- Are quote status and amount sourced from the quotation system, not inferred by AI?
- Are expired or unavailable packages blocked?

### F. Payment and booking truth
- Is a booking confirmed only from the authoritative booking system?
- Is payment status verified from Razorpay webhook/API and reconciled to order/booking IDs?
- Are duplicate webhooks and out-of-order events handled?
- Are refunds, partial payments and failed payments represented distinctly?
- No payment is considered received based only on a screenshot, user statement or AI inference.

### G. Security and operations
- Role-based access and least privilege.
- Secrets stored outside source code.
- Audit logs for human and automated actions.
- Backup/restore evidence.
- Error queue, retry policy, alerting and health checks.
- Data retention/deletion and incident process documented.
- Sandbox and production environments separated.

## 3. Baseline metrics to request
Capture at least 2–4 weeks of aggregate data where available:
- Lead count by source and destination.
- Duplicate rate and invalid-contact rate.
- Median and 90th percentile time-to-first-human-response.
- Percentage assigned within target SLA.
- Contactability and opt-out rates.
- Quote creation rate and quote turnaround time.
- Quote-to-booking conversion, with booking-system source.
- Booking/payment reconciliation exceptions.
- Follow-up tasks due, completed, suppressed and overdue.
- Webhook failure/retry counts.
Do not invent baseline values. Mark unavailable metrics as instrumentation gaps.

## 4. Diagnostic severity model
| Severity | Definition | Example |
|---|---|---|
| P0 Critical | Financial, privacy or irreversible integrity risk | AI marks booking paid without payment-system proof |
| P1 High | Revenue leakage or systemic lead loss | Webhook drops leads; duplicate retries create repeated enquiries |
| P2 Medium | Operational delay or weak controls | No routing fallback or stale package catalogue |
| P3 Low | UX/reporting improvement | Cosmetic layout or non-critical export formatting |

Each finding must include evidence, affected workflow, business impact hypothesis, confidence, recommended fix, dependencies and retest.

## 5. Deliverable structure
1. One-page executive summary.
2. Current-state architecture and integration inventory.
3. Data-flow and lifecycle map.
4. Findings register with severity and evidence references.
5. Baseline KPI table and instrumentation gaps.
6. Prioritized 30/60/90-day remediation roadmap.
7. Fixed-scope pilot proposal with explicit exclusions and acceptance tests.
8. Risks, dependencies and buyer decisions required.

## 6. Paid diagnostic offer hypothesis (not validated)
- Timebox: 2–3 working days after receiving complete access/evidence.
- Output: audit report, prioritized remediation backlog, architecture diagram, acceptance test plan.
- Indicative test price: US$250–500, or INR equivalent agreed in writing, excluding taxes and platform/payment fees.
- This is a pricing experiment, not a validated market rate or guaranteed sale.
- Payment terms: 100% upfront for a small diagnostic, or platform-protected milestone if required by the platform. No work before payment protection is confirmed.
- If diagnostic proceeds to implementation, crediting some/all of the diagnostic fee is a negotiable commercial choice, not an automatic promise.

## 7. Go/no-go
Proceed only if:
- Buyer confirms existing CRM is accessible and they want optimization, not a full rebuild.
- Technical stack and integration ownership are identified.
- Buyer provides sanitized evidence and a named decision-maker.
- Payment protection and India payout route are verified.
- Scope and acceptance criteria are agreed.
- Net economics are positive.
- No NDA, data processing terms or platform conditions are accepted without required approval.

## 8. Candidate-specific status (as of 2026-11-11)
The Upwork listing “India Travel Holiday CRM Optimization” advertises $20–30/hour for 1–3 months, less than 5 proposals and 0 interviewing at page capture. The public profile shows client joined Aug 22, 2025, but this capture did not expose total spend, payment verification or review history. Therefore this worksheet is prepared as a reusable internal asset only. It is not evidence of a contract or proof of the buyer's technical environment.
