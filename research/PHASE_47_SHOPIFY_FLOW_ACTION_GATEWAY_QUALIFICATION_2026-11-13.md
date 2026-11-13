# Phase 47 — Shopify Flow Action Reliability Gateway: Qualification Dossier

**Date:** 13 November 2026  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem (V4)  
**Parent platform rank:** Shopify App Store — current platform rank #2  
**Product status:** RESEARCH_ONLY; build not authorised  
**Spend:** ₹0 authorised

## 1. The hypothesis

A self-serve developer utility for applications that expose custom actions inside Shopify Flow.

Working name: **Flow Action Reliability Gateway**.

A Shopify app developer creates a custom Flow action and points its runtime URL to the gateway. The gateway would:
1. Authenticate Shopify-signed requests (HMAC).
2. Deduplicate requests using Shopify's `action_run_id`.
3. Persist the job and business payload safely.
4. Run the downstream task in a durable background queue.
5. Respond according to Shopify Flow's documented 200 / 202 / 429 / 5xx semantics.
6. Maintain an execution ledger, retry schedule, dead-letter record and operator-approved replay.
7. Provide an outcome receipt so the developer can distinguish accepted, executing, completed, failed and outcome-unknown states.

This is not an app to read or modify every Shopify workflow. It is a reliability middleware for developers' own custom Flow actions.

## 2. Why this narrow problem is being investigated

### Official protocol creates a real implementation burden

Shopify's custom Flow action endpoint documentation states:
- requests are HTTPS POSTs authenticated with Shopify HMAC signatures;
- endpoint response should be fast;
- Flow waits up to 10 seconds for the endpoint's HTTP response before closing and retrying later;
- a 202 response indicates accepted but not processed, after which Flow may resend the request with increasing intervals for up to 36 hours;
- 429 may use Retry-After between 5 and 3,600 seconds, with jitter/increasing delays;
- 5xx causes retry behaviour;
- duplicate requests can occur, and the unique `action_run_id` should be used as an idempotency key.

Primary source: https://shopify.dev/docs/apps/build/flow/actions/endpoints

### Public developer pain signals

1. **Retry-After issue (23-Jul-2025):** A developer implementing asynchronous custom Flow actions reported that 202/429/Retry-After behaviour was difficult to coordinate. https://community.shopify.dev/t/retry-after-is-ignored-in-flow-action-response/19808
2. **202/429 UI confusion (15-Oct-2026):** A newer thread describes Flow showing an action as failed / step errors while the action is still running and retrying. The author describes 202 accepted, repeated 429 with Retry-After, and final 200/400 handling. https://community.shopify.dev/t/202-followed-by-429-while-a-flow-action-is-still-running-is-shown-as-a-step-failure/38616
3. **Native manual retry:** Shopify already permits retry of failed workflow runs after the underlying issue is corrected. The gateway cannot claim to invent retry; its possible value is durable custom-action processing, idempotency, application-side queueing and verified business outcomes. https://help.shopify.com/en/manual/shopify-flow/manage/manual-retry

These are real technical discussions, not purchase commitments. No willingness-to-pay evidence for this exact product has been found.

## 3. Competition and substitutes

| Alternative | What it already solves | Gap potentially left for the gateway |
|---|---|---|
| Shopify Flow native retry/manual retry | Re-runs past workflow executions; supports native custom action retry protocol | Developer-owned durable job ledger, duplicate-safe custom endpoint handling and application result receipts |
| Shopify Flow built-in HTTP request | Sends HTTP request; supports 4xx/5xx retry/fail/ignore settings | Managed idempotent job execution and application-side state for a custom app |
| General-purpose queues / durable workflow systems | Background execution, retry and event processing | Shopify Flow-specific HMAC, action_run_id, Flow response codes and turnkey app extension |
| Custom developer implementation | Full flexibility using app backend, database and queue | Avoid one-off implementation and repeatable operations for multiple Flow custom actions |

**Important:** This is not yet proof of a competitor gap. P47 research must test whether existing products such as Inngest, Trigger.dev, Cloudflare Queues, QStash, Temporal or open-source queue libraries already make the Shopify Flow integration trivial. If existing tooling solves it at near-zero incremental cost, the product should be NO-GO.

## 4. Market economics and platform gates

Shopify's 28-Apr-2026 developer story reported:
- more than $1.3B paid to developers in 2025;
- millions of merchants on the App Store;
- active app installs up nearly 20% year-over-year.

Source: https://www.shopify.com/news/billion-dollar-ecosystem

Registered and eligible app developers may receive 100% of first USD $1M app revenue under Shopify's current terms, with 85% of app revenue above that threshold; a 2.9% processing fee applies. A one-time USD $19 App Store registration fee applies for public app revenue-sharing registration. Eligibility thresholds and current terms must be rechecked before seller onboarding.

