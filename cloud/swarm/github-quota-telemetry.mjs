/**
 * Phase 59.38 — evidence-first GitHub quota telemetry parsing.
 *
 * Pure parser/reconciliation code only. No HTTP client, token access or network
 * calls. The caller supplies a stable non-secret credentialScope label.
 */
export class GitHubQuotaTelemetryError extends Error {}

const RESOURCE_RE = /^[a-z][a-z0-9_]{0,63}$/;
const REST_METHODS = new Set(["GET", "HEAD", "OPTIONS", "POST", "PATCH", "PUT", "DELETE"]);

function nonEmpty(value, field) {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    throw new GitHubQuotaTelemetryError(`invalid ${field}`);
  }
  return value;
}

function nonNegativeInteger(value, field, min = 0) {
  const parsed = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || parsed < min) {
    throw new GitHubQuotaTelemetryError(`${field} must be an integer >= ${min}`);
  }
  return parsed;
}

function readHeader(headers, name) {
  if (headers && typeof headers.get === "function") {
    const value = headers.get(name);
    return value === null ? undefined : value;
  }
  if (headers && typeof headers === "object") {
    const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
    return key === undefined ? undefined : headers[key];
  }
  return undefined;
}

function validateWindow({limit, remaining, used, reset, observedAtEpoch}) {
  if (remaining > limit) throw new GitHubQuotaTelemetryError("remaining exceeds limit");
  if (used > limit) throw new GitHubQuotaTelemetryError("used exceeds limit");
  if (reset <= observedAtEpoch) throw new GitHubQuotaTelemetryError("reset timestamp is not in the future");
}

function telemetryRecord({
  credentialScope, resource, limit, remaining, used, reset, observedAtEpoch,
  source, authorityRank, endpoint, method, status, requestId, extra = {}
}) {
  nonEmpty(credentialScope, "credentialScope");
  if (!RESOURCE_RE.test(resource)) throw new GitHubQuotaTelemetryError("invalid rate-limit resource");
  validateWindow({limit, remaining, used, reset, observedAtEpoch});
  return {
    provider: "github",
    credential_scope: credentialScope,
    bucket_id: resource,
    window_id: `${resource}:${reset}`,
    limit_units: limit,
    observed_remaining_units: remaining,
    used_units: used,
    reset_at_epoch: reset,
    observed_at_epoch: observedAtEpoch,
    telemetry_source: source,
    authority_rank: authorityRank,
    is_authoritative: authorityRank >= 100,
    provenance: {
      endpoint,
      method,
      status,
      request_id: requestId ?? null,
      source,
      authority_rank: authorityRank
    },
    ...extra
  };
}

/** Parse x-ratelimit-* headers from one actual REST or GraphQL response. */
export function parseGitHubRateLimitHeaders({
  headers, credentialScope, observedAtEpoch, endpoint, method, status, requestId = null
}) {
  nonEmpty(credentialScope, "credentialScope");
  nonEmpty(endpoint, "endpoint");
  nonEmpty(method, "method");
  const observed = nonNegativeInteger(observedAtEpoch, "observedAtEpoch");
  const resource = readHeader(headers, "x-ratelimit-resource");
  const limit = nonNegativeInteger(readHeader(headers, "x-ratelimit-limit"), "x-ratelimit-limit", 1);
  const remaining = nonNegativeInteger(readHeader(headers, "x-ratelimit-remaining"), "x-ratelimit-remaining");
  const used = nonNegativeInteger(readHeader(headers, "x-ratelimit-used"), "x-ratelimit-used");
  const reset = nonNegativeInteger(readHeader(headers, "x-ratelimit-reset"), "x-ratelimit-reset", 1);
  return telemetryRecord({
    credentialScope, resource, limit, remaining, used, reset,
    observedAtEpoch: observed,
    source: "response_header",
    authorityRank: 100,
    endpoint, method: method.toUpperCase(), status, requestId,
    extra: { freshness: "OBSERVED", measurement: "provider_response_headers" }
  });
}

/**
 * Parse the periodic GET /rate_limit overview. It is lower authority than
 * per-response x-ratelimit headers and must never overwrite a newer header
 * observation for the same credential/resource window.
 */
