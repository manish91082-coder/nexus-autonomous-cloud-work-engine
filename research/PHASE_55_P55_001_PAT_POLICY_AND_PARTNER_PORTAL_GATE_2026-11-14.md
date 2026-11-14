# Phase 55 P55-001 — PAT Policy, Partner Portal and Residual Technical-Gap Audit
**Audit date:** 14 November 2026  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Candidate:** Forge Developer Cost Guard / Forge Budget Sentinel  
**Decision:** **HOLD_FOR_EVIDENCE — NO BUILD / NO TOKEN / NO ACCOUNT / NO SPEND**  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem

## 1. Executive finding

A material compliance conflict is now identified:

- The official Forge App Resource Usage export documentation currently instructs the app owner to authenticate with Basic authentication using the Atlassian account email and API token, plus `X-ExperimentalAPI`. It states the requesting account must own the Forge app; the API is experimental, one usage key is required per request, pagination and environment grouping are supported, and the rate limit is five requests/minute.
- The Marketplace Security Enforcement Policy (last updated 24-Aug-2026) says Marketplace apps must not collect, transmit or store Atlassian user account API tokens (PATs). It says new Marketplace apps that do so will not be approved during the security questionnaire review. For existing apps whose required API is available only via PAT, Atlassian describes an ECOHELP route to prioritize an alternative and extend migration while platform work is in progress.
- The existing support packet did not ask this PAT-policy/API conflict explicitly. It is now amended with Question Set G, but remains **NOT SENT**.

**Engineering consequence:** a new Marketplace-listed app must not be designed around customer PAT collection, storage or transmission unless Atlassian confirms a compliant alternative or provides an explicit written exception. Do not implement PAT input fields, keychain storage, environment-variable token ingestion or a PAT-powered background poller in a Marketplace product.

A standalone software product distributed entirely outside Marketplace may raise a different policy question, but its allowed API usage and Developer Terms still need written verification. Do not infer an exemption simply because it is local or CLI-based.

## 2. The residual buyer problem is narrower

### 2.1 Live Marketplace suggestion update

The separate Atlassian Jira suggestion **ECO-1831**, “Allow app developers to set a spend limit/budget cap for Forge usage”, remains:
- Status: **Gathering Interest**
- Resolution: **Unresolved**
- Current visible votes/watchers at this audit: **12 / 12**
- Created: 05-Oct-2026

The earlier audit snapshot recorded 11 votes. The current live record shows 12. This is an attention signal only, not WTP.

Source: https://jira.atlassian.com/browse/ECO-1831

The independent Community thread remains a direct problem signal. On 19-Aug-2026 Atlassian staff described standard 50/75/90/100% threshold alerts and stated LLM and Containers are exceptions because their zero usage thresholds mean platform-side alerts are not supported at that time. On 20-Aug-2026 the same staff member stated configurable percentage alerts were not present and budget-based notifications were unsupported by the dependent platform.

Source: https://community.developer.atlassian.com/t/forge-platform-usage-costs-alerts-limits/102240

### 2.2 Potential high-value sub-gap: zero-allowance meters

The current Forge pricing page lists:
- Forge LLM input/output with a **0-credit monthly free allowance**, with model-dependent credit rates;
- Forge Containers compute with **0 vCPU-hours free allowance** and memory with **0 GiB-hours free allowance**, both metered by usage.

Source: https://developer.atlassian.com/platform/forge/forge-platform-pricing/

The Community staff reply says standard platform usage alerts do not support LLM and Container meters because their thresholds are zero. This creates a sharper potential sub-gap than a generic dashboard: owner-defined budget warnings for paid-from-first-use LLM and Container consumption.

However:
- no proof has yet been obtained that the experimental App Resource Usage API exposes complete daily LLM and Container usage keys in the same export path;
- no proof that the export returns all needed token, vCPU-hour and GiB-hour details for a reliable USD estimate;
- no buyer WTP for this exact subproblem.

