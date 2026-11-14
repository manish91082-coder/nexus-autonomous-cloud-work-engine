# Phase 53 — Google Sheets Formula Integrity: Technical Feasibility Matrix
**Date:** 14 November 2026  
**Authority:** Master Constitution V4  
**Queue task:** P53-001  
**Decision:** HOLD; universal/team-grade product not yet technically qualified  
**Build status:** NOT APPROVED  
**Spend:** ₹0 authorised

## 1. Question being tested

Can a zero-new-spend Google Workspace Marketplace add-on reliably detect and recover spreadsheet formula changes across collaborators and common edit paths, with accurate actor attribution and repeatable operation?

This report distinguishes:
- **Formula integrity:** whether formula expressions remain present and structurally consistent.
- **Calculated-value correctness:** whether a formula's output is correct given its inputs and external dependencies.
- **Change attribution:** who made a change.
- **Recovery:** whether an earlier formula can be restored without overwriting legitimate user work.

These are different promises. A product must not market all four as one capability unless each is proven.

## 2. Path-by-path feasibility

| Edit / event path | Platform evidence | What can be observed | Recovery / attribution feasibility | Current decision |
|---|---|---|---|---|
| Single-cell manual edit in Sheets UI | Simple/installable `onEdit(e)` fires for user cell edits; event can include range, value and (only for a single cell) oldValue. | Can identify changed range and compare against a stored formula baseline. | A script can restore a stored formula. Editor identity is conditional; it may be unavailable. | **FEASIBLE, BEST-EFFORT** |
| Multi-cell paste / fill | `onEdit(e)` provides the edited range; `oldValue` is only available for a single cell. Simple `onEdit` has a documented queue limitation. | Can identify the affected range, but cannot depend on event.oldValue to restore all prior cells. | Requires a formula manifest / snapshot outside the event payload; paste, partial formulas and legitimate bulk edits need carefully tested diff logic. | **FEASIBLE WITH SNAPSHOT; TEST REQUIRED** |
| Insert row / column | Installable change events expose change types including INSERT_ROW and INSERT_COLUMN. | Can detect structural changes, but the event does not supply a full semantic map of formula lineage. | Formula propagation/rebinding requires range/template logic and regression tests; restore may move or recreate references incorrectly. | **PARTIAL; NOT PROVEN** |
| Sort / move ranges | The official event type list does not document a dedicated deterministic sort/move event with a stable before/after cell map. | A sort may be seen as an edit/other change depending on operation; exact behavior requires controlled testing. | Restoring formulas without reversing a legitimate sort or data movement is non-trivial. | **UNKNOWN; NO RELIABILITY CLAIM** |
| Apps Script `setValue()` / programmatic writes | Google documents that script executions do not invoke edit triggers. | `onEdit` cannot be relied on to see these writes. | Requires polling/API reconciliation, a separate cooperating script, or an application-specific connector. | **NOT EVENT-OBSERVABLE** |
| Sheets API / external API writes | Google documents that API requests do not invoke edit triggers. | No immediate `onEdit` event. | Polling with Sheets API can compare a manifest, but introduces latency, quota, scope and cost limits; no immediate recovery guarantee. | **NOT EVENT-OBSERVABLE; POLLING ONLY** |
| Import / external data refresh / IMPORTRANGE / formula recalculation | Formula expression can remain unchanged while its result changes; external data changes are not equivalent to a user overwriting a formula. | Need to distinguish formula-text changes from calculated-value changes. | Formula overwrite recovery cannot fix missing upstream data, recalculation delay or a bad source value. Those need a separate data-quality product. | **OUT OF SCOPE FOR FORMULA-LOCK MVP** |
| Collaborator identity | Apps Script event object may include `user`, but availability depends on security restrictions. `User.getEmail()` may return blank in some execution contexts. | Cannot promise reliable named-user attribution for every consumer Gmail / cross-domain collaborator. | Log actor as unknown when not available; do not infer identity. | **PARTIAL ONLY** |
| Script / trigger removal | Existing direct solution documents that an editor with sufficient rights can remove its bound script. | A client-side/bound script cannot guarantee its own continued presence against an authorised editor. | External service can add detection, but requires broader access, deployment and monitoring architecture; still cannot prevent an owner from revoking permissions. | **NOT TAMPER-PROOF** |

