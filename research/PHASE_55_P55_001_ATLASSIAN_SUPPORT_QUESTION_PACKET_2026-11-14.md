# Atlassian Support Clarification Packet — Phase 55 P55-001
**Prepared:** 14 November 2026  
**Status:** Draft for owner review only — NOT SENT  
**Canonical project:** ₹10 Cr Autonomous Revenue Ecosystem  
**Task:** P55-001 — Forge Developer Cost Guard qualification  
**Spend:** ₹0  
**No Atlassian account or partner onboarding action has been taken.**

## Purpose
Obtain authoritative written answers before any product design, account setup, partner agreement acceptance, distribution decision or spend. Do not include an API token, password, customer/site data or personal financial details in a support request.

## Question set A — configurable USD budgets and alerts
1. Can a Forge Marketplace app partner currently configure an arbitrary monthly USD budget (not only a percentage of the free resource allowance) at Developer Space, app, installation/site and environment level?
2. Can the developer configure separate alert amounts or percentage thresholds against that USD budget? Where in the Developer Console is this configured and what alert event/email is generated?
3. The 12-Apr-2026 Atlassian Engineering article says alerts trigger at 50/75/90/100% of an app's “allowance or configured budget”, while the Usage Alerts documentation last updated 8-May-2026 describes fixed resource-allowance thresholds. In an Atlassian Developer Community response dated 19-Aug-2026, Atlassian staff said configurable percentage alerts and budget-based notifications were not supported at that time and referenced FRGE-2252 / FRGE-2253. Which statement reflects the current feature state as of 14-Nov-2026?
4. Are any spend caps, automatic non-production environment suspension controls or app-level hard billing limits available? Please distinguish alert-only budgets from enforced platform limits and state the expected data/decision latency.

## Question set B — usage and Commerce API access
1. Is the experimental App Resource Usage API intended to be used by external vendor-owned desktop/CLI/self-hosted products using the Forge app owner's own Atlassian account token?
2. What current token scopes/permissions are required for the Usage API and for the Commerce APIs used to translate resource usage into dollar cost?
3. Does the API expose complete daily billable usage by app, installation/site and environment for all Forge meters, including corrections/backfills and all current resource categories? What are the actual refresh cadence, retention and historical correction window?
4. The App Resource Usage documentation points to Commerce public APIs using the Forge App Hosting offering ID. The Commerce REST documentation says the invoice-list resource is not accessible to Forge and OAuth2 apps. Can an independent external tool, operating under explicit authorization of the app owner, access the partner's relevant pricing plans, invoice line items and final billed amounts? Which endpoints and identity model are supported?
5. Are there API terms or restrictions on aggregating a vendor's own usage/cost data, sending alerts to that vendor, or comparing cost per installation against the vendor's own Marketplace licensing revenue?
6. Is there an officially supported stable API or roadmap to replace the experimental Usage API?

## Question set C — India Marketplace partner and payout eligibility
1. Can an India-resident individual or India-registered legal entity register as an Atlassian Marketplace Partner and publish a Paid-via-Atlassian Forge app?
2. Can Atlassian remit the partner's revenue share by USD EFT to a bank account in the same India-based partner's legal name?
3. Which India-specific KYC, tax declarations, legal-entity proofs, bank requirements, withholding rules, currency-conversion rules and intermediary-bank fees apply?
4. Does the current USD 500 threshold apply without country-specific changes to an India-based partner? Is payment approximately 30 days after month-end once the threshold is reached?
5. If India eligibility is conditional or not supported, please identify the applicable official country list or written policy.

## Question set D — permitted distribution and payment model
1. Could a local desktop/CLI/self-hosted developer tool that operates on the developer's own Forge account be listed on Atlassian Marketplace? If so, under which listing type and payment model?
2. The Marketplace Partner Agreement restricts Paid-via-Vendor models for Cloud/Forge apps except where Paid-via-Atlassian is unavailable or Atlassian gives written permission. Would a developer-side cost-management tool that is not embedded into customer Jira/Confluence sites qualify for a permitted Paid-via-Vendor listing, or must it use Paid-via-Atlassian?
3. If the product is an external standalone tool, does Atlassian offer a Marketplace listing/discovery route without hosting the tool as a Forge app?
4. Would a Forge app that asks its installer to supply a separate developer-owner API credential be permitted and technically supported, or is the usage API explicitly restricted to the app owner's own developer account?
5. What security architecture does Atlassian recommend for third-party tools that need app-owner tokens? Is a local-only credential store preferred or required?

## Evidence and current internal classification
- Product hypothesis: **Forge Developer Cost Guard**, preliminary 65/100, HOLD_FOR_EVIDENCE.
- Demand signals exist in developer community discussions dated 15-Jan, 3-Feb and 19–21-Aug 2026. They do not yet establish purchase intent or willingness to pay.
- Resource Usage API: experimental; owner account must own the Forge app; token + X-ExperimentalAPI; 5 requests/minute; Government and Isolated Cloud unsupported.
- Usage and Costs dashboard daily refresh: 12:00 UTC. No real-time alert or hard billing stop is assumed.
- Commerce invoice-list endpoint documentation explicitly excludes Forge and OAuth2 apps. External-tool access remains unverified.
- Partner Agreement: USD EFT to a valid own-name bank account; USD 500 net threshold; approximately 30 days after month-end; bank fees paid by partner. India eligibility not established in reviewed public docs.
- No account, API token, KYC, terms acceptance, Marketplace listing, spend or external communication has been initiated.

