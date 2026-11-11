# Travel Revenue Automation — Buyer-Ready Pilot Pack
**Version:** 1.0 | **Prepared:** 2026-11-11 | **Status:** Private draft; not sent to any buyer

## 1. Executive offer
A bounded, supervised 7-day pilot to validate one travel-lead workflow end to end in a buyer-controlled test environment. The pilot is not a promise to replace an existing CRM or deliver the full production platform described in a large enterprise brief.

**Pilot objective:** prove that a new enquiry can be captured with source attribution, deduplicated, checked for contact permission, structured into travel requirements, matched only against an approved package catalogue, routed to a human owner, and tracked through a human-approved quote/booking status.

## 2. Scope boundary
### Included in the 7-day pilot
1. One lead source only: one CSV import or one agreed sandbox/webhook source.
2. One destination cluster (up to 2 destinations) and one approved package catalogue (up to 50 active packages).
3. Lead normalization and duplicate detection using agreed identifiers.
4. Consent/opt-out state capture and hard suppression of contact actions when consent is absent or withdrawn.
5. Structured fields: destination, travel dates/window, traveller count, trip duration, budget band, source/campaign ID where supplied.
6. Deterministic package matching against buyer-supplied facts; no invented price, inventory, visa result or availability.
7. One routing rule to a human queue or up to 3 named destination owners.
8. Quote draft/handover summary; no quote is sent or booked automatically.
9. Follow-up task suggestions with attempt caps and stop conditions; no outbound message sending in pilot unless a separate approved sandbox test is explicitly agreed.
10. A basic funnel/exception report, event log, test report and handover guide.

### Explicitly excluded unless separately scoped
- Full CRM replacement or multi-tenant SaaS.
- Production WhatsApp Business API, Meta Lead Ads, Google Ads or website integrations.
- Production quotation API or booking/accounting sync.
- Live supplier inventory, fare, hotel or visa verification.
- Automated customer messaging, calls, sales negotiation or booking/payment actions.
- Full agent inbox, real-time supervisor console, workload optimization, complex RBAC, mobile apps, multilingual speech recognition, data warehouse or advanced BI.
- Migration/cleanup of historical CRM data; more than one lead source; more than 50 packages; custom integrations not named in the signed scope.
- Legal, tax or regulatory certification.

## 3. Seven-day execution plan
| Day | Work | Evidence/deliverable |
|---|---|---|
| 1 | Discovery, field map, consent model, source and stage definitions | Signed scope sheet, data dictionary, test plan |
| 2 | Configure one test lead intake and deduplication | Import/API test log; duplicate replay test |
| 3 | Configure approved package catalogue and deterministic matching | Catalogue validation report; match/no-match cases |
| 4 | Human routing and handover/quote draft | Owner assignment trace; quote draft sample |
| 5 | Follow-up task rules and stop conditions | Opt-out/booked/closed suppression tests |
| 6 | Funnel/exception report, audit trail, security review | Dashboard/export, exception list, audit sample |
| 7 | Buyer UAT, defect triage, handover | Acceptance report, source/config handover, open-issues register |

A seven-day schedule starts only after access, sample data, package catalogue, named reviewers and scope are available. Buyer-caused access delays pause the clock.

## 4. Acceptance tests (pass/fail)
The pilot is accepted only against the tests below, using buyer-approved synthetic or masked test records.

| ID | Test | Pass condition |
|---|---|---|
| AT-01 | Lead intake | 10/10 valid test records imported with required source fields retained |
| AT-02 | Duplicate replay | Replaying the same 10 records creates zero additional lead records |
| AT-03 | Consent gate | No-contact/unknown-consent records are not eligible for contact action |
| AT-04 | Requirement extraction | Agreed structured fields are populated from supplied structured test inputs; ambiguous fields go to human review |
| AT-05 | Package integrity | Every recommendation references an active buyer-approved package ID; no invented price |
| AT-06 | Routing | 10/10 deterministic test cases route to the owner/queue specified by the agreed rules |
| AT-07 | Human takeover | Every quote/handover remains draft/pending approval until a named human approves |
| AT-08 | Stop conditions | Opt-out, booked, closed and do-not-contact states suppress pending follow-up tasks |
| AT-09 | Traceability | Each output links to source record, rule/config version and event timestamp |
| AT-10 | Handover | Buyer receives source code, configuration, test report, runbook and open-issues list |

