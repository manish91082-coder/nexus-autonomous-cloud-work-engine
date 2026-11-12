# Phase 27 — Developer Workflow Demand Scan & Web-Game Revenue Lane
Date: 2026-11-12
Scope: Internet-only, ₹0 upfront, no client services, no cold outreach, no physical execution. Research-only platform claims are labelled as such.

## 1. Executive decision

The first ten developer-workflow opportunities examined are all crowded by capable free/open-source tools or by funded products. None currently passes the paid-product differentiation gate. We should not build another generic developer utility just because it is easy to code.

A separate revenue lane has stronger distribution economics for a zero-capital, code-first operation: **original HTML5 games distributed through a curated browser-game portal**. The portal supplies the audience and ad monetization, so the developer does not need to buy traffic or manually sell a download. This is not guaranteed income: game quality, acceptance, retention, playtime and ad demand determine revenue.

**Selected experiment:** create one original, lightweight, 2D browser puzzle game as a vertical slice; test gameplay and technical quality; prepare for CrazyGames Basic Launch. Do not create an account, submit, accept terms or complete payment/tax onboarding without owner action.

## 2. Ten developer-workflow problem candidates audited

| # | Problem / user job | Public pain signal | Existing alternatives | Decision |
|---:|---|---|---|---|
| 1 | Capture, inspect and replay webhooks locally | Developers report repeatedly triggering real provider events and waiting to reproduce payload changes; a 2026 Reddit post describes exactly this loop | Hookdeck Inspect (free no-account endpoint and replay), RequestBin, Hooklistener, HookCap, webhook.site, Beeceptor, ngrok | **Reject as first product**: strong user pain, but many mature free/paid alternatives; server-side retention/security increases operating burden |
| 2 | Detect breaking changes between OpenAPI versions | API teams need to know whether removed endpoints, required parameters or schema changes break clients | oasdiff CLI/GitHub Action/browser tool, Scalar free browser diff, SysOSX, npm openapi-diff, Postman specs/mock tools | **Reject**: mature OSS and free browser substitutes |
| 3 | Redact secrets and personal data from logs before sharing | Developers describe accidental API-key, token, email and connection-string exposure in logs and support tickets | ShareClean, LogShield, envaudit, Gitleaks, TruffleHog, GitHub secret scanning | **Reject**: security-sensitive correctness, false-positive/false-negative liability and strong free alternatives |
| 4 | Compare database schemas/data and prevent migration regressions | Developers report slow-query and schema drift diagnosis as repetitive and difficult | Bijection, Ptah, Atlas, Flyway, Bytebase, Sieve, MergeBrake | **Reject for MVP**: technically demanding, database credentials/data sensitivity, strong open-source and paid competition |
| 5 | Generate deterministic test data and relational fixtures | Teams need repeatable, realistic fixtures across related tables and formats | Nobuf browser generator, Synthetic Data Generator, MockAPI, Faker libraries, Mockaroo, JSON Generator | **Reject**: several capable free/local-first tools; paid differentiation not yet demonstrated |
| 6 | Detect .env drift, missing variables and committed secrets | Teams need parity across local/staging/production configuration and safer secret handling | envaudit, dotenv-linter, Gitleaks, TruffleHog, Infisical, Doppler, varsafe | **Reject**: mature free/open-source options; handling secrets increases security burden |
| 7 | Validate cron schedules across platforms and time zones | Scheduling errors include daylight-saving transitions, cron dialect mismatch and next-run ambiguity | CronSignal, CronHub, CronPro, Don's Tools, WebUtility, crontab.guru | **Reject**: numerous free browser tools; low willingness-to-pay signal |
| 8 | Group CI failures and detect flaky tests across runs | Developers describe slow push-wait-debug loops, flaky tests and repeated reruns; community advice identifies stack-trace clustering and commit correlation as useful first steps | Flaky Graveyard, flakestat, Projektor, TestNod, Qualflare, FlakeRadar, junit-flaky-check | **Reject as paid first product**: real pain, but open-source tools and private-beta SaaS already address it |
| 9 | Inspect and validate MCP servers, tools and schemas | MCP developers need to verify connectivity, tool registration, input schemas, output and error handling | Official MCP Inspector (web/CLI/TUI), MCP Schema Validator, DevTk MCP validator, MCP Framework debugging docs, Iris and broad agent-evaluation ecosystem | **Reject generic inspector**: official reference tooling exists and the wider agent-eval category is crowded |
| 10 | Diagnose slow SQL queries and explain execution plans | Developers report uncertainty about query plans, indexes, stale statistics and regression causes | SQLly multi-engine plan viewer, QueryPlan, RDST, database IDEs such as DBeaver, engine-native EXPLAIN tools and specialist tools | **Defer**: meaningful pain but database-engine-specific accuracy and strong specialist competition |

