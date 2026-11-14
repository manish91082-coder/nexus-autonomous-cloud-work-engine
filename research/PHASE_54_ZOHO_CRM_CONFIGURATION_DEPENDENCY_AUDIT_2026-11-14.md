# Phase 54 — Zoho CRM Configuration Dependency / Safe Field Retirement Research
**Date:** 14 November 2026  
**Authority:** Master Constitution V4  
**Canonical repository:** `manish91082-coder/nexus-autonomous-cloud-work-engine`  
**Task:** P54-001 — alternative marketplace research and evidence-backed product gap  
**Candidate status:** **HOLD — research/technical validation only**  
**Build status:** NOT APPROVED  
**Spend authorised:** ₹0

## 1. Executive finding

A specific Zoho CRM administration problem has stronger evidence than a generic "CRM cleanup" idea:

> Before a CRM administrator renames, retires or deletes a custom field, connection or template, they need to know which workflows, blueprints, custom functions, webhooks, client scripts, Flow flows, Analytics reports, PDF templates and external integrations depend on it.

A Zoho community post dated 21-Oct-2026 explicitly identifies silent breakage from deleting or renaming a field, connection or template and proposes a reference/usage tab plus dependency graph. Independent CRM community discussions from Aug/Sep/Oct 2026 describe the same class of hidden dependencies and forgotten fields/automations.

**Potential narrow product hypothesis:** a read-only *Field Retirement Impact Preflight* for Zoho CRM. The operator selects a field (or configuration object), receives a source-linked list of references found across supported CRM components, confidence labels, unknown/unscanned surfaces, and a staged retirement checklist. It must not delete or rename anything.

This is not yet a GO. Buyer pain signals are present, but willingness to pay, recurring usage, customer count and product-specific price acceptance remain unproven. Technical discovery confirms useful read APIs for several components but not full coverage of all third-party surfaces. The candidate remains **HOLD**.

## 2. Problem and buyer

### Primary buyer
Zoho CRM administrator, RevOps lead, CRM owner or implementation partner responsible for a long-lived account with multiple modules, custom fields, workflows, blueprints, functions and integrations.

### Job to be done
Before deleting/renaming a field or retiring a workflow, determine:
- where the field is referenced;
- which business process would break if it changes;
- which references are active, inactive, historical or uncertain;
- what must be migrated or tested first;
- how to roll back safely if the field is only moved to Unused Fields.

### Why this matters
Zoho's own documentation says outdated workflows, templates and reports can outlive the administrator who created them; poorly managed configuration can make the CRM behave unexpectedly, consume configuration limits or break team functions. Its Admin Tools were created to help admins inventory and remove stale configuration. The documentation specifically describes filters such as Last Used and Last Executed.  
Source: https://help.zoho.com/portal/en/kb/crm/data-administration/admin-tools/articles/working-with-admin-tools

Zoho also warns that a custom field moved to Unused Fields still exists in the database and still consumes the edition's field limit. Deleting it permanently from Unused Fields removes the field and its associated data, which cannot be restored through the UI.  
Source: https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/use-custom-fields

### Independent problem signals (not sales evidence)
1. Zoho CRM community topic, 21-Oct-2026: deleting or renaming a field/connection/template can silently break functions, workflows, blueprints, client scripts, Flow flows, Analytics reports and PDF templates; request proposes a usage tab and dependency graph.  
   https://help.zoho.com/portal/de/community/topic/zoho-crm-fields-21-10-2026
2. r/CRM, 27-Aug-2026, 20 votes: a field that appears unused may still feed reports, integrations, routing rules, permissions or quarterly workflows; discussion calls for owners, usage checks, deprecation and recoverable archives.  
   https://www.reddit.com/r/CRM/comments/1vzitxe/what_is_a_safe_process_for_retiring_unused_crm/
3. r/CRM, 18-Sep-2026, 7 votes: a recurring CRM cleanup issue where the purpose of a field is forgotten; a field looked unused but fed a workflow, report and nightly billing export.  
   https://www.reddit.com/r/CRM/comments/1wjirme/one_crm_cleanup_we_keep_doing_figuring_out_why_a/
