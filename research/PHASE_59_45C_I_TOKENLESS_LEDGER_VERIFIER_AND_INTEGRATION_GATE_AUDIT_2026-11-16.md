# Phase 59.45C-I — Tokenless Ledger Verifier Defect Fix and Integration Gate Audit

Date: 2026-11-16
Branch: `phase59-45b-canonical-installation-scope`
Scope: source-level audit and minimal verifier correction. No production credentials, GitHub App, deployment, live provider request, inference, billing, or spend.

## Verified branch state

- Latest reviewed branch head before this increment: `efba5cc000acbb5bacc47920bdbd3cc40d2b2a04`.
- Verifier correction commit: `104e448ae254e787dae9ea2911f033e51e40eb11`.
- Regression-test commit / current head at audit: `56e24e151de7af6c39e6801b80832484b6432cd2`.
- Exact-head workflow runs and combined status were queried; both returned empty arrays through the available read actions. Exact-head CI is therefore UNVERIFIED, not passed.
- PR #26 is to remain Draft/Open/Unmerged; no merge action taken in this increment.

## Defect found and corrected

`verifyGitHubCredentialProvenance()` exposed `verifyTokenBinding=false` for ledger verification, but unconditionally required a bearer token before reaching that mode. This contradicted the explicit rule that Quota Ledger must never receive the raw bearer token and made the ledger verification mode unusable.

Correction:
- Bearer token is required and digest-checked only when `verifyTokenBinding=true`.
- When `verifyTokenBinding=false`, bearer token must be absent; supplying one is rejected.
- The verifier still validates the signed assertion and returns the signed token digest for EDR cross-binding.
- Added a regression case that verifies the same signed CLA in tokenless ledger mode and confirms bearer-token presence is rejected in that mode.

This is a source correction plus test addition. No test pass is claimed because exact-head CI is not visible.

## Actual integration blockers confirmed in source

1. `quota-ledger-do.mjs` still invokes synchronous `#assertIdentity(input,...)` before action dispatch and trusts caller-provided `input.credentialScope` for identity/partition checks.
2. The actual DO action dispatcher does not yet verify CLA, EDR, or Service Assertion before action-specific state lookup/mutation.
3. The client still accepts `credentialScope` as an argument, builds the Durable Object name from it, and sends provider traffic directly through `fetchImpl(request)`. It is not yet routed through a trusted GitHub Egress Gateway.
4. The current CLA verifier's exact claim schema contains no `lease_id`, while ADR-001 / Trust Contract v1 require lease binding. This contract mismatch must be resolved before DO integration.
5. EDR is request-specific, but reserve must persist the exact operation/repository/request fingerprint/lease binding so settle and markUncertain can compare the EDR against durable reservation state.
6. The actual action surface includes reserve, settle, markUncertain, expireReservations, renewReservation, reconcileUncertain, recordTelemetry, recordSecondaryLimit, and snapshot. Each requires an explicit authorization/evidence policy; no maintenance or telemetry bypass is acceptable.
7. Existing DO uses SQLite `transactionSync` for critical mutations and HMAC nonce replay protection. Dispatch receipt replay and service-assertion JTI replay must be consumed atomically with the corresponding state transition, not in a separate in-memory set.

## Next engineering sequence

1. Reconcile CLA schema with ADR-001: add and validate lease binding and decide whether request fingerprint is included in CLA or exclusively bound by the broker-issued lease + gateway-signed EDR. Update contract, harness, tests, and report together.
2. Define a complete action authorization matrix for all nine actions, including service principals and evidence requirements.
3. Change client API to accept an opaque broker-issued lease; remove caller-controlled installation scope and direct provider egress from the worker path. Keep test-only adapters isolated.
4. Integrate async CLA/EDR/SA verification in the DO before any identity lookup or mutation; derive partition from verified claims only.
5. Add durable tables for consumed dispatch IDs and service assertion JTIs; atomically consume them with settlement/reconciliation/maintenance transitions using SQLite transactions.
6. Add crash/restart, concurrent duplicate dispatch, lease fencing, expiry, replay, and uncertain recovery tests.
7. Confirm exact-head CI before accepting the increment. Keep PR draft and unmerged until all gates pass.

## Mission and safety state

- Mission remains the zero-cost, cloud-first autonomous agent swarm and revenue ecosystem.
- P59-003 remains the sole active P0.
- P59-001 remains PAUSED; P59-002 remains BLOCKED.
- Authorized spend: ₹0.
- Verified realized net receipts: ₹0.
- No production App, credential, private key, Cloudflare deployment, live provider request, inference, billing, payment, or fund movement authorized or performed.
