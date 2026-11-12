# Recruitment Agency Revenue Assurance Desk — Product Draft v0.2.0

## Positioning
Offline-first cash-flow and guarantee-control desk for recruitment agency owners and finance/operations leads. Not an ATS, job board, employment service or manual recruiting service.

## Modules
- Anonymous placement, client and recruiter references.
- Installment-level client cash receipt ledger with date and optional reference.
- Booked fee, actual cash collected and outstanding balance.
- Recruiter commission earned only on collected cash.
- Recruiter commission paid ledger with overpayment guard.
- Guarantee claim, replacement and resolution event log.
- Receivable ageing buckets and client concentration.
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
- Package artifact run: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43159443230.
- Artifact SHA-256: `e7649325a2e1a28a08720f3cb2344a588240f81938fadd18ad6d9793470ce225`.
- Package is marked PRIVATE_DRAFT_NOT_FOR_PUBLICATION. No seller account or terms have been activated.
- Chromium + Firefox Playwright QA passed: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43159499045.
