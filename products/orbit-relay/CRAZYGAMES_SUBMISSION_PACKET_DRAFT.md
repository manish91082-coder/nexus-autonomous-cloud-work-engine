# Phase 38 — CrazyGames submission-readiness packet (title-neutral)
Date: 2026-11-12
Canonical branch: master
Mission: INR 10 Cr Autonomous Revenue Ecosystem

## Executive decision

Prepare a title-neutral submission packet for the existing offline HTML5 puzzle prototype (internal codename: Orbit Relay). Do not submit yet. Public title and artwork remain held until formal title/domain clearance and human playtesting. The existing engineering CI is positive evidence, not platform acceptance, player-demand proof, Full Launch eligibility or revenue.

## 1. Current official launch gates

The current CrazyGames documentation describes two stages:

### Basic Launch
- Basic implementation is accepted for the initial test stage.
- CrazyGames SDK is optional for Basic Launch; ads/monetization are disabled.
- No external ad provider is permitted.
- Basic Launch runs at least 7 days and requires 500 plays to end at the 7-day point; if 500 plays are not reached, it ends automatically after 21 days.
- Dashboard metrics update daily; Day 1 retention appears with a delay.
- Progression is not automatic: CrazyGames evaluates engagement and may invite Full Launch, another Basic Launch after improvements, or decline progression.

### Full Launch
- Full implementation is required after selection.
- CrazyGames SDK integration is mandatory for Full Launch and monetization.
- Full gameplay should land directly in gameplay; if not feasible, maximum one click is allowed.
- Gameplay Start/Stop events are required. SDK v3 must be initialized asynchronously and awaited before SDK calls.
- Ads must use the CrazyGames SDK and comply with its ad rules. No third-party ad SDK.
- Do not add ad calls, account integration, remote save or SDK dependency to the current offline build until platform stage and requirements are confirmed.

Official sources:
- Requirements overview: https://docs.crazygames.com/requirements/intro/
- Basic Launch KPIs: https://docs.crazygames.com/resources/basic-launch-metrics/
- Gameplay requirements: https://docs.crazygames.com/requirements/gameplay/
- HTML5 SDK v3: https://docs.crazygames.com/sdk/intro/
- Gameplay module: https://docs.crazygames.com/sdk/game/

## 2. Official technical and creative gates

### Build
- Initial download ≤50 MB; ≤20 MB for mobile-homepage eligibility.
- Total size ≤250 MB; file count ≤1,500.
- Without SDK, the full game bundle is treated as initial download and must be ≤50 MB (≤20 MB for mobile homepage).
- Relative paths only for files inside the bundle.
- Chrome and Edge compatibility expected; Chromebook smooth operation on 4 GB RAM is important.
- Mouse, keyboard and touch where mobile is supported.
- Required viewport QA examples include 907×510, 1216×684, 1077×606, 821×462, 1366×768, 1920×1080, 1536×864, 1280×720, 800×450 mobile and 1080×607 tablet.
- No custom fullscreen button; CrazyGames provides fullscreen.

### Covers
- Landscape: 1920×1080 (16:9)
- Portrait: 800×1200 (2:3)
- Square: 800×800 (1:1)
- Consistent visual identity across all three.
- No borders, store/platform logos, extra promotional text or unlicensed artwork. Only game title text is permitted on the cover.

### Preview videos
- Landscape 1080p 16:9 and portrait 1080p 2:3.
- 15–20 seconds maximum; 50 MB maximum.
- No sound, black bars, cursor, promotional overlays or app/social icons.
- Opening frame should match the static cover.
- These assets must not be finalized until public title is cleared.

## 3. Current prototype audit

Evidence:
- Engineering CI run: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43132045102
- Tested commit: fd80cd20cff7fb0cc4706ebaeaa10d0df4ca448e
- Conclusion: SUCCESS.
- 240 deterministic cases: 24 levels × 10 seeds.
- Browser tests: desktop gameplay flow, pause/resume, hint, restart, solve/progression, timer failure/retry, modal focus handling, 390px mobile viewport/no horizontal overflow/action control usability.
- Standalone vanilla HTML/CSS/JS; no runtime dependencies or external assets.
- README and UI state no account, no uploads, no tracking, no ads, no purchases; local best score only.
- Package artifact was uploaded successfully by CI. It is a build artifact, not a portal submission.

### Known gaps (do not mark as passed)
1. Official CrazyGames viewport matrix has not been run. Existing 390px mobile test does not replace 800×450 landscape mobile or the listed iframe sizes.
2. Edge and Safari/physical Android/iOS devices have not been independently tested.
3. 4 GB Chromebook performance has not been physically tested.
4. Human playtest, onboarding comprehension, fun, difficulty fairness and session duration are unknown.
5. Day 1 retention and one-minute conversion are unknown; no real traffic exists.
6. The current public title is not cleared. Orbit Relay remains internal codename only.
7. Cover images and preview videos are not created; correctly deferred until title clearance.
8. No CrazyGames account, agreement acceptance, payout onboarding, submission or platform approval has occurred.

