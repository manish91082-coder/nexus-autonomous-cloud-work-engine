# Travel Revenue Automation Demo

Synthetic, offline demonstration of a travel-sales workflow: consent-aware lead qualification, destination/budget/duration package matching, deterministic salesperson assignment, indicative quotation draft, booking-state transition controls and follow-up stop conditions.

## Run
`python products/travel-revenue-demo/engine.py --leads products/travel-revenue-demo/samples/leads.csv --packages products/travel-revenue-demo/samples/packages.csv --owners products/travel-revenue-demo/samples/owners.json --out /tmp/travel-demo.json`

## Explicit boundaries
- Synthetic records only. No real customer data.
- No WhatsApp, email, CRM, supplier, payment gateway or booking integration.
- No message is sent, no availability is checked, no booking is created, and no payment is verified.
- Quotes are indicative drafts, not offers or confirmed prices.
- Consent must be present before a lead is marked qualified; human approval remains mandatory.
- Follow-up stops for opt-out, booked, closed or do-not-contact states.
- Owner assignment is deterministic demo routing, not live workload optimization.
- No paid API, model, package or cloud dependency.

## Suggested bounded pilot (only after buyer agreement)
Day 1: map one lead source, fields, consent and existing sales stages.
Day 2: connect one client-owned test export/CRM sandbox; dedupe and qualify.
Day 3: configure approved package catalogue and routing rules.
Day 4: generate quote drafts and human review queue.
Day 5: booking-state and follow-up suppression tests.
Day 6: dashboard, audit log, exception handling and user acceptance.
Day 7: controlled handover and acceptance review.

Buyer supplies and owns all CRM/WhatsApp/supplier credentials and API charges. Scope, data processing terms, acceptance tests, payment milestones and production integrations must be agreed in writing before implementation. This repository demo is not the production pilot.
