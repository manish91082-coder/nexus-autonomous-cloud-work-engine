/**
 * Reviewed GitHub REST operation registry.
 *
 * Only explicitly documented, non-search GET operations are enabled here.
 * Search, code search, GraphQL and all mutations remain NO-GO until their
 * resource-specific primary/secondary costs are separately qualified.
 */
export const GITHUB_OPERATION_REGISTRY_VERSION = "2026-11-15.1";

const entries = [
  {
    id: "github.rest.repositories.get.v1",
    method: "GET",
    pathPattern: /^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
    pathTemplate: "/repos/{owner}/{repo}",
    resource: "core",
    primaryUnits: 1,
    queryPolicy: "NO_QUERY_PARAMETERS",
    status: "VERIFIED_LIMITED_SCOPE",
    source: "https://docs.github.com/en/rest/repos/repos",
    rateLimitSource: "https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api",
    rationale: "Get a repository is a documented GET endpoint. Non-search REST resources use the core bucket. The registry budgets one primary core request unit per GET request; this is not a secondary-rate-limit point-cost claim. Response headers remain the actual telemetry authority."
  }
];

export function getGitHubOperationDefinition(operationId) {
  const entry = entries.find(item => item.id === operationId);
  if (!entry) return null;
  return {
    id: entry.id,
    resource: entry.resource,
    primaryUnits: entry.primaryUnits,
    pathTemplate: entry.pathTemplate,
    registryVersion: GITHUB_OPERATION_REGISTRY_VERSION,
    source: entry.source,
    rateLimitSource: entry.rateLimitSource
  };
}

function sha256Hex(value) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
    .then(bytes => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, "0")).join(""));
}

export async function resolveGitHubOperation(request) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const entry = entries.find(item => item.method === method && item.pathPattern.test(url.pathname));
  if (!entry) {
    return { allowed: false, reason: "UNKNOWN_ENDPOINT_COST_NO_GO" };
  }
  if (entry.queryPolicy === "NO_QUERY_PARAMETERS" && [...url.searchParams].length > 0) {
    return { allowed: false, reason: "UNREVIEWED_QUERY_SHAPE_NO_GO" };
  }
  const canonical = [GITHUB_OPERATION_REGISTRY_VERSION, method, entry.pathTemplate, [...url.searchParams.entries()]
    .sort(([ak,av],[bk,bv]) => ak.localeCompare(bk) || av.localeCompare(bv))
    .map(([key,value]) => `${key}=${value}`).join("&")].join("\n");
  return {
    allowed: true,
    operation: entry.id,
    resource: entry.resource,
    primaryUnits: entry.primaryUnits,
    registryVersion: GITHUB_OPERATION_REGISTRY_VERSION,
    pathTemplate: entry.pathTemplate,
    requestFingerprint: await sha256Hex(canonical),
    source: entry.source,
    rateLimitSource: entry.rateLimitSource
  };
}

export function listGitHubOperationRegistry() {
  return entries.map(({pathPattern, ...entry}) => ({...entry}));
}
