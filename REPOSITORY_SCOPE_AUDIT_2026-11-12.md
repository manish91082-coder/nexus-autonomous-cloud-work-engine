# Repository Scope Audit — 2026-11-12

## Executive result

The recursive Git tree at commit `10b967b1d61185584fa50ab60c69b8ee68745cb1` contained **166 entries** (directories plus files; not 166 source files). The repository is broadly related to earlier autonomous revenue-engine experiments, but it is **not yet a clean, single-current-strategy repository**. It contains historical bounty/task marketplace automation, old physical-sector/solar and travel/client-operations research, multiple product prototypes and the current Internet-only monetization experiment.

No evidence in this tree indicates that unrelated election, livestock, ERP, crypto trading, spiritual archive or renewable-energy projects were placed here. The separate original repository `manish91082-coder/ai-content-system` is referenced by legacy continuity documents and must remain untouched.

## Current controlling rule

`MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V2.md` is the sole controlling scope. Historical artifacts remain for provenance, not as active instructions.

## Inventory and classification

| Area | Observed contents | New status |
|---|---|---|
| Master governance | `PROJECT_CONTINUITY.md`, `MISSION/*`, `strategy/*` | Keep; v2 master plan overrides conflicting older instructions |
| Old cloud work engine | `cloud-work-engine/*`, bounty/gig/task scanners, marketplace adapters and task deliverables | ARCHIVE / OUT OF SCOPE for current self-serve revenue mandate |
| Old marketplace workflows | `nexus-bounty-agent.yml`, `nexus-funded-job-scan.yml`, `nexus-jobbi-gigs.yml` | Pause schedules; retain manual dispatch only |
| Historical physical-sector research | `research/PHASE_13` through `PHASE_22`, including procurement, buyer operations, solar O&M and subcontracting | ARCHIVE / OUT OF SCOPE |
| AI Ops Starter | `products/ai-ops-starter/*` | LEGACY EXPERIMENT; no paid release without new demand gate |
| CSV-to-Action | `products/csv-to-action/*` | LEGACY / FREE ENGINEERING PILOT; generic category already rejected as flagship |
| Message-to-Action Reliability | `products/message-to-action-reliability/*` | LEGACY TECHNICAL DEMO; may be reused as internal infrastructure only after audit |
| Revenue Ops Control | `products/revenue-ops-control/*` | LEGACY EXPERIMENT; no paid release without demand and self-serve gate |
| Travel Revenue Demo | `products/travel-revenue-demo/*` | ARCHIVE / OUT OF SCOPE; client/travel operations are not current mission |
| Orbit Relay | `products/orbit-relay/*` | ACTIVE bounded game pilot; internal codename only; not published |
| Current online revenue research | `research/PHASE_23` through `PHASE_28` | Keep; use only where consistent with master plan |
| CI build workflows | `build-*.yml` for product experiments | Keep for regression/build reproducibility; no public publishing implied |

## Obsolete schedules found

Three old workflows have recurring schedules unrelated to the current self-serve digital-asset strategy:
- `nexus-bounty-agent.yml`: every 5 minutes.
- `nexus-funded-job-scan.yml`: hourly at minute 17.
- `nexus-jobbi-gigs.yml`: hourly at minute 37.

These consume free-tier automation quota and continue work now excluded by the user. Their recurring schedules and push triggers should be removed while preserving manual `workflow_dispatch` for forensic reproducibility. No task claims, bids, wallet actions or submissions are authorized.

## Cleanup policy

- Preserve history and existing product source. Do not mass-delete old work.
- Mark archived material clearly; do not treat it as current execution.
- Do not modify `manish91082-coder/ai-content-system`.
- Do not add any unrelated project to this repository.
- Only Orbit Relay remains an active product pilot at this checkpoint.
- Reassess any archived product only through the master opportunity hard gates.

## Verification limits

- The inventory is a complete recursive tree snapshot for the commit shown above (`truncated=false`).
- This is a path/content classification, not a line-by-line security or source-code audit of all 166 entries.
- No claim is made that all historic branches, forks, GitHub Actions artifacts or the separate original repository have been exhaustively audited.
