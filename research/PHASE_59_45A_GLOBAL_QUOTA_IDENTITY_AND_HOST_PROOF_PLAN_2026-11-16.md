# Phase 59.45A — Global quota arbiter identity and independent-host proof plan

Date: 2026-11-16
Mission: P59-003 only
Base master HEAD: 5f79bd9d72e272205d55c0dbb55eb9af513a6595
Branch: phase59-45-global-quota-arbiter-proof

## Decision

**Phase 59.45 is IN PROGRESS. Global quota arbitration is NOT YET PROVEN.**

This report records a source-level audit and a falsifiable acceptance plan. It does not claim production deployment, cross-run atomicity, independent-host execution, or a completed swarm.

## Verified Phase 59.44 baseline

- Phase 59.44 PR #23 is merged at `b3978bf0c8d4fda01d4bcbfdcf233cee37ae46e7`.
- Exact merge-head Workers/workerd runtime CI #122 (run 43797041059) passed 62/62.
- Final control checkpoint `9cdc16a28e9bd958cb5eec78548e464988123e10` passed Mission Continuity Guard #244 (run 43797448153; 111 checks, zero errors) and Mission Autonomous AI Worker #444 (run 43797448076; POLL_OK selected P59-003).
- Worker #444 reported WAITING_FOR_OWNER_CONFIGURATION and no inference request.
- The Phase 59.44 shadow worker uses synthetic provider responses and reports zero external network requests. It is a local Workers/workerd service-binding integration test, not a deployed global arbiter.

## Source-level findings

### 1. Object identity is derived from three values

`cloud/swarm/quota-ledger-client.mjs` calls:

```js
const name = quotaLedgerObjectName(
  input.provider,
  input.credentialScope,
  input.windowId
);
const stub = binding.get(binding.idFromName(name));
```

`quotaLedgerObjectName` is implemented in `cloud/swarm/quota-ledger-contract.mjs` as a serialization of exactly those three values. The Durable Object then binds its stored `provider`, `credential_scope`, and `window_id` identity in `#assertIdentity`.

This gives deterministic routing only when every caller supplies the same canonical values and uses the same Durable Object namespace. It does not, by itself, prove that separate deployed Worker scripts, GitHub Actions runs, or repository clients share one namespace.

### 2. Installation-scope validation is not universal

The Phase 59.44 shadow Worker checks that its trusted `NEXUS_QUOTA_CREDENTIAL_SCOPE` starts with `github-app-installation:`. The shared quota client and Durable Object identity contract accept a non-empty credential scope, but do not independently establish that it is a canonical GitHub App installation ID rather than a token-, repository-, or caller-specific scope.

Therefore, a caller misconfiguration can create a separate Durable Object identity and split accounting. The installation-wide scope convention must become a shared, fail-closed contract at the common admission boundary, not merely a convention in one Worker.

### 3. Existing runtime test topology is one local Miniflare namespace

`cloud/swarm/worker-tests/vitest.config.mjs` defines one `sharedQuotaNamespace` and binds the quota host, secondary caller, and shadow Worker to that namespace inside one Cloudflare Vitest/Miniflare test configuration.

This is useful service-binding and SQLite Durable Object integration evidence. It is not independent physical-host evidence and is not proof across separate GitHub Actions runs or deployed Worker scripts.

### 4. Deployment and owner gates remain closed

The Phase 59.44 report records no real GitHub App installation, no deployed shared Durable Object namespace, no live provider request, no inference, and no spend. The least-privilege App packet is PREPARED, NOT APPROVED, NOT CREATED, and NOT INSTALLED. Repository branch protection is UNVERIFIED because the connected integration could not read it.

## Required Phase 59.45 work sequence

1. **Canonical installation identity contract**
   - Define one canonical `github-app-installation:<numeric-installation-id>` scope.
   - Exclude repository ID, repository name, run ID, worker ID, token ID, token fingerprint, and caller ID from the quota partition key.
   - Validate the canonical form in the shared quota client and at the Durable Object boundary for GitHub provider requests.
   - Keep token identity and caller identity as audit/authentication attributes, never as quota partition dimensions.
   - Reject malformed, personal-token, repository-scoped, or ambiguous scopes before quota mutation.

2. **Cross-client deterministic routing tests**
   - Two independent client configurations representing different repositories and separate runs must resolve the same object name for the same installation and provider window.
   - Different installation IDs must resolve different object names.
   - Different provider reset windows must remain separately accounted without changing the stable installation namespace identity.
   - Tests must demonstrate that changing repository/run/token/caller metadata cannot change the partition key.

3. **Independent-host contention harness**
   - Use two separately scheduled GitHub Actions jobs/runners, not merely two promises or Workers in one Miniflare process.
   - Both hosts must target the same already-deployed Durable Object namespace and the same installation scope.
   - Contend for a deliberately small synthetic quota budget; assert no oversubscription, exactly one winner when capacity allows one reservation, and durable duplicate suppression.
   - Capture per-host run IDs, reservation IDs, object-scope fingerprints, authoritative test-fixture IDs, and append-only evidence.
   - Add crash-after-reserve, crash-after-provider-response, duplicate delivery, stale lease/fencing, uncertain retention, and recovery scenarios.

4. **Hard deployment gate**
   - Independent-host production-like proof cannot be honestly completed with an in-process Miniflare namespace alone.
   - A real shared Durable Object namespace requires an owner-approved zero-billing Cloudflare deployment path and verified configuration. Until then, only contract/harness tests may run; global atomicity remains UNPROVEN.
   - No Cloudflare deployment, GitHub App creation/installation, key generation, secret configuration, paid service, live provider request, inference, public release, or money movement is authorized by this phase.

5. **After arbiter acceptance**
   - Continue compute/publisher separation.
   - Then integrate durable execution and the specialist graph into the P10CR dispatcher.
   - Only later run the 7-day and 30-day soak gates.
   - Do not resume P59-001 revenue-source research until P59-003 acceptance gates pass.

## Acceptance criteria

- [ ] One canonical installation scope parser/validator used by every GitHub quota admission path.
- [ ] Partition-key invariance tests pass across repository/run/token/caller metadata.
- [ ] Isolation test proves distinct installation IDs cannot share a ledger.
- [ ] Reset-window rollover tests preserve old-window reservations and uncertain outcomes.
- [ ] Independent GitHub-hosted runner A and runner B contend against the same deployed Durable Object namespace.
- [ ] Crash/replay/fencing/uncertain-recovery evidence passes.
- [ ] No quota oversubscription under the defined test budget.
- [ ] Exact-head CI and mission continuity guard pass.
- [ ] Owner approval and zero-billing deployment evidence exist before any real shared namespace test.

## Current truthful status

- Phase 59.44: MERGED; 62/62 exact merge-head runtime tests.
- Phase 59.45: IN PROGRESS; source-level audit and proof plan recorded here.
- Global installation-wide quota atomicity: UNPROVEN.
- Independent physical-host proof: NOT RUN.
- Production deployment / live provider calls / AI inference: DISABLED.
- P59-003: IN_PROGRESS and sole active P0.
- P59-001: PAUSED.
- P59-002: BLOCKED.
- Verified realized net receipts: ₹0.
- Authorized spend: ₹0.