Sources:
- https://www.shopify.com/partners/terms
- https://help.shopify.com/en/partners/partner-program/how-to-earn

The owner has not authorised any spend. Therefore:
- no USD $19 registration fee;
- no paid hosting, database, queue, LLM, API, subscription, domain or monitoring service;
- local/free-tier prototype and documentation research only until an owner gate is explicitly approved;
- usage ceilings and a hard stop must exist before any metered service is tested.

The Shopify AI Toolkit changelog on 28-Oct-2026 says external agents can manage a merchant's own Flow workflows through the toolkit, while third-party apps are prevented from directly using the underlying APIs. Direct automation-management API use requires Shopify approval for the `write_automations` scope. Do not make this scope a dependency of the gateway.

Source: https://shopify.dev/changelog/posts/shopify-flow-manage-automations-through-admin-api

## 5. Initial buyer hypothesis

Primary buyer:
- developer / small software company already publishing one or more Shopify apps with custom Flow actions;
- ecommerce platform integrator maintaining custom actions for multiple merchant stores;
- automation developer whose Flow action performs long-running or side-effecting tasks.

Not the first target:
- ordinary merchant with simple Flow automations;
- merchant who only wants a workflow audit report;
- agencies expecting bespoke implementation or 24/7 human operations.

Potential willingness-to-pay rationale:
- custom action failures can impact orders, inventory, customer communications or downstream systems;
- duplicate side effects and unclear in-progress states can create support and reputation costs;
- a reusable endpoint gateway can replace bespoke retry/idempotency plumbing.

These are hypotheses, not verified customer economics. The addressable developer count, willingness-to-pay, churn and expected support burden are unknown.

## 6. Product boundary if the gap passes

### MVP must include
- per-app / per-shop tenant separation;
- Shopify HMAC verification;
- action_run_id idempotency;
- durable event/job record;
- state machine: RECEIVED → ACCEPTED → RUNNING → COMPLETED / FAILED / UNKNOWN;
- retry policy with bounded backoff and Shopify-compliant status responses;
- safe dead-letter and manual replay with duplicate-side-effect guard;
- append-only event receipts and searchable execution history;
- strict payload redaction and no secret logging;
- operator-visible outcome status and webhook/email alert options;
- deterministic fault-injection tests for timeout, duplicate POST, 202 loop, 429 Retry-After, 5xx, poison job and partial external side-effect.

### Explicit non-goals
- editing merchants' workflows or requesting broad `write_automations` scope;
- automatic retry of non-idempotent actions without an idempotency contract;
- guaranteeing the downstream business system committed a transaction when no verifiable receipt exists;
- storing payment secrets or unnecessary customer PII;
- LLM execution in the critical request path;
- bespoke consulting or managed operations;
- launching before security, app-review and owner approval gates.

## 7. Hard GO / NO-GO conditions

All must pass before build:

1. **Competition:** A current product comparison shows no existing product or near-zero-cost library already provides Shopify-specific turnkey custom Flow action reliability at equivalent capability.
2. **Buyer evidence:** At least two independent, primary buyer signals from custom Flow action developers showing a costly recurring problem; forum activity alone is not sufficient.
3. **Paid value:** At least one credible paid willingness signal (existing paid competitor, purchase intent with a concrete commitment, or verified spend for adjacent developer tooling) and a plausible self-serve price. No price is assigned yet.
4. **Technical:** Free-tier architecture can meet request and durability requirements without paid dependencies; no false guarantee on downstream completion.
5. **Economics:** Contribution margin remains positive after Shopify share, 2.9% processing and all variable infrastructure costs. No revenue forecast without usage data.
6. **Security:** HMAC, tenant isolation, secret handling, retention, deletion, replay safeguards and audit log are designed and tested.
7. **Distribution:** Shopify App Store eligibility, app review route and public listing requirements are feasible; mandatory owner steps remain explicit.
8. **Continuity:** One active product build only; this remains the single P47 candidate until GO/NO-GO.

If any hard condition fails, record NO_GO and move to the next ranked platform. No build for the sake of momentum.

## 8. Research tasks remaining before decision

- Fetch current Shopify app-marketplace competitor listings for custom Flow actions, webhook middleware and developer operations.
- Compare Inngest, Trigger.dev, Cloudflare Queues, QStash, Temporal and open-source options for idempotency, retries, durable jobs, cost, self-hostability and Shopify integration friction.
- Determine whether Shopify Flow's own retries/manual retry plus a normal app backend already solve the issue.
- Inspect public developer discussions and app listings for independent demand patterns, excluding promotional claims as purchase evidence.
- Build a small technical architecture and cost ceiling on paper only; no deployment or metered run.
- Produce a source-linked GO/NO-GO dossier.

**Current decision:** RESEARCH_ONLY. Do not create the Shopify app, pay the USD $19 registration fee, activate services or publish anything yet.
