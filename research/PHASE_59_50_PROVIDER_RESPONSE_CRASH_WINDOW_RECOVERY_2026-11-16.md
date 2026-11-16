# Phase 59.50 — provider-response crash-window recovery

**Mission:** P10CR / P59-003 only  
**Status:** implementation submitted for exact-head cloud CI  
**Branch:** \`phase59-50-provider-response-crash-window\`  
**Parent:** Phase 59.49 merged at \`51d2af04cb62b9baf3a41199030f59fe5eaa04ce\`  
**Spend:** ₹0  
**Provider calls in CI:** deterministic mocks only  
**External network:** 0  
**Production flags:** OFF  
**AI inference:** disabled

## Baseline boundary

Phase 59.49 makes settlement replay-safe and writes a metadata-only provider response receipt in the same Durable Object SQLite transaction as authoritative response-header telemetry. It cannot atomically commit a remote provider response and local SQLite state.

The remaining failure interval is: a provider returns a response, but the Worker is lost before the response-header telemetry/receipt commits. If the immediate \`markUncertain\` fallback also cannot reach the Durable Object, the reservation remains \`RESERVED\` until its persisted lease expires. The system must then retain the full reservation as uncertain and permanently suppress a duplicate provider request under the same stable request ID.

## Test added

A Cloudflare workerd runtime test exercises the boundary using a deterministic mock provider and an injected Durable Object transport failure:

1. Seed authoritative quota telemetry and reserve one unit.
2. Mock exactly one successful provider response and increment a provider-call counter.
3. Inject transport loss for both \`recordTelemetry\` and the immediate \`markUncertain\` fallback, leaving the real Durable Object reservation unchanged.
4. Verify the durable reservation remains \`RESERVED\`, one unit remains reserved, and no response receipt exists.
5. Evict/reconstruct the Durable Object from SQLite and wait for the configured 30-second lease to expire.
6. Trigger expiry through a stale heartbeat and verify \`UNCERTAIN_BUDGET_RETAINED\`, reserved units zero, uncertain units one.
7. Retry with the exact same stable request ID and verify \`DUPLICATE_REQUEST_NOT_REPLAYED\`; the provider-call counter remains exactly one and no fabricated response receipt appears.

## Acceptance criteria

- Provider mock invoked exactly once.
- No response receipt is fabricated when telemetry persistence never commits.
- Restart/eviction does not erase the reservation.
- Lease expiry never releases uncertain usage.
- A stable request ID prevents provider replay after recovery.
- No live provider call, external network request, inference, deployment, credential, billing or spend.

## Evidence boundary

This is an injected transport-loss and Durable Object eviction/reconstruction test in the Cloudflare workerd runtime. It verifies the durable state outcome of the crash window; it is **not** a physical process kill at every instruction boundary, a real provider transaction, independent-host proof, hosted production deployment, 24×7 SLA or revenue evidence. The irreducible remote-provider/local-store atomicity gap remains handled conservatively by lease expiry and duplicate suppression.

## Next

Run exact-head Workers/workerd runtime and all required regression workflows. Do not merge unless every required check passes. If successful, reconcile mission state and continuity, then proceed to Phase 59.51: test the journal's post-commit restart/readback and reservation/receipt identity consistency under duplicate telemetry and conflicting response metadata. Keep production flags OFF, provider calls mocked, AI inference disabled and spend ₹0.
