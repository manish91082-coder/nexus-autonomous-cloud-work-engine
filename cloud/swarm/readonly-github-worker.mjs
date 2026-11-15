import { executeQuotaGuardedGitHubRequest } from "./quota-ledger-client.mjs";

const WORKER_ID = "github-readonly-shadow-worker";
const OPERATION = "github.rest.repositories.get.v1";
const WINDOW_ID = "github-rate-limit-ledger";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function safeSegment(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.-]{1,100}$/.test(value)) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

function validateEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.schema_version !== "1.0"
    || typeof value.run_id !== "string" || !/^[A-Za-z0-9_.:-]{1,128}$/.test(value.run_id)
    || typeof value.task_id !== "string" || !/^[A-Za-z0-9_.:-]{1,128}$/.test(value.task_id)
    || !value.payload || typeof value.payload !== "object" || Array.isArray(value.payload)) {
    throw new TypeError("invalid swarm task envelope");
  }
  const keys = Object.keys(value.payload).sort();
  if (keys.some(key => !["owner", "repo", "request_id"].includes(key))) {
    throw new TypeError("payload contains unsupported fields");
  }
  const owner = safeSegment(value.payload.owner, "owner");
  const repo = safeSegment(value.payload.repo, "repo");
  const requestId = value.payload.request_id;
  if (typeof requestId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)) {
    throw new TypeError("invalid stable request_id");
  }
  return { runId: value.run_id, taskId: value.task_id, owner, repo, requestId };
}

/**
 * This phase intentionally has no live-network implementation.
 * The only provider transport is a deterministic in-process shadow fixture.
 */
async function mockedGitHubFetch(request, owner, repo, resetAtEpoch) {
  const url = new URL(request.url);
  if (request.method !== "GET"
    || url.hostname !== "api.github.com"
    || url.pathname !== `/repos/${owner}/${repo}`
    || url.search) {
    throw new TypeError("shadow provider received an unreviewed request");
  }
  const now = Math.floor(Date.now() / 1000);
  return new Response(JSON.stringify({
    id: 424242,
    full_name: `${owner}/${repo}`,
    private: false,
    visibility: "public",
    default_branch: "main",
    description: "Deterministic mocked shadow repository metadata",
    html_url: `https://github.com/${owner}/${repo}`,
    updated_at: "2026-11-15T00:00:00Z"
  }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": "4999",
      "x-ratelimit-used": "1",
      "x-ratelimit-reset": String(resetAtEpoch),
      "x-ratelimit-resource": "core",
      "x-github-request-id": "P10CR-SHADOW-MOCK"
    }
  });
}

export async function executeReadOnlyGitHubTask(env, envelope) {
  if (env?.NEXUS_SWARM_READ_ONLY_ENABLED !== "true") {
    return { status: "WORKER_DISABLED", executionMode: "MOCKED_SHADOW", providerAttempted: false };
  }
  if (env?.NEXUS_SWARM_SHADOW_MODE !== "true") {
    return { status: "LIVE_PROVIDER_MODE_NOT_SUPPORTED", executionMode: "MOCKED_SHADOW", providerAttempted: false };
  }
  const task = validateEnvelope(envelope);
  const credentialScope = env.NEXUS_SWARM_GITHUB_CREDENTIAL_SCOPE;
  if (typeof credentialScope !== "string" || !credentialScope) {
    return { status: "WAITING_FOR_CONFIGURATION", reason: "shadow credential scope is not configured", providerAttempted: false };
  }

  const shadowResetAtEpoch = Number(env.NEXUS_SWARM_SHADOW_RESET_EPOCH ?? (Math.floor(Date.now()/1000)+3600));
  if (!Number.isSafeInteger(shadowResetAtEpoch) || shadowResetAtEpoch <= Math.floor(Date.now()/1000)) {
    return {status:"WAITING_FOR_CONFIGURATION",reason:"invalid shadow telemetry reset window",providerAttempted:false};
  }
  const request = new Request(`https://api.github.com/repos/${task.owner}/${task.repo}`, {
    method: "GET",
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28"
    }
  });
  const result = await executeQuotaGuardedGitHubRequest({
    env,
    credentialScope,
    operation: OPERATION,
    request,
    requestId: task.requestId,
    workerId: WORKER_ID,
    fetchImpl: req => mockedGitHubFetch(req, task.owner, task.repo, shadowResetAtEpoch)
  });

  if (result.status === "DUPLICATE_REQUEST_NOT_REPLAYED") {
    return {
      status: result.status,
      executionMode: "MOCKED_SHADOW",
      runId: task.runId,
      taskId: task.taskId,
      reservationId: result.reservationId,
      providerAttempted: false
    };
  }
  if (result.status !== "COMPLETED") {
    return {
      status: result.status,
      executionMode: "MOCKED_SHADOW",
      runId: task.runId,
      taskId: task.taskId,
      reservationId: result.reservationId,
      admission: result.admission ?? null,
      providerAttempted: result.status !== "NOT_SENT"
    };
  }

  if (!result.response?.ok) {
    return {
      status: "PROVIDER_RESPONSE_ERROR",
      executionMode: "MOCKED_SHADOW",
      runId: task.runId,
      taskId: task.taskId,
      providerStatus: result.response?.status ?? null,
      providerAttempted: true,
      settlement: result.settlement
    };
  }

  const providerData = await result.response.json();
  return {
    status: "READ_ONLY_TASK_SUCCEEDED",
    executionMode: "MOCKED_SHADOW",
    runId: task.runId,
    taskId: task.taskId,
    providerAttempted: true,
    providerTransport: "IN_PROCESS_MOCK",
    repository: {
      id: providerData.id,
      full_name: providerData.full_name,
      private: providerData.private,
      visibility: providerData.visibility,
      default_branch: providerData.default_branch,
      description: providerData.description,
      html_url: providerData.html_url,
      updated_at: providerData.updated_at
    },
    accounting: {
      reservationId: result.reservationId,
      telemetryStatus: result.telemetry?.status,
      settlementStatus: result.settlement?.status
    }
  };
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return json({status:"METHOD_NOT_ALLOWED"},405);
    if (env?.NEXUS_SWARM_READ_ONLY_ENABLED !== "true"
      || env?.NEXUS_SWARM_SHADOW_MODE !== "true") {
      return json({
        status: env?.NEXUS_SWARM_READ_ONLY_ENABLED === "true"
          ? "LIVE_PROVIDER_MODE_NOT_SUPPORTED" : "WORKER_DISABLED",
        executionMode: "MOCKED_SHADOW",
        providerAttempted: false
      },403);
    }
    let envelope;
    try {
      envelope = await request.json();
    } catch {
      return json({status:"INVALID_JSON"},400);
    }
    try {
      const result = await executeReadOnlyGitHubTask(env,envelope);
      const statusCode = result.status === "READ_ONLY_TASK_SUCCEEDED"
        || result.status === "DUPLICATE_REQUEST_NOT_REPLAYED" ? 200
        : result.status === "NOT_SENT" ? 429 : 503;
      return json(result,statusCode);
    } catch (error) {
      return json({
        status:"REJECTED",
        reason:error?.message || "invalid task"
      },400);
    }
  }
};
