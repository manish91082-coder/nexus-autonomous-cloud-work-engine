# Phase 59.45C-H — Synthetic Broker / Egress / Ledger Harness Audit

Date: 2026-11-16  
Branch: `phase59-45b-canonical-installation-scope`  
Scope: test-only, in-memory trust-flow harness. No production credentials, GitHub App, network request, deployment, inference, or spend.

## Implemented artifacts

- `cloud/swarm/broker-egress-harness.test.mjs`
- `.github/workflows/phase59-45c-credential-provenance.yml` includes the harness test and path filter.
- `cloud/swarm/credential-provenance.mjs` supports two explicit verification modes:
  - broker/gateway mode: verifies the CLA signature and exact bearer-token digest binding;
  - ledger mode: verifies the signed CLA claims without receiving a bearer token. Supplying a bearer token while `verifyTokenBinding=false` is rejected.

## Test harness flow

1. Runtime-generated P-256 keypairs are created for broker and egress signer, independently.
2. Broker simulation signs a CLA bound to a synthetic-only token digest, installation, repository allowlist, lane, lease, and expiry.
3. The synthetic token is held in a private in-memory closure and is not returned in the worker-facing lease.
4. Gateway simulation retrieves the token internally, verifies the CLA/token binding, recomputes the reviewed GitHub request fingerprint, and signs an EDR with its independent key.
5. Ledger simulation verifies the CLA without token access, verifies EDR signature and bindings (including canonical URL hash), and rejects duplicate dispatch IDs in an in-memory set.

## Covered adversarial cases

- caller-supplied alternate installation scope is ignored; signed CLA controls installation identity;
- synthetic token substitution rejected by digest binding;
- repository outside CLA allowlist rejected;
- unreviewed URL path and operation rejected;
- EDR payload tampering rejected by signature verification;
- receipt/request URL mismatch rejected by canonical URL hash binding;
- duplicate dispatch replay rejected by the harness;
- uncertain outcome remains uncertain and carries no HTTP response status.

## Evidence boundary and known gaps

This is a unit/in-memory harness only. Its in-memory replay set is **not** proof of transactional Durable Object replay protection, crash safety, or multi-isolate/independent-host atomicity. It does not establish actual Cloudflare service-binding topology, key custody, revocation propagation, or that a production egress gateway attached the exact Authorization header to a real network request. No live provider request was made.

The existing verifier test suites plus this harness are included in the branch workflow, but latest-head CI for the current branch was not visible through the available workflow-run/status read actions at audit time. Therefore no passing CI claim is made for this head. Exact-head CI must be independently confirmed before this increment can be accepted.

## Next required engineering gates

1. Confirm exact-head CI on the latest branch commit.
2. Integrate asynchronous CLA/EDR verification into the actual Quota Ledger Durable Object before identity lookup or mutation.
3. Implement transactional single-use dispatch replay consumption in the Durable Object.
4. Apply CLA/EDR/maintenance-service authorization to every quota action; no action may bypass the trust boundary.
5. Add concurrency, crash/restart, stale lease/fencing, and uncertain-recovery tests.
6. Only after local/runtime gates pass, design owner-approved independent-host proof. No deployment or live request is authorized by this report.

## Mission safety state

- PR #26 remains Draft/Open/Unmerged.
- Authorized spend: ₹0.
- Production credentials or private keys: none created or accessed.
- Cloudflare deployment: none.
- Live GitHub provider requests: none.
- AI inference/billing/payment/fund movement: none.
