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
- Ageing uses the contractual invoice due date when supplied; if missing, placement date is visibly marked as a proxy. This is not statutory accounting ageing.
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
- Latest verified private package run #38: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43277956809.
- Uploaded private artifact ID: `13971801662`; GitHub artifact ZIP digest: `sha256:ed0126a6236f1582f16385cca5107ce0280c9328c08915ed0bfbbeff8e60824d`. Product ZIP checksum is in `dist/SHA256SUMS.txt` and was verified in run #38. Chromium + Firefox QA run #31 retry passed on parent commit `e430517def212a76bddd858ec28be7acd43155d6`: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43277812722. Exact latest HEAD browser QA remains pending retry.
- Package is marked PRIVATE_DRAFT_NOT_FOR_PUBLICATION. No seller account or terms have been activated.
- Chromium + Firefox Playwright QA passed on the tested revision noted above: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43277812722.
- Added [Hindi customer FAQ](CUSTOMER_FAQ_HI.md) to reduce repetitive support and clarify offline storage, backups, receipts, commission, guarantee events and product limitations.
- Latest private package includes `CUSTOMER_FAQ_HI.md`; ZIP and SHA-256 validation passed in run https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43277956809.


## v0.3.0 differentiation
- Contractual invoice due date drives receivable ageing when provided.
- Late receipts and overdue balances are flagged.
- User selects whether the signed guarantee clause requires on-time payment, is independent of payment, or requires manual review.
- The app never determines legal validity or voids a guarantee. It displays an operational signal only.
- v0.3.0 formula/mission CI passed: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43160680889.
