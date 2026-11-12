# CSV to Action — Open-Source Release Readiness Checklist

**Status:** Private preparation; not a release approval.  
**Candidate:** products/csv-to-action/  
**License:** Nested MIT license file; applies only to the intended product directory. Parent Nexus repository has no root license.

## Product promise (must remain accurate)
A browser-local CSV utility that analyzes a selected CSV file, identifies data issues and creates an action/exception list. The current README says no upload, no account, no remote server and no external dependency. These claims must be confirmed by code review and network-request tests before any release announcement.

## Required release gates
- [ ] Confirm the MIT license holder/notice is correct and the project owner approves public standalone distribution.
- [ ] Review every bundled file for third-party code, copied text, icons, fonts, sample data and dependency licenses.
- [ ] Verify no external network requests, telemetry, analytics, remote fonts or hidden uploads.
- [ ] Test large files, malformed CSV, quoted commas/newlines, Unicode, empty values, duplicate rows and formula-injection handling on CSV export.
- [ ] Confirm sensitive fields are not logged or persisted; file contents remain local.
- [ ] Add explicit privacy statement, security contact and vulnerability-reporting process.
- [ ] Add contribution guidelines, issue templates and supported browser versions.
- [ ] Publish reproducible test command and CI badge only after final CI passes on the exact release commit.
- [ ] Create tagged version and checksums only after owner approves the release.
- [ ] Only after a genuine user base exists, add GitHub Sponsors link and low-maintenance tiers.

## Security items to verify before distribution
1. CSV formula injection: cells beginning with =, +, -, @, tab or carriage return must be escaped/neutralized on exported files where appropriate, with a clear note that spreadsheet applications may evaluate formulas.
2. HTML rendering: imported cell content must be inserted as text, never interpreted as HTML.
3. Resource exhaustion: enforce file-size and row-count limits and fail gracefully.
4. Browser privacy: ensure File API usage only; no fetch/XHR/WebSocket/beacon requests or external script imports.
5. Error handling: malformed encodings and broken rows must not crash the UI or expose file contents in console logs.

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
- Release-grade CSV formula-injection and browser network tests need explicit verification.

**Decision:** Continue preparation only. Do not publish or create a new repository until the owner approves the public release and licensing scope.
