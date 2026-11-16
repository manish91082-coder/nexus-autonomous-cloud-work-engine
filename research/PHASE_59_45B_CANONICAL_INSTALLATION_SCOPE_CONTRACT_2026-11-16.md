# Phase 59.45B — Canonical installation-wide quota scope contract

Date: 2026-11-16
Mission: P59-003 only
Base master HEAD: 5f79bd9d72e272205d55c0dbb55eb9af513a6595
Implementation branch: phase59-45b-canonical-installation-scope

## Status

**Implementation committed to the feature branch; exact-head CI PASS (14/14 checks). PR #26 remains open, draft and unmerged. Not production-enabled.**

This is the first hardening slice of Phase 59.45. It does not prove independent-host atomicity or a deployed global arbiter.

## Changes

1. Added `validateGitHubInstallationScope(provider, credentialScope)` to the shared quota contract.
2. For GitHub, the accepted partition identity is now exactly `github-app-installation:<positive numeric installation ID>`, with a bounded 1–20 digit positive identifier.
3. Enforced the validator in:
   - `quotaLedgerObjectName`, before Durable Object namespace lookup;
   - `validateQuotaRequest`, before reservation processing;
   - the common `executeQuotaGuardedGitHubRequest` client, before provider work;
   - Durable Object `#assertIdentity`, as a server-side boundary.
4. Replaced repository-/token-like synthetic test scopes with numeric installation fixture IDs.
5. Added contract tests for valid and invalid identities, cross-client partition invariance, and isolation between distinct installations.
6. Added the feature branch to the Workers/workerd runtime workflow trigger.

## Intended invariant

For the same GitHub App installation and the same ledger window, repository ID/name, GitHub Actions run ID, worker ID, caller ID, access-token ID, and token fingerprint must not alter the quota partition key.

Different installation IDs must resolve to different partitions. Provider reset-window accounting remains represented by the ledger's provider-window bucket identity; it must not be conflated with the installation identity.

## Validation status

- Source changes were re-fetched from the feature branch after writes.
- Workflow definition includes `phase59-45b-canonical-installation-scope` in its push branch filter and includes `cloud/swarm/*.test.mjs` in the path filter.
- Exact-head CI at `674f20673f3ffc3ea7cb8b15d822def4279dd18a` completed with 14/14 check-runs successful, including Workers runtime.
- Earlier head `637f4309fdde0279dcaa99587c0d232e6241ad46` had a legacy adapter fixture mismatch; the fixture was corrected and `adapter-contract` passed on the current head.
- This CI proves repository test behavior only. It does not prove authenticated credential-to-installation binding or independent-host atomicity.
- Existing test runtime uses synthetic installation IDs and one local Miniflare shared namespace. It cannot establish independent physical-host or cross-run production atomicity.

## Additional security gap discovered during review

The syntax validator proves that a caller supplied a string in the canonical format; it does **not** prove that the numeric installation ID is the installation actually represented by the authenticated GitHub credential. A compromised or misconfigured trusted caller could still select another syntactically valid installation ID and create a separate quota partition.

Phase 59.45C must bind the quota scope to independently verified installation identity from trusted server-side configuration/credential provenance. The caller must not be able to select or override the installation ID. Token rotation for the same installation must preserve the same scope. Until this binding is implemented and tested, the canonical scope contract is necessary but not sufficient for tenant isolation or global budget correctness.

## Remaining Phase 59.45 gates

- [x] Exact-head Workers/workerd runtime CI passes at head `674f20673f3ffc3ea7cb8b15d822def4279dd18a` (14/14 exact-head check runs successful, including Workers runtime).
- [x] All relevant quota/federation regression workflows pass at the same exact head (included in the 14/14 successful checks).
- [ ] Phase 59.45C: bind quota scope to independently verified credential provenance; remove caller-controlled installation ID from all quota entrypoints.
- [ ] Verify token refresh does not create a new quota partition using signed broker provenance.
- [ ] Independent GitHub-hosted runner A and B contend against one owner-approved deployed Durable Object namespace.
- [ ] Crash/replay/lease/fencing/uncertain-recovery scenarios pass against that same shared durable namespace.
- [ ] No oversubscription under a deliberately constrained shared test budget.
- [ ] Owner-approved zero-billing deployment path and least-privilege GitHub App installation are independently verified before any real shared namespace proof.

## Safety boundary

No GitHub App was created or installed. No private key, token, secret, or credential was generated or accessed. No Cloudflare deployment, live GitHub provider request, AI inference, billing, public release, payment, signing, or fund movement occurred. Authorized spend remains ₹0.

P59-003 remains the sole active P0 and IN_PROGRESS. P59-001 remains PAUSED. P59-002 remains BLOCKED.
