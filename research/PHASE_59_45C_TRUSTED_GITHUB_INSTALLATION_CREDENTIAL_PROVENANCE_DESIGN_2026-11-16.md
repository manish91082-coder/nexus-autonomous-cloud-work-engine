# Phase 59.45C — Trusted GitHub installation credential provenance design

Date: 2026-11-16
Mission: P10CR / P59-003 only
Status: DESIGN BASELINE — NOT IMPLEMENTED, NOT DEPLOYED, NOT OWNER-APPROVED
Parent: Phase 59.45B canonical installation-scope contract
Current implementation branch: phase59-45b-canonical-installation-scope
Current branch head at design start: 674f20673f3ffc3ea7cb8b15d822def4279dd18a

## 1. Objective

Prevent any quota caller from choosing, spoofing, or changing the GitHub App installation identity used for the global quota partition. The installation identity must be derived from independently authenticated credential provenance, not from caller input or an environment string that a caller can freely choose.

The invariant is:

`quotaPartition = (provider="github", installationId=verifiedCredential.installationId, providerWindow)`

Repository, workflow run, worker, caller, token rotation, token fingerprint, and request ID must not change the installation partition. A different authenticated installation must produce a different partition.

## 2. Existing evidence and gap

- `quota-ledger-client.mjs` currently accepts `credentialScope` as a function argument, validates only its string format, and uses it to select the Durable Object namespace before sending the authenticated RPC.
- `read-only-swarm-worker.mjs` currently reads `NEXUS_QUOTA_CREDENTIAL_SCOPE` from its Worker environment and forwards it. This is configuration, not cryptographic proof that the GitHub token used for the provider request belongs to that installation.
- The Durable Object independently validates the same canonical string, but it does not verify a signed statement binding the string to the actual credential.
- Existing internal HMAC caller authentication authenticates the Worker-to-ledger RPC caller and protects replay/tampering. It does not establish GitHub App installation identity.
- The governance packet proposes separate Compute and Publisher GitHub Apps, but both are PREPARED only. No App exists or is installed for this project, and no real token or private key is available or authorized.
- The current Phase 59.44 worker uses synthetic provider responses and performs zero external network requests.

## 3. Trust-boundary design

### 3.1 Trusted token broker

A dedicated token broker is the only component allowed to hold the GitHub App private key for the relevant App. It must:
1. Load its installation ID from owner-controlled server-side configuration, not from a worker request.
2. Authenticate as the GitHub App and verify the configured installation identity against GitHub's App installation resource before minting a token.
3. Request an installation access token for the fixed installation and explicit repository/permission allowlist.
4. Never accept an installation ID, repository list, or permission expansion from an untrusted caller.
5. Return the short-lived token to the authorized compute/publisher lane and a signed provenance assertion.
6. Keep the private key and provenance-signing private key isolated from all swarm workers and model prompts.

The token broker is not implemented or provisioned in this phase. No credentials are created or requested.

### 3.2 Signed credential provenance assertion

Use a compact signed assertion with an asymmetric signature (proposed ES256 / P-256) so callers can verify but cannot mint or modify provenance. The private signing key exists only in the token broker. The Durable Object receives only the pinned public verification key set, with key IDs and explicit rotation policy.

Required claims:
- `iss`: fixed broker identity.
- `aud`: fixed quota-ledger audience.
- `sub`: fixed GitHub App identity / App ID.
- `installation_id`: positive numeric installation ID obtained from the broker's trusted installation configuration and verified App installation response.
- `repository_ids`: exact repository IDs permitted for this token, sorted and unique.
- `permissions`: exact token permissions, no broader than the approved Compute or Publisher policy.
- `token_sha256`: SHA-256 digest of the exact installation token returned to the caller; never include the token itself in the assertion.
- `issued_at`, `expires_at`: bounded by the installation token expiry and short assertion TTL.
- `jti`: unique assertion ID for audit/replay handling.
- `credential_lane`: `compute_readonly` or `publisher_restricted`.

Do not include private keys, raw tokens, passwords, OTPs, cookies, or recovery codes in logs, artifacts, model context, or Durable Object state.

### 3.3 Caller-side derivation

Replace caller-supplied `credentialScope` with:
- the provider `Request` containing its Authorization bearer token;
- the signed provenance assertion from the broker.

The shared quota client must:
1. Extract the bearer token in memory without logging or persisting it.
2. Verify assertion signature, issuer, audience, expiry, allowed algorithm, key ID, and required claims using the pinned public key set.
3. Compute SHA-256 of the exact bearer token and compare it to `token_sha256`.
4. Confirm the request is for the repository and permission lane allowed by the assertion.
5. Derive `credentialScope = github-app-installation:<verified installation_id>` internally. No public argument or environment override may set it.
6. Use the derived scope to select the Durable Object namespace and construct the signed ledger RPC.
7. Fail closed before any provider request if proof is missing, malformed, expired, mismatched, or unsupported.

The token fingerprint is only a binding check. It must not be used as the quota partition key.

