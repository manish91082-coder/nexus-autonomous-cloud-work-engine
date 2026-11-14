# Phase 55 P55-001 — Authentication and Data-Import Design Gate
**Audit date:** 14 November 2026  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Candidate:** Forge Budget Sentinel / Developer Cost Guard  
**Decision:** HOLD_FOR_EVIDENCE — NO PAT HANDLING, NO BUILD, NO ACCOUNT, NO SPEND

## 1. Purpose and decision

This document separates the three different Atlassian data paths so the project does not confuse API availability, app-policy permission, and buyer value.

**Current result:**
- The App Resource Usage API is documented, but its published authentication example uses a PAT.
- New Marketplace apps must not collect, transmit, or store Atlassian user PATs.
- Atlassian staff publicly mentioned a native “Export usage” button, but the export file's format and data coverage are not documented in the sources reviewed.
- The API documentation's sample query demonstrates one resource (FUNCTION_COMPUTE) and daily `tokensConsumed/tokenUnit` values; it does not establish LLM/Container completeness.
- Commerce invoice fields are documented, but the invoice endpoints explicitly block Forge and OAuth2 app clients. Partner Portal access requires a previously approved and published Paid-via-Atlassian app and a private-domain business email.
- No buyer WTP signal exists.

No architecture is approved for implementation.

## 2. Source-derived facts

### 2.1 App Resource Usage API

Atlassian's export documentation (last updated 6-Aug-2026) says:
- the account making the request must be the account that owns the Forge app;
- the documented basic-auth setup requires the owner's email and Atlassian API token;
- the `X-ExperimentalAPI` header is required because the API is experimental and subject to change;
- each request contains one `usageKey`;
- `ENVIRONMENT_ID` grouping, pagination and automatic grouping from `contextAris` are supported;
- rate limit is five requests per minute;
- Government Cloud and Isolated Cloud are unsupported.

The published sample query uses `resource: FUNCTION_COMPUTE`. The sample response gives:
- `period`;
- `resolution: ONE_DAY`;
- `tokensConsumed`;
- `tokenUnit`;
- pagination page/pageSize and an error object.

This demonstrates a daily, unit-labelled usage-metric shape for a sample resource. It does **not** prove the full resource-key inventory, LLM input/output data, Container vCPU-hour/GiB-hour coverage, or the exact completeness of an export for all usage meters.

Official source: https://developer.atlassian.com/platform/forge/developer-space/export-app-resource-usage/

### 2.2 Marketplace PAT policy

The Marketplace Security Enforcement Policy says Marketplace apps must not collect, transmit or store Atlassian user account API tokens. It directs partners toward OAuth 2.0/3LO or platform authentication where supported. Its timeline states:
- existing apps had a migration deadline at end of Q2 2026 and may contact Atlassian via ECOHELP if a required API is still PAT-only, with migration extension while platform work progresses;
- new Marketplace apps must be fully compliant; apps that collect, transmit or store PATs will not be approved during security questionnaire review.

Official source: https://developer.atlassian.com/platform/marketplace/marketplace-security-enforcement-policy/

**Scope caution:** this is a prohibition for Marketplace apps. It is not proof that every private, unlisted, owner-operated script is covered identically. It is also not proof that an unlisted/local CLI has an exemption. The local CLI's legal/Developer-Term and data-access classification must be confirmed; do not design around a presumed loophole.

### 2.3 Native “Export usage” button

On 19-Aug-2026, an Atlassian staff reply in the Developer Community said an “Export usage” button had been added at the top of the Usage and Charges page to improve visibility of the export option. The reply separately said standard platform usage alerts are 50/75/90/100% thresholds, with LLM and Containers excluded at that time because their usage threshold is zero.

Source: https://community.developer.atlassian.com/t/forge-platform-usage-costs-alerts-limits/102240

The public source does not define:
- downloadable file extension or MIME type;
- column/schema or versioning;
- start/end date coverage and retention;
- whether it includes every app/site/context/environment and every usage key;
- whether LLM model/token details and Container vCPU/GiB hours are included;
- whether exports are scheduled, incremental or only manually downloaded.

**Do not assert CSV, JSON, full history, LLM coverage or Container coverage until observed from a user-authorized export or confirmed in writing.** No export was performed for this project.

### 2.4 LLM and Container cost exposure

The current Forge pricing page lists:
- LLM input and output: zero free credits; model-specific credit pricing;
- Container compute: zero free vCPU-hour allowance, priced at USD 0.07177/vCPU-hour;
- Container memory: zero free GiB-hour allowance, priced at USD 0.00786/GiB-hour.

Source: https://developer.atlassian.com/platform/forge/forge-platform-pricing/

Atlassian staff said platform alert emails are not supported for LLM and Container meters because their zero thresholds do not support the standard alert mechanism. The combination suggests a potential residual buyer problem, but only if reliable usage data can be extracted and priced. The public App Resource Usage API sample does not prove this.

### 2.5 Commerce invoice route and partner prerequisites

The invoice REST schema documents invoice status and dates, totals, per-line descriptions/periods/quantity/unit amounts/usage/entitlement references, `paymentMethodObj`, `paymentStatus`, `dunningHistory` and `dunningStatus`.

However:
- the invoice list, detail and PDF endpoints say Forge and OAuth2 apps cannot access those resources;
- invoice list requires the `X-transaction-account` header;
- Commerce API authentication uses a bearer access token generated by Partners in the Partner Portal;
- Commerce authorization is based on billing roles such as Billing Admin and Billing User;
- Partner Central access requires at least one approved and published PvA app and a business email on an approved private domain; public/generic email domains are not accepted.

