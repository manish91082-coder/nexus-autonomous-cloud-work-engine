# Phase 47 — Shopify Flow Action Reliability Gateway: Final Qualification Decision

**Date:** 13 November 2026  
**Authority:** MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md  
**Queue task:** P47-001  
**Final decision:** **NO-GO — do not build or publish this product**  
**Shopify platform status:** Remains ranked #2 for future opportunities; this specific Flow gateway concept is rejected.  
**Spend authorised:** ₹0  
**Accounts, app registration, listing, services:** none activated.

## 1. Decision summary

The initial thesis was that Shopify Flow custom-action developers might pay for a managed reliability gateway because the endpoint contract requires fast responses, HMAC verification, duplicate-safe processing, asynchronous work, and 202/429/Retry-After handling.

Those engineering requirements are real, but the commercial thesis does not clear the hard gates:

1. Custom partner-app tasks inside Shopify Flow are available only to Shopify Plus stores. Grow and Advanced stores can use the standard Send HTTP Request action, but not custom partner-app tasks. This materially narrows the direct custom-action buyer pool.
2. Shopify's standard Send HTTP Request action already has native response handling, configurable retry/fail/ignore behaviour and a documented retry window. Flow also provides manual retry for workflow runs.
3. The core infrastructure required by this gateway is already available from established durable-execution and webhook platforms. Trigger.dev's Shopify webhook integration verifies HMAC, deduplicates deliveries, stores webhook deliveries, supports replay, and runs durable tasks. Inngest provides an open-source SDK, idempotency and retry patterns, with a free Cloud tier. Cloudflare Queues has a free allowance of 10,000 operations/day.
4. Only a small number of relevant Shopify Flow developer discussion threads were identified. They are credible engineering pain signals, but not buyer commitments, repeated paid requests, or evidence of willingness to pay.
5. No direct, established paid App Store gateway competitor was identified in this bounded search, but the stronger substitute set (native Flow, Trigger.dev, Inngest, Cloudflare Queues, general queues and custom implementation) removes much of the differentiation.
6. The product would need a continuously available, secure multi-tenant service, durable event state, logs/retention, alerting, customer support and production incident handling. Under the current ₹0 spend rule, this is not an evidenced low-cost paid product.
7. The relevant custom-action segment's true addressable size is not published by Shopify. Third-party Shopify Plus store counts vary by definition and data provider, so no precise market-size estimate is accepted.

**Conclusion:** There is a real implementation problem, but not enough evidence that a separate paid gateway solves it better than native behaviour and low-cost developer infrastructure. A custom-action adapter template or open-source example could be useful engineering material, but it does not currently support the ₹10 Cr commercial objective. Do not build it.

## 2. Ground-verified Shopify plan eligibility

Shopify's official Help Center states:
- Shopify Flow is available on Basic, Grow, Advanced and Plus plans.
- The standard **Send HTTP Request** action is available on Grow, Advanced and Plus.
- Tasks created by **custom partner apps** are available only on Plus stores.

Official source: https://help.shopify.com/en/manual/shopify-flow

This means the custom partner Flow-action gateway is not a broad Shopify-merchant product. Its addressable user is a developer of a custom partner app whose target stores have Shopify Plus. The standard HTTP action creates a broader plan base, but it already offers native response/retry controls and would require a somewhat different product proposition.

## 3. Native Shopify features already address part of the problem

### Custom partner-app Flow action endpoint
Shopify's official endpoint contract states:
- Requests are signed and must be verified.
- The endpoint has a maximum 10-second response window.
- If no response arrives within 10 seconds, Shopify closes the connection and resends the request later.
- A 202 response means accepted but not processed; Flow resends at increasing intervals for up to 36 hours.
- 429 with Retry-After follows the documented delay and retry behaviour; 5xx errors are also resent.
- A unique `action_run_id` is provided and can be used as an idempotency key.

Official source: https://shopify.dev/docs/apps/build/flow/actions/endpoints

### Standard Send HTTP Request action
Shopify's Help Center says:
- Flow waits up to 30 seconds for an HTTP response.
- For 4xx/5xx/429 errors, the workflow can be configured to Retry, Fail or Ignore.
- Retry can continue for up to 24 hours or until a different response code/timeout occurs.

Official source: https://help.shopify.com/en/manual/shopify-flow/reference/actions/send-http-request

### Manual retry
Merchants can retry a failed run or a group of runs after correcting the underlying issue. The original trigger data is reused, although Get data actions retrieve current data.

Official source: https://help.shopify.com/en/manual/shopify-flow/manage/manual-retry

The gateway cannot honestly claim to invent retry, replay or idempotency. Its possible value would have to be a production-ready custom-action integration that materially reduces engineering work or risk.

## 4. Substitute and competitor audit

