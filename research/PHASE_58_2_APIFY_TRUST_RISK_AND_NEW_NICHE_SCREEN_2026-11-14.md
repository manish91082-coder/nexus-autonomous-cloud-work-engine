# Phase 58.2 — Apify Trust/Supply-Chain Risk and Additional Niche Screen
**Date:** 14 November 2026  
**Authority:** `MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md`  
**Task:** P58-001  
**Status:** Research only; no product selected  
**Spend / account / Actor run / source upload / publication:** ₹0 / none / none / none / none

## 1. Additional generic niche screens

### A. Chrome extension permission drift
Apify Store examples: https://apify.com/transparent_meteorite/chrome-extension-permissions-audit and https://apify.com/sellerkit/chrome-web-store-scraper. Adjacent alternatives include Extension Security Monitor (https://chromewebstore.google.com/detail/extension-security-monito/eaimbdialjbkogfndijjppdgopiiaggg), Google Chrome Enterprise Core (https://chromeenterprise.google/products/chrome-enterprise-core/) and Netskope Extension Governance (https://docs.netskope.com/en/admin-setting-up-your-first-extensions-governance-security-policy/). The extension monitor advertises inventory, permission/host drift, risk scoring and alerts; enterprise controls provide allow/block/force-install policies.
**Decision: NO-GO generic.** Existing browser-local monitoring and enterprise controls cover the broad job; no differentiated recurring paid outcome or WTP was identified.

### B. WCAG / website accessibility audit
Direct Apify Store alternatives:
- https://apify.com/siteauditlab/website-accessibility-audit
- https://apify.com/nitsuahlabs/website-accessibility-audit
- https://apify.com/automation-lab/website-accessibility-wcag-audit
- https://apify.com/niches/accessibility-audit
These provide rendered-page axe-core/WCAG checks, violation evidence, selectors, fixes, reports and scheduled/batch workflows. Their own descriptions distinguish automated tests from legal certification.
**Decision: NO-GO generic.** Multiple direct Actors already serve the broad job; no differentiated segment or WTP.

### C. US building permits / contractor leads
Direct Apify examples:
- https://apify.com/owlabee/building-permits-scraper
- https://apify.com/steadyscrape/building-permits-scraper
- https://apify.com/scrapesage/us-building-permits-scraper
- https://apify.com/staticxviper/permits
- https://apify.com/cea_digital/building-permits-code-violations-scraper
- https://apify.com/lentic_clockss/us-permits-licenses-scraper
Coverage includes city/county open data, normalized schemas, new-permit monitoring and contractor/solar/roofing enrichment. One Actor explicitly says some public rows are not certified permit records.
**Decision: NO-GO generic.** Multiple direct Actors cover the broad job; no differentiated recurring buyer outcome or WTP.

## 2. Apify third-party Actor Trust / Supply-Chain Preflight

**Status: HOLD_FOR_EVIDENCE. Not selected; no build authorized.**

Apify's Actor Terms say Community Actors are available without Apify verification or guarantees; Apify does not review, vet, endorse or monitor them and does not guarantee security or legal compliance. Users are responsible for due diligence on available code, reputation and functionality. Creator access to Actor Inputs/Outputs depends on permissions:
- https://docs.apify.com/legal/actor-terms-and-conditions
- https://docs.apify.com/actors/running/permissions

Apify's Shared Responsibility page says it moderates the Store, enforces runtime isolation and may remove malicious Actors, but does not conduct line-by-line Community Actor code audits:
https://docs.apify.com/security/shared-responsibility

**Native controls already exist:** Limited vs Full permission badges; explicit Console approval before a new Full-permission Actor's first run; Actor Quality Score including Trustworthiness, reliability, feedback and history; Trust Center resources including SOC 2 Type II and penetration-test attestations.
Sources:
- https://apify.com/change-log/full-permission-actors-approval
- https://docs.apify.com/actors/publishing/quality-score
- https://trust.apify.com/

A November 2025 Apify community discussion asks how Limited Permissions work; an Apify developer responds. This is one low-engagement discussion, not two independent enterprise buyer signals or WTP:
https://www.reddit.com/r/apify/comments/1p2ocrd/limited_permissions_whats_restricted/

