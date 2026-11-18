/**
 * Internal, disabled-by-default P10CR shadow dispatcher service.
 * No public route, publisher, quota, provider or model binding is configured.
 */
import { createSwarmRunRpc } from "./swarm-run-rpc-client.mjs";
import { dispatchMissionShadow } from "./mission-dispatcher-shadow.mjs";
const MAX_BODY_BYTES = 8192;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
function response(status, body) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/internal/shadow-dispatch") return response(404, { status: "NOT_FOUND" });
    if (env?.NEXUS_MISSION_SHADOW_ENABLED !== "true") {
      return response(503, { status: "WAITING_FOR_OWNER_CONFIGURATION", reason: "SHADOW_DISPATCH_DISABLED" });
    }
    const length = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) return response(413, { status: "REJECTED", reason: "ENVELOPE_TOO_LARGE" });
    let body;
    try {
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (bytes.byteLength < 1 || bytes.byteLength > MAX_BODY_BYTES) return response(413, { status: "REJECTED", reason: "ENVELOPE_SIZE_INVALID" });
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return response(400, { status: "REJECTED", reason: "INVALID_JSON" });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)
      || body.projectId !== "P10CR" || body.taskType !== "P59_003_SHADOW_DISPATCH"
      || typeof body.taskId !== "string" || !SAFE_ID.test(body.taskId)
      || !body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
      return response(403, { status: "REJECTED", reason: "SHADOW_ENVELOPE_NOT_AUTHORIZED" });
    }
    if (!env?.SWARM_RUNS || env.NEXUS_SWARM_RUN_CALLER_ID !== "dispatcher"
      || typeof env.NEXUS_SWARM_RUN_CALLER_SECRET !== "string" || env.NEXUS_SWARM_RUN_CALLER_SECRET.length < 32) {
      return response(503, { status: "WAITING_FOR_OWNER_CONFIGURATION", reason: "DURABLE_RUN_STORE_NOT_CONFIGURED" });
    }
    try {
      const rpc = createSwarmRunRpc(env.SWARM_RUNS, env);
      const prefix = typeof env.NEXUS_SHADOW_WORKER_ID === "string" ? env.NEXUS_SHADOW_WORKER_ID : "p10cr-shadow-dispatcher";
      const result = await dispatchMissionShadow({
        rpc, taskId: body.taskId, workerId: prefix + "-" + crypto.randomUUID(),
        payload: body.payload, leaseSeconds: 60
      });
      return response(200, result);
    } catch (error) {
      const reason = String(error?.message || "DISPATCH_FAILED").slice(0, 128);
      return response(409, { status: "REJECTED", reason });
    }
  }
};
