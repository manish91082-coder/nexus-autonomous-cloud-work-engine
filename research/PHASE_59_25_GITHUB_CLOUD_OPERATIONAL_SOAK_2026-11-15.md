# Phase 59.25 — Isolated GitHub Cloud Operational Soak

Date: 2026-11-15  
Canonical repository: `manish91082-coder/nexus-autonomous-cloud-work-engine`  
Execution workflow: [Run 43694502929 — SUCCESS](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43694502929)  
Read-only contract/regression CI: [Run 43694502933 — SUCCESS](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43694502933)  
Exact tested feature-branch head: `cbba2e23596d901646a4e16f0cfc71ca01b44d8c`  
Machine-readable evidence artifact: `phase59-25-cloud-soak-43694502929` (artifact ID `14153369478`, SHA-256 `398d49ba831a527a845367647a457f194fc187af250bcc3f4674312d422e07e5`)

## 1. What was executed

A GitHub-hosted `ubuntu-latest` runner exercised actual GitHub Git-ref REST compare-and-swap writes against the isolated disposable branch `phase59-25-cloud-soak-state`, using a dedicated state path:

- `federation/phase59-25-cloud-soak/state.json`
- `federation/phase59-25-cloud-soak/events/`

The run did not write to the production `federation-locks` branch or any production mission state.

## 2. Verified results

- Eight concurrent worker threads acquired eight unique durable leases.
- Eight distinct fencing tokens were assigned.
- Three initial CAS contention losers were recovered through the bounded serial recovery lane. Only `CASConflict` was eligible for this recovery; HTTP, quota, permission and transport failures remain fail-closed.
- Eight concurrent duplicate deliveries against an already-held scope were rejected with `LockBusy`; no duplicate lease/event was committed.
- Wrong-owner heartbeat was rejected by stale-fence validation.
- Six atomic heartbeat batches renewed all eight leases each time.
- Final durable state retained eight active leases and generation 14.
- The append-only journal verified successfully: 15 events including genesis, eight claims and six batch-heartbeat events.
- Total cloud run duration: 277.294 seconds.
- Target soak: 180 seconds; measured soak interval: 218.698 seconds, including heartbeat operation time.

## 3. API quota evidence

| Metric | Observed |
|---|---:|
| Requests attempted | 405 |
| Shared run ceiling | 480 |
| Successful HTTP responses | 372 |
| Error HTTP responses | 33 |
| Transport failures | 0 |
| GitHub rate-limit capacity | 5,000 |
| Remaining quota at end | 4,504 |
| Protected safety reserve | 100 |
| Telemetry missing | false |

The 33 non-success responses were observed during the Git-ref contention / missing-first-event-path operations. The final response was HTTP 200. The run ended below the shared request ceiling and above the protected rate-limit reserve. No inference or paid provider request was made.

## 4. Engineering correction from failed attempts

Two earlier cloud runs failed and were retained in Actions history:
- Run 43694152956 exposed the script import-path issue; fixed by adding the repository root to `sys.path`.
- Run 43694371779 showed that five CAS attempts were insufficient for three of eight simultaneous workers. The report captured the 422 non-fast-forward conflicts. The store now adds per-instance retry jitter, and the cloud harness retries CASConflict losers serially with a fresh bounded invocation. The final run recovered three workers and completed all acceptance checks.

An intermediate run 43694291633 was started before the isolated state branch had been reseeded after cleanup and failed closed on a missing state file. No production branch was touched. The seed-before-run guard remains mandatory.

## 5. Exact CI

Read-only CI run `43694502933` passed:
- Python compilation of the cloud soak, quota guard and Git-ref store.
- Thread-safe quota guard tests, including one shared ceiling across 64 concurrent callers.
- Existing federation lock, quota arbiter and partitioned journal regression suites.

Operational cloud run `43694502929` passed all steps:
- Isolated branch existence check.
- Actual eight-worker GitHub REST CAS cloud execution.
- Machine-readable artifact upload.
- Disposable test branch cleanup.

## 6. Limits and remaining gates

This is genuine GitHub REST/Git-ref cloud execution, but all eight workers ran as threads within one GitHub-hosted runner. It is not an eight-host deployment or proof of cross-host exactly-once execution.

This short soak is not the 7-day/30-day production soak. The shared request ceiling is process/run-local. Cross-run/cross-repository global quota arbitration, branch ruleset enforcement, owner-approved GitHub App integration, the P10CR production worker client and the read-only external research client remain separate P59-003 gates.

No production clients, production lock writes, AI inference, paid services, customer data, owner-only actions or spend were enabled. Verified PCNE remains ₹0; authorized spend remains ₹0.

## 7. Decision and next phase

Phase 59.25 controlled cloud execution and short operational soak: **PASS**.

Next: Phase 59.26 specialist agent workflow integration, while retaining the global quota / owner-approval / production-isolation gates. Then safe handoff to the V5 portfolio research and product execution lane. Do not call the swarm production-autonomous until its separate cross-run quota and 7/30-day soak gates are met.
