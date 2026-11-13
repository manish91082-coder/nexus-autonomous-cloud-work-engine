# Repository Scope & Cleanup Audit — 13 November 2026

**Repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Branch:** `master`  
**Audited HEAD before this report:** `5267a9e4fa00db6012c9af5f1dd01ed8f1a7cde4`  
**Boundary:** This audit concerns only the canonical repository above. No other repository was inspected or modified.

## Executive finding

One canonical repository is sufficient for the unified ₹10 Cr mission. It already contains the control plane, opportunity/payout registries, product prototypes, evidence, queue, worker scripts and QA.

The repository does contain legacy and overlapping experiments. This is a scope/navigation problem, not a reason to mass-delete the history. The safe correction is to make V4, the machine state, queue, ranking report and current continuity authoritative, then preserve older material as archive/historical evidence.

## Current authority

1. `MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md`
2. `control/mission_state.json`
3. `control/automation_queue.json`
4. `REVENUE_OPPORTUNITY_RANKING_2026-11-13.md`
5. Current registries and product dossiers
6. `PROJECT_CONTINUITY.md`
7. All V1/V2/V3 plans and old phase reports are historical unless V4 explicitly points to them.

## Classification

| Path or workstream | Current classification | Action |
|---|---|---|
| Master plans V1/V2/V3 | Historical authority versions | Preserve; V4 supersedes current operating instructions |
| V4 master plan, README, mission state, queue, continuity | ACTIVE / CONTROL PLANE | Keep and update each execution turn |
| Research and opportunity/payout registries | ACTIVE evidence vault | Keep; date every new evidence report |
| Recruitment Agency Revenue Assurance Desk v0.3.0 | PRIVATE LOWER-TIER VALIDATION ASSET | Preserve; do not publish or continue feature work without new buyer evidence |
| MSME Ops Desk Lite | FREE-SAMPLE-ONLY HOLD | Freeze |
| CSV to Action | PRIVATE ADOPTION EXPERIMENT | No public repository/release until owner confirms IP/licence and adoption case |
| Message-to-Action Reliability | SYNTHETIC TECHNICAL DEMO | Reuse only after security and product-demand gates; no production claim |
| Revenue Ops Control / Job-to-Cash Control Kit | DUPLICATE / LEGACY | Freeze; consolidate only if a distinct buyer need is proved |
| Travel Revenue Demo | ARCHIVE | No current mission priority |
| Orbit Relay | PRIVATE GAME EXPERIMENT | Freeze features; require human playtest and CrazyGames acceptance evidence |
| `cloud-work-engine/` and bounty/task marketplace adapters | HISTORICAL OUT-OF-SCOPE | Preserve source and logs; no gig/job execution, bids or recurring schedules |
| `research/PHASE_13`–`PHASE_22` physical-sector/procurement research | HISTORICAL / OUT-OF-SCOPE | Preserve for provenance; do not reactivate as revenue lane |
| Current Internet revenue research / Phase 23 onward | EVIDENCE, not automatic active work | Keep only decisions still consistent with V4 |
| Old product-build workflows | REGRESSION / REPRODUCIBILITY | Keep; no automatic public release implied |
| Old worker, queue and mission scripts | ACTIVE SUPPORT, LIMITED | No claim of autonomous AI inference until provider configuration and exact-head evidence exist |

## Material documentation conflicts found

- `README.md` still advertised Phase 36/MSME as the current stage despite V3/Phase 45 being authoritative.
- `REPOSITORY_SCOPE_AUDIT_2026-11-12.md` still described V2 as the controlling plan.
- `PROJECT_CONTINUITY.md` still presented Getvik as the primary first-cash launch despite the owner's new direction to rank by largest scalable revenue first.
- `control/mission_state.json` still pointed to HEAD `4c3b7ec0...` and Worker run #155 although the live repository HEAD was `5267a9e4...`.
- `control/revenue_ledger.json` tracked bank-settled receipts only; it did not implement the owner's new platform-credited earnings KPI.

These are corrected by V4, the new priority report, and the current continuity/control-plane update. V3 and prior reports are not rewritten as if they had always contained the new policy.

## Safe cleanup plan

### Immediate
- Put V4 authority and current goal at the top of README and continuity.
- Reconcile the machine mission phase and HEAD pointers.
- Add the descending revenue-platform ranking.
- Add a single ordered P46 queue with dependencies.
- Freeze lower-priority products from new feature work.

### Later, only after a dependency audit
- Group historical research and old prototypes into clearly labelled archive folders only if Git history, links, CI paths and references can be preserved.
- Remove genuinely dead code only after reference search, workflow search, dependency analysis, backup/rollback and dry-run.
- No bulk deletion of product source, reports, datasets, tests, artifacts or prior checkpoints.

## Explicit non-actions

- No mass delete, folder move, repository rename, repository split, branch rewrite or history rewrite.
- No touching `manish91082-coder/ai-content-system` or any other repository.
- No seller account signup, KYC, terms acceptance, public release, paid plan, API purchase or money movement.
- No claim that product demand or revenue has been verified.

## Verification boundary

This is a focused root/tree and control-plane audit, not a line-by-line security audit of every historical source file. The complete recursive tree, every historical branch, every expired artifact and every external integration have not been exhaustively audited. The audit records this limit rather than implying full codebase certification.

**Decision:** retain one canonical repository; correct authority and continuity first; archive rather than delete; only remove files after explicit evidence of dead references.