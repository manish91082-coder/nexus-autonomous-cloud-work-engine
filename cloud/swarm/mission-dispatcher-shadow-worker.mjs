/**
 * Internal, disabled-by-default P10CR shadow dispatcher service.
 * HMAC ingress + durable run/budget service bindings only; no publisher, provider or model binding.
 */
import { createSwarmRunRpc } from "./swarm-run-rpc-client.mjs";
import { createPlatformBudgetRpc } from "./platform-budget-rpc-client.mjs";
import { dispatchMissionShadow } from "./mission-dispatcher-shadow.mjs";
const MAX_BODY_BYTES = 8192;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const encoder = new TextEncoder();
function response(status, body) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
function hex(bytes) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}
function fromBase64(value) {
  if (typeof value !== "string" || value.length < 16 || value.length > 256) throw new TypeError("INVALID_INGRESS_SIGNATURE");
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
async function readBounded(request, maximum) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("BODY_UNAVAILABLE");
  const chunks = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > maximum) {
      try { await reader.cancel(); } catch {}
      throw new Error("BODY_SIZE_INVALID");
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
async function verifyIngress(request, bytes, env) {
  const timestampText = request.headers.get("x-nexus-dispatcher-timestamp") || "";
  const nonce = request.headers.get("x-nexus-dispatcher-nonce") || "";
  const signatureText = request.headers.get("x-nexus-dispatcher-signature") || "";
  const secret = env?.NEXUS_DISPATCHER_INGRESS_SECRET;
  if (typeof secret !== "string" || secret.length < 32) return { ok: false, status: 503, reason: "INGRESS_CREDENTIALS_UNAVAILABLE" };
  if (!/^\d{1,12}$/.test(timestampText) || !/^[A-Za-z0-9._:-]{16,128}$/.test(nonce)) {
    return { ok: false, status: 401, reason: "INGRESS_HEADERS_INVALID" };
  }
  const timestamp = Number(timestampText);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 30) {
    return { ok: false, status: 401, reason: "INGRESS_TIMESTAMP_OUT_OF_RANGE" };
  }
  let supplied;
  try { supplied = fromBase64(signatureText); } catch { return { ok: false, status: 401, reason: "INGRESS_SIGNATURE_INVALID" }; }
  const bodyHash = hex(await crypto.subtle.digest("SHA-256", bytes));
  const canonical = [timestampText, nonce, "POST", "/internal/shadow-dispatch", bodyHash].join("\n");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("HMAC", key, supplied, encoder.encode(canonical));
  return valid ? { ok: true } : { ok: false, status: 401, reason: "INGRESS_SIGNATURE_MISMATCH" };
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/internal/shadow-dispatch") return response(404, { status: "NOT_FOUND" });
    if (env?.NEXUS_MISSION_SHADOW_ENABLED !== "true") {
      return response(503, { status: "WAITING_FOR_OWNER_CONFIGURATION", reason: "SHADOW_DISPATCH_DISABLED" });
    }
    if (!env?.SWARM_RUNS || env.NEXUS_SWARM_RUN_CALLER_ID !== "dispatcher"
      || typeof env.NEXUS_SWARM_RUN_CALLER_SECRET !== "string" || env.NEXUS_SWARM_RUN_CALLER_SECRET.length < 32) {
      return response(503, { status: "WAITING_FOR_OWNER_CONFIGURATION", reason: "DURABLE_RUN_STORE_NOT_CONFIGURED" });
    }
    if (!env?.PLATFORM_BUDGET || env.NEXUS_PLATFORM_BUDGET_ENABLED !== "true"
      || env.NEXUS_PLATFORM_BUDGET_CALLER_ID !== "dispatcher"
      || typeof env.NEXUS_PLATFORM_BUDGET_CALLER_SECRET !== "string"
      || env.NEXUS_PLATFORM_BUDGET_CALLER_SECRET.length < 32) {
      return response(503, { status: "WAITING_FOR_OWNER_CONFIGURATION", reason: "ACCOUNT_BUDGET_NOT_CONFIGURED" });
    }
    const length = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) return response(413, { status: "REJECTED", reason: "ENVELOPE_TOO_LARGE" });
    let bytes;
    try { bytes = await readBounded(request, MAX_BODY_BYTES); } catch (error) {
      const reason = String(error?.message || "BODY_UNAVAILABLE");
      return response(reason === "BODY_SIZE_INVALID" ? 413 : 400, { status: "REJECTED", reason });
    }
    if (bytes.byteLength < 1) return response(400, { status: "REJECTED", reason: "ENVELOPE_SIZE_INVALID" });
    const auth = await verifyIngress(request, bytes, env);
    if (!auth.ok) return response(auth.status, { status: "REJECTED", reason: auth.reason });
    let body;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return response(400, { status: "REJECTED", reason: "INVALID_JSON" }); }
    if (!body || typeof body !== "object" || Array.isArray(body)
      || body.projectId !== "P10CR" || body.taskType !== "P59_003_SHADOW_DISPATCH"
      || typeof body.taskId !== "string" || !SAFE_ID.test(body.taskId)
      || !body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
      return response(403, { status: "REJECTED", reason: "SHADOW_ENVELOPE_NOT_AUTHORIZED" });
    }
    try {
      const rpc = createSwarmRunRpc(env.SWARM_RUNS, env);
      const budgetRpc = createPlatformBudgetRpc(env.PLATFORM_BUDGET, env);
      const prefix = typeof env.NEXUS_SHADOW_WORKER_ID === "string" ? env.NEXUS_SHADOW_WORKER_ID : "p10cr-shadow-dispatcher";
      const result = await dispatchMissionShadow({
        rpc, budgetRpc, taskId: body.taskId, workerId: prefix + "-" + crypto.randomUUID(),
        workflowRunId: env.NEXUS_WORKFLOW_RUN_ID || crypto.randomUUID(),
        payload: body.payload, leaseSeconds: 60
      });
      const statusCode = result.status === "WAITING_FOR_BUDGET" ? 429
        : result.status === "OWNER_APPROVAL_REQUIRED" ? 403
        : ["BUSY", "BUDGET_UNCERTAIN", "BUDGET_RESERVATION_OUTCOME_UNKNOWN"].includes(result.status) ? 409 : 200;
      return response(statusCode, result);
    } catch (error) {
      const reason = String(error?.message || "DISPATCH_FAILED").slice(0, 128);
      return response(409, { status: "REJECTED", reason });
    }
  }
};
