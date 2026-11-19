# P59-003 AI Inference Owner Approval Packet
Date: 2026-11-19
Status: PREPARED; NO INFERENCE AUTHORIZED

## Purpose
This packet defines the evidence and owner approvals required before any AI inference is enabled in the P10CR mission. It does not request credentials and does not accept terms on the owner's behalf.

## Current hard blockers
- The account-scope platform budget arbiter has synthetic Workerd proof only; it is not integrated into the mission dispatcher or AI executor.
- Independent physical-host contention and 7/30-day soak have not passed.
- The provider-neutral zero-cost gateway is not implemented and verified.
- The current AI executor still contains a legacy direct Cloudflare Workers AI adapter. Two code-level gates are hard false and the workflow sets AI flags false.
- control/ai_inference_approval.json must remain DISABLED.

## Evidence the owner must review (outside ChatGPT)
1. Provider terms: official URL, effective/version date, data handling, retention, model training use, regional availability, service limits and free-tier eligibility.
2. Exact model: provider model ID, official model card, input/output restrictions, data terms and rights to generated outputs.
3. Zero-billing: official account billing state and model-specific free allocation; confirm no paid fallback, no auto-upgrade and a deterministic stop on unknown/paid state.
4. Quotas: official provider limits plus the P10CR account-global arbiter's tested limits, reset window, reservation, settlement and failure behavior.
5. Gateway: exact HTTPS endpoint, provider allowlist, signed request protocol, no-paid-fallback policy and code/CI evidence.
6. Owner approval: explicit approval reference (reviewed PR/commit or internal approval record) and timestamp.

## Manifest fields
The canonical machine record is control/ai_inference_approval.json. It requires:
- status=APPROVED_FOR_INFERENCE;
- exact provider and model_id;
- provider_terms, model_data_terms, zero_billing, quota and gateway records with status=VERIFIED, official HTTPS evidence URL, SHA-256 and verification timestamp;
- model_data_terms.training_use_policy reviewed and recorded;
- zero_billing.billing_mode=FREE_TIER_ONLY, paid_fallback=false, hard_stop_on_paid_or_unknown=true;
- quota.scope=P10CR_ACCOUNT_GLOBAL, arbiter_integration=VERIFIED, bounded daily calls, minimum interval and output-token cap;
- gateway.status=VERIFIED, exact HTTPS endpoint, provider allowlist and paid_fallback=false;
- owner_approval.approved=true, timestamp and approval reference.

The manifest contains no secrets. Do not add account IDs, API tokens, passwords, private keys, cookies, OTPs or recovery codes.

## GitHub Actions flags (only after all evidence and engineering gates pass)
- MISSION_AI_ENABLED=true
- MISSION_AI_PROVIDER_TERMS_REVIEWED=true
- MISSION_AI_MODEL_DATA_TERMS_REVIEWED=true
- MISSION_AI_ZERO_BILLING_CONFIRMED=true
- MISSION_AI_GLOBAL_QUOTA_VERIFIED=true
- MISSION_AI_OWNER_APPROVED=true
- MISSION_AI_GLOBAL_QUOTA_DISPATCHER_VERIFIED=true

Credentials, if ever required after approval, are entered only by the owner in GitHub repository Settings -> Secrets and variables -> Actions. Never paste them into chat, issues, logs, files or commits.

## Non-negotiable stop conditions
Any paid or unknown billing state, provider/model mismatch, missing evidence hash, missing owner approval, expired quota evidence, absent dispatcher reservation/fencing context, quota exhaustion, gateway failure or policy uncertainty must stop inference. No paid fallback, account rotation, KYC bypass, public release or money movement.

## Current decision
NO INFERENCE. NO PROVIDER CALLS. NO CREDENTIAL SETUP REQUEST. Continue P59-003 engineering only.
