# Phase 59.61 — Account-Scope Budget Integration into Durable Mission Dispatcher

**Date:** 19-Nov-2026  
**Mission:** P59-003 only — AI agentic swarm foundation  
**Status:** CODE + WORKERD INTEGRATION PASS; DRAFT PR; PRODUCTION OFF

## 1. Decision and scope

Phase59.60 supplied a fixed-name, account-scope platform budget Durable Object with atomic multi-resource reservations, cross-run idempotency, fencing/lease-version heartbeat, expiry-to-UNCERTAIN and a SHA-256 event journal. Phase59.61 wires that budget into the P10CR durable mission dispatcher.

The dispatcher now fails closed if the platform budget namespace is absent or disabled. It does not register or claim a durable task until a budget reservation is accepted. It settles only after the specialist result checkpoint, durable completion and final event-chain/readback verification.

No revenue-source research, product ranking, unrelated project work, production deployment or public release was performed.

## 2. Integrated protocol

1. Validate the bounded, HMAC-authenticated P10CR/P59-003 shadow envelope.
2. Canonicalize the untrusted payload and compute payload and policy SHA-256 hashes.
3. Derive a stable execution ID from task ID, payload hash and policy hash. Workflow-run ID is attribution only, so a retry from another run reuses the same reservation.
4. Reserve the fixed server-owned resource vector for canonical repository, project P10CR, task P59-003, phase P59.61 and operation `p10cr.shadow.dispatch.v1`.
5. On budget denial, missing budget configuration or uncertain reservation, stop before task registration/claim.
6. Register the durable task idempotently; inspect the task and lease state.
7. Renew the platform-budget lease immediately before the durable claim. The current lease version is carried into settlement.
8. Claim with the existing SwarmRunDO atomic lease/fencing protocol; run the deterministic ten-role specialist graph only.
9. Persist the graph checkpoint, complete the task and read back the final task record and event-chain validity.
10. Settle the budget reservation only after the durable completion readback. Verify the budget event chain and reservation status after settlement.

### Ambiguous outcomes

- A lost/ambiguous reservation response does not permit dispatch; retry uses the same stable execution ID.
- A simulated hard process death after a durable graph checkpoint leaves the reservation untouched, matching real isolate termination.
- A retry within the reservation lease reuses the same reservation and durable checkpoint, obtains a higher SwarmRun fencing token and does not rerun the graph.
- An ambiguous settlement acknowledgement is resolved by idempotent reservation readback. If the settlement actually committed, the next attempt observes SETTLED and suppresses duplicate execution.
- Errors after reservation but before a known final result are conservatively marked UNCERTAIN where the process is still alive. Uncertain resource allocations are never released automatically.
- If a reservation has expired to UNCERTAIN, dispatch remains blocked. No unsafe replay or automatic budget release is attempted.

## 3. Capability and identity boundary

The dispatcher now requires both `SWARM_RUNS` and `PLATFORM_BUDGET` bindings.

Its platform-budget caller policy is limited to:
- reserve
- heartbeat
- settle
- snapshot

It has no `testReset`, owner-approval, repository-write, publisher, public-release, payment, billing, KYC or money-movement capability.

The worker still has:
- model inference: false
- generated-code execution: false
- external provider/network calls: false
- repository write: false
- publication: false
- payments: false

The ten specialist roles remain deterministic typed stages returning HOLD for unverified inputs. They are not live LLM agents.

## 4. Exact runtime tests

### Dedicated Phase59.61 suite

GitHub Actions run **44453046636**:
- [Open exact workflow run](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44453046636)
- PR merge ref tested: `f0f97364a454a66fbf79fa3e49b73f07572d8e95`
- PR head/code-test commit: `bd39391cab62eb69b24d5cf5ffc76248d625225d`
- Dedicated Phase59.61 tests: **4/4 PASS**
- Full swarm runtime regression: **82/82 PASS**
- Total across the two suites: 86 passing test executions.

Dedicated test cases:
1. Reserve before registration, durable dispatch, checkpoint, final readback and settlement; duplicate delivery is suppressed; budget exhaustion returns 429 and creates no task.
2. Simulated process death after graph checkpoint; recovery reuses the checkpoint and same reservation, obtains a higher fencing token and settles once.
3. Ambiguous settlement acknowledgement; retry reads the same SETTLED reservation and does not create a second reservation.
4. Budget denial/unavailability; no durable task registration occurs.

Full regression:
- quota-ledger runtime: 68/68
- swarm-run ledger runtime: 6/6
- Phase59.56 cross-repository global quota: 2/2
- mission-dispatcher runtime: 6/6
- all four test files passed.

The dedicated suite also passed 4/4 on code head `69efe52f7ae16403c2ae28efb5f2da285b2e9ee8` in [run 44452863378](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44452863378).

### Failure and correction log

- Run 44452614997 failed before test discovery because host-service test definitions omitted their own Durable Object namespace bindings. Added explicit host namespace declarations.
- Run 44452764934 exposed the same setup issue on the PR path; corrected.
- Run 44452812382 exposed a test-harness caller identity mismatch; the direct probe now uses the restricted dispatcher identity.
- Run 44453001604 passed the new four-test suite but failed one legacy recovery test because its simulated process-death hook did not identify itself as a hard crash. The test now sets an explicit test-only `simulatedProcessCrash` marker so the code preserves the reservation exactly as a terminated isolate would.
- Final run 44453046636 passed both the dedicated suite and the complete 82-test regression. No failure was hidden or counted as a pass.

