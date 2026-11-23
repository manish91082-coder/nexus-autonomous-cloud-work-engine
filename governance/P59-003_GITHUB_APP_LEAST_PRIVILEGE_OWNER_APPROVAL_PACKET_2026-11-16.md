# P59-003 — GitHub App least-privilege owner approval packet
Date: 2026-11-16
Status: **PREPARED — NOT APPROVED, NOT CREATED, NOT INSTALLED**

Repository: `manish91082-coder/nexus-autonomous-cloud-work-engine`

This packet is a proposal for owner-controlled setup. The assistant has not created an App, installed an App, generated or accessed a private key, added a secret, accepted terms or changed repository protection settings.

## Recommended separation

Use two GitHub Apps, each installed only on the canonical P10CR repository initially:

### A. Nexus P10CR Compute App — read-only

| Repository permission | Level | Purpose |
|---|---|---|
| Metadata | Read | Repository identity and metadata |
| Contents | Read | Source, schemas and control-state reads |
| Actions | Read | Workflow run/job observation |
| Checks | Read | CI/check-run observation |
| Pull requests | Read | PR metadata and review state |

No write permissions. No Workflows, Administration, Secrets, Deployments, Packages, Members, Organization, Enterprise or Account permissions.

Compute workers receive only short-lived read-only installation tokens. The token broker must not pass a publisher token to a compute worker.

### B. Nexus P10CR Publisher App — single writer

| Repository permission | Level | Purpose |
|---|---|---|
| Metadata | Read | Repository identity |
| Contents | Write | Commit only deterministic, allowlisted artifacts on a dedicated branch |
| Pull requests | Write | Open/update PRs for owner/reviewer approval |
| Checks | Read | Verify required checks before opening/updating a PR |

No Workflows permission. No Actions write, Administration, Secrets, Deployments, Packages, Members, Organization, Enterprise or Account permissions. Do not add this App as a ruleset bypass actor.

GitHub App permissions should be minimal. Installation access tokens can be narrowed to selected repositories and a subset of the App's permissions; the documented installation token expires after one hour. See:
- https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app

## Token issuance policy

- Compute token: repository allowlist contains only `manish91082-coder/nexus-autonomous-cloud-work-engine`; permissions are read-only.
- Publisher token: same single-repository allowlist; only the publisher job can receive it.
- Mint tokens just in time, do not persist them, and discard them after the job. Do not broaden a token to all repositories installed on an account.
- Do not use a personal access token as a substitute.
- No account rotation, no credential sharing between projects and no cross-project access by default.

## Publisher hard boundary

GitHub App permissions are repository-scoped, not file-path scoped. Therefore `Contents: write` is still technically powerful. Enforce a deterministic publisher policy in code:

- Only a dedicated branch prefix such as `automation/p10cr/*`.
- Only schema-validated, signed/digested artifacts from approved task types.
- Explicit file-path allowlist; never accept model-generated source code.
- Never write `.github/workflows/**`, secrets, App credentials, protected master-plan policy or other projects' state.
- Do not write a revenue receipt unless independent settlement evidence, owner-controlled account attribution and reconciliation gates all pass.
- Publisher opens a PR; it does not merge. Required checks and owner/reviewer approval remain in force.
- No force-push, deletion, ruleset bypass or direct master push.

## Secret handling

- App IDs and installation IDs may be stored as repository variables if needed.
- Private keys must never be committed, logged, placed in artifacts or pasted into ChatGPT.
- Store each App's private key only in the appropriate GitHub Actions secret or a sign-only key vault. The Compute key is available only to the token broker; the Publisher key is available only to the isolated publisher job.
- Never expose a private key to model prompts or specialist workers.
- Never request or share passwords, OTPs, cookies, recovery codes or private keys.

GitHub's guidance identifies the App private key as highly sensitive, says not to hard-code it, and recommends secure storage:
- https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps

## Owner actions, only when ready

1. Review and approve the two-App design.
2. Create the Compute App with read-only permissions.
3. Create the Publisher App with only the listed write permissions.
4. Install both Apps on the canonical repository only. Do not select all repositories.
5. Generate each private key in GitHub's App settings and store it directly in the matching Actions secret or sign-only vault. Do not send the key to the assistant.
6. Add the non-secret App/installation IDs as repository variables.
7. Configure a master ruleset requiring PRs, required CI checks, at least one approval, no force-push and no deletion; do not add either App to the bypass list.
8. Approve a later controlled read-only token test before enabling any publisher flow.

