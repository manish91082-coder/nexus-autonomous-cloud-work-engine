# Private Demand Validation Pack — Recruitment Agency Revenue Assurance Desk

**Version:** 1.0  
**Status:** Ready for owner-led validation; no sessions performed  
**Product:** v0.3.0 private offline build  
**Decision gate:** No public launch or further feature build until evidence is recorded.

## 1. Target participant
Recruitment agency owner or finance/operations lead at a small agency (roughly 1–10 active recruiters) who already uses Excel, Tally/Zoho Books or an ATS. Prioritize agencies with placement invoices, delayed collections, recruiter commissions and replacement guarantees. Do not recruit candidates or jobseekers.

## 2. Recruitment and privacy
- First cohort: 5–8 independent agencies.
- Use existing trusted relationships or opt-in introductions only. No cold outreach, scraping or unsolicited messaging.
- Participation is voluntary. Do not request customer, candidate, employee or bank details.
- Use synthetic records only. Replace company/person names with fictional labels.
- Do not record audio/video unless the participant explicitly consents.
- Keep notes anonymous (A01–A08). Do not upload identifiable notes or screenshots to GitHub.

## 3. 25-minute session plan
**0–3 min: current workflow**
1. How do you currently track placement invoices, part-payments, recruiter commission and replacement guarantee exposure?
2. Which tool is the source of truth: spreadsheet, accounting tool, ATS or a combination?
3. Tell me about the last time a payment or guarantee was missed, disputed or difficult to reconcile. (Do not request client/candidate identity.)

**3–5 min: show product without pitching**
Say: “This is an offline financial-control prototype. Please try the tasks and tell me where it does not match your workflow.” Explain that it is not accounting/tax software and not a replacement for the CA or ATS.

**5–18 min: task-based observation**
Using only fictional data, ask the participant to:
1. Create a placement with a fictional client, invoice amount ₹75,000 and a contractual due date.
2. Record three installments: ₹25,000, ₹20,000 and ₹10,000. Confirm outstanding balance is ₹20,000.
3. Record recruiter commission at a fictional agreed rate and check whether commission earned follows cash actually collected, not the invoice total.
4. Mark a guarantee-payment clause as configured and create a guarantee claim/replacement event. Confirm the app does not claim legal validity.
5. Inspect overdue ageing and client concentration. Ask what action they would take based on the dashboard.
6. Export/backup data and explain whether the offline-only model is useful or limiting.

Record completion, errors, help requests, time and the participant's own interpretation. Do not coach unless stuck; record any intervention.

**18–23 min: alternative comparison**
Ask what they use today and whether it already handles each task. Mention alternatives neutrally only after they describe their workflow: Excel/Google Sheets, Tally/Zoho Books, MoneyGence, IT Ways, WePlacement, HireXL or their existing ATS. Ask what would make them keep their current tool instead.

**23–25 min: buying evidence**
Ask: “If this exact tool disappeared tomorrow, what would you do?” Then: “What would need to be true for you to adopt it?” If they independently express purchase interest, ask for a concrete next step they would voluntarily take. Do not treat compliments or hypothetical price answers as purchase intent.

## 4. Scorecard (per agency)
- Problem frequency: never / quarterly / monthly / weekly.
- Current workaround: none / spreadsheet / accounting software / ATS / multiple tools.
- Task completion: independent / with help / failed for each of six tasks.
- Critical correctness: installment balance; commission-on-collected-cash; due-date ageing; guarantee event history.
- Offline/no-candidate-PII value: essential / useful / irrelevant / disadvantage.
- Existing alternative adequacy: fully adequate / partial gap / inadequate.
- Switching friction: low / medium / high; why.
- Voluntary next action: none / request private follow-up / ask for a trial / explicit purchase commitment. Record exact behavior, not inferred intent.

## 5. Decision thresholds
Small sample is directional, not statistical proof.
- **Stop:** 4/5 or more target agencies say a free/low-cost tool already solves the same problem adequately and show no meaningful gap.
- **Reposition:** at least 3/5 independently describe the same unmet finance-control problem and complete core tasks without coaching; offline/no-PII must be a real reason, not an assistant-suggested feature.
- **Continue to paid pilot design:** at least 2 independent agencies request a concrete next step and one makes a verifiable purchase commitment. No payment is to be accepted until legal, tax and platform setup are reviewed and approved.
- **Fix before any pilot:** any arithmetic error, data loss, incorrect commission calculation or misleading legal/tax implication.

## 6. What this experiment can and cannot prove
It can reveal workflow fit, usability, current alternatives and early willingness signals. It cannot prove scalable demand, retention, platform acceptance, regulatory compliance or ₹10 Cr revenue potential. A larger cohort and actual repeat usage/purchase evidence would still be needed.

## 7. Owner execution checklist
- [ ] Select 5–8 small recruitment agencies from trusted opt-in contacts.
- [ ] Share only the private build and synthetic-data instruction.
- [ ] Run sessions and record anonymized A01–A08 scorecards.
- [ ] Separate verbatim feedback from analyst interpretation.
- [ ] Apply stop/reposition/continue thresholds without changing them after seeing results.
- [ ] Return results for independent audit before deciding build, price or publication.

**Current truth:** No participants contacted; no interviews or user tests performed; no willingness-to-pay or buyer demand established.
