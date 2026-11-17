/**
 * Phase 59.56 — synthetic cross-repository installation-quota client.
 *
 * Test-harness only. Repository identities are synthetic and every provider
 * response is injected. This module has no global fetch, publisher, model,
 * billing, account, or write capability.
 */
import { executeQuotaGuardedGitHubRequest } from "../quota-ledger-client.mjs";

const OPERATION = "github.rest.repositories.get.v1";
const MAX_BODY_BYTES = 4096;
const REQUIRED_KEYS = [
  "schemaVersion", "projectId", "repository", "workflowRunId",
  "taskId", "requestId", "operation"
];

function json(status, body) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" }
  });
}

function safeId(value, max = 128) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= max
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

async function readBody(request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return { ok: false, status: 415 };
  }
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const size = Number(declared);
    if (!Number.isSafeInteger(size) || size < 0) return { ok: false, status: 400 };
    if (size > MAX_BODY_BYTES) return { ok: false, status: 413 };
  }
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400 };
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, status: 413 };
      }
      chunks.push(part.value);
    }
  } catch {
    return { ok: false, status: 400 };
  }
  if (total < 1) return { ok: false, status: 400 };
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 400 };
  }
}

function validateEnvelope(value, env) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.keys(value).sort().join("|") !== [...REQUIRED_KEYS].sort().join("|")) return false;
  if (value.schemaVersion !== "1.0"
    || value.projectId !== env.NEXUS_SHADOW_PROJECT_ID
    || value.repository !== env.NEXUS_SHADOW_REPOSITORY
    || value.operation !== OPERATION
    || !safeId(value.workflowRunId)
    || !safeId(value.taskId)
    || !safeId(value.requestId)) return false;
  const expectedRequestId = "p59-56:" + value.repository.replace("/", ":") + ":" + value.taskId;
  return value.requestId === expectedRequestId
    && value.repository.split("/").length === 2
    && value.repository.length <= 160;
}

function syntheticProviderResponse(repository, requestId, resetAtEpoch) {
  return new Response(JSON.stringify({
    full_name: repository,
    private: false,
    fixture: true,
    request_id: requestId
  }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "99",
      "x-ratelimit-used": "1",
      "x-ratelimit-reset": String(resetAtEpoch),
      "x-ratelimit-resource": "core",
      "x-github-request-id": "P59-56-SYNTHETIC-" + requestId.replace(/[^A-Za-z0-9]/g, "-")
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/shadow/quota") {
      return json(404, { status: "NOT_FOUND" });
    }
    if (env?.NEXUS_SWARM_MODE !== "SHADOW") {
      return json(503, { status: "WAITING_FOR_OWNER_CONFIGURATION", reason: "SHADOW_MODE_REQUIRED" });
    }
    const parsed = await readBody(request);
    if (!parsed.ok || !validateEnvelope(parsed.value, env)) {
      return json(parsed.status || 400, { status: "REJECTED", reason: "INVALID_SYNTHETIC_ENVELOPE" });
    }
    const scope = env.NEXUS_QUOTA_CREDENTIAL_SCOPE;
    const workerId = env.NEXUS_SWARM_WORKER_ID;
    const resetAtEpoch = Number(env.NEXUS_SWARM_SHADOW_RESET_AT || "4102444800");
    if (typeof scope !== "string"
      || !scope.startsWith("github-app-installation:synthetic-phase59-56-")
      || typeof workerId !== "string"
      || !safeId(workerId, 96)
      || !Number.isSafeInteger(resetAtEpoch)
      || resetAtEpoch <= Math.floor(Date.now() / 1000)) {
      return json(503, { status: "WAITING_FOR_OWNER_CONFIGURATION", reason: "SYNTHETIC_SCOPE_CONFIGURATION_INVALID" });
    }

    const targetUrl = "https://api.github.com/repos/" + parsed.value.repository;
    let mockProviderCalls = 0;
    const mockFetch = async (providerRequest, init = {}) => {
      if (providerRequest.method !== "GET"
        || providerRequest.url !== targetUrl
        || init.redirect !== "manual") {
        throw new TypeError("synthetic worker rejected a non-allowlisted request");
      }
      mockProviderCalls += 1;
      return syntheticProviderResponse(parsed.value.repository, parsed.value.requestId, resetAtEpoch);
    };

    try {
      const result = await executeQuotaGuardedGitHubRequest({
        env,
        credentialScope: scope,
        operation: parsed.value.operation,
        request: new Request(targetUrl, { method: "GET" }),
        requestId: parsed.value.requestId,
        workerId,
        fetchImpl: mockFetch
      });
      if (result.status === "DUPLICATE_REQUEST_NOT_REPLAYED") {
        return json(200, {
          status: "DUPLICATE_SUPPRESSED",
          projectId: parsed.value.projectId,
          repository: parsed.value.repository,
          workflowRunId: parsed.value.workflowRunId,
          taskId: parsed.value.taskId,
          requestId: parsed.value.requestId,
          providerRequestIssued: false,
          mockProviderCalls,
          externalNetworkRequests: 0
        });
      }
      if (result.status === "NOT_SENT") {
        return json(503, {
          status: "WAITING_FOR_QUOTA",
          projectId: parsed.value.projectId,
          repository: parsed.value.repository,
          workflowRunId: parsed.value.workflowRunId,
          taskId: parsed.value.taskId,
          requestId: parsed.value.requestId,
          quotaReason: result.admission?.reason || "QUOTA_ADMISSION_NOT_CONFIRMED",
          providerRequestIssued: false,
          mockProviderCalls,
          externalNetworkRequests: 0
        });
      }
      if (result.status !== "COMPLETED" || !result.response) {
        return json(503, {
          status: "SHADOW_EXECUTION_NOT_CONFIRMED",
          quotaStatus: result.status,
          providerRequestIssued: mockProviderCalls > 0,
          mockProviderCalls,
          externalNetworkRequests: 0
        });
      }
      const body = await result.response.clone().json();
      return json(200, {
        status: "SHADOW_COMPLETED",
        projectId: parsed.value.projectId,
        repository: parsed.value.repository,
        workflowRunId: parsed.value.workflowRunId,
        taskId: parsed.value.taskId,
        requestId: parsed.value.requestId,
        quotaStatus: result.status,
        settlementStatus: result.settlement?.status ?? null,
        providerRequestIssued: mockProviderCalls === 1,
        mockProviderCalls,
        externalNetworkRequests: 0,
        result: {
          full_name: body.full_name,
          fixture: body.fixture === true,
          private: body.private
        }
      });
    } catch {
      return json(503, {
        status: "SHADOW_EXECUTION_REJECTED",
        providerRequestIssued: mockProviderCalls > 0,
        mockProviderCalls,
        externalNetworkRequests: 0
      });
    }
  }
};