## 5. Prior phase and control-plane evidence

- Phase59.60 account-budget runtime: [run 44451450193](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44451450193), 6/6 PASS on candidate SHA `3a57698702ed173831d82ea78f3972f2c08b32c2`.
- Phase59.60 candidate Worker #521: [run 44451444030](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44451444030), SUCCESS.
- Phase59.60 candidate Guard #326: [run 44451444150](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44451444150), SUCCESS.
- Current master HEAD remains `8856bf908f93e265cefd5c739f7f46b3dd995b3c`.
- Latest master Worker #518: [run 44421599703](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44421599703), SUCCESS.
- Latest master Guard #324: [run 44287999809](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/44287999809), SUCCESS.

The Phase59.31 forensic baseline remains the source for the original workflow/runtime/security findings. Phase59.55/59.60 inventory evidence remains current for dependency and workflow concerns.

## 6. Material commits

Implementation and test commits on `phase59-61-budget-dispatcher-integration`:

- `36c4fb509cfcd557fd717a3870184baa6b305068` — budget-gated durable dispatcher
- `db5c399570fb477f43e7e968fe51c2bd64a74b73` — require budget binding in shadow Worker
- `7a507e1a6b816419e9a02b7cd803dd9bfbbdceea` — authorize P59.61 phase in budget DO
- `45d58eede50c32fff5bf8b5aeb40d67f32873d4b` — isolated integration config
- `e56a953dea88247dd4c573d4e74493634d960895` — Wrangler Durable Object bindings
- `fd94dd252f6d1f0107cdf2304b646be328566eb7` — four integration tests
- `407f76de7f83e55eb8e458535ea3f472fe95dccf` — dedicated workflow
- `4d021a21a5117301ddaf6ccd6e530623dadcfc00` — host Durable Object binding correction
- `ee4efe89a60da6eb24be8e48a0fa4dc6202403cb` — workflow path-filter correction
- `69efe52f7ae16403c2ae28efb5f2da285b2e9ee8` — scoped dispatcher identity in test harness
- `c20d27902713d4c27cfb0b8b8af0dbbe57df60eb` — full regression config integration
- `4f79db324c37bea636b4c0a6e197bc78ff159c4b` — platform budget binding in full-suite Wrangler config
- `23d008f09e82041c5ec083fe74eba8e2a2e14dc1` — legacy dispatcher recovery test budget RPC
- `8399e47eb93ebbf7ed555752162c21a0ad483078` — full regression workflow step
- `14ce8d601d8d5c16cd1037e5de3967ac2331a33d` — hard-process-crash test marker
- `bd39391cab62eb69b24d5cf5ffc76248d625225d` — final workflow path filters
- `fd2be94c5e0dea350a24600a55838e42242d25cb` — owner packet update

Draft PR #46: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/pull/46  
Base: `phase59-60-account-scope-platform-budget` at `3a57698702ed173831d82ea78f3972f2c08b32c2`.  
PR #46 is draft and unmerged. PR #45 and PR #44 remain draft/unmerged parents. No master write or merge occurred.

## 7. Remaining gates and limits

1. No physical independent-host proof yet. Workerd tests use a shared simulated namespace; they do not prove multi-host or cross-account deployment.
2. Cloudflare account plan and aggregate usage remain owner-unverified. No deployment or secret configuration occurred.
3. GitHub App owner installation and scoped-token test remain pending.
4. Branch protection/ruleset status remains UNVERIFIED because the integration cannot read the protection endpoint.
5. The npm package manifest still lacks a lockfile and exact dependency pins. CI installed 123 packages; npm warned that esbuild and workerd install scripts were not covered by the install-script allowlist. This is a pre-production supply-chain blocker.
6. Mutable action tags and remaining workflow permissions/timeouts from the current-head inventory still need a dedicated hardening pass.
7. 7-day and 30-day soak have not started.

No inference/provider calls, external network calls in the Workerd tests, KYC, legal acceptance, public release, billing, payments, signing, private-key access or money movement occurred.

## 8. Financial and mission state

- Authorized spend: ₹0.
- Verified Platform-Credited Net Earnings: ₹0.
- Bank-settled net receipts: ₹0.
- Withdrawable balance: ₹0.
- Revenue ledger: unchanged; no receipts fabricated.
- AI inference: disabled.
- Production feature flags: OFF.
- P59-003: IN_PROGRESS, sole active P0.
- P59-001: PAUSED.
- P59-002: BLOCKED.

## 9. Next engineering step

Phase59.62 should prepare the independent-host test harness and exact owner preflight, while closing the dependency-lockfile/action-pinning gap. The live four-runner test must remain disabled until the owner verifies an existing Workers Free account, account-wide usage and the shared P10CR Durable Object namespace. After that, perform the bounded independent-host lease/quota/fencing test, then begin the 7-day soak. The 30-day soak remains a separate acceptance gate.

Do not resume P59-001 or P59-002 until the complete P59-003 swarm acceptance gates pass.