4. r/CRMSoftware, 7-Oct-2026, 10 votes: an 8-user Zoho CRM customer says fields and workflows accumulated and were later forgotten; replies recommend reviewing workflow usage, descriptions and moving fields to Unused Fields rather than permanent deletion.  
   https://www.reddit.com/r/CRMSoftware/comments/1wzoqqk/here_is_my_zoho_crm_review_after_14_months_i_like/

These are independent user problem signals and one explicit feature request. Votes, comments and anecdotes are **not** representative market research, paid buyer proof or subscription conversion evidence.

## 3. Native features and direct/adjacent competitors

### A. Zoho CRM Admin Tools — strong native substitute
Native Admin Tools (Enterprise Edition and above) lets admins filter and permanently delete:
- Templates, Custom Views, Workflow Rules and Reports.
- Roles, Profiles and Webforms.

Filters include Created By, Created Time, Last Used, Last Modified, Last Accessed, Last Executed, Status and other object-specific properties. Zoho says Admin Tools deletion is permanent; deletion history is available for only the last 500,000 logs. It does not document a cross-component dependency graph or a field-level static reference scan.  
Source: https://help.zoho.com/portal/en/kb/crm/data-administration/admin-tools/articles/working-with-admin-tools

### B. Configuration Logs Tracker for Zoho CRM — free, official Zoho extension
Published 15-Mar-2026; latest release 19-Aug-2026. It captures setup-level changes for workflows, functions, custom buttons, schedules, layouts and other admin components. It is a change/audit log (what changed, when, and by whom), not a field-to-reference dependency graph. Its Marketplace page showed 0 ratings at the time of research.  
Source: https://marketplace.zoho.com/app/crm/configuration-logs-tracker-for-zoho-crm

### C. Configs for Zoho CRM — free, adjacent field documentation
Published 3-Jun-2026. It creates CSV files of standard-layout field configuration for selected modules, including label, API name, datatype and picklist values. The listing explicitly excludes fields from other layouts, unused fields and selected system fields. It helps document schemas and handovers; it does not show references in workflows, blueprints, functions or webhooks. Its visible listing did not show a paid price.  
Source: https://marketplace.zoho.com/app/crm/configs-for-zoho-crm

### D. Audit Tool for Zoho CRM — free, data-quality substitute
Shows incomplete records per module and ranks missing-data issues. Marketplace listing showed 100+ installs. This is data completeness/quality, not configuration dependency analysis.  
Source: https://marketplace.zoho.com/app/crm/audit-tool-for-zoho-crm

### E. Native audit trail / change history
Zoho's native Audit Log tracks changes to templates, workflow rules and field dependency mappings. This helps establish what changed and who changed it, but is not a forward dependency map showing what will break if a field is removed.  
Source: https://help.zoho.com/portal/en/kb/crm/crm-reference/product-architecture-and-reliability/articles/how-zoho-crm-administration-and-configuration-works-for-sales-operations

### Competitor conclusion
A bounded direct/adjacent scan found:
- one strong native cleanup tool;
- one free official configuration change-log extension;
- one free field configuration export extension;
- one free record completeness audit extension;
- several native configuration/audit tools.

No exact public paid Marketplace extension for a cross-component field dependency graph was identified in this bounded search. This is **not proof that no competitor exists**; marketplace search and vendor product catalogues are not a complete census. The potential gap is narrower than generic admin cleanup, and a full competitor audit remains outstanding.

## 4. Technical feasibility — read-only API surface

A partial dependency preflight appears technically plausible from documented Zoho CRM V8 APIs:

