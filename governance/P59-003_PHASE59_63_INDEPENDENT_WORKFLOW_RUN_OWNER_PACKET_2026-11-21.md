# P59-003 Phase59.63 — Independent workflow-run proof owner packet

**Status:** PREPARED ONLY. No deployment, account setting, secret, variable, live call, billing or owner approval was performed.
**Scope:** P10CR / P59-003 only. **Spend:** ₹0. **AI inference:** disabled.

## Proof boundary

One seed workflow run, four separately dispatched host workflow runs and one separate snapshot workflow run use their actual GitHub Actions `GITHUB_RUN_ID` values. All six calls use the same test-only SQLite namespace pair: one shared SwarmRunDO namespace and one shared PlatformBudgetDO namespace. Four standard GitHub-hosted runners use two fixed synthetic repository aliases:

- host1 and host3: `synthetic-org/p10cr-shadow-repo-a`
- host2 and host4: `synthetic-org/p10cr-shadow-repo-b`

No real secondary repository is accessed or mutated. Aliases are accepted only in test mode with the P59.63 flag.

## Owner-only preflight

1. Use the existing Cloudflare account only. Verify Workers Free and aggregate account usage; do not create/rotate accounts or enable billing.
2. Provision fresh test-only SQLite namespaces for `SwarmRunDO` and `PlatformBudgetDO`. All six runs must use exactly these same namespace identities; never bind production namespaces.
3. Deploy only test-only Worker entrypoints. Keep the dispatcher disabled until GitHub environment approval is configured.
4. Set PlatformBudgetDO test cap to `{"dispatches":8}`; retain other conservative defaults. All six runs must finish within one UTC day.
5. Set `NEXUS_SHADOW_TEST_MODE=true` and `NEXUS_CROSS_RUN_PROOF_ENABLED=true` only on the test Worker. Do not attach a publisher, GitHub App write token, model/provider, payment provider or production data.
6. Create GitHub environment `p10cr-independent-host-owner-approved` with required owner reviewers for every run.
7. Set environment variables: `P59_003_CLOUDFLARE_FREE_VERIFIED=true`, `P59_003_PHASE63_NAMESPACE_VERIFIED=true`, `P59_003_PHASE63_LIVE_TEST_APPROVED=true`.
8. Set environment variable `P59_003_TEST_ENDPOINT_HOST` to the exact lower-case Worker hostname only (no scheme, path, port, wildcard or trailing dot). Set environment secrets directly in GitHub, never in chat/code: `P59_003_TEST_DISPATCH_ENDPOINT` (HTTPS `https://<exact-host>/internal/shadow-dispatch`, whose hostname must equal the separately configured variable) and `P59_003_TEST_INGRESS_SECRET` (high entropy, at least 32 characters). The workflow and client compare the endpoint hostname to the independent pin before any HMAC-signed request; a mismatch fails closed.
9. Confirm no public route, publisher, production namespace, AI provider, payment provider or external account binding exists.

If Free eligibility, aggregate headroom, namespace isolation or owner approval cannot be verified, stop. No paid fallback.

## Default-branch workflow visibility prerequisite

GitHub only exposes `workflow_dispatch` for a workflow file that exists on the repository's default branch. The Phase59.63 workflow is currently only in draft PR #48, based on `phase59-62-dependency-hardening`; parent PRs #44, #45, #46 and #47 are also open, draft and unmerged. Therefore the six-run workflow cannot yet be manually dispatched from the default branch.

Owner review/merge sequence, without bypassing branch rulesets: PR #44 to `master`, then #45, #46, #47 and #48 in order. Do not merge automatically or use a direct master write. After the complete stack is on `master`, verify the workflow appears in Actions, configure the required-reviewer environment, and only then begin the six separate manual runs.

## Phase59.63.2 default-branch execution guard

The workflow's first executable step imports the tested `owner-preflight.mjs` module and fails closed unless all three GitHub context values are exact:

