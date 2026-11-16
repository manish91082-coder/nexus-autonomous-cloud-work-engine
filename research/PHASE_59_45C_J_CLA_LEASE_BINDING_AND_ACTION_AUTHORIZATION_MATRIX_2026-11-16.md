# Phase 59.45C-J — CLA Lease Binding Reconciliation and Nine-Action Authorization Matrix

Date: 2026-11-16
Branch: `phase59-45b-canonical-installation-scope`
Status: synthetic verifier contract increment; not QLDO integration, not deployed, not owner-approved.

## 1. Contract reconciliation decision

The existing Trust Contract v1 and ADR-001 require a CLA to bind a stable opaque lease identifier and key version. The prior verifier did not require either claim. This increment aligns the strict CLA verifier with that contract:

- Required signed claims now include `lease_id` and `key_version`.
- Both are validated with bounded identifier formats.
- The verifier can compare a caller-supplied expected lease handle to the signed `lease_id`; mismatch rejects.
- Verified output exposes the signed `leaseId` and `keyVersion`.
- Maximum CLA TTL is reduced from 900 seconds to the contract's 300-second ceiling.
- Tokenless ledger mode remains explicit: no bearer token is accepted or required; the signed token digest remains available for EDR comparison.
- Broker/gateway mode still requires the exact bearer token and verifies its SHA-256 digest.

The opaque lease handle is not an installation selector. The installation ID remains broker-selected and is derived only from the signed CLA. Token rotation may change token digest, CLA JTI and key version while preserving installation partition; lease renewal/revocation remains broker-controlled.

## 2. Nine-action authorization matrix

| QLDO action | Required signed evidence | Additional binding / authorization | Replay and mutation rule |
|---|---|---|---|
| `reserve` | CLA + internal HMAC | CLA lease, installation, repository allowlist, lane; request operation ID, repository ID, method, canonical URL/body fingerprint; no caller scope | Verify before partition lookup. Persist verified identity + lease + exact request fingerprint in reservation. Stable reservation ID idempotency. |
| `settle` | CLA + EDR + internal HMAC | EDR CLA JTI/lease/install/repo/operation/method/URL/body/fingerprint/token digest must match stored reservation and current CLA | Atomically consume dispatch ID and settle counters in one SQLite transaction. Duplicate dispatch must not mutate. |
| `markUncertain` | CLA + EDR + internal HMAC | EDR must bind same reservation intent. `outcome_uncertain` remains uncertain. `connect_failed_before_send` is not an automatic release until a separately tested proof policy exists. | Atomically consume dispatch ID and move reserved units to uncertain; no release on ambiguous outcome. |
| `recordSecondaryLimit` | CLA + EDR + internal HMAC | Response status and rate-limit classification must be consistent with the same dispatch and reservation. Signed response-header evidence is required. | Consume the same dispatch evidence only under a defined multi-action dispatch lifecycle; prevent duplicate cooldown writes and cross-reservation reuse. |
| `recordTelemetry` | CLA + EDR + internal HMAC | Telemetry must be derived from response headers bound to the same EDR, reservation, repository and dispatch. Caller-supplied counters alone are not authority. | Observation insertion and accepted-current update are transactional; enforce dispatch-to-reservation linkage and no replay. |
| `renewReservation` | CLA + internal HMAC | Same signed lease/install identity, reservation owner, expected lease version, heartbeat ID and bounded extension | Heartbeat ID and lease-version compare-and-swap must be atomic; stale worker is fenced. |
| `reconcileUncertain` | CLA + primary SA + persisted EDR/telemetry references + internal HMAC | Primary maintenance principal; SA action and explicit partition scope; CLA must match affected installation; only authoritative persisted evidence can reconcile | Consume SA JTI atomically with reconciliation audit and counter mutation; no caller-supplied observations. |
| `expireReservations` | Maintenance SA + internal HMAC | `quota-maintenance-primary`, exact action, explicit partition scope; must operate only within the DO's verified installation partition | Consume SA JTI and expire only scoped reservations transactionally. |
| `snapshot` | Observer SA + internal HMAC | `quota-observer`, `snapshot` only, explicit partition scope; return only the authorized partition | Read-only; no mutation. Reject global/wildcard scope. |

HMAC authenticates the internal RPC caller and complete body; it does not establish GitHub credential identity. CLA establishes broker-attested credential identity and lease. EDR establishes gateway-attested dispatch evidence. SA establishes maintenance/observer authority. None substitutes for another.

## 3. Important schema gap found before implementation

The current EDR verifier binds response status, request identity and token digest, but does not contain a signed response-header digest. The Trust Contract says telemetry and secondary-limit evidence must be tied to the exact provider response. Without a gateway-signed digest of the relevant response headers (or an equivalent signed normalized telemetry payload), the DO cannot distinguish genuine response-header telemetry from caller-injected values.

Therefore:
- `recordTelemetry` and `recordSecondaryLimit` must remain fail-closed for the new trust path until the EDR contract is extended.
- Next schema increment should add a canonical `response_headers_sha256` (or a precisely specified normalized rate-limit evidence digest) to EDR and verify it against the exact header subset consumed by the telemetry parser.
- Do not silently accept arbitrary telemetry JSON because the HMAC caller is not the provider or gateway.

## 4. Current implementation status and limitations

Implemented in this increment:
- CLA verifier schema aligned to signed `lease_id` and `key_version`.
- CLA max TTL aligned to 300 seconds.
- Expected lease mismatch rejection added.
- Synthetic broker-to-gateway harness CLA fixture aligned with the mandatory claims.

Not implemented:
- Actual QLDO asynchronous CLA/EDR/SA verification.
- DO-side trusted pinned key configuration and issuer/audience registry.
- Durable reservation columns for verified installation/repository/lease/operation/fingerprint/token digest/CLA JTI.
- EDR response-header digest.
- Transactional dispatch ID and SA JTI replay tables.
- Opaque-lease client API and gateway-only live egress.
- Nine-action migration and tests.

## 5. Required next sequence

1. Add EDR response-header evidence digest and strict verifier tests.
2. Define canonical response-header subset and digest serialization shared by gateway and QLDO; exclude hop-by-hop headers and never store Authorization.
3. Extend reservation schema and request envelope to persist the verified lease/request binding.
4. Replace client caller-supplied `credentialScope` with opaque lease + broker-verified claims; no live direct fetch path.
5. Integrate asynchronous CLA/EDR/SA verification in QLDO before identity lookup/mutation.
6. Add atomic dispatch/JTI replay consumption and per-action transaction tests.
7. Add full concurrency, crash/restart, stale lease/fencing and uncertain recovery suites.
8. Confirm exact-head CI before accepting; keep PR #26 Draft/Open/Unmerged.

## 6. Safety and mission invariants

- Mission scope: zero-cost, cloud-first, autonomous agentic swarm and recurring internet-revenue ecosystem.
- P59-003 remains sole active P0; P59-001 PAUSED; P59-002 BLOCKED.
- Authorized spend: ₹0. Verified realized net receipts: ₹0.
- No production App/key/token, Cloudflare deployment, live provider request, inference, billing, payment or fund movement authorized or performed.
- Synthetic keys/tokens only, generated in test memory. No secret material committed.