| Component | Documented read surface | Potential scan |
|---|---|---|
| Modules, fields, layouts, related lists | Module metadata API; field metadata APIs | Enumerate API names, labels, layout membership and field properties |
| Unused fields | Field metadata API supports `type=unused` | Identify fields already removed from layouts but still consuming limits |
| Workflow rules | List Workflow Rules API supports inner conditions/actions and READ scope | Parse rule criteria, conditions, instant and scheduled actions for field references |
| Blueprints | GET Blueprints and GET specific Blueprint APIs with READ scope | Inspect states/transitions and referenced fields |
| Field-to-field mapped dependencies | GET mapped dependency fields per layout with READ scope | Build parent-child field edges |
| Webhooks | GET Webhooks API with READ scope; payload parameters may contain merge-field expressions | Detect fields passed in request bodies, headers or URL parameters |
| Custom functions | GET Functions API and Download Function Code API with READ scope | Static-scan Deluge source and Java/Node/Python packages for field API-name references |
| Custom views | GET Custom Views metadata API with READ scope | Inspect view criteria where API returns fields/criteria |
| Field update actions | Get Field Updates; response includes feature associations; API says field updates associated with Workflows, Approval Processes or Blueprints cannot be deleted as standalone actions | Identify some linked automation references and add risk warnings |

Primary sources:
- Modules/fields metadata: https://www.zoho.com/crm/developer/docs/api/v8/module-meta.html
- Fields (including unused): https://www.zoho.com/crm/developer/docs/api/v8/get-fields.html
- Workflow rules: https://www.zoho.com/crm/developer/docs/api/v8/get-all-workflows.html
- Blueprints: https://www.zoho.com/crm/developer/docs/api/v8/blueprints.html
- Mapped dependency fields: https://www.zoho.com/crm/developer/docs/api/v8/get-map-dependency.html
- Webhooks: https://www.zoho.com/crm/developer/docs/api/v8/get-webhooks.html
- Functions list: https://www.zoho.com/crm/developer/docs/api/v8/functions-list.html
- Function source code: https://www.zoho.com/crm/developer/docs/api/v8/download-function-code.html
- Custom views: https://www.zoho.com/crm/developer/docs/api/v8/custom-view-meta.html
- Field update association restriction: https://www.zoho.com/crm/developer/docs/api/v8/delete-field-updates.html

### Critical technical limits / honest product boundary
- Static scanning of code can find literal field API-name references, but dynamic field-name construction, indirect calls, string concatenation and externally stored code can create false negatives.
- Access to Function source code is sensitive. An app would need explicit opt-in scopes and transparent disclosure; code should not be transferred to an external service for analysis by default.
- This research did not confirm APIs that exhaustively enumerate Client Scripts, Zoho Flow flows, CRM Analytics reports, all PDF/email templates, external connections and third-party integrations. Until each is independently proven, those surfaces must be marked **NOT SCANNED / UNKNOWN**, never “no dependency found.”
- Workflow usage reports have gaps: the official report does not compute some trigger counts (including field-update, score-based and date/time triggers); zero counts therefore cannot prove a rule is unused.  
  Source: https://help.zoho.com/portal/en/kb/crm/automate-business-processes/workflows/articles/workflow-report
- Field and configuration delete APIs are destructive. This candidate must remain **read-only**, produce a report and checklist, and never auto-delete, rename or mutate CRM configuration.
- A missing match is not proof of no dependency. Every result must carry coverage and confidence labels.

### Provisional safe scope
A first technical proof, if later authorised, could scan only:
1. module/field/layout metadata;
2. mapped field dependencies;
3. workflows and their conditions/actions;
4. blueprints;
5. webhook parameters;
6. field-update associations;
7. downloaded custom-function code after explicit consent.

Everything else would be explicitly excluded until supported by a verified API and test. This is a feasibility hypothesis, not a finished architecture or approved MVP.

## 5. Zoho Marketplace seller economics and India payout gate

Verified official mechanics:
- Zoho Marketplace lists extensions at no cost; the Developer Console is free for building and selling extensions.
- Zoho supports public paid extensions through its payment gateway and permits one-time or monthly recurring pricing.
- Zoho's Marketplace commission report states that, for extension developers, the reported commission equals the total value paid by customers. This is the documented gross extension commission; it should not be called net cash until remittance charges, taxes, FX and reversals are reconciled.
- A monthly statement is sent when outstanding commission exceeds USD 100. The developer must approve processing. A wire transfer may take about 15 working days from approval. PayPal can be requested by email.
- Official FAQ says review is about two business days; the publishing documentation says typically 24–48 hours.
- Zoho offers a 10-day free trial for extensions.

