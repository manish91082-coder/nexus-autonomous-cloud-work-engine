# Cross-Project Agent Swarm Federation Protocol
**Federation ID:** MANISH-AI-PROJECT-FEDERATION-2026
**Controller repository:** manish91082-coder/nexus-autonomous-cloud-work-engine
**Status:** Contract defined; runtime enforcement pending
**Owner identity attribute:** manish91082@gmail.com (not a credential)

## 1. Purpose
Coordinate multiple autonomous projects and ChatGPT/automation threads without merging their goals, queues, budgets, evidence, revenue ledgers or safety policies. The controller is a federation coordinator, not a universal mission override.

## 2. Critical finding
Repositories remain separate even when owned by the same GitHub account. ChatGPT threads are separate execution contexts and do not automatically share transactional state or locks. GitHub Actions concurrency groups are repository-scoped, not global across repositories. Shared API/Actions capacity and model quotas can still be consumed by concurrent projects.

## 3. Federated topology
- Federation Controller: registry, cross-project locks, shared quota arbitration, health/duplicate-run monitoring and approval broker.
- Project Cells: each repository keeps its own constitution, queue, state, evidence vault, task graph and revenue/safety rules.
- Worker Threads: ChatGPT chats, scheduled automations and GitHub Actions are dispatchers/workers. They must claim a project/task lease before writing canonical state.
- Evidence Publisher: one authorized publisher per project repository/control-plane path. Other workers create isolated branches and submit artifacts/PRs.

## 4. Lock protocol
Every claim key is project_id/repository/task_id/idempotency_key.
1. Request a lease from the federation lock service.
2. The service atomically grants one owner and returns a monotonically increasing fencing token.
3. Worker heartbeats at 60 seconds; initial lease target 900 seconds.
4. On expiry, recovery checks the last checkpoint and increments the fencing token.
5. A stale worker with an older fencing token is rejected from canonical writes.
6. Duplicate dispatch attaches to the current lease or exits idempotently.
7. Release only after checkpoint/artifact persistence and state reconciliation.
8. Mission state, queues, constitutions, evidence ledgers and revenue ledgers never use last-write-wins.
The initial lock registry is a contract placeholder, not a functioning lock service. B4 must implement atomic serialized claims and prove race safety under concurrent workers.

## 5. Shared resource arbitration
- Maintain one budget for GitHub API requests, Actions concurrency, free inference quotas, cloud compute and storage.
- Reserve minimum capacity for each project's essential maintenance and recovery.
- Apply per-project quotas, fair scheduling and priority aging; one research storm cannot exhaust all shared capacity.
- Stagger scheduled jobs and use event-triggered dispatch for urgent work.
- Quota exhaustion cannot trigger paid fallback or silently consume another project's reserved budget.
- Projects remain independently resumable if federation controller is unavailable.

## 6. Mission isolation
- P10CR: ₹10 crore cumulative PCNE, V5 authority, zero spend default, one active product build maximum, no jobs/gigs/freelance bidding/cold outreach/spam/unauthorized scraping/recurring manual fulfilment.
- FLASHLOAN-RESEARCH: public GitHub repository research only; no wallet access, signing, trading, deployment or candidate code execution.
- ZCIRA: independent ZCIRA-2026-11-13 project; its own ₹0 rule, five commercial gates and settlement-based revenue recognition. Do not merge its queue into P10CR.
- DAILY1000: separate ₹1,000/day experiment; separate product hypothesis and revenue accounting.
- AI-CONTENT: audit before any relationship or resource sharing is assumed.
- GHOST-HUNTER family: separate crypto engineering projects and safety controls.
No task, product, revenue or authorization is copied across cells merely because the owner account is shared.

## 7. ChatGPT thread and automation coordination
Every work packet must carry project_id, repository, task_id, base_sha, idempotency_key and lease/fencing token. Threads must read canonical project state, claim a lease before writes/dispatch, work from recorded base SHA, publish to task branch, stop if base SHA/token changes and update canonical queue only through the single publisher. A thread without a lease may perform read-only research but may not change mission state, queue, ledger or canonical workflows.

## 8. Authentication and approval
The supplied Gmail address is an account identity, not a universal login token. Google Sign-In, GitHub authorization, Cloudflare, Oracle and other providers issue separate OAuth/installation grants and scopes. Existing connected GitHub access is sufficient for current repository operations; do not ask the owner to re-login where access already works.
Preferred cross-repository dispatch path: dedicated GitHub App installed only on selected repositories. Grant Metadata read-only; Contents read-only for project cells and write only to the controller where required; Actions read/write only where dispatch/cancel is required. No broad organization administration, billing, secrets-read or account-owner permissions. Use short-lived installation tokens, not unrestricted PATs.
Google OAuth is needed only if a real Google service is required. Request minimum scopes and explain purpose before consent. Gmail access is not required merely to run GitHub workflows. Use official provider consent screens. Never ask for passwords, OTPs, backup codes, cookies or private keys in chat.
The currently connected Browser tools can list tabs but cannot control the user's ChatGPT pages or approve Google prompts. Browser security policy blocked reading chatgpt.com page content. No workaround or indirect browser access will be attempted.

## 9. Owner interaction model
Autonomous after granted scopes: research, code, tests, documentation, isolated branches, PR preparation, queue maintenance, recovery, quota-aware provider switching and dashboard updates.
Owner approval remains for installing GitHub App/OAuth scopes, KYC, legal terms, billing/account activation, public release, payment/money movement, bank changes, signatures and irreversible account actions.
Each approval request must identify provider, exact scopes, purpose, duration/expiry and revocation route. Consent for one provider/scope is not consent for another.

## 10. Rollout
A. Registry and inventory.
B. B4 lock/lease/fencing and event journal in Nexus; deterministic concurrency tests.
C. Read-only federation clients in Flashloan, ZCIRA, Daily1000 and AI Content; no mission changes.
D. GitHub App setup and owner consent; enable cross-repo dispatch with least privilege.
E. Migrate one project at a time, preserve local recovery, run duplicate/overlap drills.
F. Cross-thread lease enforcement and shared quota ledger; 7-day and 30-day soak tests.

## 11. Acceptance
- 100 concurrent claims for one task produce exactly one valid lease owner.
- Stale worker with expired fencing token cannot write canonical state.
- Duplicate Actions run and duplicate ChatGPT thread resolve to one idempotent task.
- Project A cannot mutate Project B's protected state beyond granted scope.
- Quota exhaustion cannot silently trigger paid use or consume another project's reserved quota.
- Federation controller outage does not destroy project-local durable queues.
- Owner actions record provider, scope, timestamp, expiry and audit evidence.
- No credentials, OTPs or secrets appear in chat, repo, logs or artifacts.

## 12. Current audit limitations
GitHub connector exposed 15 repositories for the owner. Two ChatGPT tab titles were visible, but browser policy blocked reading their chatgpt.com contents. Their exact instructions/current execution states therefore remain unverified. This protocol prevents future conflicts only after clients and locks are deployed; writing this document alone does not enforce locks.