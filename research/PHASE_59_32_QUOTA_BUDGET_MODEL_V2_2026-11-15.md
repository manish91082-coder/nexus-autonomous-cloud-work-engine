# Phase 59.32 — Quota Budget Model v2 (15-Nov-2026)

**Active mission:** P59-003 AI agentic swarm foundation  
**Scope:** safe admission model only; no live quota service or production deployment  
**Spend:** ₹0  
**Inference:** disabled

## Why the previous arbiter cannot be activated

The legacy `scripts/federation_quota_arbiter.py` allocates a fixed 10-request unit and writes each reservation through the same GitHub Git-ref store it is meant to protect. This creates a recursive accounting problem: admission itself consumes GitHub REST requests, while the reservation cost is not derived from observed operation-specific request counts. The fixed 36-reservation/hour limit and per-project caps are policy constants, not measured capacity for every token, repository, or GitHub API class. GitHub API quota dimensions can differ by credential and endpoint, so they must not be collapsed into a fictional account-wide number.

The Git-ref store is also a low-volume CAS journal, not a high-frequency transactional quota database. Therefore the old arbiter remains disabled and is not patched into service.

## Phase 59.32 deliverables

- `scripts/quota_budget_model.py`: provider-neutral quota admission model.
- `tests/test_quota_budget_model.py`: deterministic unit and concurrency-contract tests.
- `.github/workflows/phase59-32-quota-budget-model.yml`: isolated read-only CI.

### Model invariants

1. Budget key is the tuple `provider + credential_scope + window_id`; different credentials/windows are never silently pooled.
2. Admission requires fresh, valid observed quota telemetry. Missing/unknown telemetry must fail closed before this model is called.
3. Admission reserves `work_units + admission_overhead_units`; control-plane overhead is explicitly counted.
4. The quota ledger must live on a separate transactional provider from the provider quota being arbitrated. The model rejects same-provider storage to prevent self-consuming reservation loops.
5. Every reservation must be executed inside one serializable transaction shared by all independent workers for that credential/window. This module does not implement that store.
6. Safety reserve and recovery reserve are protected before admission.
7. Settled actual usage is committed; unused estimate can be released only after measured settlement.
8. Unknown transport/outcome retains the entire reservation as `UNCERTAIN_BUDGET_RETAINED`.
9. Actual usage above estimate raises a hard error; caller must freeze further admission and reconcile telemetry.
10. Duplicate reservation IDs, wrong worker, malformed units and ledger/window mismatch fail closed.

### Test coverage

- Work and admission overhead both charged.
- Safety and recovery reserves protected.
- Duplicate reservation blocked.
- Measured settlement releases only unused estimate.
- Unknown outcome retains budget.
- Underestimated usage blocks settlement.
- Same-provider quota ledger rejected.
- Credential/window mismatch rejected.
- 40 concurrent contenders against one serialized ledger: 18 accepted, 22 rejected, 198 of 200 admissible units reserved; no oversubscription.

The concurrency test simulates a serializable transaction with a process lock. It does **not** prove multi-host atomicity. That requires the future independent transactional control plane, with integration tests across separate hosts.

## Target production architecture

- Provider adapter reads the relevant credential's rate-limit headers/usage and normalizes provider-specific dimensions.
- A transactional control plane (Cloudflare Durable Object is the current candidate) serializes reservation/settlement per credential-scope/window.
- The control plane itself must be accounted for against its own independent quota and must never write reservations through the provider whose budget it arbitrates.
- Every worker requests a reservation before work, reports measured usage after work, and retains uncertain reservations after network ambiguity.
- Global fairness and project caps are applied only after measured per-operation costs and actual credential scopes are known.
- On stale/missing telemetry, store outage, clock/window ambiguity, quota exhaustion or reconciliation mismatch: `WAITING_FOR_QUOTA`; no paid fallback.

## Current limitations and next steps

- This is a pure model, not connected to GitHub API calls, Durable Objects, Workers, or any production worker.
- The model currently uses integer normalized quota units; provider adapters must define and validate unit semantics and endpoint costs.
- It does not yet model multiple rate-limit buckets for one provider credential (for example core, search, GraphQL, Actions minutes); those require distinct bucket identifiers under the same credential scope.
- It does not implement project fairness scheduling. Fairness must be layered over safe admission, not allowed to oversubscribe the provider.
- CI run `43697291088` was triggered on commit `104d23ce395d05e2b04200b9acea3bb952aa630b`; final result must be read from GitHub Actions before claiming PASS.

## Decision

**Do not enable the legacy GitHub Git-ref quota arbiter.** Phase59.32 provides a safer admission contract and tests, but the actual shared quota service remains a production blocker until a separate transactional store, provider-specific telemetry adapters, multi-bucket accounting and independent-host atomicity tests exist.

Next: verify Phase59.32 CI, add multi-bucket provider contract tests, then implement the transactional quota store adapter behind a disabled feature flag. No AI provider activation until the complete quota gate is proven.
