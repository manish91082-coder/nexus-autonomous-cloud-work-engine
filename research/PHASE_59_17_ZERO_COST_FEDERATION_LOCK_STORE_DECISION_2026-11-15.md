# Phase 59.17 — Zero-Cost Federation Lock Store Decision
Date: 2026-11-15
Authority: V5 master constitution; P59-003 only active P0 engineering task
Status: ARCHITECTURE DECISION + ISOLATED PROTOTYPE BRANCH INITIALIZED; runtime not yet enabled for project clients.

## Executive decision

Use a dedicated Git branch in the existing canonical Nexus repository as the first zero-cost shared coordination store:
- Branch: `federation-locks`
- State snapshot: `federation/locks/state.json`
- Append-only event files: `federation/locks/events/{sequence}.json`
- Contract: `federation/locks/registry.json`

Each state transition is a Git commit whose parent is the branch HEAD observed by the writer. The writer creates a new commit and advances the branch ref with fast-forward only; stale-parent writers must not force-update the branch. On conflict, reread latest state, re-evaluate ownership/expiry and retry with a bounded cap. The Git commit history plus immutable event files provide an auditable journal. No last-write-wins.

This is selected as the initial backend because the repository and GitHub connector are already available, it introduces no new paid service or cloud account, and it can later be accessed by a least-privilege GitHub App. It is not yet a deployed lock service; no project cell may use it for canonical writes until the runtime client and race tests pass.

## Official platform constraints verified

### GitHub
- The built-in Actions `GITHUB_TOKEN` REST API limit is 1,000 requests/hour per repository.
- GitHub secondary limits include at most 100 concurrent REST/GraphQL requests and content creation limits generally no more than 80/minute and 500/hour.
- Repository contents update requires the current blob SHA and can return HTTP 409 Conflict. The Git Data API exposes commit/tree/ref operations; ref updates must remain fast-forward only.
- The lock store therefore uses bounded concurrency, short-lived claims, 15-minute leases and 5-minute heartbeats only for genuinely long-running tasks. It must not write every second or use one commit per specialist substep.
- Initial controller cap: 8 active leases. This is a conservative software cap, not a statement about GitHub account runner capacity.

### Cloudflare D1 as alternate
- Current Free plan: 5 million rows read/day, 100,000 rows written/day, 500 MB per database and 5 GB total account storage.
- D1 is single-threaded per database; concurrent queries queue and can be rejected if overloaded.
- Since 2026-09-01, exceeding free daily row read/write limits causes queries to fail until midnight UTC; stored data remains intact.
- Cloudflare account eligibility, billing state, D1 database, bindings and secrets are not connected/verified in this project. Therefore D1 is **not** enabled as an automatic fallback. It remains a separately approved alternate after account-level zero-billing checks.

## Lock state contract

Each lease must include:
- `project_id`, `repository`, `task_id`, `idempotency_key`
- `scope`, `worker_id`, `fencing_token`
- `issued_at_utc`, `expires_at_utc`, `heartbeat_at_utc`
- task/publisher role and allowed write scope.

Rules:
1. One lease owner per scope.
2. Monotonically increasing fencing token persisted in the same commit as the lease.
3. Expired lease recovery creates a new token; stale worker rejected.
4. Duplicate idempotency key attaches/exits, never creates a second execution.
5. Each transition appends a hash-chained event file in the same Git commit as state update.
6. All writers use branch fast-forward only; no force push.
7. CAS conflict, 403, 429, 5xx, malformed state, unknown quota or API outage => fail closed and leave work queued.
8. Project-local queues, mission constitutions, ledgers and evidence remain independent.
9. Lock state and event journal are coordination metadata only, not the source of truth for each project's business task queue.
10. Cross-project clients remain read-only until the GitHub App is installed and race/authorization tests pass.

## Prototype branch and preliminary CAS probe

- Dedicated branch `federation-locks` initialized from master SHA `392b21b80dccb29a48e6e00138944b41b2661383`.
- State and event journal created; test lease was claimed by candidate A, then released and state returned to zero active leases.
- Two candidate commits were constructed from the same parent. Candidate A advanced the branch. Candidate B did not alter the branch head; the GitHub connector returned an opaque GraphQL error for the stale update rather than a typed 409/422. This is **preliminary single-winner observation only**, not yet a fully audited 100-way CAS proof.
- Event files were subsequently hash-chained and state snapshot records the final event hash.
- Current branch head and final state must be fetched back before any runtime use.

## Why not reuse SQLite as the federation store?

B4 SQLite provides strong single-host atomic claims, checkpoint durability and local backup/restore. It cannot coordinate independent ephemeral GitHub runners or multiple cloud providers unless they share the same database host/storage with a separately proven locking layer. It remains the local execution journal, not the cross-project/global lock service.

## Rollout

1. Implement `GitHubGitRefStore` client with read/claim/heartbeat/release, append-only hash chain, fast-forward CAS, bounded retry and quota-aware fail-closed behavior.
2. Unit-test state transitions and run 100 concurrent claim contenders against a deterministic CAS simulator; exactly one winner.
3. Add an isolated GitHub Actions integration probe on the `federation-locks` branch using only repository-scoped `GITHUB_TOKEN`; prove real branch CAS, fencing and cleanup.
4. Do not let Flash Loan, ZCIRA, Daily1000 or other project clients write until the integration probe passes and a dedicated GitHub App is installed with minimal repository permissions.
5. Add per-project Actions/API quota reservations and fairness; no account rotation or paid fallback.
6. Keep Cloudflare D1 as a non-enabled alternate until owner authorizes exact provider scopes and zero-billing state is verified.

## Financial and mission boundary

P59-003 remains IN_PROGRESS. P59-001 stays PAUSED; P59-002 stays BLOCKED. PCNE ₹0; authorized spend ₹0. No project queue or external workflow was changed by initializing this prototype branch.


## Official documentation references

- GitHub REST API rate limits, including `GITHUB_TOKEN` and secondary limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitHub REST Git refs API and fast-forward ref updates: https://docs.github.com/en/rest/git/refs
- GitHub REST Git trees and commits API: https://docs.github.com/en/rest/git/trees and https://docs.github.com/en/rest/git/commits
- Cloudflare D1 limits and free-plan read/write/storage limits: https://developers.cloudflare.com/d1/platform/limits/
- GitHub Actions usage limits and concurrency: https://docs.github.com/en/actions/reference/limits