## Owner gate
This packet is only a prepared draft. It must not be sent, submitted through a support portal, or attached to an account until the owner explicitly approves the actual recipient/channel and final text.


## Question set E — Developer Space invoices, payment state and service-wide enforcement
1. The Forge pricing FAQ says every app has its own free monthly allowance (not shared with other apps), while charges are consolidated into one monthly invoice for all apps in a Developer Space. Please confirm this is the current rule for every billable meter and explain how separate per-app overage line items map to the Developer Space transaction account invoice.
2. Can an authorized external local/CLI/self-hosted tool read, under the Developer Space owner's authority, the billing account's invoices, invoice line items, payment status, payment method validity and current pre-dunning/dunning state? Which documented read-only API endpoints and token type support this?
3. The Billing and Payments documentation says unpaid billing can lead to pre-dunning and enforcement on all apps in the Developer Space. Is there a supported API or webhook to read a billing account's pre-dunning/dunning or enforcement state before all apps are impacted?
4. Is there an approved alerting integration or billing-account notification webhook for invoice-generation failure, failed autopay, upcoming enforcement or overdue status? If not, please confirm the only supported signals are email and the Billing Console.
5. Can app-level resource usage be exported and reconciled to per-app invoice line items for all applications in a Developer Space from an external vendor tool, without using private endpoints or UI scraping?

## Additional current documentation clarification
The Forge platform pricing FAQ explicitly says each app has its own free usage allowance per month and allowances are not shared across apps. Billing is consolidated into one monthly invoice for all apps managed by an individual/partner/customer. The Billing and Payments page describes the Developer Space invoice lifecycle: first day of the month for previous-month usage, autopay attempt, a 14-day pre-dunning window if invoice/payment fails without a payment method, and all-app enforcement if the issue remains unresolved after pre-dunning. A 21-day dunning period applies to payment failures where a payment method exists.

Sources:
- https://developer.atlassian.com/platform/forge/forge-platform-pricing/
- https://developer.atlassian.com/platform/forge/developer-space/billing-for-developer-spaces/
- https://www.atlassian.com/blog/how-we-build/engineering-the-forge-billing-platform-for-reliability-and-scale

These facts do not mean our proposed product can read billing status or avert enforcement. External billing-state access is still unverified. This packet remains **NOT SENT**.


## Additional question set F — Developer Space Insights and existing native coverage
1. Does Atlassian expose a supported API for the same aggregated data shown in Developer Space Insights, including the Top Apps by Resource Usage chart, all app rows (not only the top three displayed), and the 30-day cost/resource window?
2. Is the Developer Space Insights dashboard expected to remain the primary supported way to compare app costs and resource use across a Developer Space, or is a separate export/API supported for that aggregate view?
3. Can a Developer Space owner configure arbitrary USD budget alerts or custom escalation recipients in addition to the standard 50/75/90/100% usage-allowance emails? Is there an API for writing those policies?
4. What information is intentionally hidden from Developer Space Insights and the App Resource Usage API that would require the Billing Console, including invoice status, payment status, transaction-account identifiers, and pre-dunning/dunning/enforcement state?

The Developer Space Insights page (last updated 4-Jun-2026) already aggregates all Forge apps for logs, errors, alerts, performance and cost/resource visibility. Its Top Apps by Resource Usage chart shows the top three apps over 30 days; other dashboard charts default to 24 hours; production/development/staging are included; it is read-only. A generic multi-app dashboard must therefore not be proposed as a differentiator. The remaining possible gap is only custom USD-budget policy or billing-state alerts, subject to confirmation.

Official source: https://developer.atlassian.com/platform/forge/developer-space/developer-space-insights/


## Question set G — Marketplace PAT policy vs. Forge Usage API; tokenless export
1. The Forge App Resource Usage API documentation (last updated 6-Aug-2026) instructs an owner account to authenticate using Basic auth with the owner's Atlassian email/API token and `X-ExperimentalAPI`. The Marketplace Security Enforcement Policy (last updated 24-Aug-2026) says Marketplace apps must not collect, transmit or store Atlassian user account API tokens, and new apps that do so will not be approved. Does this prohibition apply to a third-party integration/local CLI listed as “My app isn't directly installable”, even if it runs on the owner's computer and sends the PAT directly to Atlassian?
2. Is there an approved OAuth 2.0/3LO or app-authentication alternative for the App Resource Usage API? If not, can a newly submitted Marketplace third-party integration receive a written exception or ECOHELP approval to use this API, or is the API currently unsuitable for all new Marketplace apps?
3. The Marketplace security policy says existing apps with a PAT-only required API can engage ECOHELP and receive an extended migration window. Does that exception exclude new apps? What is the approved path for a new Marketplace product whose core function requires this API?
4. Atlassian staff said an “Export usage” button had been added to the Usage and Charges page. Can the owner export a complete data file from the Developer Console without a third-party app using PAT? What is the exact format, schema, date range, app/site/environment granularity and completeness?
5. Does that native export include Forge LLM input/output usage and Container compute/memory usage, which have zero free allowance and, per staff's 19-Aug-2026 Community reply, no platform alert support because their thresholds are zero? Are these meters available via App Resource Usage API or native export?

