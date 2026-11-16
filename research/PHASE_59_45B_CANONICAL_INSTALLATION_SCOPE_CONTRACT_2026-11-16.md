# Phase 59.45B — Canonical installation-wide quota scope contract

Date: 2026-11-16
Mission: P59-003 only
Base master HEAD: 5f79bd9d72e272205d55c0dbb55eb9af513a6595
Implementation branch: phase59-45b-canonical-installation-scope

## Status

**Implementation committed to the feature branch; exact-head CI is pending. Not merged. Not production-enabled.**

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
- Workflow definition includes `phase59-45b-canonical-installation-scope` in its push branch filter.
- GitHub Actions exact-head run has not yet been observed through the available run evidence.
- No test pass is claimed until exact-head CI completes.
- Existing test runtime uses synthetic installation IDs and one local Miniflare shared namespace. It cannot establish independent physical-host or cross-run production atomicity.

## Remaining Phase 59.45 gates

- [ ] Exact-head Workers/workerd runtime CI passes.
- [ ] All relevant quota/federation regression workflows pass.
- [ ] Verify every production GitHub quota entrypoint uses the shared validator.
- [ ] Verify token refresh does not create a new quota partition.
- [ ] Independent GitHub-hosted runner A and B contend against one owner-approved deployed Durable Object namespace.
- [ ] Crash/replay/lease/fencing/uncertain-recovery scenarios pass against that same shared durable namespace.
- [ ] No oversubscription under a deliberately constrained shared test budget.
- [ ] Owner-approved zero-billing deployment path and least-privilege GitHub App installation are independently verified before any real shared namespace proof.

## Safety boundary

No GitHub App was created or installed. No private key, token, secret, or credential was generated or accessed. No Cloudflare deployment, live GitHub provider request, AI inference, billing, public release, payment, signing, or fund movement occurred. Authorized spend remains ₹0.

P59-003 remains the sole active P0 and IN_PROGRESS. P59-001 remains PAUSED. P59-002 remains BLOCKED.