Official sources:
- https://developer.atlassian.com/platform/commerce/rest/api-group-invoices/
- https://developer.atlassian.com/platform/commerce/platform-concepts/security/
- https://developer.atlassian.com/platform/marketplace/onboarding-hub/grow/access-partner-central-and-program-benefits/

**Bootstrap implication:** a new vendor without Partner Central access cannot assume it can generate the Partner Portal bearer token required for a local Commerce integration. The published/PvA-app and private-domain prerequisites must be established first. The invoice client-type restriction is explicit for Forge/OAuth2 apps; access by a non-Forge/non-OAuth local CLI is still unconfirmed.

### 2.6 Third-party integration listing

Atlassian's listing guide defines a third-party integration as software that integrates with an Atlassian app without an artifact being installed on the customer's Atlassian instance. The publisher can select “My app isn't directly installable”, provide a binary URL or information URL and supply a test instance.

Source: https://developer.atlassian.com/platform/marketplace/knowledge-base/listing-a-third-party-integration-on-the-atlassian-marketplace/

This guide does not itself determine:
- whether this particular developer-side local CLI is classified as a Software App or Cloud App;
- whether Paid-via-Atlassian or Paid-via-Vendor is permitted;
- whether its product category may use any pure-Forge revenue-share incentive.

Written classification remains required.

## 3. Architecture disposition matrix

| Architecture | Decision | Reason |
|---|---|---|
| New Marketplace app collects/transmits/stores owner PAT to call Resource Usage API | **NO-GO** | Conflicts with Marketplace Security Enforcement Policy for new apps. |
| Marketplace app uses OAuth 2.0/3LO against Resource Usage API | **UNPROVEN / HOLD** | Policy recommends OAuth, but Resource Usage API documentation does not document an OAuth/app-auth flow. |
| Owner manually exports usage in Developer Console; tokenless local tool imports file | **POSSIBLE / NOT PROVEN** | Staff confirms Export usage button exists; file schema/completeness/resource coverage and Marketplace processing classification unknown. |
| Standalone non-Marketplace CLI uses PAT directly | **UNVERIFIED / DO NOT ASSUME EXEMPT** | Marketplace rule scope may differ, but Developer Terms/API authorization must be confirmed in writing. |
| Local CLI uses Commerce Partner bearer token for invoice/dunning access | **UNVERIFIED / CONDITIONAL** | Requires Partner Portal access, transaction-account identifier and billing role; Portal access itself requires published PvA app + private-domain email; endpoint client-type restriction still unresolved. |
| Manual invoice PDF/file import into local tool | **POSSIBLE FALLBACK / NOT TESTED** | Removes live Commerce authentication dependency but creates manual reconciliation work and has not been validated. |

## 4. Product viability after architecture restrictions

If native export can provide complete, unit-labelled daily metrics, the only currently conceivable low-risk product is a **tokenless local batch estimator/alert utility**:
1. owner exports the usage file through Atlassian's own console;
2. owner imports the file into a local tool;
3. tool validates scope, date range, app IDs, resource keys, pagination/completeness markers and units;
4. tool calculates estimates using the published price schedule and explicit model-specific LLM rates when available;
5. tool applies user-defined USD budget thresholds locally and emits a report or local notification;
6. tool marks stale/missing/incomplete inputs and never represents estimates as a final invoice.

Limits:
- manual export means no always-on monitor and no real-time alert;
- daily usage resolution means it cannot guarantee cost prevention;
- absent LLM/Container rows must be treated as missing data, not zero usage;
- no hard stop, automatic app shutdown, payment-state or dunning claim;
- final charge reconciliation remains separate unless an official supported invoice route is confirmed.

This is a different proposition from the original automated budget guard. It may be less valuable to the buyer and still requires WTP.

## 5. P55 kill criteria

Stop the Marketplace product concept if any of these is confirmed:
- Atlassian says the native export cannot expose complete, useful per-app usage data or lacks the relevant high-cost meters;
- processing owner-exported usage files is not an accepted Marketplace integration use case;
- the only supported API path requires a PAT in a new Marketplace app and Atlassian provides no alternative/exception;
- the invoice/Commerce path is mandatory for the product's claimed value but cannot be accessed through an officially supported client;
- no qualified buyer provides a concrete price/buying condition;
- India-specific partner verification and lawful payment/distribution route cannot be established.

If the Marketplace concept is killed, a separately distributed generic CSV/usage-cost estimator may be considered only after legal classification and buyer evidence, not as an automatic fallback.

## 6. Exact next work

1. Ask Atlassian in writing whether the documented native Export usage download is intended for third-party local tools, and obtain file format, schema, time coverage, app/site/environment granularity and completeness.
2. Ask whether the export includes Forge LLM input/output and Container vCPU/GiB-hour metrics and whether those metrics can be accurately priced.
3. Ask whether a Marketplace-listed non-installable local integration can process user-exported usage files without violating Marketplace security or other Developer Terms.
4. Ask whether Resource Usage API has an approved OAuth 2.0/3LO/app-auth route; do not implement PAT collection or transmission.
5. Resolve Partner Portal prerequisites, transaction account access, billing role and the permitted Commerce bearer-token client type for a local tool.
6. Resolve Software App vs Cloud App and PVA/PVV classification.
7. Obtain a price-bearing WTP signal through the prepared opt-in protocol after owner approval.

Current status: P55-001 IN_PROGRESS / HOLD_FOR_EVIDENCE; P55-002 BLOCKED; WTP NOT ESTABLISHED; spend ₹0; no owner credentials used; no support packet sent.
