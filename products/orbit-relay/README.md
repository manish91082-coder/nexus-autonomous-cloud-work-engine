# Orbit Relay

Original, offline-first HTML5 signal-routing puzzle prototype.

## Play
Open `index.html` in a modern browser. No server, account, network call, external asset, or paid dependency is required.

## Controls
Click/tap a relay tile to rotate it clockwise. Connect the source to the destination. Use Hint to align one tile for a 100-point penalty. Pause, restart and advance through generated levels.

## Privacy
The prototype makes no network requests and does not collect personal data. Best score is stored locally in browser localStorage. No ads, purchases, account, analytics, or remote save.

## Technical
- Vanilla HTML/CSS/JavaScript, no runtime dependencies.
- Deterministic seeded puzzle generation with guaranteed target path.
- Grid grows from 5×5 to 7×7 as levels advance.
- Node.js built-in test runner: `node --test tests/puzzle.test.cjs`.

## Status
Prototype only. Not submitted to any portal. CrazyGames SDK and monetization are intentionally not included. Platform acceptance, Full Launch and revenue are not implied.

## IP and assets
All artwork is drawn from original SVG path geometry in code. No third-party images, audio, fonts, characters or branded assets are included.
