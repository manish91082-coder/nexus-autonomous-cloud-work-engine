# Phase 59.45C-K — Signed Response Evidence and Single-Use Dispatch Lifecycle Audit

Date: 2026-11-16
Branch: `phase59-45b-canonical-installation-scope`
Status: synthetic contract/verifier increment; QLDO integration remains pending.

## Implemented in this increment

- `cloud/swarm/github-response-evidence.mjs`: canonical versioned SHA-256 digest over a fixed allowlist:
  - `retry-after`
  - `x-github-request-id`
  - `x-ratelimit-limit`
  - `x-ratelimit-remaining`
  - `x-ratelimit-reset`
  - `x-ratelimit-resource`
  - `x-ratelimit-used`
- `cloud/swarm/github-response-evidence.test.mjs`: verifies deterministic digest, ignores unapproved headers such as `set-cookie`, and detects changes to telemetry-relevant headers.
- EDR schema now requires `response_headers_sha256` for `response_received`; non-response outcomes require null.
- EDR verifier returns and binds the response-header digest to the expected evidence value.
- Synthetic broker/egress harness now signs response-header evidence into EDR.
- Workflow includes the new helper and test.
- Trust Contract v1 and ADR-001 text updated to describe the signed response-header evidence digest.
- CLA lease binding remains required: `lease_id`, `key_version`, max TTL 300 seconds.

## Critical dispatch lifecycle issue and decision

The existing action plan separates `recordSecondaryLimit`, `recordTelemetry`, and `settle`. A dispatch receipt is required to be single-use, but those three calls may all refer to the same provider dispatch. Reusing the same EDR across three independent actions conflicts with one-use dispatch replay protection; consuming it on the first call would block the remaining accounting actions, while allowing reuse would weaken replay protection.

Required resolution before QLDO implementation:
- Introduce one externally authorized post-egress action, `finalizeDispatch`, that receives one CLA + one EDR + HMAC and performs, in one SQLite transaction:
  1. validate reservation and request/lease binding;
  2. verify response status and signed response-header digest;
  3. derive and persist rate-limit cooldown evidence when applicable;
  4. parse/persist response-header telemetry when valid;
  5. settle reserved quota conservatively;
  6. consume `dispatch_id` exactly once.
- Keep internal helper methods for telemetry/cooldown/settlement private to this transaction; do not permit independent caller RPCs to mutate response-derived evidence using a consumed EDR.
- `markUncertain` remains a separate post-egress terminal action consuming one EDR and moving the reservation to uncertain accounting.
- `connect_failed_before_send` must not release quota until a separately specified and tested proof policy exists; conservative first release remains no automatic release.
- Periodic overview `GET /rate_limit` must also travel through the trusted gateway and have its own EDR; it must not use caller-injected counters as authoritative evidence.

This changes the earlier nine-action matrix's public API: three response-derived actions become one `finalizeDispatch` terminal action. Existing internal helpers may remain private implementation details. Update the action matrix and caller policy registry before coding QLDO integration.

## Remaining blockers

1. The current response-evidence helper computes the digest, and the harness signs it, but the actual QLDO does not yet receive/verify EDR or compare the submitted header evidence against this digest.
2. The synthetic harness's in-memory dispatch set is not durable transaction replay proof.
3. Client still accepts caller `credentialScope` and directly invokes `fetchImpl(request)`; no trusted gateway is integrated.
4. QLDO still performs caller-scope identity assertion before action dispatch and has no CLA/EDR/SA verification.
5. No atomic `finalizeDispatch` API, reservation binding columns, dispatch replay table, or SA JTI replay table is implemented.
6. Exact-head CI was queried through available run/status reads; both returned empty arrays. CI is UNVERIFIED, not passed.

## Safety and mission state

- P59-003 remains the only active P0.
- P59-001 PAUSED; P59-002 BLOCKED.
- Authorized spend ₹0; verified realized net receipts ₹0.
- No production credentials, GitHub App, Cloudflare deployment, live provider request, AI inference, billing, payment or fund movement authorized or performed.
