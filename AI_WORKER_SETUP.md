> CURRENT STATUS: AI inference is hard-disabled. This document supersedes the legacy single-provider setup instructions below. No provider is approved or enabled.

# P10CR AI Worker Setup and Safety Contract

## Current execution boundary (19-Nov-2026)
- GitHub Actions may run deterministic control-plane checks and tests.
- The AI task executor is fail-closed. The mission workflow explicitly sets every AI approval flag to false.
- The canonical machine approval record, control/ai_inference_approval.json, is DISABLED and contains no account credentials.
- Two code-level gates are hard false: GLOBAL_QUOTA_ADAPTER_READY and PROVIDER_GATEWAY_ADAPTER_READY.
- The account-scope budget arbiter is synthetic-tested, but it is not yet integrated into the mission dispatcher or this AI executor.
- The provider-neutral zero-cost gateway is not yet implemented and verified.
- Therefore no model inference request can be made, even if a credential or environment flag is accidentally added.

## Required gates before any future inference
All gates are conjunctive. A missing, unknown, expired, inconsistent or unverified value fails closed.

1. Official provider terms reviewed, versioned and hashed.
2. Exact model ID and model/data terms reviewed, including training use, retention and permitted inputs.
3. Zero-billing evidence verified for the selected account/model; no paid fallback; hard stop on paid or unknown state.
4. Account-global quota and reservation/settlement integration verified, including cross-run/cross-repository scope.
5. Provider-neutral gateway tested with an explicit provider allowlist and no paid fallback.
6. A deterministic approval manifest in control/ai_inference_approval.json passes schema and evidence validation.
7. Explicit owner approval recorded in the manifest and the corresponding GitHub Actions approval flags.
8. Dispatcher-issued reservation ID, fencing token and lease version are present and verified.
9. The code-level quota adapter and provider gateway gates are changed only in a separate reviewed engineering commit after all tests pass.

The manifest is a policy/evidence record, not a place for secrets. Never store API tokens, account credentials, private keys, cookies, OTPs or recovery codes in it.

## Owner approval packet
See governance/P59-003_AI_INFERENCE_OWNER_APPROVAL_PACKET_2026-11-19.md. It lists the evidence to review and the exact fields required. Do not enable any flag or add credentials until that packet is complete and all engineering gates are verified.

## Runtime guardrails
- Code-level ceiling remains 6 calls per UTC day, at least 30 minutes between calls and at most 900 output tokens. The manifest can only lower these limits or lengthen the interval.
- Local usage state is only an additional runner-local guard, never the global quota authority.
- Model output is untrusted draft data. No generated code execution.
- No KYC, legal acceptance, public release, billing, payment, signing, wallet/private-key access or money movement.
- The workflow has contents:read, SHA-pinned actions, persist-credentials:false, bounded timeout and no AI secrets.
- A successful test does not authorize production inference.

## Verification
The safety test suite must prove:
- default disabled behavior;
- incomplete or invalid approval manifests fail closed;
- environment flags alone cannot bypass the global quota adapter gate;
- the provider gateway remains disabled until its separately verified integration exists;
- no provider request occurs on any blocked path.
