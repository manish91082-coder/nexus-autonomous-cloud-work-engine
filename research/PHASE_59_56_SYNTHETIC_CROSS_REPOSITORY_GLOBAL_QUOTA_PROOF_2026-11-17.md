# Phase 59.56 — synthetic cross-repository installation quota proof

**Mission:** P10CR / P59-003 only  
**Branch:** `phase59-56-synthetic-global-quota-proof`  
**Base:** PR #40 branch `phase59-54-deterministic-shadow-ledger-path-master-sync` at `e2b7fe6fc9be2c68628d1b4fd072fc3fa86d8d6d`  
**Status:** synthetic Workers/workerd proof PASS at exact code commit; hosted cross-run and independent-host proof still pending  
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

## Exact-head CI result

- Tested code SHA: `cabdd9d2bfbb993f0e68093c9ce5130d9f70b810`.
- Push workflow [#44012476170](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44012476170): SUCCESS.
- PR workflow [#44012482615](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44012482615): SUCCESS.
- Complete Workers/workerd suite: **3 test files passed, 76/76 tests passed**; Phase59.56 file 2/2.
- Mission Continuity Guard [#44012476152](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44012476152): SUCCESS.
- Mission Autonomous AI Worker [#44012476114](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44012476114): SUCCESS; selected P59-003; executor returned `WAITING_FOR_OWNER_CONFIGURATION`; inference requests 0.
- Burst result: 16 attempts; 2 admitted and settled; 14 rejected before provider fixture; 2 mock provider calls; 0 residual reserved units; 0 residual uncertain units; 1 later-run duplicate suppressed with 0 additional provider calls; 2 provider reset windows accounted after the first window elapsed.

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


## Second CI failure and diagnostic correction

- Push run [#44011679218](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44011679218) and PR run [#44011686715](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44011686715) started workerd successfully; existing 74 tests passed, while both new Phase59.56 tests failed.
- First assertion failure: no request was classified as `SHADOW_COMPLETED`; the test did not expose the worker's safe rejection/admission reason. The worker now emits a bounded, non-secret diagnostic reason and quota admission status in the synthetic fixture, and the assertion includes response summaries.
- Second assertion failure was a test-model error, not a production ledger defect: the ledger intentionally refuses to accept a future provider reset window until the current reset time has elapsed. The test now uses a five-second synthetic window and waits for that reset before recording the next window.
- No production quota policy or fail-closed control was weakened. Exact-head retry pending.


## Third test-model correction

The second CI log showed the cross-repository workers were receiving a synthetic response reset timestamp (4102444800) later than the seeded authoritative telemetry window. The ledger correctly retained the current provider window and did not accept that future-window response before reset. The cross-repository test now seeds the same synthetic reset timestamp as the injected provider response, so response telemetry remains in the same provider window. The independent reset-rollover test still verifies that a genuinely new window is accepted only after the old reset elapses. Exact-head retry pending.


## Third CI diagnostic evidence

- Run [#44012088385](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44012088385) reached the test assertions. Seventy-five tests passed; the one cross-repository test failed because the two admitted requests returned `RESPONSE_RECEIVED_ACCOUNTING_UNCERTAIN` and the remaining requests saw `SECONDARY_CONCURRENCY_LIMIT`.
- This proves the shared installation-scope concurrency gate is active, but does **not** yet prove successful response settlement or budget release. The worker now surfaces bounded telemetry/settlement/uncertainty status and a non-secret error reason to identify the exact accounting transition.
- The reset-window rollover test passed after the elapsed-window correction.
- Do not accept the quota proof until two admitted mock requests settle, residual reserved/uncertain units are zero, and a later-run replay is suppressed.


## Zero-cost hosting feasibility — official Cloudflare evidence (17-Nov-2026)

The hosted Durable Object design can remain zero-spend **only if the owner account is confirmed on Workers Free and the workload stays within free limits**. The repository test is not a live deployment or proof of the owner's current account plan.

Official primary sources:

- [Durable Objects concepts](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/): each object has a globally unique name, can be addressed from anywhere, and has strongly consistent durable storage; the object is single-threaded.
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/): Free plan supports SQLite-backed Durable Objects; 100,000 DO requests/day, 13,000 GB-s/day, 5 million SQL rows read/day, 100,000 rows written/day and 5 GB total SQLite storage. Exceeding a Free-plan daily limit causes further operations of that type to fail. Daily free limits reset at 00:00 UTC.
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/): Workers Free includes 100,000 requests/day and 10 ms CPU per invocation.
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): Workers Paid has a $5/month minimum. This mission must not switch to Paid or use a paid fallback.

### Derived engineering budget

A successful provider request currently uses at least three Durable Object RPC calls (reserve, response-header telemetry, settle). Therefore 100,000 free DO requests/day yields a theoretical ceiling of about 33,333 successful provider requests/day before snapshots, lease heartbeats, retries, other workflows, failed attempts or additional ledger operations. This is an arithmetic upper bound, not a throughput promise. A single installation-scoped DO is intentionally a serialized hot key for correctness; rate and latency soak must validate the practical ceiling.

### Owner-only pre-deployment gate

Before any live Worker/DO deployment, the owner must verify the account is on Workers Free, SQLite-backed DOs are enabled, no Paid plan or paid add-on is active, the current free quotas are visible, and an account spending/usage control is configured where available. If the account is Paid or free-plan status cannot be confirmed, deployment remains OFF. No credentials, payment method or account secrets are requested in chat.

## Evidence boundary

The successful CI run proves shared installation-scope partitioning across two service-isolated synthetic workers in one workerd runtime, not two independent GitHub Actions workflow processes or separate physical hosts. The later-run retry is represented by a distinct run envelope in the same test runtime. Hosted cross-run, multi-host, live Cloudflare DO, real GitHub App installation, and 7/30-day soak remain unverified.
