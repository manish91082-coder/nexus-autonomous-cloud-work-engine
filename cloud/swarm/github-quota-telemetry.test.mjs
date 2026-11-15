import test from "node:test";
import assert from "node:assert/strict";
import {
  GitHubQuotaTelemetryError,
  parseGitHubRateLimitHeaders,
  parseGitHubRateLimitOverview,
  reconcileGitHubQuotaTelemetry,
  parseGitHubRateLimitError,
  classifyGitHubOperationCost,
  parseGitHubGraphqlRateLimit,
  githubSecondaryRateLimitPolicy
} from "./github-quota-telemetry.mjs";

const baseHeaders = (overrides = {}) => ({
  "x-ratelimit-limit": "5000",
  "x-ratelimit-remaining": "4200",
  "x-ratelimit-used": "800",
  "x-ratelimit-reset": "1794788400",
  "x-ratelimit-resource": "core",
  ...overrides
});

function headerRecord(overrides = {}, observedAtEpoch = 1794784800) {
  return parseGitHubRateLimitHeaders({
    headers: baseHeaders(overrides),
    credentialScope: "github-app-installation:42",
    observedAtEpoch,
    endpoint: "GET /repos/acme/demo",
    method: "GET",
    status: 200,
    requestId: "req-001"
  });
}

test("parses authoritative core response headers with non-secret provenance", () => {
  const result = headerRecord();
  assert.equal(result.provider, "github");
  assert.equal(result.bucket_id, "core");
  assert.equal(result.window_id, "core:1794788400");
  assert.equal(result.limit_units, 5000);
  assert.equal(result.observed_remaining_units, 4200);
  assert.equal(result.used_units, 800);
  assert.equal(result.authority_rank, 100);
  assert.equal(result.is_authoritative, true);
  assert.equal(result.provenance.request_id, "req-001");
  assert.equal(result.provenance.endpoint, "GET /repos/acme/demo");
  assert.equal("token" in result.provenance, false);
});

test("keeps search, code_search, GraphQL and runner-registration resources distinct", () => {
  const resources = ["search", "code_search", "graphql", "actions_runner_registration"];
  const parsed = resources.map(resource => headerRecord({"x-ratelimit-resource": resource}));
  assert.deepEqual(parsed.map(x => x.bucket_id), resources);
  assert.equal(new Set(parsed.map(x => x.window_id)).size, 1);
});

test("fails closed when a required rate-limit header is absent", () => {
  const headers = baseHeaders();
  delete headers["x-ratelimit-resource"];
  assert.throws(() => parseGitHubRateLimitHeaders({
    headers,
    credentialScope: "installation:42",
    observedAtEpoch: 1794784800,
    endpoint: "GET /repos/acme/demo",
    method: "GET",
    status: 200
  }), GitHubQuotaTelemetryError);
});

test("rejects malformed counters, remaining greater than limit and non-future reset", () => {
  assert.throws(() => headerRecord({"x-ratelimit-remaining": "5001"}), /remaining exceeds limit/);
  assert.throws(() => headerRecord({"x-ratelimit-used": "-1"}), /integer/);
  assert.throws(() => headerRecord({"x-ratelimit-reset": "1794784800"}), /not in the future/);
  assert.throws(() => headerRecord({"x-ratelimit-resource": "bad resource"}), /resource/);
});

test("parses periodic overview resources dynamically and marks it lower authority", () => {
  const parsed = parseGitHubRateLimitOverview({
    credentialScope: "github-app-installation:42",
    observedAtEpoch: 1794784800,
    requestId: "overview-01",
    payload: {
      resources: {
        core: {limit:5000, used:800, remaining:4200, reset:1794788400},
        search: {limit:30, used:5, remaining:25, reset:1794788400},
        code_search: {limit:10, used:2, remaining:8, reset:1794788400},
        graphql: {limit:5000, used:400, remaining:4600, reset:1794788400},
        actions_runner_registration: {limit:100, used:1, remaining:99, reset:1794788400},
        source_import: {limit:100, used:0, remaining:100, reset:1794788400}
      }
    }
  });
  assert.deepEqual(parsed.buckets.map(x => x.bucket_id), [
    "core", "search", "code_search", "graphql", "actions_runner_registration"
  ]);
  assert.equal(parsed.buckets[0].authority_rank, 50);
  assert.equal(parsed.buckets[0].is_authoritative, false);
  assert.deepEqual(parsed.ignoredResources, [{
    resource: "source_import", reason: "DOCUMENTED_DEPRECATED_RESOURCE"
  }]);
});

