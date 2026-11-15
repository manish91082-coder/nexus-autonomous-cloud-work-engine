# Phase 59.18 — GitHub Git-Ref CAS Federation Lock Prototype: Live Race and Journal Verification
Date: 2026-11-15
Controller repository: `manish91082-coder/nexus-autonomous-cloud-work-engine`
Dedicated state branch: `federation-locks`
Latest live integration run: [43686594557 — SUCCESS](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43686594557)
Workflow tested commit: `0896e9e48f904dd461eee98d0aa428f2d068afff`
State branch HEAD after probe: `4a9fe8003401ed4b6421ad513a1cc4056ab548ac`

## Executive result

**The first live GitHub-backed federation lock prototype passed.** The probe used the actual repository-scoped Actions `GITHUB_TOKEN`, not an in-memory mock, and exercised the dedicated branch state.

- Unit/state suite: 7/7 PASS.
- Deterministic 100-contender optimistic-CAS simulator: exactly 1 winner.
- Live GitHub race: 20 simultaneous contenders for the same project/repository/task scope; exactly 1 valid lease, 19 received BUSY, no second lease.
- The winning lease used a monotonically increasing fencing token.
- Lease release was committed; active lease count returned to zero.
- Live journal verification: 13 event files, contiguous sequence 0–12, all SHA-256 event links verified, tail hash matched state snapshot.
- Workflow completed SUCCESS; no secrets were printed.

The live probe has been repeated across several runs. Latest evidence is run `43686594557`; earlier runs `43686339494`, `43686421752` and `43686479221` also passed the 20-contender live probe after the REST ref endpoint and journal-verifier fixes.

## Architecture now present on `federation-locks`

- `federation/locks/state.json`: current generation, global next fencing token, bounded active leases and journal checkpoint.
- `federation/locks/events/000000000000.json` onward: append-only, hash-chained event records.
- `federation/locks/registry.json`: branch contract and status.
- `scripts/federation_git_ref_store.py`: standard-library GitHub REST Git Data API client for read, claim, heartbeat, release, fencing assertion, fast-forward-only commit and journal verification.
- `tests/test_federation_git_ref_store.py`: seven state-machine tests, including 100-way deterministic CAS race.
- `scripts/probe_federation_git_ref_store.py`: live 20-contender claim/release/journal probe.
- `.github/workflows/federation-lock-store.yml`: branch-filtered test workflow; workflow-level contents read, job-level contents write only for `federation-locks`.

## Important implementation correction history

The first live probe attempts exposed two defects, which were fixed before the successful runs:
1. Python script import path needed repository root added to `sys.path`.
2. GitHub REST API uses singular `/git/ref/{ref}` for GET and plural `/git/refs/{ref}` for PATCH. The first version incorrectly reused the GET path for PATCH and received HTTP 404. The corrected client uses separate endpoints.

The final live workflow now passes. These failures remain in Actions history and are not hidden.

## Lock protocol parameters

- Lease duration: 900 seconds.
- Heartbeat interval: 300 seconds.
- Maximum active leases: 8.
- Global monotonically increasing fencing token.
- One lease per `project_id/repository/task_id` scope.
- Duplicate scope exits as BUSY.
- Expired scope can be reclaimed only with a higher fencing token.
- CAS conflicts retry with a bounded budget; API permission/quota/network failures fail closed.
- No force push.
- Event chain is audited against the state checkpoint.

The current branch state after the latest successful run has generation 12, next fencing token 6, event sequence 12, and zero active leases. The latest state tail hash is `82f4af98d599c77ac8d296041d4c002f5bc571f772de2b498ddf41ae06ea2ac8`.

## Security boundary

- Workflow is filtered to branch `federation-locks`.
- Workflow-level permission is `contents: read`; only the live probe job receives `contents: write`.
- No PAT, GitHub App private key, external secret, paid service or owner credential is used.
- This prototype is **not yet enforced by any other project cell or ChatGPT thread**. The lock branch can be bypassed by workers that do not call this client; branch protection/ruleset and least-privilege GitHub App installation are still needed.
- The live probe uses the controller repository's GITHUB_TOKEN only. Cross-repository access requires a separately approved GitHub App installation on selected repositories.
- A 20-contender live test plus 100-contender deterministic simulator is not a 100-way live stress test.

## Resource and cost constraints

- GitHub documents a 1,000 REST requests/hour `GITHUB_TOKEN` limit per repository and secondary limits on concurrent and content-generating requests. The lock service is intentionally capped at 8 active leases and 5-minute heartbeat; do not use it for high-frequency event streaming.
- Cloudflare D1 remains an alternate, not enabled. Its Free plan currently has 5 million rows read/day, 100,000 rows written/day, 500 MB per DB and 5 GB total storage; daily quota exhaustion stops queries until reset. Account-level zero-billing eligibility and credentials are not verified.
- If GitHub API is unavailable or quota-limited, tasks remain queued. No D1 auto-fallback until account, scope and zero-billing are verified. No paid fallback.

## Current deployment status

- Prototype branch and live integration probe: PASS.
- P10CR mission worker integration: NOT DONE.
- Flash Loan read-only federation client: NOT DONE.
- Other project-cell clients: NOT DONE.
- Global Actions/API quota arbiter: NOT DONE.
- Cross-thread lease enforcement: NOT DONE.
- Branch ruleset/force-push protection: NOT VERIFIED.
- 7-day/30-day soak: NOT DONE.

The prototype must be merged/reviewed into the canonical repository before it is referenced by production workflows. Even after merge, it must remain disabled for cross-project writes until GitHub App consent, branch protection, project-client read-only rollout and failure-injection gates pass.

## Next sequence

1. Review and merge the prototype code/state contract to master without enabling other project cells.
2. Add a branch ruleset/force-push protection and test failure handling.
3. Add a read-only Flash Loan status client using a dedicated GitHub App only after owner installation/approval; no Flash Loan queue/workflow writes.
4. Implement global Actions/API quota reservation and fairness.
5. Add P10CR worker lease claim/assert/release integration, then duplicate-thread and stale-fence tests.
6. Run 7-day and 30-day soak tests before cross-project write access.
7. Resume P59-001 revenue-source ranking only after safe swarm handoff.

PCNE remains ₹0; authorized spend ₹0. No provider account, paid service, billing activation or financial action occurred.
