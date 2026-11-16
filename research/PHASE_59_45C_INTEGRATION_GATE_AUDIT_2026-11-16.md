# Phase 59.45C Integration Gate Audit — 2026-11-16

Status: BLOCKED FOR INTEGRATION DESIGN; verifier-only implementation is CI-green.
Scope: read-only source audit of `phase59-45b-canonical-installation-scope` at `b11be92ddc76ee4608c9e147ef74948dbb8f45d5`.
No deployment, credential access, live provider request, paid service, or external account mutation was performed.

## Verified repository facts

1. `cloud/swarm/credential-provenance.mjs` verifies compact ES256 JWS assertions, validates a strict claim/header shape, checks issuer/audience/App ID/repository/lane/permissions/time bounds, and hashes the supplied bearer token against `token_sha256`.
2. `cloud/swarm/quota-ledger-client.mjs` still accepts caller-provided `credentialScope` in `executeQuotaGuardedGitHubRequest`, `renewQuotaReservation`, and `reconcileUncertainQuotaReservation`. The value is placed in the ledger input and used to select the Durable Object namespace.
3. `signedRpcRequest` currently authenticates only `{ action, input }` with the internal HMAC. No provenance assertion or token digest is in the RPC envelope.
4. `cloud/swarm/quota-ledger-do.mjs` verifies internal HMAC/replay protection, then calls synchronous `#assertIdentity` before dispatching quota actions. It does not verify a signed credential-provenance assertion.
5. `cloud/swarm/read-only-swarm-worker.mjs` reads `NEXUS_QUOTA_CREDENTIAL_SCOPE` from environment and forwards it as the scope. That is configuration, not proof that the GitHub token belongs to the named installation.
6. The shadow Worker injects a synthetic provider response and reports zero external network requests. Its current execution is not evidence of live GitHub credential provenance.

## Security design correction required before code integration

The verifier's `bearerToken` check is meaningful only at a component that actually possesses the bearer token. The Durable Object must not receive the raw token. Therefore a DO-side comparison of a caller-supplied digest with the signed `token_sha256` claim is **not independent proof** that the provider request used that token; it only proves that the digest matches the broker-signed claim if the broker assertion is valid.

The implementation must define and enforce this trust chain explicitly:

- A trusted broker is the sole issuer of the signed assertion and sole custodian of the GitHub App private key.
- The component that makes the provider request validates the assertion against the exact bearer token it uses.
- The internal RPC carries the assertion and a digest, never the raw token; HMAC authenticates the RPC caller/body separately.
- The Durable Object independently verifies the broker signature, issuer, audience, expiry, repository, lane, permissions, and derived installation scope before any identity lookup or mutation.
- The DO treats the digest as broker-attested metadata, not as independently observed proof of the outbound HTTP Authorization header. If stronger end-to-end binding is required, the broker must issue a one-use, request-bound attestation (method, canonical URL/operation, body digest, token digest, installation ID, expiry, unique ID) that the DO verifies and consumes atomically. Do not claim this proves the actual network Authorization header unless the network egress component enforces that binding.
- No caller-supplied scope or `NEXUS_QUOTA_CREDENTIAL_SCOPE` may determine namespace identity. Derive it only from verified provenance.

## Complete action coverage required

Every quota ledger action must carry and validate the same provenance context, including:
`reserve`, `settle`, `markUncertain`, `recordSecondaryLimit`, `recordTelemetry`, `renewReservation`, `reconcileUncertain`, `expireReservations`, and `snapshot`.
For maintenance-only actions, define an explicit service identity/authorization path rather than silently bypassing provenance. Preserve primary-caller restrictions.

## Required implementation/test gates

1. Introduce a typed, non-caller-overridable credential context returned by trusted verification; remove public `credentialScope` inputs from all client entry points.
2. Derive DO namespace name only after verification. Reject missing/malformed/expired assertions before namespace selection and before provider fetch.
3. Add assertion + token digest + request binding to the HMAC-authenticated RPC envelope; never serialize bearer token or private key.
4. Make DO verification asynchronous and perform it after HMAC authentication but before `#assertIdentity` and every action dispatch/mutation.
5. Enforce repository ID, App ID, issuer, audience, credential lane, permission allowlist, key ID allowlist, expiry, and one-use assertion/request ID semantics.
6. Ensure shadow mode uses explicitly synthetic ES256 test keys and a synthetic token fixture. Synthetic identity must be visibly test-only and impossible to configure as production.
7. Add integration tests for all actions, scope spoofing, another valid installation ID, token substitution, same-install token rotation, assertion tampering, expired assertion, wrong issuer/audience/App/repository/lane/permissions, unknown key, replay, cross-worker duplicate delivery, and rejection before provider request or ledger mutation.
8. Run the full exact-head regression suite. Keep PR #26 draft/unmerged until every gate is green and reviewed.

## Evidence and limitations

- Latest known exact-head workflow run set for the audited commit: 14 relevant workflow runs completed successfully, including Phase 59.45C Credential Provenance Verifier.
- This is verifier-only CI evidence. It does not establish client/DO integration, trusted broker existence, production key custody, global quota atomicity across independent hosts, or live revenue readiness.
- No GitHub App has been created or installed; no production key/token has been provisioned; no Cloudflare deployment or live provider request has occurred.
- Authorized spend remains ₹0; verified realized net receipts remain ₹0.

## Next authorized engineering step

Implement the trust-chain contract and integration tests on the existing Phase 59.45 branch only after the outbound-request attestation semantics and service-identity path for maintenance actions are explicit. Do not weaken fail-closed behavior to make shadow tests pass.
