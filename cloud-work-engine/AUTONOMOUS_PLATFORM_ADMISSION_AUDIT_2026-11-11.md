# Autonomous Platform Admission Audit — 2026-11-11

## Executive decision

AgentGigs is the strongest newly discovered technical fit for agent-operated paid work, but is not ready to onboard. Its public jobs page currently reports 0 open jobs. Its API requires a human-created account/API key, email verification, and Stripe Connect KYC before payouts. India payout eligibility is not established. No account was created and no credentials were requested.

Agentizable.ai (formerly Agent Bounties) is not actionable right now. Its live ready-to-earn projection returned no items and marked coverage degraded/partial. Its published protocol JSON says autonomous-v1 is recovery-only, with new creation, funding and claims disabled. The v2 read model was unavailable in the current projection. No legacy claims or wallet activity.

AIBTC has visible open listings but current examples are specialist smart-contract audits and wallet/identity-dependent Proof-of-Agent tasks. Defer until capability, wallet and task ROI gates are independently satisfied.

AgentBazaar uses internal GIG credits, explicitly not cash. Exclude from cash revenue.

## AgentGigs: evidence and constraints

- Official API docs describe autonomous browse/apply/deliver operations through REST and SSE.
- Required one-time human steps: email verification and Stripe Connect KYC.
- Job-specific NDA acknowledgement is required before applying, delivering or accessing attachments. This is a privacy acknowledgement and must not be silently accepted by the agent.
- Free tier takes 10% of completed-job payout; paid tiers are unnecessary for initial test.
- Terms say payout cooldown is 1–10 business days after client approval; pricing page says standard bank payouts 2–3 business days. Treat as a documentation discrepancy requiring clarification.
- Public jobs page currently showed 0 open jobs; authenticated API returned 401 as expected without credentials.
- India Stripe is invite-only; Stripe's official support pages document India-specific Connect limitations. Cross-border support depends on platform country, account configuration and funds flow. We cannot infer that an Indian connected account can be onboarded to this US platform.
- No API key, email, password, Stripe account, KYC, NDA acknowledgement, application or submission was created.

Official sources:
- https://www.agentgigs.io/docs/api
- https://www.agentgigs.io/llms.txt
- https://www.agentgigs.io/jobs
- https://www.agentgigs.io/terms
- https://www.agentgigs.io/pricing
- https://support.stripe.com/questions/stripe-india-support-for-marketplaces
- https://support.stripe.com/questions/payout-currency-for-stripe-accounts-in-india
- https://support.stripe.com/questions/pay-out-to-connected-accounts-in-other-countries

## Agentizable.ai: fail-closed decision

- Public opportunity projection: degraded=true, coverage=partial, items=[].
- Protocol JSON: autonomous-v1 status=recovery_only; new_creation_enabled=false, new_funding_enabled=false, new_claims_enabled=false.
- V2 source read model unavailable in current projection; no v2 item returned.
- Terms require human review of every write, signature, amount, network and destination.
- Only confirmed canonical BountySettled or CompetitionSettledV2 events prove solver payment.
- Decision: block legacy v1; retry v2 only when authoritative feed is healthy and funded actionable tasks appear.

## AIBTC

- Public open API response returned 8 records at audit time.
- Examples include Clarity/Stacks smart-contract audits (6,000–8,000 sats with high submission counts) and Proof-of-Agent participation tasks requiring new identity and on-chain wallet activity.
- Some tasks are technically relevant but require specialist security review, public evidence, wallet ownership and competition. Do not create a wallet or submit without explicit authorization.
- Current open count is a snapshot, not a guarantee of continued availability.

## Automated gate implementation

Added:
- cloud-work-engine/platform_registry.json
- cloud-work-engine/platform_gate.py
- cloud-work-engine/tests/test_platform_gate.py

Gate fails closed for unknown statuses and prevents onboarding with no current open work, unverified India payout, retired protocols, non-cash credit schemes, test/micro-value feeds and unaudited token/stale-feed platforms.

This gate is a decision-support control, not proof of platform solvency or legal eligibility.
