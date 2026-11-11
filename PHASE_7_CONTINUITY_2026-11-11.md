# Phase 7 — Evidence-first opportunity ranking
Date: 2026-11-11

## Implemented
- Added `cloud-work-engine/opportunity_ranker.py`, a deterministic ranking layer invoked after the cross-marketplace economic gate in `.github/workflows/nexus-funded-job-scan.yml`.
- Added `cloud-work-engine/tests/test_opportunity_ranker.py` covering unknown evidence, tx-reference vs funding proof, human-only restrictions, known positive net economics, and unknown-cost fail-closed behavior.
- Ranking is explicitly a deterministic evidence score, not an acceptance probability. It never authorizes bids or submissions.
- Components: USD/USDC reward floor ($50 priority), task-level funding proof, explicit AI/agent permission, verified India payout, known fees and execution cost, acceptance criteria + capability match, and observed competition. Missing facts remain blockers; no FX, costs, payout eligibility or probability are invented.
- Strict shortlist is only for human review when every blocker is cleared and score >=80. All write actions remain disabled.
- Scanner workflow now runs the ranker and uploads `report/opportunity-ranking.json`.

## Regression fixed
- Latest product workflow run 43045520782 failed after all 8 tests passed because a literal `\\n` was embedded in a multiline shell command, causing `test: too many arguments`.
- Corrected the YAML run block to use real line breaks. Awaiting cloud verification.

## Current gates
- PACT Agent key remains absent from Vault; do not bypass blocked provisioning.
- No assignment accepted, no submission, no payout, no external net income. Recognized income remains 0.
- Original source repository `ai-content-system` remains read-only.
- Destination: `manish91082-coder/nexus-autonomous-cloud-work-engine`.