export function parseGitHubRateLimitOverview({
  payload, credentialScope, observedAtEpoch, requestId = null
}) {
  nonEmpty(credentialScope, "credentialScope");
  const observed = nonNegativeInteger(observedAtEpoch, "observedAtEpoch");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || !payload.resources || typeof payload.resources !== "object"
    || Array.isArray(payload.resources)) {
    throw new GitHubQuotaTelemetryError("rate_limit payload.resources object required");
  }
  const buckets = [];
  const ignoredResources = [];
  for (const [resource, value] of Object.entries(payload.resources)) {
    // GitHub documents source_import as no longer used by any endpoint.
    if (resource === "source_import") {
      ignoredResources.push({resource, reason: "DOCUMENTED_DEPRECATED_RESOURCE"});
      continue;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new GitHubQuotaTelemetryError(`invalid resource object: ${resource}`);
    }
    const limit = nonNegativeInteger(value.limit, `${resource}.limit`, 1);
    const remaining = nonNegativeInteger(value.remaining, `${resource}.remaining`);
    const used = nonNegativeInteger(value.used, `${resource}.used`);
    const reset = nonNegativeInteger(value.reset, `${resource}.reset`, 1);
    buckets.push(telemetryRecord({
      credentialScope, resource, limit, remaining, used, reset,
      observedAtEpoch: observed,
      source: "rate_limit_endpoint",
      authorityRank: 50,
      endpoint: "GET /rate_limit",
      method: "GET",
      status: 200,
      requestId,
      extra: { freshness: "PERIODIC_OVERVIEW", measurement: "overview_snapshot" }
    }));
  }
  return {buckets, ignoredResources};
}

/**
 * Reconcile two observations for one resource. Response headers dominate
 * periodic overview snapshots. A newer header may legitimately report more
 * remaining capacity because GitHub serves API traffic from multiple regions.
 */
export function reconcileGitHubQuotaTelemetry(current, incoming) {
  if (!incoming || typeof incoming !== "object") {
    throw new GitHubQuotaTelemetryError("incoming telemetry required");
  }
  if (!current) return {record: incoming, decision: "ACCEPT_INITIAL"};
  for (const field of ["provider", "credential_scope", "bucket_id"]) {
    if (current[field] !== incoming[field]) {
      throw new GitHubQuotaTelemetryError(`telemetry identity mismatch: ${field}`);
    }
  }
  if (incoming.reset_at_epoch < current.reset_at_epoch) {
    return {record: current, decision: "KEEP_NEWER_WINDOW"};
  }
  if (incoming.reset_at_epoch > current.reset_at_epoch) {
    if (incoming.authority_rank < current.authority_rank) {
      return {record: current, decision: "KEEP_HIGHER_AUTHORITY_WINDOW"};
    }
    return {record: incoming, decision: "ACCEPT_NEW_WINDOW"};
  }
  if (incoming.authority_rank < current.authority_rank) {
    return {record: current, decision: "KEEP_HIGHER_AUTHORITY_SOURCE"};
  }
  if (incoming.observed_at_epoch < current.observed_at_epoch) {
    return {record: current, decision: "KEEP_NEWER_OBSERVATION"};
  }
  if (incoming.observed_at_epoch === current.observed_at_epoch) {
    const conservative = {
      ...incoming,
      observed_remaining_units: Math.min(
        current.observed_remaining_units, incoming.observed_remaining_units
      )
    };
    return {record: conservative, decision: "SAME_SECOND_CONSERVATIVE_MIN"};
  }
  return {record: incoming, decision: "ACCEPT_NEWER_OBSERVATION"};
}

/** Parse a GitHub REST 403/429 rate-limit response into a cooldown directive. */
export function parseGitHubRateLimitError({status, headers, body = null, observedAtEpoch}) {
  if (status !== 403 && status !== 429) {
    throw new GitHubQuotaTelemetryError("rate-limit error status must be 403 or 429");
  }
  const observed = nonNegativeInteger(observedAtEpoch, "observedAtEpoch");
  const remainingHeader = readHeader(headers, "x-ratelimit-remaining");
  const resetHeader = readHeader(headers, "x-ratelimit-reset");
  const retryAfterHeader = readHeader(headers, "retry-after");
  const remaining = remainingHeader === undefined
    ? null : nonNegativeInteger(remainingHeader, "x-ratelimit-remaining");
  const reset = resetHeader === undefined
    ? null : nonNegativeInteger(resetHeader, "x-ratelimit-reset", 1);
  const retryAfter = retryAfterHeader === undefined
    ? null : nonNegativeInteger(retryAfterHeader, "retry-after");
  const message = typeof body === "string" ? body
    : body && typeof body.message === "string" ? body.message : "";
  if (remaining === 0 && reset !== null && reset > observed) {
    return {
      status: "COOLDOWN",
      limit_type: "PRIMARY_RATE_LIMIT_EXHAUSTED",
      retry_at_epoch: reset,
      retry_source: "x-ratelimit-reset",
      secondary_limit_state: "UNKNOWN",
      message
    };
  }
  if (retryAfter !== null) {
    return {
      status: "COOLDOWN",
      limit_type: "RETRY_AFTER",
      retry_at_epoch: observed + retryAfter,
      retry_source: "retry-after",
      secondary_limit_state: "UNKNOWN",
      message
    };
  }
  // GitHub advises at least one minute before retrying when a secondary limit
  // is suspected and neither retry-after nor primary reset is available.
  return {
    status: "COOLDOWN",
    limit_type: /secondary rate limit/i.test(message)
      ? "SECONDARY_RATE_LIMIT_SUSPECTED" : "RATE_LIMIT_TYPE_UNCONFIRMED",
    retry_at_epoch: observed + 60,
    retry_source: "documented_minimum_one_minute_backoff",
    secondary_limit_state: "UNKNOWN",
    message
  };
}