## Question set H — Commerce invoice bearer token, Partner Portal prerequisite and client category
1. Commerce docs say Partners generate bearer tokens for their apps in Partner Portal, and Commerce authorization depends on Billing Admin/Billing User roles. Can a token generated for a non-Forge/non-OAuth local CLI/software app read the partner owner's own Forge Developer Space invoice list/details and per-app line items, including `paymentStatus`, `dunningStatus`, `dunningHistory` and `paymentMethodObj`?
2. Are Commerce Partner Portal bearer tokens intended for a local desktop/CLI integration, or only for applications registered in the Partner Portal? Are there token scopes, permitted OAuth/client types, IP restrictions or app-registration prerequisites?
3. The invoice API says Forge and OAuth2 apps cannot access list/detail/PDF resources. Does “OAuth2 apps” refer to OAuth client type only, or every Marketplace integration that uses customer OAuth for normal Atlassian access? Could a local client use a Partner Portal bearer token while not being a Forge/OAuth2 app?
4. Current Partner Central documentation says access requires one approved/published Paid-via-Atlassian app and a private-domain business email. Does this prerequisite also apply to the Partner Portal access needed to generate Commerce API tokens for a new tool? Can customers with only private/internal Forge apps obtain such tokens?
5. The Partner Agreement defines Software Apps as downloadable software designed to run in end-user instances of Atlassian Apps behind the firewall, and Cloud Apps as designed for Atlassian-hosted services. For a local developer-side CLI that reads a user's own Forge usage/invoice data and is submitted as a third-party integration with “My app isn't directly installable”, which listing type applies? Which payment model (Paid-via-Atlassian or Paid-via-Vendor) is permitted? Can Atlassian provide this classification in writing before implementation?
6. If the proposed software is eligible for Paid-via-Atlassian, does it count as a Software App for licensing/remittance or is it considered a Cloud/Forge app? Please confirm applicable revenue share and whether the pure-Forge 100%-up-to-USD-1m incentive is unavailable.

## Current owner/action boundary
This packet remains a research draft. Questions G/H have **NOT BEEN SENT**. Do not submit through ECOHELP or contact Atlassian without explicit owner approval of the recipient/channel and final text.


## Question set I — native usage export format, coverage and permitted tokenless processing
1. The 19-Aug-2026 Atlassian staff reply says an “Export usage” button exists at the top of the Usage and Charges page. What exact file format and schema does this UI action generate (CSV, JSON, XLSX, other), and is the schema public and versioned?
2. What start/end date coverage, retention window, data resolution and pagination/completeness semantics does this export provide? Does it include all Forge apps in the Developer Space or only one selected app?
3. Does the file contain app ID, site/context, environment, resource/usageKey, period, resolution, quantity and unit fields sufficient for reliable cost estimates? How are missing, corrected or late-arriving usage entries represented?
4. Does the export include Forge LLM input and output by model/credit unit and Container compute vCPU-hours plus memory GiB-hours? If not, what is the supported export route for these zero-free-allowance meters?
5. Can a Marketplace-listed non-installable third-party integration/local Software App process a usage file manually exported by the user from the native Developer Console, without receiving, collecting, transmitting or storing an Atlassian PAT? Is there a documented security/compliance interpretation for this use case?
6. Can the export be created automatically or only by an interactive owner action? Is scheduled export, webhook, email report, or another tokenless delivery method supported?

## Question set J — exact partner bootstrapping and Commerce API access model
1. Partner Central documentation says access requires at least one approved and published Paid-via-Atlassian app and a private-domain business email. Is this prerequisite also required before an individual or new partner can generate the Commerce bearer token for a local developer tool?
2. Can a local non-Forge/non-OAuth desktop/CLI be registered as a Partner Portal app for Commerce bearer-token issuance? What is the permitted client type and token scope?
3. Can such a token read the same partner's own Forge Developer Space invoice list/details and per-app overage lines under a Billing Admin/Billing User role? If yes, what documented endpoint and transaction-account mapping should be used?
4. Do invoice API exclusions for “Forge and OAuth2 apps” refer only to requests made from those app runtimes/client types, or do they also block an external local client whose separate Partner Portal bearer token is used?
5. If the vendor is an India-resident individual without a registered company, can the partner verification and Commerce token issuance steps be completed, and what exact tax/KYC documents and own-name EFT requirements apply?

## Current status
Questions G/H/I/J are internal draft questions. **NONE HAVE BEEN SENT.** No ECOHELP ticket or support request is created. Explicit owner approval is required before any external submission.