### 12-substitute audit
| # | Substitute | Coverage | Type |
|---:|---|---|---|
| 1 | Apify permission badges | Limited/Full access visibility | Native |
| 2 | Apify Full-permission approval | Explicit approval before first run | Native |
| 3 | Apify Actor Quality Score | Trustworthiness, reliability, feedback/history | Native |
| 4 | Apify Shared Responsibility / moderation | Runtime isolation, moderation/removal, user due diligence | Native/process |
| 5 | Apify Trust Center | SOC 2 Type II, penetration-test and platform assurance | Platform assurance |
| 6 | Semgrep | Static application security testing | Adjacent |
| 7 | Snyk Code/Open Source | Code and dependency vulnerability analysis | Adjacent |
| 8 | Socket | Malware, typosquat, package supply-chain and suspicious-behavior detection | Adjacent |
| 9 | GitHub Code Security/CodeQL/Dependabot | Code scanning, dependency review and alerts | Adjacent |
| 10 | OpenSSF Scorecard | Open-source project security-practice checks | Adjacent |
| 11 | Trivy | Vulnerability, misconfiguration, secret, license and SBOM scanning | Adjacent |
| 12 | Grype/Syft and JFrog Xray | SBOM/package vulnerability and source/binary composition scanning | Adjacent |

Representative official sources:
- https://semgrep.dev/products/semgrep-code
- https://snyk.io/product/snyk-code/
- https://socket.dev/alerts
- https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security
- https://openssf.org/projects/scorecard/
- https://trivy.dev/docs/latest/target/filesystem/
- https://oss.anchore.com/docs/guides/vulnerability/scan-targets/
- https://docs.jfrog.com/security/docs/xray

**Substitute conclusion:** generic SAST/SCA/SBOM and trust dashboards are served. A possible differentiation would have to be Apify-specific: Actor manifest/permission-change analysis, dependency/secret checks, outbound-access evidence and version-to-version risk delta. Source availability across Community Actors and repeat buyer demand remain unproven.

### Candidate decision
| Gate | Finding |
|---|---|
| Community Actor due-diligence responsibility | YES |
| Native Apify permission/quality/trust controls | SUBSTANTIAL |
| Generic code/dependency scanner alternatives | SUBSTANTIAL |
| Two independent buyer signals | NOT ESTABLISHED |
| Qualified price-bearing WTP | NOT ESTABLISHED |
| Source availability and rights across Actors | NOT ESTABLISHED |
| Reliable security verdict from static evidence | NOT ESTABLISHED |
| Generic trust scanner | NO-GO |
| Narrow Apify-specific static preflight | HOLD_FOR_EVIDENCE |
| Build/account/run/publication/spend | NOT AUTHORIZED; ₹0 |

Do not describe this as a malware scanner, security certification or trust guarantee. If reconsidered, scan only user-owned or lawfully accessible source/metadata, never execute an Actor or request an Apify token, and explicitly disclose unobservable behavior. Current WTP fails.

## 3. Apify platform security incident gate

Apify's official status page records unauthorized access to parts of its internal systems using a compromised credential on 9–10 November 2026, detected 11 November. Its 13-Nov update described token hashing, network restrictions, stronger authentication and a planned post-mortem. On 14-Nov the API and Actors were listed as **Partial Outage**:
https://status.apify.com/

**Evidentiary boundary:** this official notice does not establish Community Actor source-code, Actor-run or every customer-dataset compromise. Do not claim a third-party Actor supply-chain breach.

**Mission gate:** until the official post-mortem is published and reviewed and API/Actors are operational, do not create a new Apify account, configure Creator Plan, run Actors, upload source/customer data, connect private GitHub repositories or authorize spend. Public-source research only. This is a conservative zero-spend mission control, not a claim that Apify instructed every user to stop.

## 4. Disposition
| New family/candidate | Decision |
|---|---|
| Chrome extension permission drift | NO-GO generic |
| WCAG / website accessibility audit | NO-GO generic |
| Building permits / contractor leads | NO-GO generic |
| Generic Actor Trust / supply-chain scanner | NO-GO generic |
| Narrow Apify-specific static Actor preflight | HOLD_FOR_EVIDENCE; buyer WTP/source access unproven |
| Apify platform as a whole | NOT REJECTED; research continues after incident/post-mortem gate |

P58-001 remains IN_PROGRESS. No Actor or product selected. Do not reopen rejected generic families by renaming them.