test("per-response headers dominate a newer periodic overview snapshot", () => {
  const header = headerRecord({}, 1794784800);
  const overview = parseGitHubRateLimitOverview({
    credentialScope: "github-app-installation:42",
    observedAtEpoch: 1794784900,
    payload: {resources: {
      core: {limit:5000, used:1000, remaining:4000, reset:1794788400}
    }}
  }).buckets[0];
  const result = reconcileGitHubQuotaTelemetry(header, overview);
  assert.equal(result.record, header);
  assert.equal(result.decision, "KEEP_HIGHER_AUTHORITY_SOURCE");
});

test("accepts a newer authoritative header even when regional remaining increases", () => {
  const first = headerRecord({"x-ratelimit-remaining": "4000"}, 1794784800);
  const next = headerRecord({"x-ratelimit-remaining": "4300"}, 1794784801);
  const result = reconcileGitHubQuotaTelemetry(first, next);
  assert.equal(result.record.observed_remaining_units, 4300);
  assert.equal(result.decision, "ACCEPT_NEWER_OBSERVATION");
});

test("uses conservative minimum for observations in the same second", () => {
  const first = headerRecord({"x-ratelimit-remaining": "4000"}, 1794784800);
  const next = headerRecord({"x-ratelimit-remaining": "4300"}, 1794784800);
  const result = reconcileGitHubQuotaTelemetry(first, next);
  assert.equal(result.record.observed_remaining_units, 4000);
  assert.equal(result.decision, "SAME_SECOND_CONSERVATIVE_MIN");
});

test("does not replace a newer quota window with an older reset window", () => {
  const current = headerRecord({"x-ratelimit-reset": "1794789000"}, 1794784800);
  const older = headerRecord({"x-ratelimit-reset": "1794788400"}, 1794784801);
  const result = reconcileGitHubQuotaTelemetry(current, older);
  assert.equal(result.record, current);
  assert.equal(result.decision, "KEEP_NEWER_WINDOW");
});

test("allows a periodic overview to establish the next window after the prior reset", () => {
  const current = headerRecord({"x-ratelimit-reset": "1794788400"}, 1794784800);
  const overview = parseGitHubRateLimitOverview({
    credentialScope: "github-app-installation:42",
    observedAtEpoch: 1794788400,
    payload: {resources: {
      core: {limit:5000, used:10, remaining:4990, reset:1794792000}
    }}
  }).buckets[0];
  const result = reconcileGitHubQuotaTelemetry(current, overview);
  assert.equal(result.decision, "ACCEPT_NEW_WINDOW_AFTER_RESET");
  assert.equal(result.record.reset_at_epoch, 1794792000);
});

test("does not accept a future overview window before the current window resets", () => {
  const current = headerRecord({"x-ratelimit-reset": "1794788400"}, 1794784800);
  const overview = parseGitHubRateLimitOverview({
    credentialScope: "github-app-installation:42",
    observedAtEpoch: 1794786000,
    payload: {resources: {
      core: {limit:5000, used:10, remaining:4990, reset:1794792000}
    }}
  }).buckets[0];
  const result = reconcileGitHubQuotaTelemetry(current, overview);
  assert.equal(result.record, current);
  assert.equal(result.decision, "KEEP_CURRENT_WINDOW_UNTIL_RESET");
});

test("rejects cross-credential telemetry reconciliation", () => {
  const current = headerRecord();
  const incoming = {
    ...current,
    credential_scope: "different-installation"
  };
  assert.throws(() => reconcileGitHubQuotaTelemetry(current, incoming), /identity mismatch/);
});

test("classifies primary rate-limit exhaustion using reset timestamp", () => {
  const result = parseGitHubRateLimitError({
    status: 200,
    headers: {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1794788400"
    },
    body: {message: "API rate limit exceeded"},
    observedAtEpoch: 1794784800
  });
  assert.equal(result.limit_type, "PRIMARY_RATE_LIMIT_EXHAUSTED");
  assert.equal(result.retry_at_epoch, 1794788400);
  assert.equal(result.retry_source, "x-ratelimit-reset");
});

test("honors Retry-After for throttled responses", () => {
  const result = parseGitHubRateLimitError({
    status: 429,
    headers: {"retry-after": "75"},
    body: {message: "secondary rate limit"},
    observedAtEpoch: 1794784800
  });
  assert.equal(result.retry_at_epoch, 1794784875);
  assert.equal(result.retry_source, "retry-after");
  assert.equal(result.secondary_limit_state, "UNKNOWN");
});

test("uses at least one minute backoff when secondary-limit status is not explicit", () => {
  const result = parseGitHubRateLimitError({
    status: 403,
    headers: {},
    body: {message: "You have exceeded a secondary rate limit"},
    observedAtEpoch: 1794784800
  });
  assert.equal(result.limit_type, "SECONDARY_RATE_LIMIT_SUSPECTED");
  assert.equal(result.retry_at_epoch, 1794784860);
  assert.equal(result.secondary_limit_state, "UNKNOWN");
});

