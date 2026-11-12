# Recruitment Agency Revenue Assurance Desk — Product Draft v0.3.0

## Positioning
Offline-first cash-flow and guarantee-control desk for recruitment agency owners and finance/operations leads. Not an ATS, job board, employment service or manual recruiting service.

## Modules
- Anonymous placement, client and recruiter references.
- Installment-level client cash receipt ledger with date and optional reference.
- Booked fee, actual cash collected and outstanding balance.
- Recruiter commission earned only on collected cash.
- Recruiter commission paid ledger with overpayment guard.
- Guarantee claim, replacement and resolution event log.
- Invoice reference/date/due date and due-date-based receivable ageing (placement-date proxy visibly marked when due date is missing).
- Late-payment and payment-linked guarantee risk flags based on a user-selected contract clause; operational reminders only, never legal interpretation.
- Client concentration.
- Guarantee expiry watchlist.
- JSON backup/restore with legacy v0.1.0 migration.

## Calculation policy
- Outstanding = max(0, agreed placement fee − sum of receipt events).
- Commission earned = sum of receipt events × recruiter share %.
- Commission payable balance = max(0, earned − recorded payments).
- Ageing currently uses placement date as a proxy, not contractual invoice due date. Do not treat this as statutory accounting ageing.
- Client concentration = client's outstanding / total outstanding.

## Privacy / architecture
Single HTML file, no server, no network calls, telemetry or external libraries. Local browser storage only. No candidate PII fields. Do not store candidate names, contact details, CVs, government identifiers or sensitive personal data.

## Status
Private validation draft. No publication, platform connection, KYC, legal acceptance or revenue. Product-market fit and willingness to pay remain unproven.

## QA
- Offline/privacy contract checks
- Embedded JavaScript syntax check
- Formula-level tests for receipts, outstanding, commission, ageing and client concentration

## Distribution preparation
- First validation channel selected: Getvik Free, subject to owner approval, KYC and legal acceptance.
- Secondary: ownstreet Free after a first genuine paid sale.
- Private launch packet: [GETVIK_LAUNCH_PACKET.md](GETVIK_LAUNCH_PACKET.md).
- License draft for review: [LICENSE_DRAFT.md](LICENSE_DRAFT.md).
- Private package workflow: [package-recruitment-product.yml](../../.github/workflows/package-recruitment-product.yml).
- Package artifact run: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43160901484.
- Artifact SHA-256: `e3ece9f15c3738e1ecea86cccd6b39799b5a60cf41140dfb0a61f67548421195`.
- Package is marked PRIVATE_DRAFT_NOT_FOR_PUBLICATION. No seller account or terms have been activated.
- Chromium + Firefox Playwright QA passed: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43160901456.
- Added [Hindi customer FAQ](CUSTOMER_FAQ_HI.md) to reduce repetitive support and clarify offline storage, backups, receipts, commission, guarantee events and product limitations.
- Latest private package includes `CUSTOMER_FAQ_HI.md`; ZIP and SHA-256 validation passed in run https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43159877452.


## v0.3.0 differentiation
- Contractual invoice due date drives receivable ageing when provided.
- Late receipts and overdue balances are flagged.
- User selects whether the signed guarantee clause requires on-time payment, is independent of payment, or requires manual review.
- The app never determines legal validity or voids a guarantee. It displays an operational signal only.
- v0.3.0 formula/mission CI passed: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43160680889.