### 3.4 Durable Object independent verification

The Durable Object must not trust the caller's derived string alone. For every quota mutation:
1. Authenticate the existing internal caller HMAC as today.
2. Verify the signed provenance assertion independently against its own pinned public key set.
3. Recompute the canonical scope from the verified installation ID.
4. Require the supplied ledger identity to equal that derived scope.
5. Enforce assertion expiry and approved lane/permissions/repository policy for the action.
6. Bind reservation ownership to both the authenticated internal caller and the verified installation identity.
7. Reject before mutation on any mismatch.

The object name is derived from the verified canonical scope. Since a Durable Object request needs a namespace lookup before the DO can verify the assertion, the client must perform signature verification before namespace lookup, and the DO must repeat verification at the mutation boundary. This is defense in depth, not a trust transfer.

## 4. Rotation and identity rules

- A new installation token for the same App installation must retain the same quota partition.
- Token hash changes on rotation; installation ID does not.
- App key rotation must support a bounded overlap of pinned `kid` values and a documented retirement point.
- An installation transfer/reinstallation that changes installation ID is a distinct quota identity and requires explicit owner review.
- Repository selection or permission reduction may change token claims, but must not create a new installation quota partition.
- Expired or revoked tokens/provenance must fail closed. No automatic fallback to a caller-provided scope.

## 5. Threat model and required negative tests

| Threat | Required control / test |
|---|---|
| Caller supplies another valid numeric installation ID | Rejected because no matching broker signature |
| Caller changes installation ID inside assertion | Signature verification fails |
| Caller substitutes another token | token SHA-256 mismatch |
| Token rotates for same installation | same quota object name; different token digest accepted only with fresh broker assertion |
| Assertion expired or not yet valid | rejected before namespace lookup/provider fetch |
| Wrong issuer/audience/algorithm/kid | rejected |
| Assertion for another repository | rejected before provider fetch |
| Publisher assertion used by compute worker or vice versa | lane/action policy rejection |
| Caller modifies assertion after internal RPC signing | RPC HMAC and broker signature both fail |
| Replay of old assertion | bounded expiry plus assertion jti policy; quota request replay protection remains independently enforced |
| Broker signing key compromise | revoke kid, rotate key, fail closed; do not silently trust a new key |

## 6. Required code changes (implementation plan)

1. Add a small pure provenance contract module with strict claim schema, canonical base64url parsing, algorithm allowlist, claim bounds, and deterministic scope derivation.
2. Add ES256 verification using WebCrypto; reject `none`, algorithm confusion, unknown `kid`, malformed signatures, duplicate/unknown critical headers, and non-canonical claim forms.
3. Add token fingerprint binding against the exact Authorization bearer token in the request.
4. Change the common quota client API to accept provenance, not a free-form scope.
5. Include the signed assertion in the internal ledger RPC payload; do not include the raw provider token.
6. Verify provenance again inside Durable Object before all mutation/snapshot paths.
7. Remove `NEXUS_QUOTA_CREDENTIAL_SCOPE` as an identity source from the shadow worker; synthetic tests must use generated test-only signing keys and explicit fixture tokens.
8. Update all callers, fixtures, tests, schemas, and research records. Search all repository callsites before deleting the old argument.
9. Add test-only token broker fixture. It must be clearly marked synthetic and must never issue a real GitHub token.
10. Update governance documentation to distinguish design-only proof from actual App/token deployment.

## 7. Acceptance gates

- No caller-controlled installation ID remains in production quota entrypoints.
- Every GitHub quota path derives scope from verified broker provenance.
- Durable Object independently verifies the signed assertion.
- The exact Authorization token digest matches the assertion.
- Same-installation token rotation preserves quota identity.
- Cross-installation spoofing and token substitution fail before provider network access and before quota mutation.
- Expired, revoked, wrong-audience, wrong-repository, wrong-lane, unknown-key, malformed, and replayed assertions fail closed.
- All Workers/workerd and existing quota/federation regressions pass on exact HEAD.
- No production credentials, App creation/installation, live provider requests, deployment, billing, inference, or spend occurs without a separate owner-approved gate.

## 8. Explicit limitations

This design does not establish that a GitHub App is created, installed, or operating. It does not prove live credential provenance until a future owner-approved token broker is provisioned and independently tested. Synthetic signing keys prove code behavior only, not real-world key custody, broker isolation, GitHub token authenticity, or hosted global atomicity.

## 9. Safety and mission status

- Authorized spend: ₹0.
- Live GitHub provider requests by the swarm: 0.
- Production deployment: none.
- GitHub Apps created/installed: none.
- Private keys/tokens/secrets accessed or generated: none.
- P59-003 remains sole active P0.
- P59-001 remains PAUSED.
- P59-002 remains BLOCKED.
- Phase 59.45B exact-head CI is green at `674f20673f3ffc3ea7cb8b15d822def4279dd18a` (14/14 checks); PR #26 remains open, draft, unmerged.
