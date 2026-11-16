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
