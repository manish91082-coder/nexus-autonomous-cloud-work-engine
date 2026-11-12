# Execution Status & Progress Reporting Protocol

**Effective:** 2026-11-12  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem V3

## What actually runs

1. **Daily reasoning/execution session:** ChatGPT scheduled task “Advance ₹10 Cr Mission”, 08:30 Asia/Kolkata. It starts a bounded agent run. It is not an always-on worker and does not guarantee eight hours of work or continuous execution between runs.
2. **Hourly progress watcher:** ChatGPT task “₹10 Cr Progress Watch”, hourly. It checks repository/CI/task state and notifies only on meaningful progress, failure, blockers, material drift, unexpected inactivity or verified payout.
3. **GitHub deterministic guard:** `.github/workflows/mission-continuity-guard.yml`, currently scheduled daily at 08:11 Asia/Kolkata plus manual dispatch. It validates JSON and task dependencies. It does not perform AI research or product execution.

## User-facing status states

- **SCHEDULED:** future run exists; no run evidence yet.
- **IN_PROGRESS:** a run is recorded as active. This does not prove a worker is continuously alive.
- **COMPLETED:** run ended; inspect its result and changed files before calling it productive.
- **FAILED:** run failed; inspect logs and retry/repair safely.
- **NO_UPDATE:** run completed without a user-visible update; inspect result/state before assuming no work.
- **BLOCKED_OWNER:** one specific KYC/legal/payment/publication/wallet/spend approval is required.
- **IDLE_OR_STALE:** expected run did not produce new commit, report, queue movement or explicit reason.
- **DIRECTION_DRIFT:** work no longer maps to a V3 opportunity, evidence gate or ₹10 Cr objective.

## Mandatory progress evidence per execution

Each execution should record start/end timestamps and automation run reference; starting and ending GitHub HEAD; task IDs started/completed/blocked/failed; files changed and commit SHA; CI run IDs and conclusion; research sources added and freshness; test counts/failures; decisions and revenue rationale; owner gates; receipts/fees/refunds/costs; next queued task and checkpoint.

A run is **productive** only when it advances a queue item with inspectable evidence, code/test output, a committed report, or a verified external milestone. Merely waking up or sending a status message is not productive work.

## Daily progress scorecard

Report tasks completed/attempted/blocked; verified source count and categories; candidates passing/failing hard gates; pilots selected and why; CI pass/fail; new commits and changed files; verified settled receipts and costs; next action and owner gate.

Do not invent an hours-worked figure. Agent runtime, task count and evidence are the measures available; there is no promise of a fixed daily number of hours.

## Continuous-work limitation and next engineering step

Scheduled ChatGPT runs are discrete sessions. The hourly watcher is a status poll, not an always-on AI worker. GitHub Actions is a bounded deterministic runner. A true continuous agent daemon would need an always-available compute host, persistent credentials, safe execution sandbox and operational budget; under the current ₹0 spend rule, do not claim that this exists. Prefer event-driven/scheduled bounded jobs and persistent queue recovery. If free-tier limits or sleep policies prevent reliable operation, document the limitation and ask before any paid infrastructure.

## Current verified scheduler state at 2026-11-12

- Daily execution task is enabled for 08:30 Asia/Kolkata; no recorded run yet; next run 2026-11-13 08:30 IST.
- Hourly progress watcher is enabled; no recorded run yet; next check 2026-11-12 08:44 IST.
- GitHub workflow is committed; first workflow run is pending verification.
- Therefore: automation is configured, but no evidence yet that autonomous work has executed successfully. Do not describe it as continuously working.
