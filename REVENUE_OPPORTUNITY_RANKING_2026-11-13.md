# Revenue Opportunity Ranking — 13 November 2026

**Mission:** ₹10 Cr in platform-credited net earnings  
**Scope:** only the canonical repository's revenue mission  
**Decision type:** platform-level prioritisation, not a forecast  
**Spend:** ₹0 authorised  
**Live publications:** 0 evidenced in this mission

## 1. How to read this ranking

The order estimates the *potential to build a scalable, self-serve revenue product on each platform*, adjusted for market evidence, repeat billing, marketplace discovery, economics, zero-spend fit and practical gates. It does not claim that the platform itself guarantees customers or revenue.

A platform can rank highly while a particular product idea is rejected. Product selection requires a separate competitor and buyer-problem dossier.

## 2. Ranked opportunities

| Rank | Revenue platform / model | Evidence of buyer ecosystem | Economics visible in primary sources | Current fit / decision |
|---:|---|---|---|---|
| 1 | Atlassian Marketplace / Forge app | Atlassian reports 300,000+ customers, 5,700+ Marketplace apps; a June 2026 update reports $7B+ lifetime Marketplace sales, 40%+ of customers with at least one app, 6,000+ Cloud apps and 3,700+ public Forge apps | Forge apps receive 100% of gross revenue on the first $1M lifetime Forge revenue; after that the standard Forge share is 83% to partner / 17% to Atlassian in the current schedule. Remittance threshold is $500 profit; paid within 30 days after month-end when threshold is reached | **P1 channel / product gap research now.** Strongest quantified B2B Marketplace evidence. Direct Jira Automation cost-audit niche has multiple new competitors; no clone approved |
| 2 | Shopify App Store | Shopify reports paying developers more than $1.3B in 2025; the App Store serves millions of merchants and active app installs grew nearly 20% year-over-year | Eligible registered developers retain 100% of first $1M gross app revenue, 85% above; 2.9% processing fee; one-time $19 USD App Store registration | **P1/P2 channel.** Large developer revenue pool. Generic workflow automation is saturated; a narrow custom Flow-action reliability hypothesis is in Phase 47 research only. No $19 registration spend authorised |
| 3 | Microsoft Marketplace / AI Apps & Agents | Microsoft Marketplace currently advertises 4,000+ AI apps/agents and 11,000+ models; Marketplace says AI solution purchases doubled | 3% store service fee; earnings threshold USD $50; generally monthly payouts. Transactable offers require validated tax and payout profiles before sale | **P2 enterprise lane.** High-value potential but seller profile, infrastructure, security and account gates make it later than research |
| 4 | Apify Store / paid Actors | Store exposes actual user/run/price signals; Apify's help article states leading independent creators have exceeded $10,000 MRR, although this is a platform-reported example, not a typical outcome | Creator receives 80% of user fees minus platform usage costs; monthly payout process; KYC required before payout. Free testing credits are platform usage, not revenue | **P1/P2 execution candidate.** Best short-cycle self-serve prototype lane after product-gap research. Exact Actor niche not selected |
| 5 | Getvik digital products | Live Discover marketplace contains paid digital products; seller's own product demand is still unproven | Free plan ₹0/month; 10% platform fee + GST on the fee + Cashfree processing; ₹100 payout request threshold; usual 2–3 business days after request | **P3 / existing asset only.** Keep Recruitment Revenue Assurance Desk private pending buyer validation and owner launch gates. Getvik states a storefront does not create demand by itself |
| 6 | CrazyGames HTML5 games | Platform has a publisher marketplace and SDK ad monetisation; no engagement evidence exists for Orbit Relay | €100 minimum for payout; monthly process and NET 60 terms; advertising revenue depends on real player engagement and advertiser demand | **P3 / frozen experiment.** No more game feature work until human playtest and publisher evidence |
| 7 | GitHub Sponsors, KDP, stock libraries, audience/affiliate | Real platforms, but current repository contains no evidenced audience, paid adoption, catalogue traction or sponsorship base | Fees/eligibility/payout methods vary; several need account-level eligibility and recurring content supply | **Long horizon / defer.** Do not let content volume or repository stars be misreported as revenue |

### Why the top order is not the existing scorecard order

The earlier opportunity registry primarily weighted near-term payout certainty and no-monthly-cost storefront friction, which put Getvik first. The owner's new instruction is to maximise the *largest scalable revenue stream first*. This ranking therefore weights recurring B2B/software value and proven marketplace spend more heavily. The old scores are preserved; do not compare them as if they used the same scoring model.

## 3. Ground-level competitor adjudication: Atlassian Automation Cost / Risk

A real near-term trigger exists: Atlassian says usage-based Automation step billing starts **3 December 2026** for applicable plans. Steps include triggers, conditions, actions, branches and loops. Admins can monitor usage, set limits and receive alerts; the native usage dashboard already provides visibility.

