# Opportunity Decision Register — Destination Copy

Snapshot source:
- Repository: manish91082-coder/nexus-autonomous-cloud-work-engine
- Workflow run: 43041553414
- Commit scanned: 1cf0a5a18aead1ca7af3873937eb44c9f59a0013
- Artifact: nexus-funded-jobs-43041553414 (artifact ID 13864369755)
- Scan timestamp: 2026-11-11T14:45:42Z
- Scope: read-only public marketplace discovery; no bids, claims, purchases, submissions, registrations or wallet actions.

## Decision policy

A listing is not income. A candidate is not authorized work. A budget is not a guaranteed payout.
A task may advance only when all applicable gates are independently satisfied:
1. Open and available to this operator/agent.
2. Worker type explicitly permits autonomous AI execution, or terms clearly permit AI-assisted work.
3. Payment is a fixed, funded/escrow-backed payout, not an unaccepted bid budget.
4. Acceptance criteria are objective and feasible with available free compute/tools.
5. No required purchase, deposit, stake, bond, paid subscription, KYC impersonation, physical action, or region-restricted purchase.
6. Expected net payout after platform, network, conversion and withdrawal costs is positive and worthwhile.
7. Submission route and payout route are supported for the operator's jurisdiction.
8. Any account-specific identity, wallet signing, legal attestation or consequential submission remains owner-controlled.

## Decisions from first destination scan

### MoltJobs

| Listing | Listed amount | Evidence | Decision |
|---|---:|---|---|
| WharfUp.com Landing Page | 150 USDC | BID mode; funded=false; no escrow transaction; six acceptance criteria | WATCH ONLY. Bid budget is not a secured payout. |
| Landing page for pedex.org | 150 USDC | BID mode; funded=false; no escrow transaction; six acceptance criteria | WATCH ONLY. Bid budget is not a secured payout. |
| Other independent listings | 5–200 USDC | Finance/asset-tokenization/CBDC/sovereign wealth risk, low value, or missing acceptance criteria | EXCLUDE pending safer terms or better evidence. |
| Referral/forum listings | 0.2 USDC | Referral/forum participation, not ordinary paid work | EXCLUDE. |

The two landing-page tasks are not assigned work and are not authorized for execution. Private detail reads were unavailable without a platform credential; do not invent missing terms.

### Dealwork

20 records were discovered. The current sample exposes posterFunded=false for all 20.

Decision: BLOCK all 20 until the platform provides independent evidence that the payer's funds are locked and the task's worker/AI permissions are acceptable. The listed USD values are not guaranteed income.

### Taskmarket

10 records were discovered. The detail records include escrow transaction references and frozen terms, but a reference alone does not establish that the worker is eligible, the task is unclaimed, or the payout will be awarded.

| Listing | Listed reward | Material conditions | Decision |
|---|---:|---|---|
| FlapJax Series 3 Q97 | 1 USDC | First-timers only; chain analysis; own public audit page; uncovered receipt requirement; worker handle/identity | DEFER. Verify first-timer eligibility, current slot availability, submission mechanics and net settlement before considering. No public post or submission authorized. |
| FlapJax Series 3 Q96 | 1 USDC | First-timers only; historical chain analysis; public audit page and worker identity | DEFER for the same eligibility and economics reasons. |
| Lumen House shopping challenge | Up to 15 USDC | Requires product purchases, own funds, guestbook post, receipt, and US-purchaser-only Help Map eligibility | EXCLUDE. Upfront spending and geographic restriction violate zero-capital/India-first execution gate. |
| Dungeon Crawler microtasks | 0.25 OUSD each | Multiple separate code changes, git commits/bundles, first-working-commit or competition-style acceptance | EXCLUDE from priority queue. Very low reward and competitive acceptance risk. |
| Other FlapJax research task | 1 USDC | Similar first-timer and public evidence requirements | DEFER pending eligibility and economics proof. |

Taskmarket terms in this snapshot show no stake required on the listed tasks. That does not remove the other eligibility, acceptance, platform fee, settlement and payout risks.

### BasedAgents

18 records were discovered:
- 10 bounty records are not escrow-ready/claimable, or require a claim bond.
- 8 are non-cash/no-bounty tasks.

Decision: BLOCK or EXCLUDE. Do not pay a bond or register a wallet for these tasks.

### Bounty

Authenticated discovery returned `needs_agent_api_key`. This is a credential-readiness state, not evidence that the marketplace has no tasks. No key was present, and no write actions were attempted.

## Economic conclusion

- Qualified, fully evidenced, immediately executable paid tasks in this snapshot: **0**
- Secured MoltJobs assignments: **0**
- Dealwork funded tasks in sample: **0**
- Confirmed realized income: **0**
- Marketplace writes or submissions: **0**
- Purchases, wallet actions or paid infrastructure: **0**

## Next technical priorities

1. Improve Taskmarket normalization to expose eligibility, first-timer restrictions, worker-address requirements, platform fee and payout status as first-class fields.
2. Add a deterministic cross-marketplace economic/eligibility gate so low-value, purchase-dependent, region-restricted and first-timer-only listings are not promoted as actionable candidates.
3. Add an evidence-backed per-task report that distinguishes: discovered, details verified, escrow receipt verified, eligible, feasible, authorized, submitted, accepted and paid.
4. Keep all marketplace operations read-only until a task is both economically viable and explicitly authorized.

## Non-negotiable boundaries

- Work only in this destination repository.
- Never modify the original `manish91082-coder/ai-content-system` repository.
- Never put credentials, wallet secrets or personal identity data in source files or chat.
- No task registration, bid, claim, purchase, public submission, wallet signing, payment or withdrawal without the required owner-controlled authorization.
- Count revenue only after actual payout receipt is independently reconciled net of all applicable costs.
