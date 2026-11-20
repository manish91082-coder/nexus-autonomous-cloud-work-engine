# P59-003 Phase 59.62 — Independent-host test owner preflight

**Status:** Prepared only. No Cloudflare deployment, account setting, secret, GitHub variable, live endpoint call, billing action, or owner approval was performed.

## Scope and safety boundary

This packet authorizes no action by itself. It is a checklist for the repository owner to review before any live test.

- Project scope is P10CR / P59-003 only.
- Use an existing Cloudflare account only. Do not create or rotate accounts.
- Verify the account is already on the Workers Free plan and inspect aggregate account usage before testing.
- Use a fresh, dedicated test-only Durable Object namespace for both the SwarmRunDO and PlatformBudgetDO stores. Do not bind production namespaces.
- All four host jobs must call the same temporary test dispatcher endpoint and therefore the same test-only PlatformBudgetDO namespace.
- Do not add a custom domain or product route. Use a temporary workers.dev endpoint protected by the dispatcher HMAC.
- The test workflow is manual-only, read-only with respect to GitHub, uses standard GitHub-hosted ubuntu-latest runners, and uploads no artifacts or caches.
- If the Free plan, aggregate usage headroom, or namespace isolation cannot be verified, stop. Do not enable billing or use a paid fallback.
- The dispatcher and snapshot routes must remain disabled outside the approved test window.

## Cloudflare test-only service topology

Create three test-only Worker scripts using the repository entrypoints:

1. **p10cr-swarm-run-host**
   - Entry: `cloud/swarm/swarm-run-host.mjs`
   - Durable Object class: `SwarmRunDO`
   - SQLite migration: new test-only class namespace.
2. **p10cr-platform-budget-host**
   - Entry: `cloud/swarm/platform-budget-host.mjs`
   - Durable Object class: `PlatformBudgetDO`
   - SQLite migration: new test-only class namespace.
3. **p10cr-independent-host-shadow-dispatch**
   - Entry: `cloud/swarm/mission-dispatcher-shadow-worker.mjs`
   - Bind `SWARM_RUNS` to the test-only `p10cr-swarm-run-host` namespace.
   - Bind `PLATFORM_BUDGET` to the test-only `p10cr-platform-budget-host` namespace.
   - Temporary endpoint path: `/internal/shadow-dispatch`.
   - Read-only snapshot path: `/internal/shadow-budget-snapshot`.
   - Do not attach a publisher, GitHub App write token, AI provider, payment provider, or production data binding.

The same Durable Object namespaces must be used by all four independent runner jobs. A separate namespace per runner would invalidate the global-arbiter test.

## Exact dispatcher Worker configuration

Set these non-secret variables on the test-only dispatcher Worker:

- `NEXUS_MISSION_SHADOW_ENABLED=true`
- `NEXUS_SHADOW_TEST_MODE=true`
- `NEXUS_PLATFORM_BUDGET_ENABLED=true`
- `NEXUS_SWARM_RUN_CALLER_ID=dispatcher`
- `NEXUS_PLATFORM_BUDGET_CALLER_ID=dispatcher`
- `NEXUS_SHADOW_WORKER_ID=p10cr-independent-host-test`

Set these secrets through Cloudflare's secret manager, never in source or chat:

- `NEXUS_DISPATCHER_INGRESS_SECRET`: random high-entropy secret, at least 32 characters.
- `NEXUS_SWARM_RUN_CALLER_SECRET`: random high-entropy secret, at least 32 characters.
- `NEXUS_PLATFORM_BUDGET_CALLER_SECRET`: random high-entropy secret, at least 32 characters.

Leave `NEXUS_WORKFLOW_RUN_ID` unset. The caller-supplied `workflowRunId` is part of the HMAC-signed request body and is validated by the Worker.

## Exact SwarmRunDO host policy

On the test-only SwarmRunDO host, set:

- `NEXUS_SWARM_RUN_ENABLED=true`
- `NEXUS_SWARM_RUN_CALLER_KEYS` to a JSON object containing only the dispatcher caller and the same secret as `NEXUS_SWARM_RUN_CALLER_SECRET`.
- `NEXUS_SWARM_RUN_CALLER_POLICIES` to:

```json
{
  "dispatcher": [
    "register",
    "claim",
    "heartbeat",
    "checkpoint",
    "complete",
    "fail",
    "snapshot"
  ]
}
```

Do not configure a `primary` caller. Do not grant `approve` or `recover` to the dispatcher identity.

## Exact PlatformBudgetDO test-only policy and caps

On the test-only PlatformBudgetDO host, set:

- `NEXUS_PLATFORM_BUDGET_ENABLED=true`
- `NEXUS_PLATFORM_BUDGET_TEST_MODE=true`
- `NEXUS_PLATFORM_BUDGET_CALLER_KEYS` to a JSON object containing only the dispatcher caller and the same secret as `NEXUS_PLATFORM_BUDGET_CALLER_SECRET`.
- `NEXUS_PLATFORM_BUDGET_CALLER_POLICIES` to:

