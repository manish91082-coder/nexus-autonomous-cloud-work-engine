# Phase 59.60 - Account-Scope Platform Budget Arbiter
Date: 2026-11-19
Task: P59-003 (sole active P0)
Status: SYNTHETIC WORKER-RUNTIME PASS; DISPATCHER INTEGRATION, LIVE ACCOUNT VERIFICATION AND PHYSICAL MULTI-HOST PROOF PENDING

## 1. Authority and checkpoint
- Canonical repository: manish91082-coder/nexus-autonomous-cloud-work-engine.
- Governing constitution: MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V5.md.
- Master HEAD at audit: 8856bf908f93e265cefd5c739f7f46b3dd995b3c.
- Candidate branch: phase59-60-account-scope-platform-budget.
- Draft PR #45 is stacked on draft PR #44; it remains open, draft and unmerged.
- Exact executable/test SHA: 06599b22f61a37d6cf09df6a234a2dfc32209736.
- Exact-head Workers/workerd CI: run 44450335146, SUCCESS, 1 test file, 6/6 tests.
- Push run 44450328625 was cancelled by the pull-request concurrency group; the exact-head PR run completed successfully.
- Master control-plane: Mission Worker #518/run 44421599703 SUCCESS and Mission Continuity Guard #324/run 44287999809 SUCCESS, both on master HEAD 8856bf908f93e265cefd5c739f7f46b3dd995b3c.

P59-001 remains PAUSED. P59-002 remains BLOCKED. P59-003 remains the sole active P0. No revenue-source/product research was restarted.

## 2. Required forensic inputs
Read:
- MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V5.md.
- PROJECT_CONTINUITY.md.
- control/mission_state.json.
- control/automation_queue.json.
- federation/PROJECT_FEDERATION_REGISTRY.json.
- research/PHASE_59_31_SWARM_FIRST_FORENSIC_AUDIT_AND_RECOVERY_2026-11-15.md.

The Phase59.31 report is a historical forensic baseline. The later Phase59.55 inventory and this current candidate-tree audit supersede its workflow counts.

## 3. Current candidate-head workflow/runtime/dependency/security inventory
Recursive Git tree: 472 entries, not truncated.
- GitHub workflow files: 34.
- Python scripts under scripts/: 18.
- Cloud swarm .mjs modules: 32 (includes test modules).
- Package manifests: 1 (cloud/swarm/worker-tests/package.json).
- Lockfiles: 0.

Workflow controls:
- Workflows with contents:write: 3:
  1. federation-lock-store.yml (lock-store branch writer).
  2. p10cr-constrained-publisher.yml (the constrained P10CR artifact publisher).
  3. phase59-25-cloud-operational-soak.yml (bounded soak/test writer).
- Workflows without an explicit timeout-minutes: 2:
  1. build-travel-revenue-demo.yml.
  2. package-recruitment-product.yml.
- Mutable action-tag workflows: 11, concentrated in legacy build/research/recruitment/bounty workflows:
  build-ai-ops-starter.yml, build-csv-to-action.yml, build-message-action-demo.yml,
  build-orbit-relay.yml, build-revenue-ops-control.yml, build-travel-revenue-demo.yml,
  nexus-bounty-agent.yml, nexus-funded-job-scan.yml, nexus-jobbi-gigs.yml,
  package-recruitment-product.yml, recruitment-browser-qa.yml.
- Secret references are present in nexus-bounty-agent.yml, nexus-funded-job-scan.yml and p10cr-constrained-publisher.yml. The bounty/funded lanes are outside P10CR and remain out of this task.
- The mission autonomous worker is read-only. The P10CR artifact publisher remains a separate, constrained draft-PR-only writer; no publisher token was installed or used.
- The new Phase59.60 workflow has contents:read, a SHA-pinned checkout, persist-credentials:false, a 15-minute timeout, a concurrency group, no secrets, no artifacts/cache and no deployment.
- Dependency reproducibility remains a blocker: the only package manifest uses unpinned/latest or range dependencies and there is no lockfile. The runtime test is isolated from the other existing Workerd suites; dependency pinning/lockfile is still required before production.
- Branch protection/ruleset status remains owner-unverified. No branch-protection bypass was attempted.

## 4. Design implemented
New files:
- cloud/swarm/platform-budget-do.mjs
- cloud/swarm/platform-budget-host.mjs
- cloud/swarm/platform-budget-rpc-client.mjs
- cloud/swarm/worker-tests/platform-budget-test-worker.mjs
- cloud/swarm/worker-tests/platform-budget.wrangler.jsonc
- cloud/swarm/worker-tests/platform-budget.vitest.config.mjs
- cloud/swarm/worker-tests/platform-budget.test.mjs
- .github/workflows/phase59-60-account-scope-platform-budget.yml

The Durable Object name is fixed to P10CR-account-platform-budget-v1. All participating Workers must bind to the same Durable Object namespace/script. The caller cannot choose a budget/account partition. This proves one shared namespace, not cross-Cloudflare-account federation.

The server owns a fixed cost registry. Callers cannot submit costs, caps, provider telemetry or a reset window. The UTC day is derived by the Durable Object. Resource reservations are all-or-none and cover worker requests, downstream Durable Object requests, duration allocation, SQLite row reads/writes, storage allocation and dispatch count.

Separate control-plane RPC overhead is charged to its own reserved sub-budget. Every valid RPC uses a replay-protected HMAC identity and nonce. Only P10CR/P59-003/Phase59.60 and the registered shadow-dispatch operation are accepted. Production mode accepts only the canonical repository. Two synthetic repository names are allowed only in the isolated test environment.