test("rejects non-rate-limit HTTP statuses in throttle parser", () => {
  assert.throws(() => parseGitHubRateLimitError({
    status: 500, headers: {}, observedAtEpoch: 1794784800
  }), /must be 200, 403 or 429/);
});

test("keeps generic REST method costs provisional until endpoint-specific cost is verified", () => {
  const get = classifyGitHubOperationCost({
    apiKind: "rest", method: "GET", endpoint: "/repos/acme/demo"
  });
  const post = classifyGitHubOperationCost({
    apiKind: "rest", method: "POST", endpoint: "/repos/acme/demo/issues"
  });
  assert.equal(get.secondary_points, 1);
  assert.equal(post.secondary_points, 5);
  assert.equal(get.primary_units, 1);
  assert.equal(get.admission_ready, false);
  assert.equal(post.admission_ready, false);
});

test("treats GET /rate_limit as zero primary units but not zero secondary points", () => {
  const result = classifyGitHubOperationCost({
    apiKind: "rest", method: "GET", endpoint: "/rate_limit"
  });
  assert.equal(result.primary_units, 0);
  assert.equal(result.secondary_points, 1);
  assert.equal(result.admission_ready, false);
});

test("requires endpoint-specific verified cost for REST admission", () => {
  const result = classifyGitHubOperationCost({
    apiKind: "rest", method: "POST", endpoint: "/repos/acme/demo/issues",
    endpointSpecificSecondaryPoints: 7
  });
  assert.equal(result.secondary_points, 7);
  assert.equal(result.endpoint_cost_verified, true);
  assert.equal(result.admission_ready, true);
});

test("classifies GraphQL query/mutation secondary defaults and requires measured primary cost", () => {
  const query = classifyGitHubOperationCost({
    apiKind: "graphql", method: "POST", endpoint: "/graphql",
    graphqlOperationKind: "query"
  });
  const mutation = classifyGitHubOperationCost({
    apiKind: "graphql", method: "POST", endpoint: "/graphql",
    graphqlOperationKind: "mutation", graphqlPrimaryCost: 13
  });
  assert.equal(query.secondary_points, 1);
  assert.equal(query.primary_units, null);
  assert.equal(query.admission_ready, false);
  assert.equal(mutation.secondary_points, 5);
  assert.equal(mutation.primary_units, 13);
  assert.equal(mutation.admission_ready, true);
});

test("exposes published secondary-limit ceilings as policy, not live telemetry", () => {
  const policy = githubSecondaryRateLimitPolicy();
  assert.equal(policy.directly_queryable, false);
  assert.equal(policy.ceilings.concurrent_rest_and_graphql_requests.limit, 100);
  assert.equal(policy.ceilings.rest_endpoint_points.limit, 900);
  assert.equal(policy.ceilings.graphql_endpoint_points.limit, 2000);
  assert.equal(policy.ceilings.content_generating_requests_hourly.limit, 500);
  assert.equal(policy.admission_mode, "LOCAL_CONSERVATIVE_GUARDRAIL_ONLY");
});

test("rejects a normal HTTP 200 response without a rate-limit error message", () => {
  assert.throws(() => parseGitHubRateLimitError({
    status: 200,
    headers: {"x-ratelimit-remaining": "0", "x-ratelimit-reset": "1794788400"},
    body: {message: "Success"},
    observedAtEpoch: 1794784800
  }), /does not contain a rate-limit error/);
});

test("parses measured GraphQL rateLimit cost and reset window", () => {
  const result = parseGitHubGraphqlRateLimit({
    credentialScope: "github-app-installation:42",
    observedAtEpoch: 1794784800,
    payload: {data: {rateLimit: {
      limit: 5000,
      cost: 13,
      remaining: 4200,
      used: 800,
      resetAt: "2026-11-16T00:20:00Z"
    }}}
  });
  assert.equal(result.bucket_id, "graphql");
  assert.equal(result.measured_graphql_cost, 13);
  assert.equal(result.authority_rank, 80);
});

test("rejects GraphQL responses without measured query cost", () => {
  assert.throws(() => parseGitHubGraphqlRateLimit({
    credentialScope: "github-app-installation:42",
    observedAtEpoch: 1794784800,
    payload: {data: {rateLimit: {
      limit: 5000, remaining: 4200, used: 800,
      resetAt: "2026-11-15T18:00:00Z"
    }}}
  }), /rateLimit.cost/);
});
