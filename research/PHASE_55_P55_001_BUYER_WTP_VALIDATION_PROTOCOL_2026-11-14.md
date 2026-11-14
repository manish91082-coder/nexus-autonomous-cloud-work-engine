# P55-001 Buyer WTP Validation Protocol — Forge Developer Cost Guard
**Prepared:** 14 November 2026  
**Status:** Internal research plan only — NOT PUBLISHED, NOT SENT  
**Mission:** ₹10 Cr Autonomous Revenue Ecosystem  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Spend:** ₹0

## 1. Purpose

Public evidence now establishes two independent problem-demand signals, but no buyer has stated a concrete budget or willingness to pay for the proposed Forge Developer Cost Guard. This protocol defines the next evidence step without cold outreach, credential collection, account setup, product build or paid activity.

## 2. What counts as a qualified buyer

A respondent counts only if they:
- own, operate or control a Forge app as a Marketplace vendor/developer;
- personally own or influence the cost/billing decision for that Forge app or Developer Space;
- are discussing their own real app use, not a hypothetical or competitor's product;
- voluntarily answer the research questions.

App-owner credentials, Atlassian API tokens, customer tenant data, invoice PDFs, PAN, bank information and other sensitive account details must never be requested or collected.

## 3. Interview / opt-in survey questions

1. Do you currently own or operate a Forge app? If yes, is it a Marketplace app, a customer/internal app, or both?
2. Who is responsible for the Forge platform bill and cost-control decisions?
3. Have you experienced unexpected overage, usage spikes, or uncertainty about what the final Developer Space bill will be? Describe one example without sharing confidential amounts or customer identifiers.
4. What do you use today: native Usage and Costs, native emails, Billing Console, spreadsheets, an observability platform, manual review, or another tool?
5. Which outcome is most valuable: (a) owner-defined USD budget alerts, (b) per-app/environment estimates, (c) invoice/line-item reconciliation, (d) billing-state alerts, or (e) something else?
6. Would you pay for a third-party product that delivered this outcome? Choose one: no; free-only; one-time purchase; monthly subscription; annual subscription; usage-based. Explain why.
7. What is the maximum monthly price or one-time price you would personally approve for the exact outcome selected? An answer such as “it depends” is recorded as no price signal unless a range and condition are provided.
8. What event would cause you to buy: a real overage, an upcoming launch, more Marketplace customers, an invoice surprise, finance approval, or another trigger?
9. Would you voluntarily join a read-only, owner-controlled pilot after API permissions and data handling are documented? No credentials are requested during research.

## 4. Evidence rubric

| Level | Evidence | Treatment |
|---|---|---|
| D0 | Likes, votes, generic agreement | Weak attention only; not WTP |
| D1 | Feature request or pain statement | Problem signal |
| D2 | Qualified Forge app owner describes recent pain and current workaround | Buyer problem validated |
| D3 | Budget owner names a concrete acceptable price/range and buying condition | WTP signal |
| D4 | Qualified owner requests a pilot at an identified price or signs a price-bearing pilot intent | Strong commercial intent |
| D5 | Independent paid purchase and provider/platform-credited earnings | Revenue evidence |

Minimum WTP gate for P55-001: at least one independently verifiable, qualified Forge app budget owner must state a concrete price range and a buying condition for the proposed outcome. Stronger GO confidence requires at least three independent qualified owners, at least two price-bearing responses, and one price-bearing pilot request. D0/D1 signals cannot substitute for D3.

## 5. Sampling and quality rules

- Aim for at least five qualified Forge app owners from distinct vendors/apps before selecting a product or pricing tier.
- Separate Marketplace vendors from internal/custom app developers; their cost structures and buying authority may differ.
- Record date, role/segment, evidence level and anonymised response summary; do not collect unnecessary personal information.
- Count a vendor once even if multiple people from the same company respond.
- Keep negative and “would not pay” responses; do not cherry-pick.
- Do not infer willingness-to-pay from generic SaaS budgets, CloudZero/AWS/Azure pricing, Jira project-budget apps, Marketplace install counts or voting totals.
- Do not publish a survey, post in a community, contact vendors, run a landing-page campaign or send a support request without explicit owner approval of the channel and final text.

## 6. Draft public opt-in invitation (NOT APPROVED / NOT SENT)

**Research title:** Forge app cost-management: 5-minute developer research

**Draft text:**

“We are researching how Forge app owners monitor platform usage, estimate overages and manage unexpected Developer Space costs. We are not selling anything or requesting credentials, customer data or invoices. We would like to learn which workflows developers already use, where the gaps remain, and whether a separate read-only tool would be valuable at a concrete price. Participation is optional. Please share only non-confidential experience from your own Forge app.”

This draft is for future owner review only. It has not been posted or sent.

## 7. Decision rule

- If qualified buyers describe pain but no one states a concrete price: keep WTP NOT_ESTABLISHED and do not build P55-002.
- If one price-bearing buyer signal is obtained: update P55-001 evidence, then separately assess whether API, Marketplace and India gates justify a controlled private prototype.
- If repeated price objections or no recurring buyer problem emerge: record NO-GO and move to the next ranked platform lane.
- A free waitlist or survey signup is not a sale. A pilot request is not revenue. Only a genuine independent paid order and credited net earnings count in the revenue ledger.

**Current decision:** HOLD_FOR_EVIDENCE. No WTP signal has yet been captured.