```json
{
  "dispatcher": ["reserve", "heartbeat", "settle", "snapshot"]
}
```

Set `NEXUS_PLATFORM_BUDGET_TEST_CAPS` to the following conservative application-level test caps:

```json
{
  "dispatches": 8,
  "worker_requests": 200,
  "do_requests": 64,
  "do_duration_milli_gb_seconds": 4000,
  "sqlite_rows_read": 360,
  "sqlite_rows_written": 144,
  "storage_bytes": 131072,
  "budget_rpc_requests": 500,
  "budget_duration_milli_gb_seconds": 65000,
  "budget_sqlite_rows_read": 25000,
  "budget_sqlite_rows_written": 1500,
  "budget_storage_bytes": 26214400
}
```

The 8-dispatch cap is the test invariant. The 200 worker-request cap covers the 105 actual dispatcher HTTP requests (one seed, four duplicate replays, and 100 unique task attempts). The remaining counters are bounded above the expected task and control-plane costs but far below the published Free-plan daily ceilings. These are application-level caps, not Cloudflare entitlements.

Use a fresh test-only Durable Object namespace for each test batch. Do not add a reset endpoint or reset production state.

## GitHub owner configuration

Only after the Cloudflare test Worker and both test-only namespaces have been independently verified, the owner may set these repository variables:

- `P59_003_CLOUDFLARE_FREE_VERIFIED=true`
- `P59_003_LIVE_TEST_APPROVED=true`

And these repository secrets:

- `P59_003_TEST_DISPATCH_ENDPOINT`: full HTTPS URL on the exact `*.workers.dev` hostname family, without a custom port, credentials, query or fragment, ending exactly in `/internal/shadow-dispatch`.
- `P59_003_TEST_INGRESS_SECRET`: same value as the test dispatcher's `NEXUS_DISPATCHER_INGRESS_SECRET`.

Never put secret values in issues, commits, logs, reports, or chat. Do not send passwords, OTPs, cookies, recovery codes, or private keys.

## Test execution procedure

1. Verify the Cloudflare Free plan and aggregate usage in the existing account.
2. Verify the three test-only Worker scripts and the two fresh SQLite DO namespaces.
3. Confirm the dispatcher and DO caller policies contain only the permissions listed above.
4. Confirm the snapshot endpoint returns only aggregate counters and is disabled unless `NEXUS_SHADOW_TEST_MODE=true`.
5. Set the GitHub variables and secrets above.
6. Manually dispatch **Phase 59.62 Independent-host global quota proof** with `confirm_live_test=true`.
7. The workflow runs one seed job and four independent standard GitHub-hosted runner jobs. Each host job uses a distinct signed `workflowRunId` formed from the workflow run ID and job identity.
8. The four host jobs each submit one replay of the already-completed sentinel and 25 unique tasks. The four hosts must share the same test-only DO namespaces.
9. The final job checks the four runner names, four distinct signed run identities, exact response totals, and a read-only budget snapshot.

### Expected result

- Seed task: 1 completed and settled.
- Cross-run sentinel replays: 4 duplicate suppressions, with no new reservation.
- Unique attempts: 100.
- Unique tasks admitted: exactly 7.
- Unique tasks rejected for exhausted budget: exactly 93.
- Unexpected responses: 0.
- Distinct GitHub-hosted runner names: 4.
- Distinct signed workflow-run identities: 4.
- Final PlatformBudgetDO snapshot: committed dispatches 8, reserved dispatches 0, uncertain dispatches 0, valid event chain, control RPC count no greater than 500.

The four host jobs are separate GitHub-hosted runner instances with distinct signed workflow-run identities, but they are jobs within one GitHub Actions workflow run. This proves cross-host and cross-run-identity contention. It does not claim four separate GitHub Actions workflow-run IDs.

## After the test

- Disable `NEXUS_MISSION_SHADOW_ENABLED`, `NEXUS_PLATFORM_BUDGET_ENABLED`, and `NEXUS_SHADOW_TEST_MODE` on the test Workers.
- Remove the temporary GitHub variables and secrets.
- Keep the test namespace read-only until the evidence is fetched and reconciled.
- Do not delete the test namespace or evidence until the owner has reviewed the final report.
- Do not merge the stacked PRs or enable production dispatch as part of this test.

## Current owner gate

No Cloudflare account, Worker, Durable Object namespace, GitHub variable, GitHub secret, or live endpoint has been modified. No live network request has been made by this test harness.


## Runner identity correction

The four independent GitHub-hosted jobs record the documented `runner.name` context as their host identity. The harness does not rely on an undocumented `runner.id` context property. These remain four runner jobs within one workflow run; they are not four separate GitHub Actions workflow-run IDs.