A test is not considered passed if it relies on manually editing the database after intake. External integrations are marked MOCK/SANDBOX until a real authenticated round-trip is demonstrated.

## 5. Buyer dependencies
Buyer provides through a secure, buyer-controlled channel:
- One technical owner and one sales/process owner.
- Test CRM export or sandbox access, with minimum necessary masked/synthetic data.
- Approved package catalogue, valid IDs, current prices and validity dates.
- Destination-owner mapping and routing rules.
- Consent/opt-out definitions and approved message policy.
- API documentation and test credentials only for integrations explicitly included in scope.
- Acceptance reviewer available on Days 1, 4 and 7.

Do not send passwords, API keys, customer data or credentials in ordinary email/chat. Prefer buyer-managed secret storage and least-privilege, revocable credentials.

## 6. Security, privacy and operational controls
- Data minimization: only fields required for the pilot.
- Prefer synthetic or masked records; no production customer dataset by default.
- Role-based access is limited to what the pilot environment supports; production RBAC requires separate design and testing.
- Secrets stay in buyer-controlled secret management; never commit secrets to Git.
- No training on buyer data by default; any model-provider processing must be disclosed and approved before use.
- Encryption, backups, retention, deletion, incident response and cross-border data handling must be agreed for the actual hosting and providers selected. Do not claim these controls exist until technically verified.
- Maintain source IDs, timestamps, rule versions and human-approval events.
- Human approval required for customer messages, quotes, booking, refunds, payments and changes to buyer records.
- On completion, revoke temporary access and return/delete pilot data according to the written data-handling agreement.

## 7. Commercial structure (test offer, not validated market pricing)
The Upwork reference buyer listed a $2,000 fixed-price budget for a much broader scope. That is a buyer-posted budget, not evidence of willingness to pay for this narrower pilot or confirmation of a contract.

**Pricing hypothesis for negotiation, subject to discovery:**
- Fixed 7-day bounded pilot: **US$1,500–2,000** (or INR equivalent at invoice-date conversion), excluding taxes, platform fees, messaging, hosting and third-party API charges.
- Optional paid discovery-only stage: **US$250–400**, credited against the pilot if the pilot proceeds.
- Production integrations and rollout: separately estimated after pilot; no fixed quote before API, data, security and operational discovery.
- Monthly support: quote only after agreed hours, response windows, monitoring duties and integration footprint are known.

These are test prices, not validated market rates, guaranteed earnings or an accepted offer.

### Suggested milestone schedule
- 30% on written scope approval and kickoff.
- 40% after Day 4 demonstration of intake, dedupe, package matching and human routing.
- 30% after Day 7 UAT and handover.
- Any platform escrow/payment protection rules override this suggested schedule. Do not begin work until the first milestone is actually funded/received under the agreed payment mechanism.

## 8. Change control
Any additional source, destination, package volume, integration, workflow, report, security control or acceptance test requires a written change request stating added effort, cost and schedule impact. No silent scope expansion. Defects against the agreed acceptance tests are corrected within the agreed pilot window; new requirements are changes.

## 9. Delivery and ownership
On full payment, transfer the agreed pilot source code, configuration, test evidence, runbook and open-issues register to the buyer's designated repository/account. Third-party libraries and services remain subject to their own licenses/terms. Buyer owns its data, accounts, credentials, package catalogue and customer relationships.

## 10. Honest capability statement
The current repository is a synthetic offline prototype. It demonstrates qualification, package matching, deterministic routing, quote drafting, guarded booking-state transitions and follow-up suppression. It does **not** yet connect to WhatsApp, Meta, Google, a live CRM, quotation API, booking system, supplier inventory or payment gateway. Those are implementation tasks, not existing capabilities.

## 11. Go/no-go before kickoff
Proceed only when all are true:
- Buyer and scope are identified in writing.
- Budget and milestone payment route are confirmed.
- Buyer confirms lawful authority to share the supplied data.
- Test data and required access are available.
- The exact integration list and sandbox/production distinction are documented.
- Acceptance tests and named approvers are agreed.
- Net economics remain positive after platform, payment, infrastructure and contractor/model costs.