/**
 * Return documented generic secondary-point defaults separately from primary
 * quota units. These are not endpoint-specific measured costs; admission must
 * remain blocked until an endpoint-specific verified cost is supplied.
 */
export function classifyGitHubOperationCost({
  apiKind, method, endpoint, graphqlOperationKind = null,
  endpointSpecificSecondaryPoints = null, graphqlPrimaryCost = null
}) {
  nonEmpty(endpoint, "endpoint");
  const verb = nonEmpty(method, "method").toUpperCase();
  if (apiKind === "rest") {
    if (!REST_METHODS.has(verb)) throw new GitHubQuotaTelemetryError("unsupported REST method");
    const primaryUnits = endpoint === "/rate_limit" && verb === "GET" ? 0 : 1;
    const documentedDefault = ["GET", "HEAD", "OPTIONS"].includes(verb) ? 1 : 5;
    const verified = endpointSpecificSecondaryPoints !== null;
    const secondaryPoints = verified
      ? nonNegativeInteger(endpointSpecificSecondaryPoints, "endpointSpecificSecondaryPoints", 1)
      : documentedDefault;
    return {
      api_kind: "rest",
      endpoint,
      method: verb,
      primary_units: primaryUnits,
      secondary_points: secondaryPoints,
      secondary_points_source: verified ? "endpoint_specific_verified_override" : "documented_general_default",
      endpoint_cost_verified: verified,
      admission_ready: verified,
      note: endpoint === "/rate_limit" && verb === "GET"
        ? "does not consume primary REST quota; may consume secondary points"
        : "generic method cost is not an endpoint-specific measurement"
    };
  }
  if (apiKind === "graphql") {
    if (verb !== "POST") throw new GitHubQuotaTelemetryError("GraphQL requests must use POST");
    if (graphqlOperationKind !== "query" && graphqlOperationKind !== "mutation") {
      throw new GitHubQuotaTelemetryError("graphqlOperationKind must be query or mutation");
    }
    const secondaryPoints = graphqlOperationKind === "query" ? 1 : 5;
    const primaryCost = graphqlPrimaryCost === null
      ? null : nonNegativeInteger(graphqlPrimaryCost, "graphqlPrimaryCost", 1);
    return {
      api_kind: "graphql",
      endpoint,
      method: "POST",
      primary_units: primaryCost,
      secondary_points: secondaryPoints,
      secondary_points_source: "documented_graphql_operation_default",
      endpoint_cost_verified: primaryCost !== null,
      admission_ready: primaryCost !== null,
      note: "GraphQL primary quota is points-based; use measured rateLimit.cost"
    };
  }
  throw new GitHubQuotaTelemetryError("apiKind must be rest or graphql");
}

/** Parse GraphQL rateLimit cost and window data from a query response. */
export function parseGitHubGraphqlRateLimit({
  payload, credentialScope, observedAtEpoch, endpoint = "POST /graphql", requestId = null
}) {
  const rate = payload?.data?.rateLimit ?? payload?.rateLimit;
  if (!rate || typeof rate !== "object") {
    throw new GitHubQuotaTelemetryError("GraphQL data.rateLimit object required");
  }
  const resetAt = typeof rate.resetAt === "string" ? Math.floor(Date.parse(rate.resetAt) / 1000) : NaN;
  if (!Number.isSafeInteger(resetAt)) throw new GitHubQuotaTelemetryError("invalid GraphQL resetAt");
  const record = telemetryRecord({
    credentialScope,
    resource: "graphql",
    limit: nonNegativeInteger(rate.limit, "rateLimit.limit", 1),
    remaining: nonNegativeInteger(rate.remaining, "rateLimit.remaining"),
    used: nonNegativeInteger(rate.used, "rateLimit.used"),
    reset: resetAt,
    observedAtEpoch: nonNegativeInteger(observedAtEpoch, "observedAtEpoch"),
    source: "graphql_rateLimit_field",
    authorityRank: 80,
    endpoint,
    method: "POST",
    status: 200,
    requestId,
    extra: {
      measured_graphql_cost: nonNegativeInteger(rate.cost, "rateLimit.cost", 1),
      freshness: "OBSERVED",
      measurement: "graphql_response_rateLimit"
    }
  });
  return record;
}
