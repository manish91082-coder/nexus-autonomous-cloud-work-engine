/**
 * Phase 59.44 — read-only P10CR shadow Worker.
 *
 * This entrypoint is intentionally test-only and shadow-only:
 * - accepts one strict P59-003 envelope shape;
 * - targets only the canonical P10CR repository metadata endpoint;
 * - routes admission/telemetry/settlement through the shared quota DO binding;
 * - injects a deterministic provider response instead of using global fetch;
 * - has no publisher, repository-write, model, billing or account capability.
 */
import { executeQuotaGuardedGitHubRequest } from "./quota-ledger-client.mjs";

const CANONICAL_REPOSITORY = "manish91082-coder/nexus-autonomous-cloud-work-engine";
const CANONICAL_URL = "https://api.github.com/repos/" + CANONICAL_REPOSITORY;
const OPERATION = "github.rest.repositories.get.v1";
const WORKER_ID = "p10cr-read-only-shadow-worker";
const MAX_BODY_BYTES = 8192;
const ENVELOPE_KEYS = [
  "schemaVersion", "mode", "projectId", "taskId", "taskType",
  "runId", "requestId", "operation", "target"
];

function json(status, body) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" }
  });
}

function safeId(value, max = 128, min = 1) {
  return typeof value === "string"
    && value.length >= min
    && value.length <= max
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

function validateEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  if (keys.join("|") !== [...ENVELOPE_KEYS].sort().join("|")) return false;
  if (value.schemaVersion !== "1.0"
    || value.mode !== "SHADOW"
    || value.projectId !== "P10CR"
    || value.taskId !== "P59-003"
    || value.taskType !== "READ_ONLY_REPOSITORY_METADATA"
    || value.operation !== OPERATION
    || !safeId(value.runId)
    || !safeId(value.requestId, 128, 14)
    || !value.requestId.startsWith(`p10cr-shadow:${value.runId}:`)) return false;
  const target = value.target;
  if (!target || typeof target !== "object" || Array.isArray(target)) return false;
  const targetKeys = Object.keys(target).sort();
  if (targetKeys.join("|") !== "owner|repo") return false;
  return target.owner === "manish91082-coder"
    && target.repo === "nexus-autonomous-cloud-work-engine";
}

async function readEnvelope(request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return { ok: false, status: 415 };
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      return { ok: false, status: 400 };
    }
    if (parsedLength > MAX_BODY_BYTES) return { ok: false, status: 413 };
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
  let value;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, status: 400 };
  }
  return validateEnvelope(value)
    ? { ok: true, value }
    : { ok: false, status: 400 };
}

function syntheticProviderResponse(resetAtEpoch) {
  return new Response(JSON.stringify({
    full_name: CANONICAL_REPOSITORY,
    private: false,
    fixture: true
  }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "99",
      "x-ratelimit-used": "1",
      "x-ratelimit-reset": String(resetAtEpoch),
      "x-ratelimit-resource": "core",
      "x-github-request-id": "P10CR-SHADOW-FIXTURE-0001"
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/shadow/research") {
      return json(404, { status: "NOT_FOUND" });
    }
    if (env?.NEXUS_SWARM_MODE !== "SHADOW") {
      return json(503, { status: "WAITING_FOR_OWNER_CONFIGURATION", reason: "SHADOW_MODE_REQUIRED" });
    }
    const parsed = await readEnvelope(request);
    if (!parsed.ok) {
      return json(parsed.status, { status: "REJECTED", reason: "INVALID_TASK_ENVELOPE" });
    }

    const credentialScope = env?.NEXUS_QUOTA_CREDENTIAL_SCOPE;
    const resetAtEpoch = Number(env?.NEXUS_SWARM_SHADOW_RESET_AT);
    if (typeof credentialScope !== "string"
      || !credentialScope.startsWith("github-app-installation:")
      || credentialScope.length > 128
      || !Number.isSafeInteger(resetAtEpoch) || resetAtEpoch <= Math.floor(Date.now() / 1000)) {
      return json(503, { status: "WAITING_FOR_OWNER_CONFIGURATION", reason: "SHADOW_FIXTURE_CONFIGURATION_INVALID" });
    }

    let mockProviderCalls = 0;
    const mockFetch = async (providerRequest, init = {}) => {
      if (providerRequest.method !== "GET"
        || providerRequest.url !== CANONICAL_URL
        || init.redirect !== "manual") {
        throw new TypeError("shadow fixture rejected a non-canonical or non-read-only request");
      }
      mockProviderCalls += 1;
      return syntheticProviderResponse(resetAtEpoch);
    };

    try {
      const result = await executeQuotaGuardedGitHubRequest({
        env,
        credentialScope,
        operation: parsed.value.operation,
        workerId: WORKER_ID,
        requestId: parsed.value.requestId,
        request: new Request(CANONICAL_URL, { method: "GET" }),
        fetchImpl: mockFetch
      });

      if (result.status === "DUPLICATE_REQUEST_NOT_REPLAYED") {
        return json(200, {
          status: "DUPLICATE_SUPPRESSED",
          taskId: parsed.value.taskId,
          runId: parsed.value.runId,
          requestId: parsed.value.requestId,
          reservationId: result.reservationId,
          providerRequestIssued: false,
          mockProviderCalls,
          externalNetworkRequests: 0
        });
      }
      if (result.status !== "COMPLETED" || !result.response) {
        return json(503, {
          status: result.status === "NOT_SENT" ? "WAITING_FOR_QUOTA" : "SHADOW_EXECUTION_NOT_CONFIRMED",
          quotaStatus: result.status,
          reservationId: result.reservationId ?? null,
          providerRequestIssued: mockProviderCalls > 0,
          mockProviderCalls,
          externalNetworkRequests: 0
        });
      }

      const body = await result.response.clone().json();
      return json(200, {
        status: "SHADOW_COMPLETED",
        projectId: parsed.value.projectId,
        taskId: parsed.value.taskId,
        runId: parsed.value.runId,
        requestId: parsed.value.requestId,
        operation: parsed.value.operation,
        reservationId: result.reservationId,
        quotaStatus: result.status,
        settlementStatus: result.settlement?.status ?? null,
        providerRequestIssued: mockProviderCalls === 1,
        mockProviderCalls,
        externalNetworkRequests: 0,
        result: {
          full_name: body.full_name,
          private: body.private,
          fixture: body.fixture === true
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