Do not claim a product can monitor or alert on these meters until data coverage and unit economics have been established.

## 3. PAT policy vs Usage API: new hard gate

### 3.1 What the API docs require

The official Export App Resource Usage page, last updated 06-Aug-2026, says:
- the Atlassian account making the call must be the same account that owns the Forge app;
- the sample authentication is Basic authentication with account email/API token;
- `X-ExperimentalAPI` is required because the API is experimental and subject to change;
- one usage key per request;
- `ENVIRONMENT_ID` grouping and pagination;
- five requests per minute.

Source: https://developer.atlassian.com/platform/forge/developer-space/export-app-resource-usage/

### 3.2 What Marketplace security policy requires

The Marketplace Security Enforcement Policy, last updated 24-Aug-2026, states:
- Marketplace apps must not collect, transmit or store Atlassian user account API tokens;
- new Marketplace apps that do so will not be approved during security questionnaire review;
- where an existing app depends on a PAT-only required API, the partner may engage Atlassian through ECOHELP to prioritize the platform capability and extend migration while platform work is in progress.

Source: https://developer.atlassian.com/platform/marketplace/marketplace-security-enforcement-policy/

The linked Security FAQ additionally says apps cannot collect/store Atlassian account credentials even with user consent and advises contacting Atlassian if the REST API lacks app authentication.

Source: https://developer.atlassian.com/platform/marketplace/security-requirements-faq/

### 3.3 Product implications

| Proposed method | Current classification |
|---|---|
| Marketplace app asks user to paste PAT | **PROHIBITED for a new Marketplace app under current policy** |
| Marketplace app stores PAT in local keychain or app database | **PROHIBITED / not approvable** |
| Marketplace app sends PAT from local process to Atlassian API | **PROHIBITED / not approvable** |
| Owner performs export through Atlassian's native console and imports file into a separate tokenless local tool | **POSSIBLE FALLBACK; export-file schema, completeness and policy classification require proof** |
| Standalone non-Marketplace CLI distributed outside Marketplace | **POLICY SCOPE AND DEVELOPER-TERMS STATUS UNVERIFIED; do not assume exemption** |
| OAuth 2.0 / 3LO or another supported non-PAT app-auth method for Usage API | **NOT DOCUMENTED for this experimental API; require Atlassian confirmation** |

The fact that Atlassian staff describes usage/Commerce APIs as exportable into “your own tools” does not override the later explicit Marketplace security requirement. Resolve the conflict in writing before choosing the product authentication architecture.

### 3.4 Possible no-PAT fallback

A Community staff reply on 19-Aug-2026 says Atlassian recently added an **Export usage** button at the top of the Usage and Charges page.

This may enable an owner-operated workflow:
1. The owner signs into the native Developer Console.
2. The owner performs the export through Atlassian's own UI.
3. The owner imports a local file into a separate tokenless desktop/CLI tool.
4. The tool calculates estimates and local USD threshold warnings without receiving or transmitting the owner's PAT.

This is only a hypothesis. Atlassian has not confirmed:
- the actual export format (CSV, JSON or another form);
- whether it contains all sites, usage keys, environments and daily periods;
- whether LLM and Container usage are included;
- whether the file is complete enough for cost calculations;
- whether periodic automated downloads or scheduled exports exist;
- whether a third-party Marketplace Software App may process this owner-exported file.

The tool must show file timestamp, scope and completeness, and label amounts as estimates until reconciled to a final invoice.

## 4. Commerce invoice API: useful data fields, gated client access

### 4.1 Documented invoice response

The Commerce invoice API's documented invoice response includes:
- invoice status, created/finalized/due/paid dates;
- invoice totals, currency, tax and line items;
- per-line entitlement references, usage totals and billing periods;
- payment method object;
- `paymentStatus`;
- `dunningHistory` and `dunningStatus`.

Source: https://developer.atlassian.com/platform/commerce/rest/api-group-invoices/

