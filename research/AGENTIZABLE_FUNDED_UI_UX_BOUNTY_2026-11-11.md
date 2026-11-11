# Agentizable live funded task verification and audit preparation — 2026-11-11

## Live funded opportunity
Source feed:
- https://api.agentizable.ai/v1/base/autonomous-bounties/feed?network=base-mainnet&claimable_only=true
- https://api.agentizable.ai/v1/opportunities?network=base-mainnet&view=ready_to_earn&source_type=canonical_base&limit=300
- Public opportunity board: https://agentizable.ai/earn.html

At feed check, one canonical autonomous-v2 task appeared:
- Title: UI/UX audit of Agentizable.ai (whole site)
- Bounty ID: 0x378e59502b1f725b690d6b8cea86c218a979f22b5324dc9b8570bc9c155ab01f
- Bounty contract: 0xe70a699c2a102468ea64345730822ee431d951b3
- Creator wallet: 0x349fac043ede79adf18e9f9cfe29a23b883ca634
- State: claimable; payment_state escrowed; payment_committed true; verification_ready true
- Funded amount: 2,357,500 base units = 2.3575 USDC
- Solver reward: 2,100,000 base units = 2.10 USDC (not $2.1 million)
- Verifier reward: 0.10 USDC
- Claim bond: 0.10 USDC (refundable under lifecycle conditions)
- Platform fee: 0.1575 USDC (7.5%, paid by poster)
- Required external spend: 0 USDC
- Gross cash margin reported: 2.10 USDC before gas, bond-risk and other costs; not net profit.
- Funding event: tx 0x5bea445014e06e76236416168ec42ed58eb6c64a1b41abef32d75039ea50fd8a, block 56119588, occurred 2026-11-11T16:24:53Z. Events include funding_added and bounty_became_claimable.
- Terms hash: 0xc9c8491658f19e9f095939f87f760f4e8b800c554768a3ab17a04d072f911fed.
- Funding deadline: 2026-11-12T20:00:00Z.
- Claim window and verification window: 604800 seconds each.
- Verification: customer_review_v1, signed quorum threshold 1; paying customer reviews the deliverable. Only canonical BountySettled event proves payment.
- Acceptance criteria: one Markdown/PDF; cover home, post-a-bounty, browse work, workspace, account; at least 10 distinct issues; each issue URL, screenshot, severity, concrete fix; at least 3 issues found at mobile width 390px or narrower; pass/fail accessibility checks per page for contrast, keyboard navigation and form labels; prioritized top-5 fixes.
- Evidence schema requires artifact_url and artifact_sha256.
- Opportunity projection explicitly notes partial inventory/degraded coverage for other competition protocols; this record itself is canonical funded and claimable.

## Authorization gate
- Claim requires a public Base wallet address/readiness check and 0.10 USDC claim bond, then a wallet signature/transaction. No wallet claim, readiness request, signature or transaction was made.
- The user has authorized research, read-only browser inspection and repository engineering, but wallet signing/financial transaction remains explicitly approval-gated.
- No account/agent registration, claim, or submission has occurred.
- Do not treat the task as accepted or revenue. No payment received.
- A public Base wallet address is not a private key. Never ask for or accept seed phrase/private key/OTP in chat.
- Before starting, verify task still claimable, recheck canonical contract events and exact current deadline, confirm operator wallet/network/token/gas, and obtain explicit approval for the 0.10 USDC bond and gas expenditure/signature.

## Read-only audit preparation
Browser audit run 1:
- https://agent.tinyfish.ai/runs/ad366153-94ac-4467-aace-0617411cc46f
- Inspected homepage, /earn.html, /post.html, /workspace and /account without sign-in or changes.
- Produced 20 candidate findings. Several contrast/accessibility concerns are visual/DOM-level hypotheses and require exact contrast and keyboard verification; do not present them as confirmed failures.
- Browser run reported seven desktop screenshots captured, but did not expose individual screenshot URLs/files. Do not fabricate screenshot references.
- Desktop findings observed include cookie consent overlay blocking part of hero; rotating hero copy without obvious controls; carousel controls/indicator accessibility concerns; earn page sidebar/feed separation and filter label association concerns; post-bounty form labeling/helper-text concerns; workspace route purpose mismatch; account route redirects to login; footer grouping and theme-toggle clarity concerns.
- Audit run's own summary says screenshots captured at desktop default ~1920px; exact hex contrast was not measured; keyboard checks partial.

Mobile verification run 2:
- https://agent.tinyfish.ai/runs/11dad933-266f-472f-865c-1d29e89c576b
- Requested 390px; tool could not resize below approximately 705px. Actual observed widths 705px, 1020px, 1439px.
- At 705px, homepage had no horizontal overflow and nav remained horizontal with no hamburger/collapsed state. This is verified at 705px only.
- Actual 390px behavior, mobile screenshots, form widths, touch targets and mobile keyboard focus remain unverified. Do not claim 3 mobile findings until true <=390px testing is achieved.

## Current decision
- The bounty passes funding, agent eligibility and defined deliverable checks, but is not yet executable under existing authorization because claim requires owner-controlled wallet signature and bond.
- Read-only audit preparation is complete; no claim has been made. Do not perform uncompensated full deliverable before claim lock.
- Ask for explicit approval only for the exact 0.10 USDC bond plus network gas and wallet signature, after the owner confirms the wallet/network. Do not request private key or seed phrase.
- If approval is not granted or task is no longer claimable, skip it and continue other sources.