Idempotency identity is project/repository/task/phase/execution/operation. Workflow-run ID is attribution only and is deliberately excluded from the idempotency fingerprint, so a retry in another workflow run is suppressed.

Leases use a monotonic fencing token plus lease version. Heartbeat increments lease version. Stale token/version writes are rejected. An expired or ambiguous reservation moves to UNCERTAIN and retains its full budget allocation; there is no release/refund operation. Per-day events form a SHA-256 hash chain; snapshot verifies the chain.

All SQLite mutations use Durable Object storage.transactionSync. No raw SQL BEGIN/COMMIT is used.

## 5. Internal caps and conservative allocation model
The default internal caps split the Phase59.59 5%-of-Free guardrail into workload and budget-control allocations:

| Resource | Workload allocation | Budget RPC allocation | Combined internal cap |
|---|---:|---:|---:|
| Worker requests/day | 5,000 | 0 | 5,000 |
| Durable Object requests/day | 4,500 | 500 | 5,000 |
| DO duration/day | 585 GB-s | 65 GB-s | 650 GB-s |
| SQLite rows read/day | 225,000 | 25,000 | 250,000 |
| SQLite rows written/day | 3,500 | 1,500 | 5,000 |
| SQLite storage | 225 MiB | 25 MiB | 250 MiB |
| Shadow dispatches/day | 100 | 0 | 100 |

Per-dispatch server-side allocation:
- 1 Worker request.
- 8 downstream DO requests.
- 0.5 GB-s DO duration.
- 45 SQLite rows read.
- 18 SQLite rows written.
- 16 KiB storage allocation.
- 1 dispatch.

Per budget RPC allocation:
- 1 budget DO request.
- 0.01 GB-s.
- 5 SQLite rows read.
- 3 SQLite rows written.
- 1 KiB storage allocation.

These are conservative internal reservations, not measured Cloudflare usage or a provider guarantee. The live account plan and aggregate account usage have not been inspected. Owner dashboard reconciliation is mandatory before deployment. No automatic paid fallback exists.

## 6. Exact synthetic runtime results
Workflow: Phase 59.60 Account-Scope Platform Budget Runtime Tests
Run: 44450335146
Tested SHA: 06599b22f61a37d6cf09df6a234a2dfc32209736
Result: SUCCESS, 6/6.

Tests:
1. 100 concurrent reservation attempts across two synthetic repository identities and four workflow-run identities share one object and cap. Exactly 8 admitted; 92 fail closed. All eight settle; no residual reserved or uncertain dispatch units.
2. A retry in a different workflow run with the same logical execution ID is suppressed; no second reservation.
3. Stale fencing token and stale lease version are rejected; heartbeat renews; identical settlement replay is idempotent.
4. Expired reservation moves to UNCERTAIN; budget is retained, not released.
5. Cross-project, wrong task, wrong phase and unregistered operation are rejected.
6. Control-plane RPC budget remains separate from workload reservation; event-chain snapshot validates.

## 7. Failure history and corrections
The first CI iterations were not hidden:
- Runs 44449422360, 44449438771, 44449538361, 44449664486 and 44449671669 exposed worker/module-root and import-path mistakes.
- Run 44449747815 exposed an incorrect Wrangler main path and escaped template-literal syntax.
- Runs 44449847744 and 44450104353 exposed raw SQL BEGIN/COMMIT usage, which Cloudflare Durable Objects prohibit; changed to storage.transactionSync.
- Run 44449973199 also ran unrelated test files because the isolated Vitest config did not restrict include; the config now selects only platform-budget.test.mjs.
- Run 44450243873 passed 5/6 and exposed workflowRunId being included in the idempotency fingerprint; removed it from the fingerprint.
- Final exact-head PR run 44450335146 passed 6/6. Push run 44450328625 was cancelled by the PR concurrency group, not failed.

## 8. Explicit acceptance boundary
Passed:
- Synthetic cross-repository/run shared-namespace atomic budget.
- Atomic multi-resource admission.
- HMAC/replay protection contract.
- Idempotency across workflow runs.
- Fencing, lease-version heartbeat, expiry-to-uncertain.
- Append-only event-chain verification.
- Exact-head Workerd CI 6/6.

Not yet proven:
- Real Cloudflare account plan/usage and account-wide aggregation.
- Cross-host contention across independent physical GitHub runners.
- Budget RPC wired into the mission dispatcher.
- GitHub App owner installation and branch ruleset verification.
- 7-day or 30-day soak.
- Production integration or AI inference.

The synthetic test uses two Worker identities and two synthetic repository identifiers in one Workerd test environment. It is not a live multi-host test and does not prove that different Cloudflare accounts share a quota.

## 9. Safety and financial invariants
- Production feature flag: OFF.
- AI inference: OFF.
- Provider calls: 0.
- External network requests from tests: 0.
- Spend: ₹0.
- Verified realized net receipts: ₹0.
- No KYC, terms acceptance, public release, billing, payment, signing, fund movement, private-key access or other-project mutation.
- P59-001 PAUSED; P59-002 BLOCKED; P59-003 sole active P0.

## 10. Next engineering step
Phase59.61:
1. Integrate the account-scope budget RPC into the P59-003 shadow mission dispatcher.
2. Reserve before task dispatch; only start the durable run after reservation succeeds.
3. Settle only after the durable result checkpoint and final readback.
4. If outcome/acknowledgement is ambiguous, retain UNCERTAIN and suppress replay.
5. Add cross-run duplicate, crash-window, budget exhaustion and fail-closed integration tests.
6. Keep production OFF and AI inference OFF.
7. Then use the existing owner packet for account verification and independent-host tests; only after those gates start bounded 7/30-day soak.

P59-001 must not resume until every P59-003 acceptance gate passes.