The exact Jira Automation analysis niche is already occupied by multiple listings:

| Existing listing | Current observed evidence | Implication |
|---|---|---|
| Automation Cost & Audit for Jira (TCYM) | Marketplace listing: v2.1.0, 9 Sep 2026 initial release; paid via Atlassian; 1 install; no reviews when checked | Direct paid competitor, but traction is currently very small |
| Automation Usage & Risk Analyzer for Jira (iDev Solutions) | Free listing; v2.6.0, 21 Sep 2026; 8 installs; no reviews when checked; browser-local JSON/CSV analysis | Free direct substitute; author says it is intended to stay free because it incurs no Forge costs |
| Automation Step Cost Analyzer: Usage & Limits for Jira | Public Marketplace listing already claims rule ranking, branch/loop risk explanations, saved scans and weekly digests | Direct product overlap; install/review count not verified in this capture |
| Automation Map for Jira | Marketplace/community material describes rule dependencies, daily sync and cost-savings analysis | Further adjacent competition; exact current commercial traction not verified |
| Autom Mate: FinOps Automation | Existing Jira/Confluence Cloud listing for broader automation/FinOps workflows | Adjacent competition |

**Decision:** Do not build another static Jira Automation JSON analyser or a generic step-cost calculator. The niche can be reopened only if further research proves a paid gap not solved by native usage dashboards or the above listings, for example a verifiable cross-system control, continuous governance or operational assurance outcome with clear buyer demand. No such gap is yet proven.

## 4. Phase 46 product decision: AI Business Automation Reviewer

**Decision: NO-GO for the generic reviewer.** It is not approved for development or publication.

The generic concept overlaps n8n's native security audit, Power Platform Admin Center governance, Make error handling, Atlassian Marketplace audit/automation apps, Datvero, Pulse, FlowOversee and free static workflow reviewers.

Evidence report: [PHASE_46_AUTOMATION_REVIEWER_MARKET_AUDIT_2026-11-13.md](research/PHASE_46_AUTOMATION_REVIEWER_MARKET_AUDIT_2026-11-13.md).

A narrower product hypothesis has been opened under the higher-ranked Shopify platform. It is not a GO decision.

## 5. Phase 47 product hypothesis: Shopify Flow Action Reliability Gateway

This would be a developer-side middleware for custom Shopify Flow actions, not a generic workflow monitor.

Shopify's own endpoint contract documents:
- HTTPS/HMAC-signed POST requests;
- a 10-second response window;
- possible resends after timeouts;
- 202 / 429 / Retry-After / 5xx retry handling;
- the unique `action_run_id` that developers can use as an idempotency key.

Two developer discussions report 202/429 retry-state confusion and Retry-After implementation issues. Shopify's native manual retry and existing queue systems are important substitutes, so the paid gap is not proven.

**Current status: RESEARCH_ONLY.** Compare existing queue/durable-execution products and free libraries; verify direct App Store competitors; establish real developer willingness to pay; and prove free-tier economics before any build.

Source dossier: [PHASE_47_SHOPIFY_FLOW_ACTION_GATEWAY_QUALIFICATION_2026-11-13.md](research/PHASE_47_SHOPIFY_FLOW_ACTION_GATEWAY_QUALIFICATION_2026-11-13.md).

## 6. Sources added to the platform evidence

- Shopify developer payouts and app growth: https://www.shopify.com/news/billion-dollar-ecosystem
- Shopify Partner terms, revenue share and registration fee: https://www.shopify.com/partners/terms
- Shopify Flow custom action endpoint contract: https://shopify.dev/docs/apps/build/flow/actions/endpoints
- Shopify Flow 202/429 developer discussion: https://community.shopify.dev/t/202-followed-by-429-while-a-flow-action-is-still-running-is-shown-as-a-step-failure/38616
- Shopify Flow Retry-After developer discussion: https://community.shopify.dev/t/retry-after-is-ignored-in-flow-action-response/19808

No revenue forecast or willingness-to-pay amount is assigned. Actual verified platform-credited earnings remain ₹0.


## 5. Phase 47 final product decision: Shopify Flow Action Reliability Gateway

**Decision: NO-GO. Do not build or publish.**

The custom partner-app Flow task surface is limited to Shopify Plus stores. Grow, Advanced and Plus stores have the standard Send HTTP Request action, which already includes configurable retry/fail/ignore behaviour. Shopify also supports manual retry of workflow runs.

Existing substitutes include Trigger.dev's Shopify webhook pipeline (HMAC verification, deduplication, delivery storage and replay), open-source Inngest with free execution/event quotas, Cloudflare Queues with a free daily operation allowance, Temporal, and developers' own queue implementations. Only two notable Flow custom-action 202/429/Retry-After problem threads were found; they establish engineering friction, not paid intent. The addressable developer segment is unquantified and no exact product-specific willingness-to-pay evidence exists.