## Current repository protection status

- Visible repository rulesets API result: empty array.
- Branch-protection API read: HTTP 403, integration scope insufficient.
- Therefore current master protection is **UNVERIFIED**. Do not infer that it is absent or configured. Owner must inspect the repository Settings UI.

Official ruleset documentation:
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository

## Approval boundary

This packet does not authorize App creation, installation, private-key generation, secret storage, KYC, legal acceptance, billing, public release, payments, repository-wide write access for compute workers or activation of production clients. Those actions remain owner-gated.


## Phase59.57 — implemented compute/publisher separation (candidate PR #42, 17-Nov-2026)

The implementation is committed on draft PR #42, stacked on PR #41 and draft PR #40. It is not merged to master.

### Compute worker
- Candidate mission-autonomous-worker workflow uses GITHUB_TOKEN Contents:read only.
- Checkout credential persistence is disabled.
- The worker no longer stages, commits or pushes any file.
- Provider secrets are not passed to the AI executor; MISSION_AI_ENABLED and MISSION_AI_ZERO_BILLING_CONFIRMED are explicitly false.
- The worker writes run-local reports and uploads artifacts only.

### Single constrained Publisher workflow
- Trigger: completed successful Mission Autonomous AI Worker run from canonical master only.
- GITHUB_TOKEN permissions: Actions:read and Contents:read.
- App token is minted only after source artifact validation and the two owner secrets below are present.
- Official token action is SHA-pinned: actions/create-github-app-token commit 64ab729a6294000f5aa4a4bc0b73d1f32bc45510 (v3.3.0).
- Required owner-only secrets, if and when approved: NEXUS_PUBLISHER_APP_CLIENT_ID and NEXUS_PUBLISHER_APP_PRIVATE_KEY. Never place private keys in chat, files, artifacts or commits.
- Token scope: only this repository; Metadata:read, Contents:write, Pull requests:write. No Actions, Workflows, Administration, Secrets, Deployments, Packages, organization or account permissions.
- Deterministic output branch prefix: automation/p10cr/worker-run-*.
- Deterministic file path: research/worker-drafts/ai-run-<run>-attempt-<attempt>.json.
- Only P59-003 reports marked DRAFT_READY_FOR_EVIDENCE_REVIEW with all safety assertions are eligible. Raw model output is never committed; only a sanitized summary with output SHA-256 and byte count is prepared.
- The publisher creates/reuses a draft PR only. Its source code has no merge, force-push, delete, release, deployment, KYC, payment or money-movement operation.

### Critical permission caveat and owner gates
GitHub's Pull requests:write permission is technically powerful and may permit merge operations at the API level. The publisher code does not call a merge endpoint, but code-level intent is not a substitute for repository enforcement. Before App installation or token use, the owner must configure and verify a ruleset that requires PRs, required CI checks and at least one human approval; denies force-push/deletion; and does not list either App as a bypass actor. Branch protection is currently UNVERIFIED. PR #42 must remain draft/unmerged until the stacked PRs and owner approval are reviewed.

This packet does not authorize App creation, installation, secret creation, AI inference, deployment, publication or any financial/account action. The compute worker remains hard-disabled for inference.


## Phase59.64B owner-review addendum (23-Nov-2026)

### Current PR and evidence state
- PRs #44→#45→#46→#47→#48→#49→#50 are all open, draft, mergeable and unmerged. Review and merge only in that order after owner review; no assistant merge is authorized.
- PR #50 is the current Phase59.64 candidate. Tested code head `3de92c7eb32ae594d3ea3f6da141a211a0ae6cb5` passed push #45106578746 and PR #45106583941. Final candidate checkpoint `e872f34afdbeae9350e84198d178fce63033bafd` passed #45107001561. Each: 32/32 offline, YAML PASS, 165-package lockfile integrity, 83/83 Workers runtime, 1/1 Workerd integration.
- Candidate Worker #45106996804 selected P59-003 with no inference. Candidate Guard #45106996788 passed 111 checks. Master Worker #45097408304 selected P59-003 with no inference; master Guard #45011590613 passed 111 checks.