### Evidence quality

- Reddit posts are evidence of individual developer experiences, not statistically representative market demand.
- Vendor pricing is evidence that a vendor offers a paid tier, not verified transaction volume or willingness to pay for a new entrant.
- Free tools demonstrate both real utility and competitive pressure.
- No conversion rate, TAM, revenue forecast or success probability is inferred from these sources.

## 3. Why the web-game lane passes an initial channel screen

### CrazyGames
Official documentation checked 2026-11-12:
- Accepts submissions from developers around the world; documentation says there are no location restrictions.
- Supports HTML5/JavaScript and engines including Phaser, Godot, PixiJS and Unity.
- Basic Launch is a limited soft-launch phase with no monetization; Full Launch is decided by CrazyGames using editorial, quality and performance criteria.
- Full Launch requires CrazyGames SDK, original/distinguishable game assets, no external ad provider and no other game-portal branding.
- Revenue is based on popularity, player traffic, ad performance and advertiser interest. No fixed developer percentage is published in the public terms.
- Official FAQ claims more than 50 million monthly players; this is a platform-reported figure, not independent audit evidence.
- Payments use Tipalti; available payout methods depend on country and local rules. Minimum payout is €100. Public payout docs state contract NET 60 while saying they currently aim to process sooner, typically by the 10th of the following month. Actual bank receipt depends on payment method and local bank processing.
- Developer terms permit non-exclusive publication by default. An optional 50% compensation uplift is offered for a two-month browser-game exclusivity period, but we should **not** opt into exclusivity. Terms also include IP warranties, self-billing and indemnity obligations.

Decision: **Best first game-portal candidate**, subject to owner-only billing/tax onboarding and review of the final in-portal agreement. The India-specific Tipalti bank route must be confirmed during owner onboarding; global submission acceptance does not guarantee a particular payout method.

### GameDistribution
- Public developer page reports 350M monthly gameplays, 3,000+ publishers and a network of 1,000+ developers; these are vendor claims.
- SDK is mandatory; QA can take up to three weeks.
- Current Developer Game License Agreement states developer receives 33% of Net Revenue, payment if at least €100 within 60 days after the preceding-month report becomes available. Its public FAQ describes €50 PayPal / €100 bank thresholds, so exact route/threshold should be confirmed in the dashboard.
- Agreement requires developer to provide user support including community management.
Decision: **Do not use as first channel** because the contract creates a support/community obligation and the revenue share is low relative to CrazyGames' less-defined compensation model. Reconsider only if support can be handled within acceptable boundaries and contract terms are reviewed.

### Poki
- Requires an application with team/studio details, company-registration status, a playable browser build or video, three gameplay screenshots and a rationale for player fit.
- Its preferred web-exclusive deal is five years; non-exclusive terms may be available by agreement.
- Monetization is through Poki SDK ads; payout terms depend on the deal.
Decision: **Defer**. Do not give away five-year web exclusivity for an unvalidated first title.

### Roblox
- DevEx requires at least 30,000 Earned Robux, verified email, age 13+, account standing and tax/portal setup.
Decision: **Defer** due to high threshold and platform-specific development/distribution model.

