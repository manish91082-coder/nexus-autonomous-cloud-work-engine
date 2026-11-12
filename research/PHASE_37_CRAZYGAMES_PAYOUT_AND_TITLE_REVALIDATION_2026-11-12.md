# Phase 37 — CrazyGames payout rail and public title revalidation
Date: 2026-11-12
Canonical branch: master
Verified HEAD at research start: cd4339a0ef7b244866f1084f1dfc92a6229a4165

## Executive result

The CrazyGames lane remains a viable zero-upfront, high-upside distribution candidate for the existing HTML5 puzzle prototype, but it is not yet an approved or revenue-producing channel. Public evidence now strengthens the India payout hypothesis: CrazyGames' publisher is Maxflow BV, a Belgian entity; Tipalti's UK/EU coverage table lists India INR local-bank transfers and USD wire routes. Tipalti's footnote excludes India payouts where the payer itself is India-based, which does not appear to describe Maxflow BV. This is strong public evidence, not confirmation of the methods actually offered in the developer's CrazyGames billing account.

## 1. Payout and settlement verification

### CrazyGames official documentation
- CrazyGames says developer payments are handled by Tipalti.
- Listed methods include wire transfer, direct deposit/ACH, eCheck and PayPal; availability depends on country and local regulation.
- Minimum payout: EUR 100.
- Contractual terms: NET 60. The documentation says CrazyGames currently aims to process sooner, typically by the 10th of the following month. These are not equivalent guarantees; use NET 60 as the conservative contractual assumption until an account invoice proves otherwise.
- Actual receipt date depends on selected method and local bank processing.
- Developer onboarding includes address, tax details and payment information. The documentation says payment can be held while onboarding is completed, but this does not remove the legal/account setup gate.

### Entity and Tipalti coverage
- Current CrazyGames developer terms identify the publisher as Maxflow BV, a Belgian corporation, registered in Leuven, Belgium.
- Tipalti's UK/EU payer coverage lists India INR wire/local-bank routes, with local bank transfer timing shown as T+1 to T+3 in the table.
- Tipalti footnote states payments to India are not available for India-based entities. The restriction concerns the payer entity; CrazyGames' publisher is Belgian according to its developer terms.
- Therefore India payout is publicly plausible for a Belgian payer, but must be verified in CrazyGames' own Tipalti onboarding/account. Do not promise payout availability or timing before that check.

### Decision
PAYOUT_GATE = PUBLIC_EVIDENCE_SUPPORTS_INDIA_ROUTE; ACCOUNT_LEVEL_CONFIRMATION_PENDING.
CrazyGames remains a candidate, not a fully cleared payout provider. No account was created, no tax/KYC data submitted, no terms accepted and no payment setup performed.

## 2. Current payout economics and risk
- €100 threshold can create a long first-settlement delay if traffic/revenue is low.
- NET 60 is the contractual planning basis. The faster monthly processing target is operational guidance, not a replacement for the contract.
- FX, wire/transfer fees, withholding and bank charges must be checked in the actual Tipalti portal and invoice.
- Basic Launch is not monetized; Full Launch and SDK approval are required before ad monetization. Acceptance and Full Launch are not guaranteed.
- No earnings forecast is justified before actual traffic, engagement and revenue-share data exist.

## 3. Public title collision scan

The internal codename "Orbit Relay" must not be used publicly: earlier exact-title research found unrelated mobile games with that title.

New exact-phrase web screening:
- "Signal Weave" is already used by an HTML5 itch.io prototype for a signal-routing/space-network game.
- "Orbit Loom: Signal Weave" is an App Store puzzle game with a closely related orbital signal-routing theme.
- "Pulse Path" has multiple Google Play and Chrome Web Store game/app uses.
- "Relay Grid" is an App Store daily circuit puzzle and also appears in other game listings.
- "Signal Circuit" appears in game catalogues.
- "Circuit Loom" produced no obvious exact-title match in the initial web search; this is only a preliminary search result, not trademark/domain/store clearance.
- "Grid Current" likewise produced no obvious exact-title match in the initial web search; this is not clearance.

Provisional shortlist for further screening: Circuit Loom (first candidate), Grid Current (backup). Do not lock either name publicly until checks across Google Play, Apple App Store, CrazyGames, Poki, itch.io, major domains and IP India/WIPO trademark databases are completed. Search-engine absence is not proof of availability.

## 4. Next executable sequence
1. Complete structured exact/phonetic title and trademark screening for Circuit Loom and Grid Current.
2. Choose one public title only after collision and trademark checks; keep Orbit Relay as internal codename.
3. Complete CrazyGames technical submission checklist, metadata and SDK separation for Basic vs Full Launch; keep monetization disabled until platform acceptance and owner approval.
4. Owner-only steps remain: developer account ownership, review/acceptance of the actual developer agreement, tax/billing onboarding, payout method confirmation and explicit submission/publication approval.
5. Only after approved Basic Launch, measure plays, gameplay conversion, average session duration and retention. Do not infer earnings from Basic Launch because it is not monetized.
6. Use actual Full Launch reporting and settled payout statements before recording revenue.

## 5. Evidence sources
- CrazyGames payout documentation: https://docs.crazygames.com/payouts/
- CrazyGames FAQ and country acceptance: https://docs.crazygames.com/faq/
- CrazyGames developer terms identifying Maxflow BV: https://files.crazygames.com/documents/developer_terms_20250818.pdf
- Tipalti UK/EU payment coverage: https://help.tipalti.com/hc/en-us/articles/31316176094359-Payment-methods-coverage-UK-EU
- Tipalti US & ROW payment coverage: https://help.tipalti.com/hc/en-us/articles/31314361313815-Payment-methods-coverage-US-ROW
- Signal Weave existing game: https://acid-otter.itch.io/signal-weave
- Orbit Loom: Signal Weave: https://apps.apple.com/au/app/orbit-loom-signal-weave/id6812287683
- Pulse Path examples: https://play.google.com/store/apps/details?id=com.pocketfrolic.pulsepath and https://chromewebstore.google.com/detail/pulse-path/jbbiolmffnambllfgoaaphalhojbmaom
- Relay Grid: https://apps.apple.com/ca/app/relay-grid/id6784173925
- Signal Circuit catalogue: https://minike.com.br/games/

## 6. Accounting and owner gates
Verified realized net receipts: INR 0.
Authorized spend: INR 0.
Accounts created: 0.
KYC/tax/bank details submitted: 0.
Terms accepted: 0.
Game submitted/published: 0.
No paid service, asset, advertisement or subscription was used.