### Repository-wide write-boundary caveat
The P10CR constrained publisher remains the only P10CR publication workflow. It uses a read-only GITHUB_TOKEN, then a one-repository GitHub App token with Contents:write and Pull requests:write only after source validation and owner configuration. Its code creates one allowlisted branch/file and a draft PR only; no merge, release, deployment, force-push or deletion path exists.

Two separate branch-scoped write workflows remain in the repository and were not invoked:
1. `.github/workflows/phase59-25-cloud-operational-soak.yml`: legacy disposable test-branch writer using GITHUB_TOKEN Contents:write, restricted to the Phase59.25 soak branch and a disposable state branch.
2. `.github/workflows/federation-lock-store.yml`: separate federation-locks branch CAS workflow with job-scoped Contents:write.

These are not the P10CR publisher, but they are residual write-capable workflows. Before production, the owner must review and either disable them or explicitly retain their branch-scoped permissions with verified protections. Other project workflows remain unexecuted/read-only in P59-003.

### Ruleset and branch-protection gate
The repository rulesets API returned an empty list and the branch-protection API returned HTTP 403 to the integration. This does not prove that branch protection is absent; it means protection is UNVERIFIED. The owner must verify in GitHub Settings that required PR review, required CI, no force-push/deletion and no App bypass actor are enforced before App installation or publisher activation.

### Owner approval sequence
1. Review and merge PRs #44–#50 sequentially, with required CI and human approval.
2. Verify master mission_state, queue, federation and continuity now reflect P59-003 as sole active P0; P59-001 PAUSED; P59-002 BLOCKED. Master currently has stale V5 portfolio sequence_mode and old continuity, so do not start live runs until reconciled.
3. Verify branch rulesets/protection in owner UI.
4. Review the two legacy branch-scoped write workflows above.
5. Only then create/install the least-privilege GitHub App and store owner secrets directly in the GitHub Environment. Never paste private keys or tokens into chat.
6. Keep AI inference disabled until provider/model/data terms, zero-billing and quota controls are verified and separately approved.
7. Do not enable public release, KYC, legal acceptance, payments, wallet signing or money movement through this packet.


## Phase59.64C synthetic concurrency acceptance (23-Nov-2026)

- Corrected code head `9868b642a57caa697dd60f740d3664bcdab50087` passed [PR CI #45107642156](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45107642156): 32/32 offline, YAML PASS, lockfile 165, Workers 83/83, Workerd 1/1.
- Two concurrent host1 workflow-run identities produced exactly one settled host1 reservation and one winner. Two competing snapshot workflow-run identities produced exactly one settled overflow1 reservation; the losing run could not create overflow2. Final synthetic snapshot: eight settled, zero reserved, zero uncertain, six distinct run IDs, two repositories, valid event chain.
- This does not replace physical independent-host testing. The six separate workflow runs remain owner-gated until PR stack merge, branch protection, Cloudflare Free account/aggregate usage, required-reviewer environment and test-only shared namespace are verified.


## Phase59.65 publisher environment approval requirement (23-Nov-2026)

The constrained publisher job now declares the exact GitHub Environment `p10cr-publisher`. The job must remain blocked until the owner configures this environment with:

1. At least one required reviewer who is not the workflow initiator (enable the platform's prevent-self-review option).
2. Administrator bypass disabled where the repository plan/settings expose that control.
3. Deployment branch policy restricted to the canonical `master` branch.
4. Store `NEXUS_PUBLISHER_APP_CLIENT_ID` and `NEXUS_PUBLISHER_APP_PRIVATE_KEY` as **environment secrets** on `p10cr-publisher`, not repository-wide secrets.
5. Keep the Publisher App installed only on `manish91082-coder/nexus-autonomous-cloud-work-engine`, with Metadata: read, Contents: write and Pull requests: write only. Do not grant Actions, Workflows, Administration, Secrets, Deployments or bypass permissions.

The workflow's environment declaration is a fail-closed gate, not proof that the environment is configured. Until the owner verifies required reviewers, branch policy and secrets placement in GitHub Settings, the publisher remains NOT APPROVED and must not be activated. This addendum does not authorize App creation/installation or secret creation.