Sources:
- https://www.zoho.com/developer/help/marketplace/faqs.html
- https://www.zoho.com/developer/help/marketplace/payments.html
- https://www.zoho.com/developer/help/marketplace/pricing.html
- https://www.zoho.com/developer/help/marketplace/publish-extension.html
- https://www.zoho.com/developer/help/marketplace/guidelines.html

**India seller/payout is NOT VERIFIED.** The extension payout guide describes bank-details and wire transfer but does not explicitly list India as a supported extension-developer payout country, confirm INR/foreign-currency conversion, wire charges, tax documentation or whether a particular Indian entity/account is accepted.

Important distinction: a separate Zoho Reseller Store article lists an INR 50,000 threshold for Zoho India reseller commission. That is a different partner/reseller programme, not evidence of the Marketplace extension developer threshold. Do not use that INR 50,000 number for CRM extension sales.  
Source: https://www.zoho.com/store/partner/help/receive-commission.html

Zoho Marketplace claims access to 60M users; that is a vendor-reported ecosystem reach figure, not evidence of marketplace traffic, installs in the proposed category or paid buyer volume.

## 6. Wix App Market payout clarification

The Wix App Market plan must not be mistaken for Wix Payments merchant payout:
- Wix says app developers retain 100% of app revenue for the first 12 months; after that, revenue is split 80/20 after a 2.5% transaction fee and applicable sales tax.
- Paid app revenue is denominated in USD.
- Payout threshold is USD 200. Wix says a March revenue month is paid at the beginning of May, so the effective payout timing is later than simply “30 days after month-end.”
- The public developer documentation reviewed here does not explicitly confirm India-based App Market developer payout onboarding. A Wix article about Wix Payments merchant availability and a Wix Studio Partner article excluding banks in Russia/Pakistan do not, by themselves, prove that India App Market developer payouts are available.

Sources:
- https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/payments-and-billing-faqs
- https://dev.wix.com/docs/build-apps/launch-your-app/pricing-and-billing/about-monetizing-your-app
- https://support.wix.com/en/article/wix-studio-receiving-revenue-share

## 7. Economics and demand decision

No paid buyer count, subscription conversion, average revenue per account, churn, category install data or customer acquisition cost has been established for this specific Zoho problem. The existence of a published marketplace payment model does not validate product demand.

A monthly recurring licence could theoretically fit repeated dependency scans and change alerts, but that is only a monetization hypothesis. A one-time audit report may fit less well with recurring revenue. No price is approved and no ₹10 Cr sales forecast is assigned.

To progress beyond HOLD, the project still needs:
1. exact India seller and payout confirmation from Zoho for Marketplace extensions, including wire/FX fees and tax documentation;
2. an audit of at least 10–15 direct/adjacent CRM admin/dependency/configuration tools, their pricing, editions, installs/ratings, update dates and feature boundaries;
3. two or more independent current buyer signals beyond anecdotes, ideally paid procurement, buyer requests with budgets or paid comparable products;
4. a controlled technical proof of which fields can be mapped to which supported CRM components using read-only scopes, with false-positive/false-negative tests;
5. explicit technical exclusions for unsupported components and a positive recurring net-economics model.

## 8. Decision

**HOLD — NOT APPROVED FOR BUILD, ACCOUNT CREATION OR PUBLICATION.**

The problem is credible and the read-only API surface is promising enough for continued research. But existing native tools and free extensions cover much of the adjacent space; API coverage is partial; buyer willingness to pay and India seller payout remain unverified. Do not build a generic CRM cleanup tool or call it a universal dependency scanner.

P54-001 remains IN PROGRESS. Zoho stays the first marketplace research lane; this candidate remains a single HOLD hypothesis. Wix stays second, subject to explicit India app-payout validation. No owner gate has been exercised.

## 9. Financial truth

- Platform/provider-credited net earnings: ₹0.
- Bank-settled net receipts: ₹0.
- New spend authorised: ₹0.
- No developer account created, no KYC submitted, no Marketplace terms accepted, no public extension listed, and no code developed for this candidate.