Primary technical sources:
- Apps Script triggers and event objects: https://developers.google.com/apps-script/guides/triggers/events
- Simple trigger restrictions: https://developers.google.com/apps-script/guides/triggers/
- Installable trigger restrictions: https://developers.google.com/apps-script/guides/triggers/installable
- User email availability: https://developers.google.com/apps-script/reference/base/user
- Apps Script quotas: https://developers.google.com/apps-script/guides/services/quotas
- Google Sheets API scopes: https://developers.google.com/workspace/sheets/api/scopes
- Workspace add-on scopes: https://developers.google.com/workspace/add-ons/concepts/workspace-scopes

## 3. Runtime and scope economics

Current official Apps Script documentation lists:
- Consumer account trigger runtime: 90 minutes per day.
- Google Workspace account trigger runtime: 6 hours per day.
- Maximum execution runtime: 6 minutes.
- Trigger count: 20 per user per script.
- Property storage: 500 KB per property store.
- Quotas can change and are enforced per user.

Source: https://developers.google.com/apps-script/guides/services/quotas

OAuth scope options:
- `spreadsheets.currentonly` is suitable only for the currently active spreadsheet when used through Apps Script Services.
- Direct Sheets API `spreadsheets` access is sensitive and covers all user spreadsheets.
- A public Marketplace app using sensitive scopes must complete OAuth verification; some restricted scopes can require a security assessment.

Sources:
- https://developers.google.com/workspace/add-ons/concepts/workspace-scopes
- https://developers.google.com/workspace/sheets/api/scopes
- https://developers.google.com/workspace/marketplace/about-app-review

Implication:
- A small, bound-script feature that handles UI edits in one spreadsheet may be feasible without a paid backend.
- A continuous, cross-file, API-aware, multi-user product needs a broader architecture. A one-minute polling design would have to prove API-call budgets, per-owner quotas, execution time, data retention, retries, idempotency and recovery correctness. Those have not been demonstrated.
- Requesting broad spreadsheet scope to overcome limitations creates a heavier OAuth review and trust burden. Do not request it until a product gap and minimum-scope architecture are proven.

## 4. Direct incumbent capability and differentiation

FormulaLock already offers:
- free protection on one tab per spreadsheet;
- automatic restoration after collaborators type/paste over a locked cell in the Sheets UI;
- change logging;
- published Pro pricing of USD $19 one-time for wider tab coverage, although the website currently says Pro is closed and not taking orders.

Its documented limits include:
- script can be removed by an editor with sufficient access;
- imports, other scripts and Sheets API edits are not caught;
- user identity is not guaranteed in every account/security context;
- formula cells are not hidden or encrypted.

Sources:
- https://formulalock.com/
- https://formulalock.com/limits
- https://formulalock.com/terms

This shows a real solution and a published price hypothesis, not proven sales or recurring subscriptions. The fact that Pro orders are closed must not be interpreted as demand or commercial success.

## 5. Technical decision

### Limited scope that appears feasible
- User-authorised single-spreadsheet helper.
- Manual formula lock/unlock.
- Best-effort detection of manual Sheets UI edits.
- Stored formula baseline for multi-cell paste recovery.
- Explicit warning when actor identity is unavailable.
- Clear exclusions for API, script, imports, structural operations and calculated-value correctness.

But this is substantially overlapping with FormulaLock and would likely be a low-ticket one-time utility, not yet a credible recurring ₹10 Cr path.

### Scope not currently qualified
- Universal detection across UI, API, Apps Script, integrations and imports.
- Guaranteed named-user attribution across consumer Gmail and external domains.
- Tamper-proof enforcement against authorised editors.
- Automatic recovery without risking overwriting legitimate bulk edits or formulas that have intentionally changed.
- High-frequency cross-spreadsheet monitoring under zero-spend quotas.

### Decision: HOLD, not GO

The project should not build a “universal spreadsheet integrity monitor” based on the current evidence. A narrower team-control SaaS remains only a research hypothesis. It must first prove:
1. a technical architecture for each edit pathway, with no false promise;
2. independent current buyer signals and evidence of recurring budget;
3. why a customer would pay repeatedly rather than use FormulaLock, protected ranges or ARRAYFORMULA;
4. positive net economics after cloud, monitoring, support and OAuth verification costs.

Until those conditions pass, no code, marketplace listing, account creation or spending is authorised.

## 6. Next action under P53-001

Continue Google Workspace problem-first discovery beyond formula locking. Avoid generic spreadsheet automation, formula checking, notification, attachment archival and approval workflows already covered by the audited incumbents. Identify a new recurring business outcome with two independent strong demand signals, a direct paid substitute and a defensible gap. If no candidate passes, continue to HubSpot/Slack research under the Phase 53 order.

**Financial truth:** platform/provider-credited net earnings ₹0; bank receipts ₹0; authorised spend ₹0.