## 4. Metadata draft (title withheld)

### Internal title
Orbit Relay (internal engineering codename only; do not publish under this title).

### Public title
HOLD — pending official app-store, game-portal, domain and trademark checks.

### Genre/category
Puzzle / Logic / Casual / Single-player.

### Short description
Rotate the relay tiles, connect the signal path, and solve increasingly complex circuit-routing puzzles.

### Long description
A signal network has gone dark. Rotate the relay tiles to connect the source to the destination. Plan each move, use hints sparingly, and solve increasingly complex grids as the network grows. A quick-to-learn, single-player logic puzzle with keyboard, mouse and touch controls.

### Controls
- Mouse: click a relay tile to rotate it clockwise.
- Touch: tap a relay tile to rotate it clockwise.
- Keyboard: Tab to focus a tile; Enter/Space to activate the focused tile.
- Hint: align one relay at a score penalty.
- Restart: restart the current level.
- Pause: pause/resume the timer.

### Content and privacy declaration draft
- Single-player logic puzzle.
- No violence, gambling, user-generated content, chat, multiplayer, external login or purchases in current build.
- No uploads or remote account data.
- Best score is stored locally in browser storage.
- No third-party tracking or advertising in current build.
- Reconfirm every statement against final release build before portal submission.

## 5. Basic Launch KPI experiment plan

These are measurement targets, not forecasts or guarantees. CrazyGames' own Basic Launch guide says successful games often show 10+ minutes average playtime, strong games often show 10–15% Day 1 retention, and top-performing games typically exceed 80% one-minute conversion, load in under 10 seconds and have a build below 20 MB.

Record from the actual Developer Portal, without fabricated traffic:
- Plays and unique players.
- One-minute gameplay conversion.
- Average session playtime.
- Day 1 retention.
- Platform feedback and rejection/QA notes.
- Build size and time to first playable state.

Interpretation:
- Low conversion → investigate first-load, title/cover promise mismatch and tutorial clarity.
- Low average session duration → investigate puzzle depth, level variety, difficulty curve and timer pressure.
- Low Day 1 retention → investigate progression, saved progress and meaningful daily return reasons.
- Never use bots, click farms, paid traffic without approval, fake reviews or incentivized ad clicks.

## 6. Monetization design — deferred, not implemented

CrazyGames' monetization guidance identifies opt-in rewarded ads for puzzle hints/extra moves as a potential genre fit and midgame ads at natural breaks such as between levels. This is not authorization to implement ads now.

If and only if invited to Full Launch and owner approves:
- Integrate CrazyGames HTML5 SDK v3.
- Await SDK init before using methods.
- Report gameplayStart only once the user is in playable gameplay.
- Report gameplayStop on pause/menu/level break and gameplayStart on resume.
- Consider an optional rewarded hint/undo offer, preserving a fair no-ad baseline and ensuring rewards are granted only after successful ad completion callbacks.
- Request midgame ads only at natural level transitions and comply with current SDK pacing/rules.
- No external ad network, forced ad click, deceptive placement or ad during active puzzle solving.
- Run new SDK, adblock, pause/resume, failure and reward-integrity tests before Full Launch.

## 7. Owner-only gates

The following remain blocked until explicit owner approval:
- Official title and trademark/domain verification where OTP/CAPTCHA or legal judgement is required.
- Creating/using developer account under owner's identity.
- Reading and accepting the actual current developer agreement.
- Tax, billing, KYC and bank/payout information.
- Confirming India payout method in the live Tipalti account.
- Uploading/submitting the game, public release, SDK monetization and any spend.

No account, KYC, tax/bank data, terms acceptance, submission or spend has been performed.

## 8. Next engineering tasks
1. Add CrazyGames' published viewport matrix to automated browser QA (at minimum the listed 10 viewport sizes); measure board visibility, horizontal overflow, usable controls and first playable state.
2. Add a separate Edge browser check if runner/browser availability permits; document Safari and physical device gaps.
3. Run human playtest with consent and structured feedback; no fabricated retention claims.
4. Complete title clearance manually through official registry/UI and domain registrar/RDAP sources.
5. Create title-specific covers and two silent preview videos only after title is cleared.
6. Keep product private until owner explicitly approves account onboarding and submission.

## 9. Financial truth
- Verified realized net receipts: INR 0.
- Authorized spend: INR 0.
- Developer accounts created: 0.
- Submission/publication: 0.
- Monetization: disabled.
- No revenue estimate is defensible before genuine platform traffic and actual settlement statements.
