# Phase 59.56 — synthetic cross-repository installation quota proof

**Mission:** P10CR / P59-003 only  
**Branch:** `phase59-56-synthetic-global-quota-proof`  
**Base:** PR #40 branch `phase59-54-deterministic-shadow-ledger-path-master-sync` at `e2b7fe6fc9be2c68628d1b4fd072fc3fa86d8d6d`  
**Status:** implementation corrected after first CI failure; exact-head CI retry pending  
**Spend:** ₹0  
**AI inference:** disabled  
**Live provider calls:** 0  
**External provider network requests:** 0  
**Production feature flags:** OFF

## Objective

Prove that separate synthetic repository clients and distinct workflow-run envelopes share one installation-scoped quota partition, without contacting or modifying any real secondary repository. Keep the provider quota ledger separate from the project-cell task/run ledger.

## Implementation

- `cloud/swarm/cross-repository-quota-worker.mjs`: strict test-only SHADOW worker with a fixed per-worker repository/project identity, HMAC-authenticated quota client and injected mock GET response. It has no global fetch, publisher, model, account or write capability.
- `cloud/swarm/worker-tests/phase59-56-cross-repository-global-quota.test.mjs`: two service-isolated worker identities, two synthetic repository/project identities, four distinct run-envelope IDs and a 16-request contention burst against one shared installation-scope Durable Object.
- `schemas/phase59-56-cross-repository-quota-envelope-v1.schema.json`: strict synthetic envelope schema.
- `cloud/swarm/worker-tests/vitest.config.mjs`: adds two isolated service workers and distinct HMAC caller identities, both bound to the same quota Durable Object namespace and same synthetic installation scope.
- `.github/workflows/phase59-56-global-quota-proof.yml`: read-only, bounded CI workflow.

## Required assertions

1. Both synthetic repository clients resolve to the same quota object identity because provider + installation credential scope + quota-window key are shared; repository, worker and run IDs do not create separate quota budgets.
2. Sixteen concurrent attempts across two repository identities and four run-envelope IDs cannot exceed the shared endpoint budget of two.
3. Excess requests fail closed before the mock provider is invoked.
4. A retry in a later run with the same repository/task idempotency key is suppressed before the mock provider is invoked again.
5. All admitted mock requests settle; reserved and uncertain quota units return to zero.
6. Provider reset windows remain separately accounted under the same installation identity.
7. No real repository URL is used; all provider responses are injected; external provider requests remain zero.

## Evidence boundary

This is a synthetic workerd/service-binding proof in one CI runtime. It is **not** proof of separate GitHub Actions workflow processes sharing a hosted production Durable Object, independent physical hosts, a real GitHub App installation, account-wide GitHub Actions minutes, or production deployment. Those remain owner-gated hosted/multi-host acceptance gates. No other project repository is read or modified.

## Mission state

- P59-003 remains the sole active P0.
- P59-001 remains PAUSED.
- P59-002 remains BLOCKED.
- ₹0 spend; AI inference disabled; production flags OFF.
- No KYC, legal acceptance, publication, billing, payment, signing or money movement.

## Next

After exact-head CI and continuity guard verification, proceed to Phase59.57: separate read-only compute workers from one constrained, deterministic publisher. The publisher may prepare an allowlisted PR only; it must never merge. Do not activate production or resume P59-001.


## Initial CI failure and correction

- Push workflow run [#44011529268](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44011529268) failed before tests started.
- PR workflow run [#44011562986](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44011562986) failed for the same module-resolution error.
- Exact failure: workerd rejected `../quota-ledger-client.mjs` from the test worker module because the service worker `rootPath: "../"` resolves `cross-repository-quota-worker.mjs` at the `cloud/swarm/` root.
- Correction: import changed to `./quota-ledger-client.mjs`, matching the resolved worker module root. No quota policy, namespace, permissions or production flag was changed.
- Retry status: pending; the previous failure remains preserved as evidence.
