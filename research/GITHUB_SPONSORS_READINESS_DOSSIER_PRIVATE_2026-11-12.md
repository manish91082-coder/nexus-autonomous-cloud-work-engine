# GitHub Sponsors Readiness Dossier — Private Draft

**Prepared:** 2026-11-12  
**Status:** PRIVATE PREPARATION ONLY — no application, KYC, bank/tax submission, agreement acceptance or tier publication.

## Executive decision
GitHub Sponsors is a viable long-horizon community-funding rail because India is a supported receiving country and personal-account sponsorships carry 0% GitHub fee. It is not a fast-cash channel: first payment is processed 60 days after the first sponsorship, and subsequent payments follow monthly settlement terms. Current public repositories show very low adoption, so no sponsor revenue should be forecast.

## Safest current project candidate
**CSV to Action** (products/csv-to-action/)
- MIT license exists inside the product directory.
- Browser-local CSV processing; no upload, account, server or external dependency.
- README and Hindi README exist; tests are present in tests/csv_engine.test.cjs.
- The parent Nexus repository itself has no root LICENSE; do not claim the whole repository is MIT-licensed. The nested license applies to its intended product scope.
- Differentiation remains weak because generic CSV and invoice exception tools are crowded. Treat this as a community utility candidate, not a commercial demand-validated product.

**Secondary candidate:** Job-to-Cash Control Kit (products/ai-ops-starter/)
- MIT license in its product directory, local Python standard-library implementation and tests.
- Broader workflow overlap and more setup friction than the browser-only CSV utility.

**Not selected as sponsor flagship now:**
- Crypto trading repositories: financial-risk software; README claims and security/risk behavior need independent audit before promotion.
- Ghost Hunter research repositories: no root license detected; do not imply open-source reuse rights.
- AI content system: no root license and no established adoption.
- Nexus root repository: no root license; nested product licenses do not license the whole project.

## Proposed low-maintenance sponsorship tiers (draft only)
All amounts are USD because GitHub Sponsors tiers are configured in USD. No tier should promise private support, custom development, guaranteed response times, trading outcomes, financial advice or other recurring manual services.

| Tier | Draft amount | Benefit |
|---|---:|---|
| Supporter | $3/month | Public thank-you (opt-in) and monthly public changelog |
| Builder | $10/month | Supporter benefits plus early access to tagged releases and public roadmap polls |
| Project Backer | $25/month | Builder benefits plus quarterly public architecture/maintenance report |
| One-time Support | $5 or more | One-time contribution, no continuing benefit or service obligation |

These are hypotheses, not final prices. Do not publish until there is a genuine open-source project, clear license scope, public documentation, issue/support policy, security contact and owner approval.

## Owner-only eligibility and setup checklist
1. Confirm the GitHub account holder is eligible and can legally receive sponsorship funds in India.
2. Enable account 2FA.
3. Complete GitHub Sponsors profile and submit application for approval.
4. Choose Stripe Connect payout route and complete KYC, tax and bank details directly in GitHub/Stripe.
5. Verify the exact India cross-border payout minimum, bank fees, tax documentation and payout currency shown during onboarding. Public terms warn that a cross-border minimum may apply.
6. Review and accept the GitHub Sponsors Additional Terms.
7. Only after approval, create and publish the selected tiers.
8. Add a sponsor button to the chosen repository after the profile is active.

## Payout facts from official terms
- India is listed as a supported receiving region.
- Personal-account sponsorships: 0% GitHub fee. Organization sponsorships: up to 6% fee.
- First sponsorship payment: processed 60 days after the first sponsorship is initiated.
- Later payments: processed within 30 days after month-end. Stripe Connect payouts are generally initiated on the 22nd; country/bank holidays can shift timing.
- Cross-border minimum payout may apply. The exact India amount and bank fees need account-level confirmation.
- GitHub does not guarantee sponsor acquisition; this is a community support model, not a platform marketplace with guaranteed discovery.

## Stop/go criteria
- **HOLD:** no account approval, no KYC, no public tier publication until owner authorization.
- **GO to setup:** only after a chosen safe OSS repo has explicit license scope, tested release, issue triage, security contact, documentation and a real user community.
- **GO to tier publication:** after GitHub approves the Sponsors application and the owner confirms payout terms.
- **Do not forecast revenue:** until actual recurring sponsorships and settled payouts are observed.

## Official references
- About GitHub Sponsors and supported regions: https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
- Additional terms and payment timing: https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms
- Personal account setup: https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-personal-account
- Payout management: https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/managing-your-payouts-from-github-sponsors

**Current finance:** verified realized sponsorship receipts INR 0; authorized spend INR 0.
