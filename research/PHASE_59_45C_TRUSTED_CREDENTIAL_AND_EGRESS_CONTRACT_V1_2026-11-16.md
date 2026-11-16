# Phase 59.45C — Trusted Credential and Request-Binding Contract
Date: 2026-11-16
Status: DESIGN CONTRACT v1.0 — NOT IMPLEMENTED, NOT DEPLOYED, NOT OWNER-APPROVED

## 1. Purpose and non-goals

This contract closes the identity gap where a caller can choose a syntactically valid GitHub installation scope that is not cryptographically bound to the credential actually used for provider traffic.

It separates four distinct trust decisions:
1. Credential provenance: which GitHub App installation issued the credential.
2. Request authorization: whether this exact repository operation is allowed.
3. Egress enforcement: whether the exact credential authorized by the broker is the credential actually attached to the outbound GitHub request.
4. Quota accounting authorization: whether the Durable Object may mutate the quota partition derived from the verified identity.

A valid signature alone does not prove that an outbound HTTP request used a particular bearer token. The component that controls network egress must enforce that binding.

Non-goals: creating a real GitHub App, provisioning a production key/token, deploying Cloudflare resources, sending live GitHub requests, or enabling billing.

## 2. Components and trust boundaries

### 2.1 Trusted Credential Broker (TCB)
- Sole custodian of the GitHub App private key.
- Uses owner-approved, server-side installation configuration. Callers cannot submit or override installation IDs, repository IDs, permissions, or credential lane.
- Mints narrowly scoped installation tokens from the configured installation.
- Emits a short-lived signed Credential Lease Assertion (CLA).
- Never returns private key material. Token delivery is restricted to the trusted egress component; it is not exposed to general swarm tasks.

### 2.2 Quota Admission Client (QAC)
- Accepts an opaque broker-issued lease handle, not `credentialScope`, installation ID, repository ID, token digest, or public key supplied by the caller.
- Obtains/validates the CLA through a trusted broker interface.
- Derives the quota identity only from the verified CLA.
- Signs internal Worker-to-DO RPC with the existing HMAC caller credential. This HMAC is a separate trust layer and does not establish GitHub identity.

### 2.3 Trusted GitHub Egress Gateway (GEG)
- Sole component permitted to make live GitHub HTTP requests for this execution lane.
- Resolves the opaque lease handle to the broker-held bearer token.
- Enforces the exact method, canonical URL, operation ID, repository ID, request-body digest, and allowed headers against the CLA.
- Attaches the bearer token internally. Callers cannot supply or override Authorization.
- Rejects redirects, unreviewed hosts, unapproved methods, repository mismatch, write operations on read-only lane, and any caller-provided Authorization header.
- Produces a signed Egress Dispatch Receipt (EDR) only after the outbound request has been constructed and the gateway has enforced the token/CLA binding. The receipt records request digest, installation identity, token digest, operation, repository, response status, gateway identity, timestamp, unique dispatch ID, and outcome class. It contains no bearer token.

### 2.4 Quota Ledger Durable Object (QLDO)
- Independently verifies broker signatures and gateway signatures using pinned, server-controlled public keys.
- Derives namespace identity from verified CLA claims. Caller input cannot select it.
- Verifies EDR for post-egress accounting actions and consumes its unique dispatch ID atomically to prevent receipt replay.
- Performs provenance verification after internal HMAC authentication and before identity lookup or any quota mutation.
- Never receives or stores the raw GitHub bearer token.

## 3. Signed assertion contracts

### 3.1 Credential Lease Assertion (CLA)

Compact JWS ES256. Protected header exact keys: `alg=ES256`, `kid`, `typ=JWT`.

Required claims:
- `iss`: fixed broker issuer
- `aud`: fixed quota/egress audience
- `sub`: GitHub App ID
- `installation_id`: broker-selected positive numeric ID
- `repository_ids`: sorted unique allowlist of positive numeric repository IDs
- `permissions`: exact minimal permission map
- `credential_lane`: `compute_readonly` or `publisher_restricted`
- `token_sha256`: SHA-256 digest of exact broker-minted bearer token
- `issued_at`, `expires_at`: integer epoch seconds, maximum TTL 300 seconds for live credentials
- `jti`: unique assertion ID
- `lease_id`: opaque stable lease identifier
- `key_version`: broker key version

No optional free-form claims. Unknown claims/headers reject.

### 3.2 Egress Dispatch Receipt (EDR)

Compact JWS ES256, signed by a distinct egress key, not the broker key.

Required claims:
- `iss`: configured egress gateway identity
- `aud`: quota ledger audience
- `cla_jti`: CLA assertion ID
- `lease_id`
- `installation_id`
- `repository_id`
- `operation_id`
- `method`
- `canonical_url_sha256`
- `request_body_sha256` (hash of empty bytes for GET)
- `token_sha256`
- `dispatch_id`: unique, replay-protected ID
- `started_at`, `completed_at`
- `response_status`
- `outcome`: `response_received`, `connect_failed_before_send`, or `outcome_uncertain`

The GEG signs only after enforcing that the exact token identified by `token_sha256` was attached to the exact request identified by method/URL/body/operation/repository. For a request that may have reached GitHub but whose response is lost, outcome is `outcome_uncertain`; quota is not released.

The QLDO verifies EDR signature, issuer, audience, CLA linkage, installation/repository/operation, request digest, timestamp bounds, and dispatch replay state. It cannot independently observe the network Authorization header; the cryptographic trust in that fact rests on the GEG's enforced egress boundary and signing key. This limitation must remain explicit in audits.

## 4. RPC envelope and action policy

