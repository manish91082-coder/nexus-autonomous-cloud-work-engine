# Phase 59.64B — Seed Replay, Snapshot-Stage Gates and Current-Head Inventory

**Date:** 2026-11-23  
**Mission:** P59-003, sole active P0  
**Repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Master HEAD:** `8856bf908f93e265cefd5c739f7f46b3dd995b3c` (unchanged)  
**Candidate branch:** `phase59-64-host-slot-run-identity-binding`  
**PR:** #50, draft/open/unmerged, based on PR #49 branch  
**Tested code head:** `3de92c7eb32ae594d3ea3f6da141a211a0ae6cb5`  
**Push CI:** [#45106578746](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45106578746), SUCCESS  
**PR CI:** [#45106583941](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45106583941), SUCCESS

## Decision

Phase59.64B code and synthetic Workerd acceptance **PASS**. Seed replay and snapshot/overflow stages are now gated against the shared durable budget ledger. This is still synthetic Workerd evidence, not independent physical-host proof or live deployment.

## Engineering changes

### 1. Seed creation and replay use one stable idempotency payload

A first attempt added a `seedReplay` boolean to the seed payload. CI correctly exposed that changing this field changed the request fingerprint and caused the replay to stop being idempotently suppressed.

The final implementation removes that flag. Seed creation and cross-run seed replay carry the same payload, including the original `seedWorkflowRunId`. The Worker infers creation versus replay from the durable ledger:

- If no seed row exists, only the workflow run whose ID equals `seedWorkflowRunId` may create it.
- If a seed row exists, exactly one SETTLED row must be bound to that exact seed workflow-run ID and the expected synthetic repository.
- A different run may replay only after the original seed row is settled.
- A seed row bound to another run, unsettled, missing or ambiguous fails closed.
- A same-run retry remains idempotent and may be classified as a duplicate after durable readback.

### 2. Host slots verify actual prior reservations

Before a host slot is dispatched, the Worker reads the shared PlatformBudgetDO snapshot and verifies the seed and every earlier host slot are settled under the exact supplied workflow-run IDs and expected synthetic repository aliases. Future slots must be absent. Forged, premature, swapped or uncertain prerequisites are rejected before task registration.

### 3. Snapshot and overflow stages require all four hosts

Before any overflow reservation is attempted, the Worker verifies:
- one settled seed row under the exact seed run ID;
- exactly one settled row for each host1–host4 slot;
- each host row is bound to the supplied workflow-run ID and expected repository alias;
- the snapshot workflow-run ID is distinct from seed and all four hosts;
- any existing overflow rows belong to the same snapshot run and are settled;
- overflow-4 has not already been reserved;
- the snapshot event chain is valid.

This prevents a snapshot run from starting early, accepting swapped host IDs, or splitting overflow reservations across snapshot runs.

### 4. Workerd failure-injection sequence

The integration test now proves:
- seed replay before seed creation is rejected;
- the initial seed is accepted;
- cross-run replay with the same payload is suppressed;
- overflow before all four hosts is rejected;
- forged seed ID is rejected;
- host2 before host1 is rejected;
- host3 before host2 is rejected;
- swapped prior host IDs are rejected;
- host1 → host2 → host3 → host4 then succeeds;
- swapped host IDs at snapshot are rejected;
- overflow1–3 settle, overflow4 is denied by the shared cap;
- final readback verifies eight settled reservations, zero reserved, zero uncertain, six distinct workflow-run IDs, two synthetic repositories and a valid event chain.

## Exact CI evidence

Both push and pull-request events passed on code/test head `3de92c7eb32ae594d3ea3f6da141a211a0ae6cb5`:
- Offline independent-host/preflight tests: **32/32 PASS**.
- Workflow YAML syntax: **PASS**.
- npm lockfile: **165 package entries; integrity PASS**.
- Workers runtime: **83/83 across 4 files**.
- Isolated Phase59.63 Workerd integration: **1/1 PASS**.
- Node: 22.16.0; npm: 11.6.3; install uses `npm ci --ignore-scripts`.
- Runs #45106578746 and #45106583941 both SUCCESS.

### Failure history retained

- Runs #45106178146 (push) and #45106181930 (pull_request) failed because adding a replay flag changed the idempotency payload fingerprint. The flag was removed; creation and replay now use the same payload and the Worker derives the state from durable reservation evidence. Both final runs passed.
- Earlier Phase59.64A failures #45105477551 and #45105696473 were caused by a template-literal syntax error and a duplicate `seedRunId` declaration; both were corrected before Phase59.64A run #45105764381 passed.
- No live endpoint was called during any failed or successful run.

## Current candidate branch inventory and security findings

The recursive candidate tree is complete (not truncated): **500 entries**.

| Component | Count |
|---|---:|
| GitHub workflow files | 37 |
| `cloud/swarm/*.mjs` modules | 42 |
| Python files total | 87 |
| Python under `scripts/` | 18 |
| `cloud-work-engine/` runtime Python | 21 |
| `cloud-work-engine/tests/` Python | 20 |
| `products/` Python | 12 |
| top-level `tests/` Python | 16 |
| npm package manifests | 1 |
| npm lockfiles | 1 |
| Wrangler configs | 4 |

Workflow/action audit across all 37 files:
- 74 action references: 55 pinned to full commit SHA, 19 mutable tags.
- The 19 mutable references occur in six non-P10CR build/revenue/recruitment workflows; these were not executed or modified in this P59-003 phase.
- Five workflows reference secrets: the two isolated Nexus revenue-agent workflows, the P10CR constrained publisher, and the Phase59.62/59.63 owner-gated test workflows.
- No `pull_request_target` workflow was found.
- The P10CR compute worker and continuity guard use read-only repository permissions and do not reference secrets.
- The P10CR publisher keeps the GitHub Actions token read-only. Only after source validation and owner configuration does it mint a one-repository GitHub App token with `contents:write` and `pull_requests:write`; its code allowlists one deterministic branch/file path and creates draft PRs only. No merge, release or deployment path exists.
- Two other branch-scoped write workflows remain in the repository and were not invoked: the legacy Phase59.25 disposable cloud-soak branch writer and the separate `federation-locks` branch CAS workflow. They are not the P10CR publisher, but they are residual write-capable workflows that require owner review before claiming the entire repository has a single write path.
- The federation lock workflow remains isolated to its dedicated branch and is not part of P59-003 execution.
- Rulesets API returned an empty list. Branch-protection API returned HTTP 403; protection remains **UNVERIFIED**, not assumed absent.

## Canonical control-plane drift

Master remains at `8856bf908f93e265cefd5c739f7f46b3dd995b3c`. The master copies of:
- `mission_state.json` are dated 2026-11-16 and still identify Phase59.53;
- `automation_queue.json` is dated 2026-11-16. Task statuses are P59-003 IN_PROGRESS, P59-001 PAUSED, P59-002 BLOCKED, but its `sequence_mode` still describes V5 portfolio aggregation;
- `PROJECT_FEDERATION_REGISTRY.json` is dated 2026-11-16 and last observed head is `9cdc16a2...`;
- `PROJECT_CONTINUITY.md` ends at Phase59.44.

The Phase59.64A/64B override and current checkpoint are on the unmerged candidate PR stack. Do not describe them as merged master state. Latest master Mission Worker #45097408304 still selected P59-003 with `POLL_OK`, AI executor `WAITING_FOR_OWNER_CONFIGURATION`, and no inference. Latest master Guard #45011590613 passed 111 checks with zero errors. Master combined status endpoint reports zero status contexts, so workflow run results are tracked separately.

## Safety and acceptance boundary

- No Cloudflare deployment, live endpoint request, GitHub App installation, publisher activation, AI inference, external provider call, public release, KYC, legal acceptance, billing, payment, signing or money movement.
- No generated model code was executed. CI ran only the reviewed deterministic candidate source and tests; the swarm model-inference adapter remains disabled.
- Other project workflows were inspected read-only and not executed.
- Production flags OFF; authorized spend ₹0; verified realized net receipts ₹0.
- P59-003 remains the sole active P0; P59-001 PAUSED; P59-002 BLOCKED.

## Next engineering step

Phase59.64C: add concurrent same-slot and competing snapshot-run failure-injection tests, prove one durable winner and no split snapshot, and audit the publisher/legacy branch-scoped write boundary. Live six-run proof remains owner-gated until PR stack #44→#50 is reviewed and merged in order, branch protection is verified in owner UI, existing Workers Free account and aggregate usage are confirmed, test-only namespaces are configured, and the required-reviewer environment is approved. Start 7-day soak only after exact six-run acceptance; 30-day soak follows the 7-day gate.


## Post-checkpoint verification

- Final candidate checkpoint before this evidence-only commit: `e872f34afdbeae9350e84198d178fce63033bafd`; [Phase59.35 CI #45107001561](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45107001561) completed SUCCESS on that exact branch head. It re-ran the same executable code and test files: 32/32 offline tests, YAML PASS, 165-package lockfile integrity, 83/83 Workers runtime and 1/1 Workerd integration.
- Candidate Mission Worker [#45106996804](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45106996804) SUCCESS: `POLL_OK`, selected P59-003, AI executor `WAITING_FOR_OWNER_CONFIGURATION`, zero inference requests.
- Candidate Continuity Guard [#45106996788](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45106996788) SUCCESS: 111 checks, zero errors.
- Master Mission Worker [#45097408304](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45097408304) and master Guard [#45011590613](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45011590613) remain the latest verified master control-plane runs: Worker selected P59-003 with no inference; Guard passed 111 checks.
- PRs #44–#50 are all open, draft, mergeable and unmerged in a sequential stack. PR #50 base is `phase59-64-default-branch-execution-guard`; head before this evidence-only commit was `e872f34afdbeae9350e84198d178fce63033bafd`.