These fields could support billing-state monitoring and per-app invoice reconciliation **if** the target owner can authorize the client.

### 4.2 Authentication, authorization and endpoint restrictions

Commerce security documentation says:
- Commerce REST calls require an access token;
- Marketplace partners can generate bearer tokens for their apps through the Partner Portal;
- requests include `Authorization: Bearer ...`;
- Commerce authorization uses billing roles such as Billing Admin and Billing User.

Source: https://developer.atlassian.com/platform/commerce/platform-concepts/security/

The invoice API explicitly states that Forge and OAuth2 apps cannot access invoice list, detail and PDF endpoints; the list endpoint requires the `X-transaction-account` header.

Source: https://developer.atlassian.com/platform/commerce/rest/api-group-invoices/

**Current classification:** a non-Forge/non-OAuth client using a Partner Portal bearer token and an appropriately authorized billing role is a possible route, but Atlassian does not explicitly confirm that this model can read the owner's Forge Developer Space invoice and per-app line items from a local/CLI integration. No token was created and no API call was attempted.

### 4.3 Partner Portal prerequisite narrows the buyer pool

Current Atlassian documentation, last updated 13-Nov-2026, says Partner Central/Partner Portal access requires:
- at least one approved and published Paid-via-Atlassian app on the Marketplace;
- a business email address on the organization's approved domain (public email domains such as Gmail, Yahoo and Hotmail are not accepted).

Source: https://developer.atlassian.com/platform/marketplace/onboarding-hub/grow/access-partner-central-and-program-benefits/

The Marketplace Partner Program page separately repeats that partners with at least one Paid-via-Atlassian app and a private-domain email are eligible for Partner Portal access.

Source: https://developer.atlassian.com/platform/marketplace/marketplace-partner-program/

This makes Partner Portal token access a **qualified-vendor prerequisite**, not a universal capability for every Forge developer or private/internal app owner. The invoice-integrated buyer segment may need to be limited to existing published Paid-via-Atlassian Marketplace partners with an approved business email domain. This reduces the addressable market and adds onboarding friction.

## 5. Third-party integration listing and payment classification remain unresolved

Atlassian's third-party integration listing guide supports “My app isn't directly installable” and asks for a binary or information URL plus a test instance.

Source: https://developer.atlassian.com/platform/marketplace/knowledge-base/listing-a-third-party-integration-on-the-atlassian-marketplace/

The Partner Agreement distinguishes:
- **Software Apps**: downloadable by end users and designed to run in end-user instances of Atlassian Apps behind the firewall;
- **Cloud Apps**: designed for use with Atlassian-hosted services;
- **Forge Apps**: Cloud Apps or components developed using Forge.

It allows Paid-via-Atlassian for Software Apps and Cloud Apps. Paid-via-Vendor may not be used for Cloud Apps, Data Center approved apps, or Forge/Connect apps unless the exception applies.

Source: https://www.atlassian.com/licensing/marketplace/partneragreement

The exact listing type for a local developer-side CLI that reads owner-exported Forge usage data or accesses invoices through a Partner Portal bearer token is **not determined** by the generic third-party integration listing page. Do not assume it automatically qualifies as a Software App or that Paid-via-Vendor is permitted. The Marketplace category, payment model and licensing mechanism must be clarified in writing before any product build or pricing model.

## 6. Updated demand and WTP

- Two independent public problem-demand records remain verified: the Aug 19–21 Community discussion and ECO-1831.
- The live ECO-1831 page currently shows **12 votes and 12 watchers**, status Gathering Interest, unresolved. The earlier audit snapshot showed 11. This is a live attention signal only, not WTP.
- The Community discussion also reveals a narrower LLM/Container alert gap: Atlassian staff said platform alerts are not supported for these zero-threshold meters because their thresholds are zero.
- No concrete buyer price commitment, approved budget, paid pilot, preorder or transaction has been identified for Forge Budget Sentinel / Developer Cost Guard.
- **WTP remains NOT ESTABLISHED.** The buyer protocol exists at `research/PHASE_55_P55_001_BUYER_WTP_VALIDATION_PROTOCOL_2026-11-14.md`; its invitation remains NOT APPROVED / NOT SENT.

