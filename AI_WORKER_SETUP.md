> **SUPERSEDED BY PHASE 59.10 (14-Nov-2026): CLOUD-ONLY MULTI-PROVIDER DESIGN**
>
> Do not treat the single-provider Cloudflare secret setup below as the final deployment plan. Do not ask the owner to enable this legacy adapter in isolation. The final design requires a provider-neutral zero-cost gateway, independent compute failover, strict provider allowlisting, quota accounting, and fault-injection proof. No provider is currently enabled. The Phase 59.10 report is authoritative:
> `research/PHASE_59_10_CLOUD_ONLY_ZERO_COST_MULTI_CLOUD_FAILOVER_FINAL_DESIGN_2026-11-14.md`
>
> No laptop/local inference is part of the final architecture. Owner-only account/KYC/terms actions remain gated, but engineering and deployment preparation should be performed by the project automation where supported.

# AI Worker Setup and Safety Contract

## Current deployment state
The five-minute GitHub Actions workflow is the wake-up mechanism. The AI executor is bounded and fail-closed. It does not call a provider unless the owner has explicitly configured all required GitHub Actions secrets.

## Required GitHub Actions secrets (one-time owner setup)
- `MISSION_AI_ENABLED` = `true`
- `MISSION_AI_ZERO_BILLING_CONFIRMED` = `true`, only after confirming the Cloudflare account has no enabled paid billing and the chosen model is eligible for the free allocation.
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` with only the minimum Workers AI invocation permission.
- `CLOUDFLARE_AI_MODEL` = exact currently eligible model identifier chosen after checking the account's free-plan availability.

Never paste tokens into chat, issues, commits, JSON files or workflow YAML. Add them only in GitHub repository Settings → Secrets and variables → Actions. Do not enable paid billing. If free eligibility or billing state is uncertain, leave the enable flags unset.

## Guardrails
- Maximum 6 inference calls per UTC day; minimum 30 minutes between calls; maximum 900 output tokens per call.
- No model-generated code is executed.
- No public publication, account actions, KYC/legal acceptance, wallet signing, private-key access, spending or money movement.
- Model output is a draft, not evidence. Verify all URLs and claims against primary sources before changing opportunity/payout registries or completing a task.
- Missing secrets, quota cap, cooldown or provider failure stop inference safely.
- These limits bound calls, not guaranteed monetary cost. The zero-billing flag is an explicit owner assertion, not a billing API check.

## What is not yet proven
The first provider-backed run, real productive task completion, recovery test and 24-hour soak test must all pass before this system can be described as a proven autonomous AI worker.
