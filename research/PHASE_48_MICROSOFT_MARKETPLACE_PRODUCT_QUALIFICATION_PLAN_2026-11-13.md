# Phase 48 — Microsoft Marketplace AI Apps & Agents: Product Qualification Plan

**Date:** 13 November 2026  
**Mission authority:** MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md  
**Platform rank:** #3  
**Status:** Research only; no product selected  
**Spend:** ₹0 authorised

## 1. Mission

Identify one specific, high-value, self-serve AI app or agent that can be sold repeatedly through Microsoft Marketplace to business customers, with a credible route toward large recurring platform-credited net earnings.

Do not build a generic chatbot, generic Copilot wrapper, generic workflow reviewer, or generic Power Automate monitor. Phase 46 already rejected a generic automation-reviewer product.

## 2. Ground facts to use

Microsoft Marketplace currently presents 4,000+ AI apps/agents and 11,000+ models, and reports a 2× increase in AI-solution purchases. These are platform-level scale signals, not evidence that a new app will sell.

Primary source: https://www.microsoft.com/en-us/marketplace/business/ai-apps-agents

Microsoft's current commercial Marketplace economics and gates:
- Store service fee: 3% for applicable transactable purchases.
- Earnings threshold: USD $50; payment timing depends on maturity and transaction type. Credit-card transactions have a 30-day hold before maturity.
- Transactable SaaS offers must support MSA and Microsoft Entra ID authentication, an always-available landing page, SaaS Fulfillment API integration, a connection webhook, subscription lifecycle and plan management.
- The landing page and connection webhook must operate 24/7. Microsoft retries webhook calls (official webhook documentation specifies 500 retries over 8 hours).
- A Contact Me listing has fewer technical requirements but is a lead-generation path, not the self-serve transactable revenue model required by this mission.

Primary sources:
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/payout-faq
- https://learn.microsoft.com/en-us/partner-center/marketplace/marketplace-commercial-transaction-capabilities-and-considerations
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/plan-saas-offer
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/create-new-saas-offer-technical
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/pc-saas-fulfillment-apis
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/pc-saas-fulfillment-webhook
- https://learn.microsoft.com/en-us/partner-center/account-settings/create-account

## 3. Research deliverables

P48-001 must produce:
1. Current marketplace category map and at least 20 directly relevant paid/free competitor listings, with pricing, review/install/usage evidence where published.
2. At least three specific buyer problems in one or two adjacent categories, each supported by primary product documentation plus independent user pain signals.
3. One narrow buyer persona, job-to-be-done and economic trigger. Avoid generic “businesses need AI”.
4. Competitor comparison that identifies existing native Microsoft features, Copilot/Power Platform/Teams capabilities and independent vendors.
5. A paid gap that remains after considering free Microsoft-native capabilities and open-source substitutes.
6. Product form: transactable SaaS, Teams app, Copilot/agent app, API, or downloadable software; explain exact licensing and marketplace distribution route.
7. One-time build and ongoing hosting/security/support requirements. Transactable SaaS has 24/7 landing page and webhook requirements; no unsupported zero-cost hosting claim.
8. Pricing and gross-margin sensitivity based on observed competitor prices, 3% store fee and known variable infrastructure. Do not invent conversion, market share or MRR.
9. Publisher verification and account/identity/legal/payout gates. Tax and payout optimisation remain deferred, but account eligibility and mandatory terms cannot be bypassed.
10. GO/NO-GO decision. No product build until all hard gates pass.

## 4. Hard decision rules

GO only if:
- the buyer problem is clear and expensive/frequent enough to justify recurring payment;
- direct competitors and native Microsoft functions leave a defensible gap;
- at least two independent demand signals exist, including at least one credible paid-market signal;
- a transactable self-serve distribution path is technically feasible;
- recurring hosting, security, support and fulfilment costs fit positive margin;
- no mandatory paid service is required before the first valid buyer signal, unless the owner explicitly approves the spend;
- all AI, privacy, data-access and marketplace policy rules can be met.

If no product passes, record NO_GO and proceed to Apify Store research (platform rank #4). Do not make a product merely to fill the Marketplace.

## 5. Owner gates — not yet authorised

- Microsoft Partner Center enrollment/verification.
- Seller-profile and identity/organization verification.
- Tax and payout profile completion.
- Any paid cloud plan, infrastructure, domain, API or other spend.
- Public offer publication and any contract/terms acceptance.

No account, listing, paid resource or public offer is authorised by this research plan.
