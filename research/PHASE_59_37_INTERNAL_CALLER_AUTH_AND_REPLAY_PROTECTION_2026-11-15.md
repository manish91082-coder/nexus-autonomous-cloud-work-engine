# Phase 59.37 — Internal Caller Authentication and Replay Protection

**Mission:** P10CR / P59-003 AI agentic swarm foundation  
**Status:** Merged to master; security/runtime CI PASS  
**PR:** [#15](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/pull/15)  
**Merge commit:** `d3ffd9b29e5b317451f3c6c9ee1ccbe493caafde`  
**Exact tested head:** `d8ba113fe16ad97e65f49581885152c043e34a26`  
**Spend:** ₹0  
**Live inference:** disabled  
**Production quota feature flag:** OFF

## Security boundary implemented

- The Durable Object exposes only an authenticated `fetch()` RPC surface. Quota mutation and snapshot operations are private class methods, so a Worker cannot bypass authentication by calling public RPC methods directly.
- HMAC-SHA256 authenticates the caller ID, timestamp, nonce, HTTP method, path and SHA-256 hash of the exact request body.
- The host Durable Object Worker reads a server-side caller-key registry from environment secrets. Real keys are not committed; the local test harness uses clearly marked dummy test keys.
- Timestamp skew is limited to 30 seconds.
- A SQLite nonce table enforces per-caller replay prevention with a 120-second expiry and expired-entry cleanup.
- Per-caller action policies are enforced at the Durable Object boundary:
  - `primary`: reserve, settle, mark uncertain, snapshot.
  - `secondary`: reserve, mark uncertain.
- Every reservation records the authenticated caller ID. Settlement and uncertain-outcome transitions must come from the reservation-owning caller.
- Provider, credential-scope and quota-window identity is checked for every operation.
- The host requires `NEXUS_QUOTA_STORE_ENABLED=true`; only the isolated local test host sets it. Production remains disabled by default.

## Verification

Runtime CI: [43707931301](https://github.com/manish91082-coder/nexus-autonomous-cloud-work-engine/actions/runs/43707931301) — **SUCCESS, 18/18 tests**.  
The exact tested head also passed 13 check runs: workers runtime, ledger adapter, quota budget, multi-bucket contract, specialist contracts, journal, contention recovery, cloud soak, quota guard and PostgreSQL reference regression.

Security tests cover:
1. unauthenticated caller rejection without quota mutation;
2. unknown caller and wrong HMAC key rejection;
3. expired timestamp rejection;
4. replayed nonce rejection;
5. body tampering rejection;
6. per-caller action allowlists;
7. reservation-owner binding, preventing one caller from settling another caller's reservation;
8. wrong provider/credential/window identity rejection.

The same runtime suite retains quota invariants: multi-bucket all-or-nothing admission, quota settlement, duplicate reservation protection, uncertain usage retention, telemetry rebase, two-Worker shared namespace and mixed-caller contention without oversubscription.

## Explicit non-claims and remaining gates

- No Cloudflare hosted deployment or independently hosted Worker.
- No real provider telemetry collector or provider credentials.
- No key rotation protocol, automated secret distribution, or external KMS integration.
- No multi-region/high-availability or 24x7 SLA proof.
- No live LLM inference, paid fallback, customer transaction or revenue claim.
- The test secrets and local feature flag are not production credentials/configuration.

## Next phase — 59.38

1. Implement provider-specific read-only quota telemetry adapters, beginning with GitHub REST, Search, GraphQL and Actions buckets.
2. Normalize observed remaining/limit/reset timestamps, resource identity and telemetry freshness with provenance.
3. Build measured endpoint-to-bucket operation-cost maps; unknown costs fail closed rather than being guessed.
4. Test stale, future, out-of-order telemetry, provider reset boundaries and quota-window rollover.
5. Add reservation expiry, uncertain-use reconciliation, audit export and restore drills.
6. Only then integrate the authenticated quota client into read-only swarm workers behind the disabled feature flag.
