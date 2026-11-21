# P59-003 Phase59.63 — Independent workflow-run proof owner packet

**Status:** PREPARED ONLY. No deployment, account setting, secret, variable, live call, billing or owner approval was performed.
**Scope:** P10CR / P59-003 only. **Spend:** ₹0. **AI inference:** disabled.

## Proof boundary

One seed workflow run, four separately dispatched host workflow runs and one separate snapshot workflow run use their actual GitHub Actions `GITHUB_RUN_ID` values. All six calls share one fresh test-only SQLite Durable Object namespace. Four standard GitHub-hosted runners use two fixed synthetic repository aliases:

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
8. Set environment secrets directly in GitHub, never in chat/code: `P59_003_TEST_DISPATCH_ENDPOINT` (HTTPS `*.workers.dev/internal/shadow-dispatch`) and `P59_003_TEST_INGRESS_SECRET` (high entropy, at least 32 characters).
9. Confirm no public route, publisher, production namespace, AI provider, payment provider or external account binding exists.

If Free eligibility, aggregate headroom, namespace isolation or owner approval cannot be verified, stop. No paid fallback.

## Six separate workflow runs

Use one unique test ID unchanged across all runs, e.g. `p59-63-20261121-01`. Run all stages within one UTC day.

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
