# Phase 28 — Orbit Relay QA, Naming and CrazyGames Readiness
Date: 2026-11-12

## Executive decision

The HTML5 game prototype has passed a real Chromium browser CI suite and an accessibility-focused modal/keyboard iteration. It is **not ready for public submission yet**. Keep the game internally named Orbit Relay for source continuity, but do not use that name publicly: exact-title search surfaced several unrelated games already using “Orbit Relay” on Google Play and Apple App Store. A replacement brand name must be screened before covers or public metadata are finalized.

CrazyGames remains the first candidate distribution channel, but no account, submission, SDK monetization, agreement, KYC or payment onboarding has been initiated.

## 1. Engineering verification

### Latest successful browser QA
- Run: https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43131745746
- Commit: `f3b95d271b7ae3ad38ceafb5051a142d307152b8`
- Job conclusion: SUCCESS; all reported steps succeeded.
- Existing puzzle tests passed.
- Playwright Chromium browser tests: 3 passed, 0 failed.
  1. Desktop start, pause/resume, hint, restart, solve and next-level.
  2. Accelerated timeout, failure and retry.
  3. Mobile 390px viewport, no horizontal overflow and usable action controls.
- Artifact ID: `13905676397`; 8,229 bytes; SHA-256 `3988dc93f7c11738ac709a9f6bfc566781c8f206bac08ef2baa6e38e705a4625`.

### Accessibility work
- Modal action receives keyboard focus when the win/fail dialog opens.
- Tab is trapped on the single modal action button; Escape does not silently dismiss the required result.
- After the board re-renders, focus moves to the first playable relay.
- CI iterations caught and corrected a malformed JavaScript newline insertion and a focus-restoration order bug.
- Physical-device testing and a full WCAG audit remain outstanding.

### Additional seeded stress test
- Added a deterministic seed/difficulty matrix test across 24 levels × 10 seeds. It checks that generated puzzles start unsolved, routes have meaningful length, and repeated hints converge to a solved state.
- Commit: `fd80cd20cff7fb0cc4706ebaeaa10d0df4ca448e`.
- Its CI execution must be inspected before treating this additional stress test as passed.

## 2. CrazyGames official requirements

Official sources:
- SDK introduction: https://docs.crazygames.com/sdk/intro/
- Technical requirements: https://docs.crazygames.com/requirements/technical/
- Launch requirements: https://docs.crazygames.com/requirements/intro/
- Gameplay requirements: https://docs.crazygames.com/requirements/gameplay/
- Covers and preview videos: https://docs.crazygames.com/requirements/game-covers/
- Payouts: https://docs.crazygames.com/payouts/
- FAQ: https://docs.crazygames.com/faq/

### Launch sequence
- Basic Launch is a limited audience soft launch lasting 7–21 days. It is not monetized.
- The official launch guide says the Basic Launch period ends after at least 7 days and 500 plays; if 500 plays are not reached, it ends automatically after 21 days.
- Progression to Full Launch depends on platform engagement benchmarks such as average playtime, conversion to gameplay and retention. This is not guaranteed.
- Full Launch requires the full implementation, SDK and another QA review. Monetization starts only after Full Launch.

### SDK
- HTML5 SDK v3 is the recommended version.
- The documented loader is `https://sdk.crazygames.com/crazygames-sdk-v3.js`; initialize with `await window.CrazyGames.SDK.init()` before SDK calls.
- SDK is optional for Basic Launch; if used, trigger Gameplay Start when the player enters a playable state. Ads are disabled in Basic Launch.
- Full Launch requires SDK integration. Gameplay Start/Stop events are required; Data/User modules apply where relevant. Ads must use CrazyGames SDK and comply with its ad requirements.
- Current prototype has no SDK, ads, external tracking or external login. Do not add monetization or call SDK methods until platform setup and integration scope are authorized.