The existing HMAC envelope remains separate and signs the complete canonical JSON body. Proposed envelope:
`{ action, input, credential: { cla, leaseId }, dispatchReceipt? }`

- Never include raw bearer token or private key.
- `credentialScope` is removed from caller-facing inputs. The server derives it as `github-app-installation:<installation_id>` only after CLA verification.
- Client-side namespace selection uses the verified identity. DO independently verifies CLA and recomputes identity; a mismatch rejects.
- HMAC caller identity controls which RPC actions may be invoked. CLA controls GitHub credential identity. EDR controls proof of the outbound dispatch. None substitutes for another.

Action matrix:

| Action | Required evidence | Notes |
|---|---|---|
| reserve | CLA + HMAC | Must bind reservation to operation ID, repo ID, request digest and lease |
| settle | CLA + EDR + HMAC | EDR must match reserved operation and request fingerprint |
| markUncertain | CLA + EDR or trusted egress failure receipt + HMAC | Never release budget when outcome may have reached provider |
| recordSecondaryLimit | CLA + EDR + HMAC | Response status and rate-limit evidence must match dispatch |
| recordTelemetry | CLA + EDR + HMAC | Telemetry must link to the same dispatch/reservation |
| renewReservation | CLA + HMAC | Same lease identity; worker/lease fencing still enforced |
| reconcileUncertain | CLA + primary-service authorization + EDR/evidence references + HMAC | Preserve primary-only rule; no caller-supplied quota observations |
| expireReservations | dedicated maintenance-service assertion + HMAC | Not a GitHub credential action; must not impersonate an installation |
| snapshot | dedicated read-only service assertion + HMAC | Read-only least privilege; no arbitrary cross-installation data exposure |

Maintenance actions do not carry a fabricated GitHub CLA. They use a distinct service identity with an explicit action allowlist and tenant/partition scope. Primary-only restrictions remain mandatory.

## 5. Required execution sequence

1. Worker submits a task containing operation intent, repository target and stable request ID. It cannot submit installation identity or Authorization.
2. TCB resolves the owner-configured installation and issues a short-lived CLA plus opaque lease handle.
3. QAC verifies CLA and derives installation partition. It asks QLDO to reserve using CLA, operation and canonical request fingerprint.
4. QLDO verifies HMAC and CLA before namespace identity checks and reserve mutation.
5. After a successful reservation, QAC sends the opaque lease handle and exact request intent to GEG.
6. GEG resolves the actual token, verifies CLA, validates the request allowlist, attaches Authorization internally, executes exactly one request with redirects disabled, and signs EDR.
7. QAC sends EDR to QLDO for telemetry/settlement/uncertainty. QLDO independently verifies EDR and atomically consumes dispatch ID with accounting mutation.
8. Duplicate request IDs or dispatch IDs never cause a second provider request or second accounting mutation.

The current direct `fetchImpl(request)` path must be replaced by a gateway interface for live mode. A test-only injected synthetic response can remain only behind a hard test-mode boundary and synthetic keys.

## 6. Replay, rotation, and revocation

- CLA maximum live TTL: 300 seconds; verifier may support shorter test TTL.
- EDR maximum validity: 120 seconds after completion; clock skew allowance <= 30 seconds.
- `jti` and `dispatch_id` are one-use within the appropriate issuer namespace. DO consumes dispatch ID atomically with settlement/uncertainty mutation.
- Token rotation within the same installation preserves quota partition because installation ID is stable; token digest and CLA `jti` change.
- Installation transfer/reinstall producing a different installation ID is a new quota identity and requires owner review.
- Unknown/revoked key IDs, expired assertions, wrong issuer/audience, malformed claims, repo mismatch, permission escalation, lane mismatch, receipt replay, or fingerprint mismatch fail closed.
- Key rotation uses an overlap window with pinned old/new public keys; removal of old key rejects assertions signed by it after the overlap.

## 7. Synthetic test profile

- Test-only private signing keys and bearer tokens are generated in test memory at runtime.
- Public keys are passed as test fixtures to verifier instances. No test private key is checked into repository or emitted to logs.
- Synthetic claims use an unmistakable test issuer, test App ID, test repository ID and `synthetic_test_only` key namespace. Production configuration rejects these values.
- Shadow Worker cannot switch to live mode via request envelope or caller input.
- Tests assert zero external network requests and use a fetch spy that fails if global fetch is invoked.

## 8. Acceptance gates

A phase is not accepted until:
1. No public API accepts caller-controlled `credentialScope`, installation ID, repository ID, token digest, or key selection.
2. All GitHub quota actions require valid CLA; post-egress actions require matching EDR.
3. Maintenance actions use distinct service assertions and preserve primary-only constraints.
4. GEG is the only live egress path and enforces actual Authorization/token binding.
5. QLDO independently verifies CLA/EDR and consumes replay identifiers atomically before mutation.
6. All adversarial cases reject before provider egress or quota mutation as appropriate.
7. Token rotation preserves installation partition; different installation IDs isolate partitions.
8. Full exact-head CI passes, including existing Workers/workerd, transaction, contention, replay, and shadow suites.
9. No production App, key, token, deployment, live request, or paid service is introduced without separate owner approval.

## 9. Explicit unresolved implementation decisions

- Broker and gateway deployment topology and their service-to-service authentication.
- Whether CLA is fetched per task or cached by lease with strict expiry/revocation checks.
- Durable Object storage schema for consumed `dispatch_id` and CLA revocation epochs.
- Exact service-assertion format and partition authorization for maintenance operations.
- Gateway handling of connect failures and proof that a request was not transmitted.
- Key rotation, revocation distribution and emergency disable procedure.

These are implementation gates, not permission to improvise production infrastructure. Until resolved, the design remains non-production and no live request is authorized.
