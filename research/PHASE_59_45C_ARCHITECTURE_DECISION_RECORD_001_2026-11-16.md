# Phase 59.45C — Architecture Decision Record 001
Date: 2026-11-16
Status: PROPOSED DEFAULTS FOR SYNTHETIC IMPLEMENTATION; production topology remains unapproved.

## ADR-001: Broker, egress and quota service boundaries

### Decision A — Three independently authenticated service roles

Use three logical services, even if colocated in a local test harness:
1. **Credential Broker (CB):** owns GitHub App private key and installation configuration; mints installation tokens; signs CLA.
2. **GitHub Egress Gateway (GEG):** retrieves tokens through a private broker-to-gateway channel; validates CLA and exact request intent; attaches Authorization; performs the only permitted live GitHub request; signs EDR with a distinct key.
3. **Quota Ledger DO (QLDO):** verifies CLA and EDR with pinned public keys; owns quota state and replay consumption; never receives token or private key.

The general swarm Worker and Quota Admission Client receive neither private key nor raw GitHub token. Service-to-service calls use distinct identities and least-privilege allowlists. A shared secret or signing key must not be reused across CB, GEG, and QLDO.

### Decision B — Lease lifecycle
- CB creates a lease for one configured installation, repository allowlist, lane and minimal permissions.
- CLA lifetime is at most 300 seconds. Lease handle lifetime cannot exceed CLA expiry.
- Token rotation produces a new token digest and CLA jti, but retains the same installation ID and quota partition.
- CB can revoke a lease. Revocation state is checked by GEG before dispatch; QLDO checks a bounded revocation policy before reserve and post-egress mutation. Maximum propagation delay must be measured before production.
- No caller may request a different installation ID or broaden repositories/permissions.

### Decision C — Request flow and no-token exposure
1. Worker submits canonical operation intent and stable request ID to QAC.
2. QAC asks CB for a lease using a server-side policy selector, never a caller-supplied installation ID.
3. CB returns CLA and opaque lease handle. It does not return bearer token to Worker/QAC.
4. QAC verifies CLA and derives installation scope. It asks QLDO to reserve with CLA, repo ID, operation ID, request fingerprint and stable reservation ID.
5. After reservation success, QAC sends lease handle plus canonical request intent to GEG.
6. GEG resolves token through private CB-to-GEG channel, validates CLA and exact request allowlist, injects Authorization itself, sends one request with redirects disabled, and returns response plus signed EDR. It never returns token.
7. QAC forwards EDR and response telemetry to QLDO. QLDO verifies CLA/EDR and atomically consumes dispatch ID with settlement/uncertainty update.

### Decision D — Request identity

For response evidence, EDR additionally carries `response_headers_sha256`, computed over the versioned allowlist of `retry-after`, `x-github-request-id`, and `x-ratelimit-*` headers consumed by quota telemetry. It is null for outcomes without a response. QLDO compares the supplied header evidence against this signed digest.\n\nThe canonical request fingerprint is SHA-256 over a versioned canonical serialization of provider, repository numeric ID, operation registry ID, HTTP method, canonical URL (fixed api.github.com host; normalized path/query; no credentials/fragments), request body SHA-256, and credential lane.

GEG independently computes the same fingerprint from the actual request it is about to send. QLDO compares it to the reservation record and EDR. Caller-supplied fingerprints are never trusted.

### Decision E — Maintenance service identity

Use a distinct Service Assertion (SA), signed by a dedicated service identity key, not the GitHub broker key and not the egress key.

Required SA claims: issuer, quota-ledger audience, stable service principal (quota-maintenance-primary or quota-observer), exact action allowlist, explicit partition scope, issued_at, expires_at (maximum 120 seconds), unique jti, and key_version.

Rules:
- expireReservations requires quota-maintenance-primary and explicit partition scope.
- reconcileUncertain requires quota-maintenance-primary, CLA context for the affected installation, and authoritative persisted EDR/telemetry references. Existing primary-only check remains.
- snapshot requires quota-observer; it is read-only and returns only authorized partition scope. Global snapshots are disabled unless separately approved.
- QLDO verifies SA after HMAC and before reading/mutating the relevant partition. SA replay IDs are consumed atomically for mutating actions.
- No GitHub credential identity is fabricated for maintenance operations.

### Decision F — Egress outcome semantics

GEG emits exactly one EDR outcome:
- response_received: response status and response-header digest are available; quota telemetry may be recorded.
- connect_failed_before_send: gateway can establish that no request bytes were transmitted. A release may occur only under explicit, tested policy.
- outcome_uncertain: request may have been transmitted or provider response is unavailable. Reservation moves to uncertain accounting; no automatic release.

A generic thrown fetch error is not proof of connect_failed_before_send. Default all ambiguous failures to outcome_uncertain.

### Decision G — Test-first delivery plan
1. Implement pure canonical request fingerprint module and unit tests.
2. Implement CLA and EDR strict verifiers with distinct key maps and issuer/audience pins.
3. Implement SA verifier and action/partition policy tests.
4. Implement a synthetic in-memory broker + egress harness with runtime-generated test keys/tokens. No external network.
5. Implement client API that accepts opaque lease context, removes caller-controlled scope, and routes provider calls through gateway.
6. Integrate QLDO async verification and atomic replay consumption before identity lookup/mutation.
7. Migrate all quota actions and shadow Worker; maintenance actions use SA.
8. Run adversarial and complete regression suites on exact HEAD.

### Rejected alternatives
- Caller passes installation ID/scope: rejected; allows quota partition splitting.
- DO trusts caller-provided token digest: rejected; does not prove the token was attached to outbound request.
- Send raw token to DO or general Worker: rejected; expands credential exposure and persistence risk.
- One shared signing key for broker and egress: rejected; collapses trust boundaries and permits one compromised role to forge both credential provenance and egress receipts.
- Use only HMAC caller authentication as GitHub identity: rejected; authenticates internal RPC caller, not the installation credential.
- Treat generic fetch exception as definitely unsent: rejected; can release budget after an ambiguous provider outcome.

## Unresolved production gates
- Cloudflare service-binding topology and key custody model require a separate deployment design and owner approval.
- Actual GitHub App installation/repository IDs and permissions must come from owner-controlled configuration; none are currently provisioned.
- Revocation propagation SLO, gateway egress observability, key rotation, and service assertion storage need implementation tests.
- No production deployment, live request, App creation, key/token generation or spending is authorized by this ADR.