### Technical and creative assets
- Initial download size limit: 50 MB; 20 MB to be eligible for mobile homepage. Total size limit 250 MB and file count limit 1,500.
- Must work on Chrome and Edge; support mouse/keyboard and touch if mobile is supported. Chromebook performance matters.
- Three covers are mandatory: 1920×1080 landscape, 800×1200 portrait, 800×800 square. Consistent artwork across formats; no borders, extra promotional text, icons/store logos or unlicensed visuals.
- Preview video: 15–20 seconds maximum, <=50 MB, landscape 1080p 16:9 and portrait 1080p 2:3; no sound, black bars, cursor or promotional overlay. First frame should match the cover.
- Submission also requires qualitative metadata, description and controls.
- The present ZIP is approximately 8 KB, far below the technical size limits.

### Payout reality and India gate
- CrazyGames uses Tipalti. Published payment options include wire transfer, ACH/direct deposit, eCheck and PayPal, but availability depends on country and local regulations.
- Minimum payout threshold: EUR 100.
- Contractual terms are NET 60. The documentation says CrazyGames currently aims to process sooner, typically by the 10th of the following month. Actual bank receipt depends on country, method and bank.
- India-specific available methods, exact bank settlement, FX/fees and tax workflow are not publicly confirmed in the documentation. These must be checked in owner onboarding before any submission/terms acceptance. Do not assume Indian direct deposit or PayPal is enabled.
- The developer portal may require billing information for self-billing invoices; a hold-payments option exists. Owner must complete identity/tax/bank/legal steps.

## 3. Public title screening

Exact phrase “Orbit Relay” surfaced multiple existing unrelated mobile games:
- Google Play: https://play.google.com/store/apps/details?id=com.festive.catchyhbt25
- Google Play: https://play.google.com/store/apps/details?id=com.orbit.relay.qza15
- Google Play: https://play.google.com/store/apps/details?id=com.orbitrelay6z2t.g6ba30ee9e7058f6b1c9c
- Apple App Store: https://apps.apple.com/in/app/orbit-relay/id6761186486

This is enough to reject the name as a clean public-facing brand candidate. It is **not** a formal trademark clearance opinion. A new distinctive title must undergo further search in relevant app stores, game portals, domains and official trademark registries (India IP India, WIPO and relevant target markets) before public use.

## 4. Current risk register

| Risk | Status | Required control |
|---|---|---|
| Public title collision | Open | Rename public brand after registry screening |
| Game fun/retention unknown | Open | Independent human playtest; tune onboarding and difficulty |
| Browser QA | Core suite passed | Keep CI mandatory; verify new stress-test run |
| Physical mobile/browser coverage | Open | Real Android/iOS/Chrome/Edge testing |
| CrazyGames acceptance | Not submitted | Meet quality and originality gates; acceptance not guaranteed |
| India payout route | Unverified | Owner onboarding/Tipalti confirmation before agreement |
| Revenue | ₹0 received | Count only settled bank receipts |
| Legal/KYC/tax | Not started | Owner approval and completion required |

## 5. Next sequence

1. Verify the latest CI run for the new 240-case seeded stress test.
2. Complete human playtest protocol and difficulty audit. Improve first-session clarity, fair timer pressure, and progression variety; do not optimize for retention before fun is evidenced.
3. Screen a distinctive new public title against app stores, game portals and trademark databases.
4. Prepare original three cover images and two silent preview videos to official specifications after the title is chosen.
5. Draft (but do not enable) an SDK v3 adapter with separate Basic/Full Launch behavior and test stubs.
6. Only after owner approval: review developer terms, confirm India Tipalti payout route and complete account/KYC/tax/bank onboarding.
7. Submit only after explicit approval. No submission or agreement acceptance has occurred.

## 6. Commercial status

- Accounts created: none.
- Portal submission: none.
- SDK monetization: disabled/not integrated.
- Paid infrastructure or advertising spend: ₹0.
- Sales, ad earnings, pending balances or settled receipts: none.
- Verified revenue received: ₹0.
