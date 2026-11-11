# Product-market validation checkpoint — 2026-11-11

## Decision
Do not build another generic WhatsApp chatbot, CRM, field-service suite, or invoice reminder product yet. Continue demand validation before expanding the existing Job-to-Cash Control Kit.

## Evidence observed
1. Meta announced Business AI on WhatsApp for eligible small businesses in India on 14 May 2026. It supports 24/7 customer responses, lead capture, appointment booking and product recommendations in native Indian languages, without third-party tools. This substantially commoditizes generic WhatsApp FAQ/lead-response bots. Official source: https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/
2. ServicePilot publicly lists Indian field-service plans at ₹2,499/month (Starter), ₹4,999/month (Growth) and ₹7,499/month (Pro), excluding GST, with jobs, scheduling, complaints, AMC, quotations, payments, inventory and reporting. Source: https://servicepilot.in/pricing/
3. Crystal CRM markets a lifecycle platform for agencies that sell, install and service products, including leads, quotations, installed products, AMC, tickets, field visits, renewals and an AI assistant. It has a free plan and a paid per-agent plan. Source: https://crystalcrm.in/
4. PaisaBaki publicly positions itself around WhatsApp/email invoice follow-up, promise/blocker capture and next-action tracking for Indian businesses. Its page labels sample financial figures illustrative and invoice OCR as planned for a later increment. Source: https://paisabaki.com/
5. Other published category pricing found in search includes KaryaFlow from ₹81/user/month billed yearly and VORA CRM from ₹500/month. These are vendor-published claims and have not been independently tested.

## Interpretation
- There is a visible commercial category for field-service/AMC operations and receivables follow-up, evidenced by multiple vendors publishing products and prices. This is evidence of market supply and pricing, not proof of unmet demand or willingness to buy our product.
- A generic lead bot is a weak wedge because Meta now offers a native substitute to eligible businesses.
- A generic FSM/CRM product is also a weak wedge because established vendors already bundle scheduling, technician apps, AMC, invoices, collections and reporting.
- The existing offline CSV kit is too easy to substitute and does not yet have verified buyer demand. Keep it as a low-cost prototype, not as a revenue forecast.

## Working hypothesis to test (not validated)
A narrow, service-specific “voice note / photo → verified job closeout → pending parts/approval → customer update draft → invoice/collection next action” assistant may complement existing FSM/CRM systems rather than replace them. Candidate verticals: solar installation/maintenance, RO service, AC service, CCTV/security and electrical contractors.

The product must not autonomously promise a repair price, technician arrival time, discount, safety instruction, or payment status. Extracted facts remain untrusted suggestions until a human confirms them. Do not connect customer WhatsApp accounts or send messages until channel terms, consent, security, pricing and authorization are verified.

## Validation gates before coding a new product
- Find at least 10 independent public customer complaints or workflow descriptions from the target vertical, not vendor marketing alone.
- Identify at least 5 businesses with the same repeated workflow and evidence they already pay for staff/software or lose measurable time/money.
- Validate a concrete buyer role, trigger, input, output and current workaround.
- Verify competitor feature coverage and switching friction.
- Test willingness to pay with a clearly stated price hypothesis; no fabricated survey responses or outreach without approval.
- Confirm a legal, low-cost distribution and payment path for an India-based seller before public launch.
- Build only the smallest workflow that complements existing tools and can be delivered reliably without paid APIs.

## Next execution
Research customer-side evidence for solar/RO/AC/CCTV/electrical service operators, compare repeated failure points, and shortlist one narrow workflow. Keep marketplace scanning read-only in parallel. No outreach, registrations, paid subscriptions, public listings or submissions are authorized by this checkpoint.

## Revenue state
Verified realized revenue remains ₹0. The product build artifact is not a sale or payment.


## Additional customer-workflow evidence — solar O&M (11 Nov 2026)
- Public procurement specifications from Oil India describe monthly preventive maintenance, detailed maintenance/health reports, and quarterly invoices submitted with those reports; one tender states invoices without accompanying reports will not be entertained. Source: https://www.oil-india.com/files/oldtender/national/NIT_SJI8084P19.pdf
- A separate Oil India specification describes monthly maintenance reporting and quarterly billing, reinforcing that evidence packs are part of the contractor's billing workflow. Source: https://www.oil-india.com/files/oldtender/national/NIT_SDI5233P18.pdf
- An ISRO e-procurement annexure specifies breakdown response, qualified personnel, and monthly reports of generation, preventive/breakdown maintenance and downtime. Source: https://eproc.isro.gov.in/common/viewDocument?id=ff8081819a713e5f019ae36b69097761&indentId=SH2025000200
- These are real procurement requirements for particular contracts, not proof that all small rooftop EPCs face the same requirement or will pay for software.
- Stronger narrow hypothesis: a **solar O&M evidence-pack assistant** that turns technician voice notes, photos, meter readings and checklist selections into a human-reviewed visit report, exception list and invoice-supporting monthly pack. It should export PDF/CSV and attach source evidence; it must never invent readings, work completed, technician qualifications, sign-offs or generation figures.
- This wedge is narrower than a CRM/FSM and ties directly to report-backed billing requirements. Still not validated for SMB willingness to pay. Before implementation, collect 10+ independent contractor-side examples, identify a reachable buyer segment, and test willingness to pay. No public outreach yet.
