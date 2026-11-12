# Recruitment Agency Revenue Assurance Desk — Product Draft v0.1.0

## Positioning
An offline-first revenue-control tool for recruitment agency owners and finance/operations leads. It is not an ATS and does not store candidate personal data.

## Core workflow
- Record placement reference, client reference, recruiter reference and joining date.
- Record booked placement fee and cash collected.
- Calculate outstanding placement fee and recruiter share on collected cash.
- Track contractual replacement/guarantee periods and upcoming expiry exposure.
- Monitor collection ratio and open guarantee exposure.
- Export/restore local JSON backup.

## Differentiation hypothesis
Most generic recruitment trackers focus on candidate pipelines. This tool focuses on agency cash conversion and post-placement obligations: billed vs collected fees, recruiter split on collections, and guarantee/replacement exposure. It deliberately avoids candidate PII and ATS scope.

## Privacy
Single HTML file; no server, network, telemetry or external libraries. Local browser storage only. Do not enter candidate names, phone numbers, email addresses, CVs or other personal data. Use a compliant ATS for candidate records.

## Status
Private MVP draft only. Product-market fit unproven. Not published, no platform account connected, no terms accepted.

## QA
- Offline/no-external-script smoke test
- Required module presence
- Embedded JavaScript syntax check via Node.js