### Yandex Games
- Offers ad and in-game purchase monetization; non-Russian developers may use a unified licensing route if eligible or Yandex Advertising Network depending on legal form.
- Published payout thresholds include USD 150 / EUR 100 and payment within 20 business days of the next month once threshold is reached.
- India individual/sole-proprietor payout eligibility was not established from the public pages reviewed.
Decision: **Hold pending country/entity payout verification**.

### itch.io
- Prior audit found a $5 payout threshold through PayPal/Payoneer, tax interview, 7-day wait and possible longer holds.
Decision: **Secondary direct-download channel** if the game can also be sold as a downloadable build or source package; not the primary ad-distribution channel.

## 4. Initial product hypothesis: original browser puzzle game

Working title: **Orbit Relay** (title is provisional; trademark/title search required before release).

Core loop:
1. A signal must travel from a source node to a destination node across a compact grid.
2. Players rotate original circuit/relay tiles to connect the path.
3. Each level has a guaranteed solvable path, increasing board complexity and optional decoys.
4. The player earns score from completion time and move efficiency.
5. Levels, daily seeded challenge and local best scores encourage repeat play without requiring an account or backend.

Design constraints:
- Original mechanics, art and code; no borrowed characters, brands, soundtracks or copied level layouts.
- 2D HTML5 Canvas/SVG/DOM; no GPU requirement, no paid engine, no external assets.
- Desktop and mobile responsive, short onboarding, immediate gameplay.
- No chat, multiplayer, personal-data collection, third-party ads, account system or server costs in the prototype.
- No dark patterns or artificial ad-click incentives.
- Add platform SDK only after CrazyGames Basic Launch selection and in accordance with current SDK requirements.
- Keep source and a standalone build; preserve non-exclusive rights.

This is a prototype hypothesis, not evidence of market demand. CrazyGames acceptance and Full Launch are not guaranteed.

## 5. Automated validation gates for the game

Before any portal submission:
- deterministic level generation with a solver check proving each generated level has a source-to-target path;
- unit tests for rotation, connectivity, score and level progression;
- no softlocks; restart/pause/mute controls work;
- responsive input for mouse, touch and keyboard;
- load size and frame-rate checks; no network calls before any platform SDK is added;
- accessibility labels, contrast and reduced-motion option;
- original asset provenance register and third-party license inventory;
- manual playtest by owner or authorized tester for actual fun/quality (cannot be fully replaced by static tests);
- independent browser compatibility checks.

## 6. Phase 27 decision scoreboard

| Measure | Status |
|---|---:|
| Developer workflow problem families screened | 10 |
| Passed paid-product differentiation gate | 0 |
| New monetization lane screened | HTML5 web games |
| First game portal candidate | CrazyGames |
| Game prototype | Not yet created at report time |
| Platform account / submission | 0 |
| KYC / tax / bank setup | Not performed |
| Revenue / settled bank receipts | ₹0 |
| Spend | ₹0 |

## 7. Next execution sequence

1. Build Orbit Relay as a local-first HTML5 vertical slice with deterministic solvable levels.
2. Add a Node test suite for the puzzle generator and game-state logic; run GitHub Actions.
3. Produce a self-contained playable browser build and lightweight gameplay preview.
4. Run QA and revise based on observed usability and retention proxy metrics from voluntary test sessions; no fake traffic.
5. Prepare CrazyGames submission metadata and SDK adapter draft, but do not submit or accept terms.
6. Owner completes account, Tipalti, tax and bank onboarding if/when ready; confirm India payout route before accepting the agreement.
7. After Basic Launch metrics, decide whether to integrate SDK for Full Launch. Only count revenue when settled to bank.

## 8. Financial truth

- No game has been built or submitted yet.
- No platform account, KYC, tax, bank or payout setup has been performed.
- No platform has accepted a game.
- Revenue and settled receipts remain ₹0.
- ₹10 crore in 30 days from ₹0 remains an extreme stretch goal, not a forecast or promise.