| Substitute | What it already provides | Effect on proposed product |
|---|---|---|
| Shopify Flow native custom-action contract | HMAC verification pattern, 202/429/5xx retry semantics, 36-hour resend behaviour and action_run_id idempotency guidance | Developer can implement the protocol directly |
| Shopify Flow Send HTTP Request | 30-second timeout, secrets, configurable retry/fail/ignore handling up to 24 hours | Broad non-Plus custom-action substitute |
| Shopify Flow manual retry | Retry one or multiple failed runs after fixing root cause | Removes some replay feature value |
| Trigger.dev Shopify webhooks | HMAC verification, delivery storage, deduplicated retry handling, replay and durable task execution | Strong adjacent substitute for webhook-to-background-task operations |
| Inngest | Open-source SDK, idempotency/deduplication, retries, failure handlers; free Cloud tier | Developers can build the durable processing path without buying our gateway |
| Cloudflare Queues | Free Workers allowance includes 10,000 queue operations/day; free message retention is 24 hours | Low-cost queue primitive; application still needs durable state and idempotency |
| Temporal | Durable execution, event history, retries/backoff and self-hosted option | Capable existing alternative for complex workflows |
| Custom app backend | Developers already implement their own HMAC, database, queue, retry and action_run_id handling | No separate gateway required for many software teams |

Primary sources:
- Trigger.dev Shopify webhooks: https://trigger.dev/product/webhooks/shopify
- Trigger.dev pricing: https://trigger.dev/pricing
- Inngest pricing: https://www.inngest.com/pricing
- Inngest durable execution best practices: https://www.inngest.com/docs/durable-execution/best-practices
- Cloudflare Queue pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Queues Free plan announcement: https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/
- Temporal pricing: https://temporal.io/pricing

Important nuance: Trigger.dev's Shopify product page is for Shopify webhooks generally, not proof that it is a drop-in Shopify Flow custom-action endpoint. It is still a strong substitute for the durable queue, deduplication and replay layers the gateway intended to sell.

## 5. Demand evidence and its limits

Observed developer discussions:
- 23-Jul-2025: a developer described handling long-running Flow actions with 202, 429 and Retry-After, and reported a Retry-After issue: https://community.shopify.dev/t/retry-after-is-ignored-in-flow-action-response/19808
- 15-Oct-2026: a developer described a Flow step appearing failed while a custom action was still running/retrying under 202/429: https://community.shopify.dev/t/202-followed-by-429-while-a-flow-action-is-still-running-is-shown-as-a-step-failure/38616

These demonstrate engineering friction. They do not provide:
- independent buyer purchase commitments;
- a paid competitor with proven customer traction for this exact need;
- a count of app developers actively publishing custom Flow actions for Plus stores;
- repeatable evidence that developers will pay for an additional service instead of using Trigger.dev, Inngest, Cloudflare Queues, Temporal or their own backend.

Therefore the product-specific willingness-to-pay gate fails.

## 6. Zero-cost economics and engineering feasibility

Technical feasibility exists in principle, but the commercial service would require:
- a 24/7 public HTTPS endpoint;
- HMAC validation and secure secret rotation;
- tenant isolation by app and shop;
- a durable idempotency ledger;
- storage of event state and outcomes;
- background execution, bounded retry and dead-letter queues;
- delivery logs, alerts and replay controls;
- retention/deletion and privacy guarantees;
- reliable support and incident response.

Cloudflare Queues' free plan is limited to 10,000 operations/day and 24-hour retention, while Shopify Flow can resend custom action requests for up to 36 hours. It therefore cannot be treated as a complete turnkey persistence policy without a separate state store and expiry design.

Trigger.dev's current free tier includes $5 monthly credits and 20 concurrent runs; the Hobby plan is $10/month. Inngest's free tier includes 50,000 executions, 500,000 events and 100,000 queue depth; the paid Pro tier starts at $99/month. These are infrastructure alternatives, not an independent paid-product margin proof.

No service was provisioned and no credit or budget was consumed.

## 7. Final hard-gate matrix

| Gate | Result | Reason |
|---|---|---|
| Real technical problem | PASS | Official protocol and developer reports establish implementation complexity |
| Broad addressable Shopify user base | FAIL | Custom partner-app Flow tasks are Plus-only |
| Native platform gap | FAIL / WEAK | Flow has built-in retry/manual retry and HTTP action support |
| Differentiation vs substitutes | FAIL | Trigger.dev, Inngest, Cloudflare Queues, Temporal and custom backends cover most core primitives |
| Paid buyer evidence | FAIL | No credible willingness-to-pay or exact paid competitor traction found |
| Product-specific net economics | FAIL / UNKNOWN | Recurring hosting/support cost without proven paid demand |
| Zero-spend path to production | FAIL / UNPROVEN | Free quotas may support a demo, not a production reliability promise |
| Decision | **NO-GO** | Multiple commercial hard gates fail |

## 8. Phase and portfolio disposition

- Product: `SHOPIFY-FLOW-ACTION-RELIABILITY-GATEWAY` → `NO_GO_RESEARCH_COMPLETE`.
- Do not build an MVP, register a Shopify Partner public-app listing, pay the USD $19 registration fee, buy hosting, provision queues or activate an account.
- Preserve the research dossier; do not delete the idea's evidence.
- Shopify remains platform rank #2 for any future product with a different proven gap.
- Next platform-level lane is Microsoft Marketplace / AI Apps & Agents (rank #3), subject to its own product-market fit, self-serve and infrastructure gates. If Microsoft fails those gates, move to Apify Store (rank #4).
- No product currently approved for build.
- Platform-credited net earnings remain ₹0 verified; authorised spend remains ₹0.

**Next queue task:** P48-001 — qualify a high-value, self-serve Microsoft Marketplace AI app/agent product with exact buyer evidence, competitor audit, platform compliance, recurring economics and infrastructure feasibility. No build until the product dossier passes.