- Repository: `manish91082-coder/nexus-autonomous-cloud-work-engine`
- Ref: `refs/heads/master`
- Event: `workflow_dispatch`

The same preflight validates the exact pinned Worker hostname, HTTPS internal dispatch path, owner approval variables, test-only namespace assertion, HMAC secret length, numeric run IDs, host slot and six-run uniqueness before the client is allowed to make a network request. It returns only non-secret context. A dispatch from a PR/feature branch or any non-manual event must stop before network access.

This code guard supplements, and does not replace, GitHub Environment required reviewers and owner verification of branch/ruleset protections. The live endpoint, namespace, environment and secrets remain unconfigured until the owner completes the approval packet.

## Six separate workflow runs

Supply a fresh unique test ID manually for each new proof and reuse it unchanged across all six runs, e.g. `p59-63-20261121-01`. The workflow has no reusable default. Never restart a partial proof with the same test ID; abandon it and use a new ID after owner-approved namespace cleanup. Run all stages within one UTC day.

1. Manually dispatch mode `seed`; record the actual run ID printed in `P59_63_SEED_RESULT`.
2. Manually dispatch a new run for host1, mode `host`, and enter the seed run ID.
3. Repeat as separate runs for host2, host3 and host4; record each actual run ID.
4. Manually dispatch a sixth run, mode `snapshot`, entering the seed ID and all four host IDs. Its own ID must differ from the other five.

The four host runs may run concurrently after separate environment approvals. Do not repeat a stage with the same test ID. If any stage fails or the UTC day changes, abandon that test ID and reset/re-provision the isolated namespace only through the owner-approved procedure.

## Expected result

- One seed reservation; four host reservations tied to four actual workflow-run IDs.
- Three overflow reservations admitted by the snapshot run; one additional overflow rejected.
- Four sentinel replays suppressed without extra reservations.
- Exactly 8 settled reservations; zero residual reserved and zero uncertain dispatches.
- Exactly 6 distinct workflow-run IDs and exactly 2 synthetic repository aliases.
- All reservations belong to the selected P59.63 test ID/phase and the SHA-256 event chain is valid.

Phase59.60's synthetic 100-attempt/cap-8 test remains the high-contention proof. Phase59.63 proves separate hosted workflow-run identity and shared namespace behavior. Four jobs inside one workflow run are not four workflow runs.

## Permissions and safety

Manual `workflow_dispatch` only; `GITHUB_TOKEN` is `contents:read`. No Actions write, contents write, PR write, publisher token or automated dispatch. Standard runners only; no cache, artifacts, larger runners or paid services. No inference, generated-code execution, public release, KYC, legal acceptance, billing, payments, signing or money movement. No passwords, OTPs, cookies, recovery codes or private keys.

Stop on unexpected identities, non-HTTPS/non-`workers.dev` endpoint, missing approval, budget mismatch, uncertain reservation, invalid event chain or nonzero spend. Preserve evidence; never auto-release uncertain capacity.



## Phase59.64A update — ordered host-run server gate (23-Nov-2026)

Before each host slot is accepted, the Worker now reads the shared PlatformBudgetDO snapshot and verifies the seed reservation and every earlier host-slot reservation are durably SETTLED under the exact supplied workflow-run ID and expected synthetic repository alias. Future slots must be absent. The client sends the seed and ordered prior-host IDs in the HMAC-covered payload. Workerd tests reject forged seed IDs, premature host2/host3 and swapped prior IDs before sequential host1→host2→host3→host4 acceptance.

Exact candidate code/test head: `99558b02de68e973ff80f8506b7212e13e87d686`. Exact CI: [#45105764381](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/45105764381), SUCCESS: 31/31 offline tests, YAML PASS, 165 lockfile entries, 83/83 Workers runtime, Workerd 1/1. This remains synthetic Workerd evidence, not physical-host proof. No live endpoint request, deployment, AI inference, spend or receipt. PR #50 remains draft/unmerged.
