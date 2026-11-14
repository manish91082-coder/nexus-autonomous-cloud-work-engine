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