Full decision record: [PHASE_47_SHOPIFY_FLOW_GATEWAY_FINAL_NO_GO_2026-11-13.md](research/PHASE_47_SHOPIFY_FLOW_GATEWAY_FINAL_NO_GO_2026-11-13.md).

Shopify remains platform rank #2 for a different product with a proven paid gap. The Flow gateway concept is closed.

## 6. Current next platform: Microsoft Marketplace / AI Apps & Agents

Microsoft Marketplace is platform rank #3 and is now the active qualification lane. Current public Marketplace pages show 4,000+ AI apps and agents, 11,000+ models and a 2× increase in AI-solution purchases. This is platform-level evidence, not evidence for a specific new product.

Important requirements for a self-serve transactable SaaS offer:
- Microsoft Entra ID / MSA authentication and SSO.
- A live onboarding/landing page.
- SaaS Fulfillment API integration for subscription provisioning, activation, changes and cancellation.
- A connection webhook that must be available 24/7.
- Microsoft reports a 3% store service fee for applicable transactions and a USD $50 payment threshold; credit-card earnings mature after a 30-day hold.

A Contact Me listing has fewer technical requirements but is lead-generation, not the self-serve transactable revenue model required here. Microsoft Marketplace enrollment and publisher verification are owner-gated; no enrollment or spend is authorised.

Sources:
- https://www.microsoft.com/en-us/marketplace/business/ai-apps-agents
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/plan-saas-offer
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/pc-saas-fulfillment-apis
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/pc-saas-fulfillment-webhook
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/payout-faq

Qualification plan: [PHASE_48_MICROSOFT_MARKETPLACE_PRODUCT_QUALIFICATION_PLAN_2026-11-13.md](research/PHASE_48_MICROSOFT_MARKETPLACE_PRODUCT_QUALIFICATION_PLAN_2026-11-13.md).

Next task: P48-001. Identify one narrow, recurring, high-value buyer problem that Microsoft-native Copilot, Teams, Power Platform and incumbent vendors do not already solve. Audit competitors, verify buyer demand, cost/hosting, security and transactable requirements. GO/NO-GO before build. If no gap passes, move to Apify Store (rank #4).



## Phase 49 final decision: Apify Store niche qualification — NO-GO

**Decision:** Do not build or publish a generic raw-data / extraction Actor from the niches audited.

A total of 27 live Apify Store listings were reviewed across web/RAG, PDF/OCR, ClinicalTrials.gov, SEC/EDGAR, Federal Register, USAspending/SAM.gov, domain RDAP and ATS job-board data.

- Apify's own RAG Web Browser showed 212K total users, 30K MAU and 4.7/35 reviews; its Website Content Crawler showed 177K total users, 12K MAU and 4.6/235 reviews. These are strong incumbents for generic web extraction.
- Eight direct PDF extractors compete at about $1–$5 per 1,000 records; most showed 1–2 total users and zero reviews.
- ClinicalTrials, SEC/EDGAR, Federal Register and government-contract data each have multiple near-identical Actors using public APIs, mostly priced $0.50–$12 per 1,000 records, with very low public adoption.
- One Federal Register industry-signal Actor is priced at $70/1,000, but its listing showed 1 total user, 1 MAU and 0 ratings. Price is not demand evidence.
- Apify PPE creator revenue is 80% of eligible paid event revenue minus platform usage costs. Free-plan user events do not create creator PPE earnings. Therefore public MAU does not prove paid buyers.
- The $1M Challenge is over (31-Jan-2026); not a current prize route. The $500 article program is editorially selected manual content work, not a self-serve revenue product.

Full competitor/terms/economics dossier: [PHASE_49_APIFY_STORE_NICHE_QUALIFICATION_NO_GO_2026-11-13.md](research/PHASE_49_APIFY_STORE_NICHE_QUALIFICATION_NO_GO_2026-11-13.md).

No Actor was built, run, paid for or published. No Apify account/KYC or usage credits were activated.

## Current next lane: Getvik digital products — requalify existing asset

The next rank is Getvik. The existing Recruitment Agency Revenue Assurance Desk v0.3.0 remains private. Its implementation and prior browser QA are not evidence of customer demand. Prior competitor work found feature overlap with agency CRM/ATS suites and free spreadsheets; prices ₹499/₹799/₹999 remain hypotheses.

Phase 50 will recheck current direct competitors, Getvik category discovery, seller terms/fees and the realistic order volume required for meaningful net earnings. The product will not be published solely because it is already built. Manual outreach, calls, demos and bespoke consulting are not acceptable as the acquisition model.

Plan: [PHASE_50_GETVIK_EXISTING_PRODUCT_REQUALIFICATION_PLAN_2026-11-13.md](research/PHASE_50_GETVIK_EXISTING_PRODUCT_REQUALIFICATION_PLAN_2026-11-13.md).

**Next task:** P50-001. GO / REPOSITION / NO-GO before any build changes, account action or public listing.
