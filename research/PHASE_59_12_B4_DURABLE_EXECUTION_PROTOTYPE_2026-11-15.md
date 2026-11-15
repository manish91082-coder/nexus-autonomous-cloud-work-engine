# Phase 59.12: B4 durable execution prototype and workflow forensic audit

**Date:** 2026-11-15  
**Mission:** ₹10 Cr V5 portfolio, P59-003 is the sole active P0 engineering task  
**Canonical repository:** manish91082-coder/nexus-autonomous-cloud-work-engine  
**Audited master HEAD:** d327c1afa1d48bac1421718c67b14e35c614a88e

## Executive decision

P59-003 is the highest-priority unblocked task. P59-001 remains PAUSED by the single-active-task invariant; P59-002 remains BLOCKED pending a V5-qualified product. This run therefore advances the B4 durable execution foundation rather than repeating platform/payout research or starting a product build.

A standalone, standard-library B4 prototype adds SQLite-backed task persistence, atomic BEGIN IMMEDIATE claims, monotonically increasing fencing tokens, append-only hash-chained events, checkpoint persistence, retry/backoff/dead-letter handling, owner-gate enforcement, single-writer lock primitives, and allowlisted child-process execution with bounded timeout and discarded stdout/stderr. It is deliberately not wired into the production worker or cross-project federation runtime.

## HEAD and CI evidence

- master was compared against d327c1afa1d48bac1421718c67b14e35c614a88e; GitHub compare returned identical, ahead_by=0, behind_by=0.
- Repository is public, default branch master, and connected GitHub permissions include push/admin.
- Combined commit status for that HEAD returned no status contexts.
- mission_state.json still identifies Worker #340 / run ID 43622150773 as its last exact-HEAD verified run on 7a1dd14eeda25ae035d1fabb7e97873aa154b8a0; this is not CI proof for current HEAD.
- federation/PROJECT_FEDERATION_REGISTRY.json claims Worker #341 and Guard #100 passed, but run IDs and tested SHAs are not recorded there or in the latest continuity block. Those claims are retained as unverified, not promoted to exact-HEAD CI evidence.
- Existing workflow run-list retrieval is not exposed by the connected GitHub actions tools in this run. Do not infer run IDs from run numbers.

## Workflow and runtime source audit

Eight workflow files referenced by repository continuity history were fetched and inspected:

| Workflow | Trigger / permission | Finding |
|---|---|---|
| mission-autonomous-worker.yml | push, manual, 5-minute schedule; contents: write | Deterministic guard/tests/queue poll, then bounded AI executor; AI secrets gate; existing third-party actions are tag-pinned, not SHA-pinned |
| mission-continuity-guard.yml | push, manual, daily schedule; contents: read | Read-only state/queue validation |
| nexus-funded-job-scan.yml | manual only; contents: read | Legacy funding/bounty discovery; not P10CR revenue execution |
| nexus-bounty-agent.yml | manual only; contents: read | Legacy bounty flow; reads Bounty/PACT/Supabase secrets and includes Ollama install/model pull; do not activate under P10CR/V5 or cloud-only policy |
| nexus-jobbi-gigs.yml | manual only; contents/issues/pull-requests read | Job/gig discovery, excluded from P10CR by constitution |
| build-ai-ops-starter.yml | product path push/manual; contents: read | Test/package only |
| build-csv-to-action.yml | product path push/manual; contents: read | Test/package only |
| build-orbit-relay.yml | product path push/manual; contents: read | Test/browser QA/package only |

The current connector can fetch files but cannot enumerate a repository directory tree. Therefore these are the eight workflow files discoverable from continuity references, not a certified exhaustive .github/workflows directory listing. Existing workflows were not modified. A dedicated read-only B4 workflow is added separately and uses public git fetch rather than a third-party action.

Runtime modules inspected:
- scripts/swarm_runtime.py: in-memory state transitions; no durable cross-process lock or event journal.
- scripts/swarm_coordinator.py: bounded ThreadPool coordinator; Python threads cannot be forcibly terminated.
- scripts/mission_guard.py: JSON/queue/ledger invariants and one-active-task guard.
- scripts/worker_tick.py: deterministic queue poll/select only; no task execution.
- scripts/ai_task_executor.py: disabled/fail-closed until owner config; bounded draft-only inference path, no publication or funds movement.

The existing production worker remains deterministic and the AI provider remains unconfigured. No live LLM specialist, cloud deployment, cross-repo lock service or 24x7 daemon is claimed.

## B4 prototype contents

- scripts/durable_execution.py
- tests/test_durable_execution.py
- schemas/durable-execution-v1.schema.json
- .github/workflows/b4-durable-execution.yml

Core invariants:
1. Task registration is idempotent and binds ID, key, payload and owner-gate policy.
2. SQLite transactions serialize claims across threads and spawned processes; failure-injection tests confirm one concurrent claimant wins.
3. Task and publisher locks use monotonically increasing fencing tokens; task and publisher heartbeats extend only the current lease; stale tokens cannot heartbeat, finish or publish.
4. Event records are append-only at the SQL layer and chained with SHA-256; verification detects out-of-band mutation.
5. Checkpoint, status transition and event append occur in one transaction.
6. Retry delay is bounded exponential backoff; attempts are capped and exhausted tasks enter DEAD_LETTER.
7. Owner-gated tasks cannot be autonomously claimed.
8. Child process execution requires explicit executable and script allowlists, disables shell, discards output and kills the process group on POSIX timeout.

## Local verification

- python3 -m unittest discover -s tests -p 'test_durable_execution.py' -v: 16/16 PASS, including a six-process spawned claim race and publisher heartbeat/fencing.
- python3 -m py_compile scripts/durable_execution.py: PASS.
- python3 -m json.tool schemas/durable-execution-v1.schema.json: PASS.
- Runtime: Python 3.13 in the isolated tool container.

This is local prototype verification only. The dedicated GitHub Actions run must pass on the commit that adds these files before the prototype is called CI-verified.

## Deliberate non-changes and limits

- No existing production workflow, mission worker, queue dispatcher or AI provider configuration was changed.
- No third-party marketplace, seller account, KYC, terms, public listing, money movement, wallet signing or private key was accessed.
- opportunity_registry.json, payout_registry.json and revenue_ledger.json remain unchanged because this engineering milestone introduced no new buyer, payout or receipt evidence.
- Verified PCNE, bank-settled receipts and authorized spend remain ₹0.
- The prototype is not a distributed consensus service; SQLite is a single-database serialization boundary. Cross-cloud deployment, backup/restore, process-crash soak, multi-host lock enforcement, Windows process-tree termination and production queue integration remain unproven.
- Existing workflow inventory completeness is limited by the GitHub connector's missing directory-list operation.

## Next milestone

1. Verify the B4 workflow result on the exact commit.
2. Add multi-process crash/recovery and process-tree termination tests on the target Linux runner.
3. Review the complete workflow tree using an authorized directory/tree listing before changing any existing automation.
4. Implement a federation registry client and quota arbitration only after B4 race/soak tests; keep project queues and constitutions isolated.
5. Resume P59-001 portfolio-wide revenue-source ranking after the safe swarm handoff. Do not build a product until V5 buyer, competition, India payout, rights and zero-cost gates pass.
