# Phase 59.55 — current-head swarm workflow, runtime, dependency and security inventory

**Mission:** P10CR / P59-003 only  
**Inventory baseline master HEAD:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c`  
**Phase 59.54 tested PR head:** `a15e921f5029b7ff7d01ae3ed1ae42e02a65f958`  
**Status:** source-level inventory complete; remediation remains sequenced, not activated  
**Spend:** ₹0  
**AI inference:** disabled  
**Live provider calls:** 0  
**Production flags:** OFF

## 1. Method and coverage

The canonical master Git tree was fetched recursively at the inventory baseline. GitHub returned 441 entries and `truncated=false`.

Inspected inventory:
- 29 workflow files under `.github/workflows/`.
- 17 Python modules under `scripts/`.
- 18 JavaScript modules under `cloud/swarm/`, including runtime hosts, Durable Objects, clients, contracts and tests.
- One package manifest: `cloud/swarm/worker-tests/package.json`.
- No `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `uv.lock`, `poetry.lock`, `requirements*.txt` or `pyproject.toml` was present in the recursive tree.

All 29 workflow files were fetched and inspected for triggers, permissions, action references, secret references, timeout, concurrency and write behavior. All 17 Python and all 18 cloud JavaScript modules were enumerated; the mission dispatcher, worker tick, AI executor, durable store, specialist workflow/coordinator, federation stores, quota ledger, run ledger, shadow Worker, hosts, contracts and runtime test helpers were source-inspected.

## 2. Workflow security findings

| Finding | Verified result | Consequence |
|---|---:|---|
| Workflow inventory | 29 | Complete at baseline HEAD |
| Workflows with mutable action tags | 6 | Supply-chain pinning remains incomplete |
| Workflows with `contents:write` | 3 | Compute/publisher separation is not complete |
| Workflows without explicit `timeout-minutes` | 2 | Add bounded runtime limits |
| Workflows with concurrency controls | 29 | Per-workflow concurrency exists, not a global quota arbiter |
| `pull_request_target` triggers | 0 | No privileged target-trigger workflow found |
| Workflows with `persist-credentials: true` | 0 | No persistent checkout credential setting found |

### The three repository-write workflows

1. `.github/workflows/mission-autonomous-worker.yml`
   - Scheduled every five minutes and bounded to eight minutes.
   - Has `contents:write`.
   - Its current commit step stages only `ai_worker_report.json` and `control/ai_usage_state.json`.
   - The file allowlist is useful but does not make the compute job read-only; the workflow still holds a repository-write token.
   - This is not yet the requested isolated single publisher.

2. `.github/workflows/federation-lock-store.yml`
   - Uses `GITHUB_TOKEN` for the disposable federation lock-store probe.
   - Its write capability is test/control-plane scoped, not a production mission publisher.

3. `.github/workflows/phase59-25-cloud-operational-soak.yml`
   - Uses `GITHUB_TOKEN` for an isolated disposable-branch cloud soak.
   - It is a test writer, not the constrained P10CR artifact publisher.

The six mutable-tag workflow families are older build, recruitment/browser and manually dispatched legacy workflows. The P10CR mission worker, continuity guard and Phase59 quota/runtime workflows inspected here use full-SHA action references. The two workflows lacking explicit timeouts are `build-travel-revenue-demo.yml` and `package-recruitment-product.yml`.

## 3. Dependency and runtime inventory

### JavaScript / Workers

The sole package manifest currently declares:
- `@cloudflare/vitest-plugin: latest`
- `vitest: ^4.1.0`

No lockfile is committed. The Phase59.54 CI log resolved Vitest 4.1.12, but a successful resolution is not a reproducible dependency lock. Exact versions, integrity hashes and a committed lockfile remain required before treating the test supply chain as deterministic.

### Python

No Python dependency manifest or lockfile is present. The mission runtime primarily uses the standard library. `scripts/postgres_quota_store.py` imports `psycopg` only when the optional PostgreSQL adapter is instantiated; no pinned psycopg dependency is declared. The adapter is a reference/test boundary and is not the production mission store.

## 4. Runtime and authority map

