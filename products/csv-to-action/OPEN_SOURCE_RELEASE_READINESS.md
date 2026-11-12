# CSV to Action — Open-Source Release Readiness Checklist

**Status:** Private preparation; not a release approval.  
**Candidate:** products/csv-to-action/  
**License:** Nested MIT license file; applies only to the intended product directory. Parent Nexus repository has no root license.

## Product promise
A browser-local CSV utility that analyzes a selected CSV file, identifies data issues and creates an action/exception list. The selected file is read locally. The current static source test verifies no remote network APIs or external script/link URLs appear in the page. This is not a substitute for an independent runtime security audit.

## Verified engineering checks
- CSV parser tests cover quoted commas, escaped quotes and embedded newlines.
- Malformed/unclosed quotes and duplicate headers are rejected.
- Alternate headers are mapped.
- Overdue balances, invalid dates, duplicate IDs and overpayment are flagged.
- CSV export quotes commas/newlines.
- Formula prefixes (=, +, -, @) are neutralized, including leading tab/newline/BOM cases.
- Input limit: 10 MB at browser file picker and 100,000 parsed data rows in engine.
- Static HTML test asserts no fetch, XMLHttpRequest, WebSocket, sendBeacon, external script or external link URL.
- CI run 43174294723 passed 11/11 tests, static bundle validation, packaging and artifact upload.

## Remaining release gates
- [ ] Confirm MIT copyright holder/notice is correct and owner approves standalone public distribution.
- [ ] Review all bundled files for third-party code, copied text, icons, fonts, sample data and dependency licenses.
- [ ] Conduct independent runtime browser network capture and verify no requests leave the page during import, analysis or export.
- [ ] Test large files, malformed encodings, Unicode, empty values, duplicate rows and spreadsheet formula-injection behavior in Excel/LibreOffice.
- [ ] Confirm imported cell content is rendered only as text; no HTML interpretation or script execution.
- [ ] Add a security contact and vulnerability-reporting process.
- [ ] Add contribution guidelines, issue templates and supported browser versions.
- [ ] Publish a reproducible test command and CI badge only after final CI passes on the exact release commit.
- [ ] Create a tagged version and checksums only after owner approves the release.
- [ ] Only after a genuine user base exists, add GitHub Sponsors link and low-maintenance tiers.

## Community funding posture
- Do not imply that GitHub Sponsors guarantees income or platform discovery.
- No private support, custom integration or response-time promises in tiers.
- Prefer transparent public roadmap, tagged releases and changelog as sponsor benefits.
- Sponsorship account setup, KYC, bank/tax details and tier publication remain owner-controlled.

## Current gaps
- No standalone repository; code is nested in the Nexus mission repository.
- Parent repository has no root license; nested MIT license scope must be made explicit.
- Current adoption is effectively zero; no user demand or sponsor conversion evidence.
- No security contact or published vulnerability-reporting policy found in the current product folder.
- Independent runtime security review remains pending.

**Decision:** Continue preparation only. Do not publish or create a new repository until the owner approves the public release and licensing scope.
