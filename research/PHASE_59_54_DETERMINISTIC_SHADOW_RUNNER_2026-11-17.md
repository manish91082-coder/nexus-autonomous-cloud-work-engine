# Phase 59.54 — deterministic shadow-runner integration

**Mission:** P10CR / P59-003 AI agentic swarm foundation  
**Base master:** 8856bf908f93e265cefd5c739f7f46b3dd995b3c  
**Branch:** phase59-54-deterministic-shadow-runner  
**Status:** submitted for exact-head CI; not merged  
**Spend:** ₹0  
**External network:** 0 by design  
**Live provider calls:** 0  
**AI inference:** disabled  
**Production feature flags:** OFF

## Objective

Connect the project-cell SwarmRunDO to one deterministic, provider-free shadow task lifecycle. Keep the provider quota ledger independent and do not call it for this fixture. Prove registration, claim, checkpoint, fixture execution, completion, duplicate delivery suppression and recovery after Durable Object eviction.

## Implementation

- Added `cloud/swarm/deterministic-shadow-runner.mjs`.
- Runner accepts an injected authenticated RPC function and a deterministic fixture callback.
- It validates the P10CR task identity, idempotency key, policy SHA-256 fingerprint and worker identity. It independently recomputes SHA-256 over the canonical JSON fixture input and rejects any mismatch with the registered payload hash.
- It registers idempotently, reads the durable snapshot, verifies the event chain, claims or resumes the same worker's unexpired lease, checkpoints the claimed state, runs the fixture, checkpoints the deterministic result and completes against the exact run ID and fencing token.
- It performs a final snapshot and rejects completion unless the event chain is valid and the task is COMPLETED.
- It has no network, provider, model, publisher, wallet or payment capability.
- Added workerd integration tests for complete lifecycle, duplicate delivery, payload-hash binding and Durable Object eviction/reconstruction after the claim checkpoint.

## Test intent

1. Fresh task: REGISTERED → CLAIMED → CHECKPOINT 1 → deterministic fixture → CHECKPOINT 2 → COMPLETED.
2. Duplicate delivery after completion: return ALREADY_COMPLETED without rerunning fixture.
3. Restart: reconstruct the Durable Object after checkpoint 1, reuse the same valid worker lease/run/fencing identity, execute the fixture once, persist checkpoint 2 and complete.
4. Validate final durable event-chain integrity and terminal task status.

## Safety boundaries

- Fixture callback is supplied by the test and must be deterministic and side-effect-free.
- No global fetch or external provider request is made.
- No quota-ledger call is made for this fixture.
- No model inference, account action, publication, payment, wallet operation or deployment.
- Owner-gated tasks remain subject to the existing primary approval gate.
- Production flags OFF; spend ₹0.

## Acceptance gate

Do not merge until the exact PR head passes the full Workers/workerd runtime suite, all required regression workflows and mission-continuity checks. Record exact test counts and workflow URLs after CI. If any check fails or remains pending, fix or hold the PR.

## Known limitation

The runner is a deterministic shadow integration, not a production scheduler or autonomous AI executor. A fixture callback is not a model and its output is not revenue. The workerd runtime test is not proof of a deployed Cloudflare Durable Object, independent physical-host recovery, live provider connectivity or 24×7 production operation.
