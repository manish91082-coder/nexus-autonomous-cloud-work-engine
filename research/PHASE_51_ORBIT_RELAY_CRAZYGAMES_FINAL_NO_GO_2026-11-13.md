# Phase 51 — Orbit Relay / CrazyGames Qualification: NO-GO as-is

**Date:** 13 November 2026  
**Authority:** MASTER_PLAN_10CR_AUTONOMOUS_REVENUE_ECOSYSTEM_V4.md  
**Queue task:** P51-001  
**Decision:** **NO-GO for submitting or monetising the current Orbit Relay build as-is.**  
**Platform status:** CrazyGames remains a possible channel for a genuinely distinctive future game; this prototype is not approved for submission.  
**Spend:** ₹0 authorised. No developer account, terms, billing profile, KYC, game submission, SDK, ads or paid service activated.

---

## 1. Executive decision

CrazyGames has a large existing web-game audience and a low-friction Basic Launch process, but the current Orbit Relay game is not sufficiently differentiated from existing successful CrazyGames titles. The core game loop is already served by direct competitors:

- Rotate individual pipe/circuit tiles.
- Connect a source to a destination.
- Form a continuous path.
- Use hints.
- Progress through increasingly difficult levels.

Two long-standing CrazyGames titles match this gameplay proposition closely:
- **Plumber Pipe Out**: 8.8 rating (last six months), 4.2K likes / 557 dislikes, 250 levels, hints and undo; rotates pipes to connect water flow.
- **Pipe Puzzle**: 9.3 rating, 5.1K likes / 631 dislikes, 100 levels and hints; rotates/rearranges pipe pieces to create a single connected flow.

The current Orbit Relay differentiators are:
- electrical/signal theme instead of water pipes;
- deterministic procedural board generation rather than a fixed hand-designed level catalogue;
- campaign progression, a daily seeded challenge, local score and time/move scoring;
- single HTML file / offline-first design.

Those are engineering/packaging differences, but not yet a clearly distinguishable gameplay proposition. CrazyGames explicitly requires the Full Launch game to be original and clearly distinguishable from existing games before revenue share eligibility.

The platform's Basic Launch is a useful discovery mechanism but does not pay:
- it requires at least 7 live days and 500 plays to conclude at the 7-day point;
- if 500 plays are not achieved, it ends automatically after 21 days;
- progression to Full Launch is decided by CrazyGames using its own review and engagement criteria;
- Basic Launch has no monetization;
- Full Launch requires SDK integration.

The platform's own KPI guidance says successful titles often see 10+ minutes average playtime; strong games often see 10–15% Day 1 retention; top-performing titles typically exceed 80% one-minute conversion and strong games are in the top 20% of category CTR. Orbit Relay has no human playtest results, no real player sessions, no retention or conversion data, and no verified distribution or revenue evidence.

