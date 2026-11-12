# Phase 43 — GitHub Sponsors and Marketplace Audit

**Date:** 2026-11-12  
**Task:** P43-004 completed  
**Decision:** GitHub Sponsors is the more feasible long-horizon OSS funding lane; paid GitHub Marketplace Apps are not a near-term path.

## 1. GitHub Marketplace paid apps
Official requirements:
- App must be owned by a GitHub organization that has completed publisher verification; verified domain, contact information and enforced 2FA are required.
- Paid GitHub Apps need at least 100 installations before paid listing eligibility.
- Paid plans must include monthly and annual pricing, Marketplace purchase-event handling, listing review and financial onboarding.
- Payout threshold is USD 500 revenue for a month; payment is sent electronically at the end of the following month.
- GitHub retains 5% for transactions after Jan 1, 2021.
- India-specific seller payout method and bank onboarding were not confirmed in the public docs reviewed.

Sources:
- https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/about-github-marketplace-for-apps
- https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app
- https://docs.github.com/en/apps/github-marketplace/selling-your-app-on-github-marketplace/receiving-payment-for-app-purchases

## 2. GitHub Sponsors
Official terms:
- India is a supported receiving country.
- Personal-account sponsorships have 0% GitHub fee; organization sponsorships may incur up to 6% fee.
- One-time and monthly sponsorship tiers are supported.
- First sponsorship payout is processed 60 days after the first sponsorship is initiated.
- Thereafter, payments are processed within 30 days after the close of the month. Stripe Connect payouts are generally initiated on the 22nd; cross-border minimums may apply.
- KYC, tax and bank details are mandatory owner-controlled steps; account eligibility and India payout details still need account-level verification.

Sources:
- https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
- https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms
- https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-personal-account

## 3. Existing public repository audit
Accessible user-owned repositories reviewed: 11.
- `ghost-hunter-research-all-block-chains`: 2 stars, no root license detected.
- `ai-content-system`: 1 star, no root license detected.
- `crypto-trading-bot-ai-based`: MIT license, 0 stars; trading/financial-risk software, not selected as a flagship sponsor asset until claims, security and risk controls are independently audited.
- `ghost-hunter-ai-smart` and `full-ai-ghost-hunter-universe`: no root license detected, no stars.
- `nexus-autonomous-cloud-work-engine`: public, 0 stars, no root license at repository root. Nested `products/ai-ops-starter` and `products/csv-to-action` contain MIT license files, but the repository as a whole is not licensed under a root license.
- Other accessible repos are private or not suitable for a public sponsor lane at present.

This is a snapshot, not an exhaustive legal review. A license in a nested product directory applies only within its intended scope; do not imply that the entire parent repository is MIT-licensed.

## 4. Decision and ranking
| Lane | Entry barrier | Payout | Current demand readiness | Decision |
|---|---|---|---|---|
| GitHub Sponsors | Supported region, public OSS contribution, 2FA, profile, bank/tax onboarding and approval | First payment 60 days; then monthly; cross-border minimum may apply | Very low organic traction today | P2 validation |
| Paid GitHub Marketplace App | Verified organization, 100 installations, app review, monthly+annual plans and financial onboarding | USD 500 monthly threshold, paid following month; 5% GitHub retention | No suitable production GitHub App or 100 installations | Hold / not near-term |

## 5. Next task
P43-005: prepare a readiness dossier for safe, useful, properly licensed open-source assets. Propose low-maintenance tiers (public roadmap, changelog, early access to releases, sponsor acknowledgement only) without promising personal support or services. Do not create a Sponsors profile, submit KYC/tax/bank details, accept terms or publish tiers without owner approval.

**Financial truth:** verified realized net receipts INR 0; authorized spend INR 0.