## 7. Updated V4 gate matrix

| Gate | Status | Evidence / blocker |
|---|---|---|
| 15 direct/adjacent substitutes | PASS | Existing audit |
| Two independent problem-demand signals | PASS | Community + ECO-1831; live votes now 12 |
| Buyer WTP / price-bearing evidence | **NOT PASSED** | No qualified buyer named a price or purchase condition |
| Native budget-alert gap | PARTIAL PASS | Staff says custom percentage/USD budget notifications unsupported at the time; fixed alerts exist |
| LLM/Container alert gap | **POTENTIAL SUB-GAP** | Staff says no platform alerts for these zero-threshold resources; API coverage unverified |
| Usage API data contract | DOCUMENTED | Same owner account, Basic PAT, experimental, 5 req/min, one usageKey/request |
| Marketplace PAT compliance | **HARD GATE / NOT PASSED** | New Marketplace apps cannot collect/transmit/store PAT; documented Usage API auth currently requires PAT |
| Tokenless manual export fallback | POSSIBLE, NOT PROVEN | Export usage button mentioned; format/completeness/resource coverage unknown |
| Commerce invoice fields | DOCUMENTED | Includes invoice/payment/dunning and per-app line-item fields |
| External Commerce invoice access | **OPEN** | Forge/OAuth2 clients blocked; local non-Forge/non-OAuth access not confirmed |
| Partner Portal availability | CONDITIONAL | Requires approved published PvA app + private-domain email |
| Third-party integration category/payment | UNRESOLVED | Software vs Cloud classification and PVA/PVV model unknown |
| India individual paid-app verification/EFT | UNVERIFIED | India-specific public question remains unanswered |
| Zero-spend feasibility | NOT PROVEN | Tokenless export import may work; no prototype authorized |
| WTP | NOT ESTABLISHED | No price-bearing buyer response |
| GO / build | **NO** | Continue P55-001 HOLD; keep P55-002 BLOCKED |

## 8. Decision and exact next actions

**P55-001 remains IN_PROGRESS / HOLD_FOR_EVIDENCE. P55-002 remains BLOCKED.** The preliminary score remains 65/100 and is not raised.

Next P55-001 work:
1. Obtain written Atlassian clarification on whether a newly listed Marketplace third-party integration/local Software App may use the PAT-authenticated Resource Usage API, and whether any supported OAuth/app-auth alternative or documented exception exists.
2. Confirm whether native Developer Console “Export usage” produces a complete file, its format, scope, data granularity and LLM/Container coverage. Assess a tokenless local-file import architecture only if the file supports reliable calculations.
3. Confirm whether a non-Forge/non-OAuth local client can use a Partner Portal bearer token to access its owner's Forge Developer Space invoice list/details and per-app line items, and what billing role/portal prerequisite applies.
4. Obtain a formal classification/payment-model decision for the third-party integration: Software App vs Cloud App, Paid-via-Atlassian vs Paid-via-Vendor, and whether the local CLI qualifies for any Forge revenue-share incentive.
5. Obtain one genuine price-bearing buyer WTP signal through the owner-approved opt-in protocol.
6. Obtain India-specific paid-app verification and own-name EFT clarification.

The amended Atlassian support question packet is still a draft and **NOT SENT**. No account, token, KYC, support submission, external outreach, product code, Marketplace listing, paid service, spend or funds movement has occurred.

**If Atlassian confirms no compliant tokenless/authorized data route, or the owner-export file cannot support reliable per-app usage estimates, reject the Marketplace-listed Forge Cost Guard concept rather than route around policy.** A separately distributed local data-import utility could be reconsidered only under a verified legal/distribution model and demonstrated WTP.