There is also an exact-source QA gap: the last successful Orbit Relay CI run (#12, commit `fd80cd20...`) predates later changes to `game.js`, `index.html` and `tests/browser.test.cjs`. The current browser test file contains a CrazyGames viewport matrix test, but no exact-HEAD successful run for the latest source was found. Therefore the prior CI success must not be reported as proof that the present source passed all current tests.

**Decision:** Do not submit the current prototype. Freeze feature development. Preserve it as a private engineering asset. Re-open only if a materially different core gameplay mechanic is designed and demonstrated to real players, or if an independently validated new market/distribution hypothesis emerges.

---

## 2. Current Orbit Relay product audit

The canonical repo contains:
- `products/orbit-relay/index.html`
- `products/orbit-relay/game.js`
- `products/orbit-relay/puzzle.js`
- `products/orbit-relay/tests/puzzle.test.cjs`
- `products/orbit-relay/tests/browser.test.cjs`
- `products/orbit-relay/HUMAN_PLAYTEST_PROTOCOL.md`
- `products/orbit-relay/CRAZYGAMES_SUBMISSION_PACKET_DRAFT.md`

### Implemented features
- 5×5 to 7×7 procedurally generated signal-routing grids.
- Rotate relay tiles by clicking/tapping.
- Source-to-destination connectivity check.
- Campaign progression and local save.
- Daily UTC-seeded puzzle.
- Timer, move counter, hint penalty, score and best score.
- Keyboard focus and basic touch controls.
- Vanilla HTML/CSS/JavaScript; no external libraries, server, account, ads or remote data.
- Artwork is drawn as inline SVG geometry in code; repository README claims no third-party imagery, fonts, characters or branded assets.

### Missing commercial/product proof
- No actual human playtest sessions; the prepared 5–8 tester protocol remains unexecuted.
- No measured voluntary replay, average session duration, daily return, difficulty fairness or onboarding comprehension.
- No user acquisition, store views, real player count or retention data.
- No validated unique gameplay mechanic beyond the established rotate-to-connect puzzle loop.
- No cleared public title. “Orbit Relay” is still an internal codename.
- No finished store cover art or preview video.
- No CrazyGames submission or platform acceptance.
- No SDK, monetization, platform analytics or remote save in the current build.

### Source/rights boundary
The source README claims original code-drawn SVG artwork and no third-party assets. That claim is supported by the current file structure at a surface level, but no independent IP/trademark clearance for the internal title or a public game name has been completed. Do not publish under “Orbit Relay” without title clearance.

---

## 3. Direct CrazyGames competitor evidence

The following public Marketplace snapshots were accessed on 13-Nov-2026:

| Game | Current listing evidence | Direct overlap |
|---|---|---|
| [Plumber Pipe Out](https://www.crazygames.com/game/plumber) | 8.8 rating; 4.2K likes / 557 dislikes; 250 levels; five difficulty options; hints; undo | Rotating individual pipe tiles to connect a water source and destination |
| [Pipe Puzzle](https://www.crazygames.com/game/pipe-puzzle) | 9.3 rating; 5.1K likes / 631 dislikes; 100 levels; hints; desktop and mobile app versions | Rotating/rearranging pipe pieces to create one connected flow |
| [Plumber Soda](https://kids.crazygames.com/game/plumber-soda) | Existing CrazyGames Kids pipe-rotation puzzle | Rotate straw pieces to connect keg and bottle |
| [Flow Mania](https://www.crazygames.com/game/flow-mania) | 9.0 rating; established browser/mobile title | Connect same-colour dots into valid paths without crossing |

Ratings and votes are platform-displayed engagement signals, not verified revenue or active-user counts. The first two titles are the closest gameplay comparators and have years of listing history and substantial player feedback.

### Differentiation matrix

| Dimension | Orbit Relay | Existing direct competitors | Result |
|---|---|---|---|
| Core action | Rotate tiles | Rotate/rearrange pipe tiles | No differentiation |
| Objective | Connect source to destination | Connect source to destination | No differentiation |
| Theme | Electrical signal/circuit | Water/pipes/straws | Cosmetic differentiation only |
| Levels | Procedurally generated endless progression | 100–250 authored levels, difficulty options | Different production method, but player value unproven |
| Daily challenge | Deterministic UTC seed | Daily mode varies by competitor; not enough to prove unique | Weak differentiation |
| Hints | One tile per hint with score penalty | Hints and/or undo | Not distinctive |
| Multiplayer/social | None | Not required by direct comparison | No additional retention mechanic |
| Retention proof | None | Existing high public engagement ratings/votes | Unproven |

**Conclusion:** A circuit theme and generated boards alone are not enough to support a “clearly distinguishable” claim for a rotate-to-connect puzzle.

Sources:
- https://www.crazygames.com/game/plumber
- https://www.crazygames.com/game/pipe-puzzle
- https://kids.crazygames.com/game/plumber-soda
- https://www.crazygames.com/game/flow-mania

---

## 4. CrazyGames distribution and monetization gates

### Basic Launch
Current official documentation states:
- the game must be live for at least 7 days;
- the test requires at least 500 plays;
- when both conditions are met, Basic Launch ends at the 7-day point;
- if the game does not reach 500 plays, it ends automatically after 21 days;
- dashboard data updates daily;
- Basic Launch does not require the SDK and does not pay revenue.

The launch is a limited public test, not guaranteed broad traffic or monetization.

### Full Launch
If selected:
- CrazyGames SDK is mandatory.
- Ads must be served through CrazyGames SDK; external ad networks are not allowed.
- Basic gameplay events and required integration/visual QA must pass.
- Monetization is not available until Full Launch.
- CrazyGames retains editorial and performance discretion over progression.

The current technical size rules state initial download ≤50MB, total file size ≤250MB (≤50MB without SDK), and up to 1,500 files. Orbit Relay is a small vanilla HTML5 project and appears structurally compatible, but the final packaged size and portal preview must be rechecked on the exact release candidate.

### Performance gates
CrazyGames publishes these indicative success markers:
- average playtime: successful titles often 10+ minutes;
- Day 1 retention: strong games often 10–15%;
- one-minute conversion: top-performing games typically 80%+;
- load under 10 seconds and build below 20MB are associated with top-performing titles;
- from 23-Nov-2026, CTR becomes a fourth Basic Launch metric; games entering Basic Launch before that date retain the current scoring.

These are platform guidance/observed benchmarks, not guaranteed acceptance thresholds or forecasts.

### Monetization reality
CrazyGames says earnings depend on player engagement, retention, popularity and advertiser demand. There is no guaranteed revenue per play or guaranteed CPM stated in the current public FAQ.

### Payout reality
Current payout guidance:
- Tipalti is used.
- Country-specific payment-method availability applies.
- A minimum €100 unpaid earnings balance is required for payout.
- Current public guide says NET 60 terms, but CrazyGames aims to process payments sooner, typically around the 10th of the following month; actual receipt depends on country/payment method and local processing.
- Developer Portal billing onboarding and account information are required for payment. No payout method or account was set up.

Sources:
- https://docs.crazygames.com/resources/basic-launch-metrics/
- https://docs.crazygames.com/requirements/intro/
- https://docs.crazygames.com/faq/
- https://docs.crazygames.com/payouts/

---

## 5. Exact-source CI and QA reconciliation

### Last verified build
- Workflow: Build Orbit Relay HTML5 game
- Run: #12 / ID 43132045102
- Result: SUCCESS
- Tested commit: `fd80cd20cff7fb0cc4706ebaeaa10d0df4ca448e`
- Run: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43132045102

The successful workflow included:
1. Puzzle solvability/connectivity tests.
2. Playwright Chromium browser test runtime installation.
3. Real-browser tests.
4. File checks.
5. ZIP packaging and SHA-256 artifact creation.

The then-current test file included desktop gameplay flow, pause/resume, hint, restart, solve/progression, timer failure/retry, keyboard focus and 390px mobile layout checks.

### Why this is not current-head proof
A GitHub comparison from `fd80cd20...` to the later repository HEAD `d136fcadb2939ac3eebb4c2f512db09cd651d98e` shows subsequent modifications to:
- `products/orbit-relay/game.js`: campaign progress persistence and Daily Challenge logic;
- `products/orbit-relay/index.html`: Daily Challenge entry button;
- `products/orbit-relay/tests/browser.test.cjs`: new daily-mode persistence, UTC rollover, blocked-localStorage and CrazyGames viewport matrix tests;
- `products/orbit-relay/CRAZYGAMES_SUBMISSION_PACKET_DRAFT.md`: submission-readiness documentation.

The newer browser test source contains a ten-viewport CrazyGames matrix (907×510, 1216×684, 1077×606, 821×462, 1366×768, 1920×1080, 1536×864, 1280×720, 800×450 and 1080×607), with tile sizing, overflow and action controls. **No exact-HEAD successful workflow run was located for these later changes.**

Therefore:
- The previous CI PASS is valid only for its tested commit.
- The newer matrix test exists in source, but is not claimed as executed successfully on current HEAD.
- No product source or test was modified during this Phase 51 research. It remains frozen.

---

## 6. Phase 51 hard-gate matrix

| Gate | Result | Explanation |
|---|---|---|
| Existing game prototype | PASS | Functional HTML5 prototype exists |
| Previous deterministic/browser tests | PASS on older SHA only | Run #12 tested `fd80cd20...` |
| Current exact-HEAD CI | FAIL / NOT VERIFIED | Later game and browser-test changes lack exact-head evidence |
| Current game build size | LIKELY PASS, not release verified | Vanilla HTML/JS is small; final portal package not remeasured |
| Human playtest / engagement | FAIL / UNKNOWN | No human sessions or observed voluntary replay |
| Genre differentiation | FAIL | Direct CrazyGames competitors already implement the same core rotate-to-connect loop and show strong ratings/votes |
| CrazyGames originality/distinguishability | FAIL as-is | Cosmetic theme and procedural levels do not establish a unique gameplay proposition |
| Basic Launch | Technically plausible, not submitted | 7–21 day test; ≥500 plays; no monetization |
| Full Launch / SDK / revenue | NOT ELIGIBLE YET | Must pass Basic Launch and Full Launch review |
| India payout route | NOT VERIFIED | Tipalti methods depend on country; no account onboarding |
| Overall decision | **NO-GO AS-IS** | Do not submit or add monetization to the existing build |

## 7. Final disposition

**Orbit Relay**
- Status: `NO_GO_CRAZYGAMES_AS_IS`.
- Keep all source and tests in the canonical repository.
- Freeze feature development.
- Do not submit the present game, prepare public cover art, integrate CrazyGames SDK, create an account, accept terms, complete Tipalti/KYC, or publish.
- A future revival requires a genuinely new gameplay mechanic or a clearly differentiated mode, not just a different colour/theme or random levels; then exact-head CI and actual human player evidence must precede submission.

**P51-001 is complete with NO-GO. P51-002 through P51-005 are cancelled.**

---

## 8. Next lane — Phase 52: remaining creator / IP distribution models

The current platform list's remaining group includes GitHub Sponsors, KDP/digital publishing, stock asset marketplaces and audience/affiliate models. None is assumed to be attractive by default.

P52-001 must compare these remaining models and existing private assets by:
- verified buyer/payer demand and platform-native discovery;
- recurring vs one-time revenue;
- realistic price and customer volume needed for ₹10 Cr;
- ability to operate as self-serve without cold outreach, manual freelancing or recurring service labour;
- source/IP ownership and editorial/platform approval;
- platform share, fees, KYC/settlement and any minimum threshold;
- zero-spend feasibility and automation limits;
- whether the existing CSV to Action, AI Ops Starter/Job-to-Cash or original content assets have a defensible paid layer.

Do not create another product, public repository or content catalogue before this comparison. If none passes the hard gates, return to a broader evidence-led opportunity search rather than pretending that low-potential assets can reach ₹10 Cr.

**Next exact task:** P52-001 — rank the remaining creator/IP channels and select one product-market gap, or record NO-GO for all current candidates.

**Financial truth:** Platform-credited net earnings ₹0 verified; bank-settled net receipts ₹0; authorised new spend ₹0.