| Component | Current behavior | Integration / authority status |
|---|---|---|
| `scripts/mission_guard.py` | Validates mission and queue state; writes a report | Connected to bounded worker workflow |
| `scripts/worker_tick.py` | Reads registries, selects one eligible task, writes heartbeat report | Selection only; no durable claim or task execution |
| `scripts/swarm_runtime.py` | Pure typed state-transition and validation model | Contract/test layer |
| `scripts/durable_execution.py` | Local SQLite journal, leases/fencing/checkpoints, allowlisted process runner | Standalone prototype; local file is not a cloud cross-run store |
| `scripts/swarm_coordinator.py` | ThreadPoolExecutor specialist coordinator | Threads cannot be forcibly terminated; not wired to durable cloud run ledger |
| `scripts/specialist_agent_workflow.py` | Deterministic evidence, demand, payout, economics and rights handlers | No inference/network/side effects; not invoked by scheduled worker |
| `scripts/ai_task_executor.py` | Optional Cloudflare Workers AI draft request behind explicit secrets, zero-billing confirmation, daily cap and cooldown | Current mission state keeps inference disabled; model output is untrusted draft data |
| `scripts/federation_git_ref_store.py` | GitHub REST Git-ref CAS lock-store with `GITHUB_TOKEN` | Separate lock-store prototype; not a universal cross-host arbiter |
| `scripts/federation_quota_arbiter.py` | Provider-neutral quota policy over the federation lock-store | Not globally enabled; policy scope is not account-wide Actions minutes or all repositories' token quotas |
| `cloud/swarm/quota-ledger-do.mjs` | SQLite Durable Object for quota reservations, telemetry, uncertain accounting, leases and response journal | Separate from task/run state |
| `cloud/swarm/swarm-run-do.mjs` | SQLite Durable Object for task identity, owner approval event, atomic claim, lease/fencing, checkpoints, retries, dead-letter and hash-chain events | Workerd-tested; not yet connected to mission dispatcher |
| `cloud/swarm/read-only-swarm-worker.mjs` | Canonical-repository metadata GET through quota-guarded client | Shadow/test-only; no publisher capability |
| `cloud/swarm/swarm-run-host.mjs` | Exports the run Durable Object; public fetch returns 404 | Internal test host, not deployed |
| Mission specialist graph | Five deterministic typed handlers and audit validation | Not live independent LLM agents; no model inference is active |

Model outputs remain untrusted proposals. No generated source code is executed. The owner approval event in the run ledger is a service-side record and is not, by itself, proof of a human approval ceremony; production owner-consent integration remains a hard gate.

## 5. Global quota evidence boundary

Phase59.45A proved two separately authenticated shadow Worker clients with distinct worker/run/request identities sharing one synthetic installation-scope Durable Object quota partition inside workerd. Exact-head regression was 13/13 and Workers/workerd run 43814337444 passed.

Phase59.46 proved a 16-request concurrent burst across two shadow Worker identities against the shared fixture endpoint budget of two: no oversubscription, 14 fail-closed denials, two committed units and zero residual reserved/uncertain units. Exact-head regression was 13/13 and Workers/workerd run 43830209099 passed.

These are meaningful shared-ledger proofs, but they are **not**:
- separate GitHub Actions workflow runs sharing a deployed hosted Durable Object;
- multiple real repositories sharing one real GitHub App installation identity;
- independent physical cloud hosts;
- a production global quota arbiter for all GitHub Actions minutes or all provider limits.

The canonical quota object key is derived from provider, credential scope and window identity, not repository/run/worker identity. All participating clients must still be proven to bind to the same hosted namespace and same installation identity. No other project was accessed or modified for this inventory.

## 6. Owner/security gates

- The least-privilege two-App packet exists at `governance/P59-003_GITHUB_APP_LEAST_PRIVILEGE_OWNER_APPROVAL_PACKET_2026-11-16.md`; it is prepared only, not approved, created or installed.
- The Compute App is proposed read-only. The Publisher App is proposed as the only writer, restricted to a dedicated branch and deterministic artifact allowlist; it must open a PR and never merge.
- Repository ruleset listing returned an empty array to the connected integration, while branch-protection read returned HTTP 403. Protection is **UNVERIFIED**, not presumed absent or configured.
- No private key, KYC, legal acceptance, billing, public release, payment, fund movement or owner account action was performed.
- AI inference, provider calls, production feature flags and spend remain disabled/zero.

## 7. Engineering order from this inventory

1. **Phase 59.56 — global quota arbiter:** extend the shared installation partition proof across synthetic repository identities and distinct run envelopes while keeping every non-P10CR project read-only and untouched. Add cross-run duplicate, contention, reset-window and no-oversubscription tests. Hosted/physical-host proof remains owner-gated.
2. **Phase 59.57 — compute/publisher separation:** make compute workers read-only; move all permitted writes to one deterministic publisher with path, branch, schema, digest, lease/fence and owner gates. Keep merge owner-controlled.
3. **Phase 59.58 — durable dispatcher integration:** connect SwarmRunDO, task envelope, checkpoints and the deterministic specialist graph to the mission dispatcher. No inference until provider/model/data terms, zero-billing and quotas are verified and explicitly authorized.
4. **Phase 59.59 — independent-host validation and soak:** only after owner-approved hosted setup; first bounded multi-host failure tests, then 7-day and 30-day soak with stop conditions and evidence export.

P59-003 remains the sole active P0. P59-001 remains PAUSED and P59-002 remains BLOCKED. No product/source ranking or unrelated project mission was executed.

## 8. Evidence boundary

This report is a source/configuration inventory and test-evidence reconciliation. It does not claim a deployed swarm, physical multi-host proof, 24×7 SLA, live LLM agent swarm, production publisher or revenue. Spend and verified realized net receipts remain ₹0.


## Rebased PR #40 verification addendum

The inventory/control checkpoint is carried on draft PR #40, branch `phase59-54-deterministic-shadow-ledger-path-master-sync`, based on master `8856bf908f93e265cefd5c739f7f46b3dd995b3c`. The exact branch head `3100ea2dfc698087299c4fe114df5a08a73de354` passed all 13 regression workflows. The separate mission continuity guard run `44009214414` passed 111 checks with zero errors. The Phase59.54 Workers/workerd run `44009258395` passed 74/74. PR #39 is closed unmerged; PR #40 remains draft.
