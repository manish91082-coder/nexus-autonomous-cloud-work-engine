/**
 * Internal, disabled-by-default P10CR shadow dispatcher service.
 * HMAC ingress + durable run/budget service bindings only; no publisher, provider or model binding.
 */
import { createSwarmRunRpc } from "./swarm-run-rpc-client.mjs";
import { createPlatformBudgetRpc } from "./platform-budget-rpc-client.mjs";
import { dispatchMissionShadow } from "./mission-dispatcher-shadow.mjs";
const MAX_BODY_BYTES = 8192;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const SAFE_RUN_ID = /^[0-9]{1,20}$/;
const P59_63_REPOSITORIES = Object.freeze(["synthetic-org/p10cr-shadow-repo-a","synthetic-org/p10cr-shadow-repo-b"]);
const encoder = new TextEncoder();
function phase63HostPrerequisiteFailure(snapshot, context) {
  if (snapshot?.httpStatus !== 200 || snapshot?.status !== "SNAPSHOT"
    || snapshot?.eventChainValid !== true || !Array.isArray(snapshot?.reservations)) {
    return "PRIOR_RESERVATION_SNAPSHOT_UNAVAILABLE";
  }
  const { testId, slot, seedWorkflowRunId, priorHostWorkflowRunIds, currentWorkflowRunId, currentRepository } = context;
  const prefix = "p59-63-" + testId + "-";
  const rows = snapshot.reservations.filter(row => row.phaseId === "P59.63" && row.taskId?.startsWith(prefix));
  const matches = suffix => rows.filter(row => row.taskId === prefix + suffix);
  const seedRows = matches("seed");
  if (seedRows.length !== 1 || seedRows[0].workflowRunId !== seedWorkflowRunId
    || seedRows[0].repository !== P59_63_REPOSITORIES[0] || seedRows[0].status !== "SETTLED") {
    return "SEED_RESERVATION_NOT_SETTLED_OR_RUN_MISMATCH";
  }
  for (let priorSlot = 1; priorSlot < slot; priorSlot++) {
    const priorRows = matches("host" + priorSlot + "-01");
    const expectedRepository = priorSlot % 2 === 1 ? P59_63_REPOSITORIES[0] : P59_63_REPOSITORIES[1];
    if (priorRows.length !== 1 || priorRows[0].workflowRunId !== priorHostWorkflowRunIds[priorSlot - 1]
      || priorRows[0].repository !== expectedRepository || priorRows[0].status !== "SETTLED") {
      return "PRIOR_HOST_RESERVATION_NOT_SETTLED_OR_RUN_MISMATCH";
    }
  }
  for (let futureSlot = slot + 1; futureSlot <= 4; futureSlot++) {
    if (matches("host" + futureSlot + "-01").length !== 0) return "FUTURE_HOST_STAGE_ALREADY_PRESENT";
  }
  const currentRows = matches("host" + slot + "-01");
  if (currentRows.length > 1 || currentRows.some(row =>
    row.workflowRunId !== currentWorkflowRunId || row.repository !== currentRepository || row.status !== "SETTLED")) {
    return "CURRENT_HOST_SLOT_ALREADY_BOUND_OR_UNSETTLED";
  }
  return null;
}

function phase63SeedPrerequisiteFailure(snapshot, context) {
  if (snapshot?.httpStatus !== 200 || snapshot?.status !== "SNAPSHOT"
    || snapshot?.eventChainValid !== true || !Array.isArray(snapshot?.reservations)) {
    return "SEED_RESERVATION_SNAPSHOT_UNAVAILABLE";
  }
  const { testId, seedWorkflowRunId, currentWorkflowRunId, replay } = context;
  const prefix = "p59-63-" + testId + "-";
  const rows = snapshot.reservations.filter(row => row.phaseId === "P59.63" && row.taskId?.startsWith(prefix));
  const seeds = rows.filter(row => row.taskId === prefix + "seed");
  if (seeds.length === 0) {
    return seedWorkflowRunId === currentWorkflowRunId ? null : "SEED_REPLAY_PREREQUISITE_NOT_SETTLED";
  }
  if (seeds.length === 1 && seeds[0].workflowRunId === seedWorkflowRunId
    && seeds[0].repository === P59_63_REPOSITORIES[0] && seeds[0].status === "SETTLED") return null;
  return "SEED_ALREADY_BOUND_TO_DIFFERENT_RUN_OR_UNSETTLED";
}

function phase63SnapshotPrerequisiteFailure(snapshot, context) {
  if (snapshot?.httpStatus !== 200 || snapshot?.status !== "SNAPSHOT"
    || snapshot?.eventChainValid !== true || !Array.isArray(snapshot?.reservations)) {
    return "SNAPSHOT_STAGE_RESERVATION_READBACK_UNAVAILABLE";
  }
  const { testId, seedWorkflowRunId, hostWorkflowRunIds, currentWorkflowRunId } = context;
  if (new Set([seedWorkflowRunId, ...hostWorkflowRunIds, currentWorkflowRunId]).size !== 6) {
    return "SNAPSHOT_STAGE_RUN_IDS_NOT_DISTINCT";
  }
  const prefix = "p59-63-" + testId + "-";
  const rows = snapshot.reservations.filter(row => row.phaseId === "P59.63" && row.taskId?.startsWith(prefix));
  const matches = suffix => rows.filter(row => row.taskId === prefix + suffix);
  const seeds = matches("seed");
  if (seeds.length !== 1 || seeds[0].workflowRunId !== seedWorkflowRunId
    || seeds[0].repository !== P59_63_REPOSITORIES[0] || seeds[0].status !== "SETTLED") {
    return "SNAPSHOT_SEED_NOT_SETTLED_OR_RUN_MISMATCH";
  }
  for (let slot = 1; slot <= 4; slot++) {
    const hostRows = matches("host" + slot + "-01");
    const expectedRepository = slot % 2 === 1 ? P59_63_REPOSITORIES[0] : P59_63_REPOSITORIES[1];
    if (hostRows.length !== 1 || hostRows[0].workflowRunId !== hostWorkflowRunIds[slot - 1]
      || hostRows[0].repository !== expectedRepository || hostRows[0].status !== "SETTLED") {
      return "SNAPSHOT_HOST_SLOTS_NOT_SETTLED_OR_RUN_MISMATCH";
    }
  }
  const overflowRows = rows.filter(row => /^overflow-[1-4]$/.test(String(row.taskId || "").slice(prefix.length)));
  if (overflowRows.some(row => row.workflowRunId !== currentWorkflowRunId || row.status !== "SETTLED")
    || overflowRows.some(row => row.taskId === prefix + "overflow-4")) {
    return "SNAPSHOT_OVERFLOW_ALREADY_BOUND_OR_UNEXPECTED";
  }
  return null;
}

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
async function verifyIngress(request, bytes, env, path) {
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
  const canonical = [timestampText, nonce, "POST", path, bodyHash].join("\n");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("HMAC", key, supplied, encoder.encode(canonical));
  return valid ? { ok: true } : { ok: false, status: 401, reason: "INGRESS_SIGNATURE_MISMATCH" };
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const dispatchPath = "/internal/shadow-dispatch";
    const snapshotPath = "/internal/shadow-budget-snapshot";
    if (request.method !== "POST" || ![dispatchPath, snapshotPath].includes(url.pathname)) return response(404, { status: "NOT_FOUND" });
    if (url.pathname === snapshotPath && env?.NEXUS_SHADOW_TEST_MODE !== "true") return response(404, { status: "NOT_FOUND" });
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
    const auth = await verifyIngress(request, bytes, env, url.pathname);
    if (!auth.ok) return response(auth.status, { status: "REJECTED", reason: auth.reason });
    let body;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return response(400, { status: "REJECTED", reason: "INVALID_JSON" }); }
    if (url.pathname === snapshotPath) {
      const phase63Snapshot = body?.taskId === "p59-63-budget-snapshot-readback";
      const payload = body?.payload, hostRunIds = payload?.hostWorkflowRunIds;
      const phase63Valid = phase63Snapshot && env?.NEXUS_CROSS_RUN_PROOF_ENABLED === "true"
        && typeof payload?.testId === "string" && SAFE_ID.test(payload.testId)
        && SAFE_RUN_ID.test(body?.workflowRunId || "") && SAFE_RUN_ID.test(payload?.seedWorkflowRunId || "")
        && Array.isArray(hostRunIds) && hostRunIds.length === 4
        && hostRunIds.every(value => typeof value === "string" && SAFE_RUN_ID.test(value))
        && new Set(hostRunIds).size === 4
        && new Set([payload.seedWorkflowRunId, ...hostRunIds, body.workflowRunId]).size === 6
        && Object.keys(payload).sort().join(",") === "hostWorkflowRunIds,seedWorkflowRunId,testId";
      const phase62Valid = !phase63Snapshot && body?.taskId === "p59-62-budget-snapshot-readback"
        && typeof body?.workflowRunId === "string" && SAFE_ID.test(body.workflowRunId)
        && payload && typeof payload === "object" && !Array.isArray(payload) && Object.keys(payload).length === 0;
      if (!body || typeof body !== "object" || Array.isArray(body) || body.projectId !== "P10CR"
        || body.taskType !== "P59_003_BUDGET_SNAPSHOT" || (!phase62Valid && !phase63Valid)) {
        return response(403, { status: "REJECTED", reason: "BUDGET_SNAPSHOT_ENVELOPE_NOT_AUTHORIZED" });
      }
      try {
        const budgetRpc = createPlatformBudgetRpc(env.PLATFORM_BUDGET, env);
        const snapshot = await budgetRpc("snapshot", {});
        if (snapshot.httpStatus !== 200 || snapshot.status !== "SNAPSHOT") return response(409, { status: "BUDGET_SNAPSHOT_UNVERIFIED" });
        const summary = {
          status: "BUDGET_SNAPSHOT", committedDispatches: snapshot.committed?.dispatches ?? 0,
          reservedDispatches: snapshot.reserved?.dispatches ?? 0, uncertainDispatches: snapshot.uncertain?.dispatches ?? 0,
          controlBudgetRpcRequests: snapshot.control?.budget_rpc_requests ?? 0, eventChainValid: snapshot.eventChainValid === true,
          eventCount: snapshot.eventCount ?? 0, lastEventHash: snapshot.lastEventHash ?? null
        };
        if (!phase63Snapshot) return response(200, summary);
        const rows = snapshot.reservations || [];
        if (rows.length > 32) return response(409, { status: "BUDGET_SNAPSHOT_UNVERIFIED", reason: "P59_63_RESERVATION_LIMIT_EXCEEDED" });
        const prefix = "p59-63-" + payload.testId + "-";
        const scoped = rows.filter(row => row.phaseId === "P59.63" && row.taskId?.startsWith(prefix));
        const suffixOf = row => String(row.taskId || "").slice(prefix.length);
        const runIds = [...new Set(scoped.map(row => row.workflowRunId))].sort();
        const repositories = [...new Set(scoped.map(row => row.repository))].sort();
        const expectedRunIds = [payload.seedWorkflowRunId, ...hostRunIds, body.workflowRunId].sort();
        const seedRows = scoped.filter(row => suffixOf(row) === "seed");
        const seedCount = seedRows.length;
        const hostSlotWorkflowRunIds = Object.fromEntries([1, 2, 3, 4].map(slot => {
          const matches = scoped.filter(row => suffixOf(row) === "host" + slot + "-01");
          return ["host" + slot, matches.length === 1 ? matches[0].workflowRunId : null];
        }));
        const hostCount = Object.values(hostSlotWorkflowRunIds).filter(value => value !== null).length;
        const overflowRows = scoped.filter(row => /^overflow-[1-3]$/.test(suffixOf(row)));
        const overflowCount = overflowRows.length;
        const settledCount = scoped.filter(row => row.status === "SETTLED").length;
        const expectedHostSlotWorkflowRunIdsMatch = [1, 2, 3, 4].every(slot =>
          hostSlotWorkflowRunIds["host" + slot] === hostRunIds[slot - 1]);
        const seedWorkflowRunIdMatch = seedRows.length === 1 && seedRows[0].workflowRunId === payload.seedWorkflowRunId;
        const snapshotWorkflowRunIdMatch = overflowRows.length === 3
          && overflowRows.every(row => row.workflowRunId === body.workflowRunId);
        return response(200, {
          ...summary, testId: payload.testId, reservationCount: scoped.length,
          settledReservations: settledCount, nonSettledReservations: scoped.length - settledCount,
          seedReservationCount: seedCount, hostReservationCount: hostCount, overflowReservationCount: overflowCount,
          seedWorkflowRunIdMatch, snapshotWorkflowRunIdMatch,
          hostSlotWorkflowRunIds, expectedHostSlotWorkflowRunIdsMatch,
          distinctWorkflowRunIds: runIds, distinctRepositories: repositories,
          expectedWorkflowRunIdsMatch: runIds.length === expectedRunIds.length && runIds.every((value, index) => value === expectedRunIds[index]),
          expectedRepositoriesMatch: repositories.length === 2 && repositories[0] === P59_63_REPOSITORIES[0] && repositories[1] === P59_63_REPOSITORIES[1],
          allReservationsPhase59_63: rows.length === scoped.length
        });
      } catch (error) {
        return response(409, { status: "BUDGET_SNAPSHOT_UNVERIFIED", reason: String(error?.message || "SNAPSHOT_FAILED").slice(0, 128) });
      }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)
      || body.projectId !== "P10CR" || body.taskType !== "P59_003_SHADOW_DISPATCH"
      || typeof body.taskId !== "string" || !SAFE_ID.test(body.taskId)
      || (body.workflowRunId !== undefined && (typeof body.workflowRunId !== "string" || !SAFE_ID.test(body.workflowRunId)))
      || !body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
      return response(403, { status: "REJECTED", reason: "SHADOW_ENVELOPE_NOT_AUTHORIZED" });
    }
    let budgetScope = null;
    let phase63HostPrerequisite = null;
    let phase63SeedPrerequisite = null;
    let phase63SnapshotPrerequisite = null;
    const alias = body.payload?.testRepositoryAlias;
    if (alias !== undefined) {
      if (env?.NEXUS_SHADOW_TEST_MODE !== "true" || env?.NEXUS_CROSS_RUN_PROOF_ENABLED !== "true"
        || body.payload?.testSuite !== "P59.63" || !P59_63_REPOSITORIES.includes(alias)
        || typeof body.payload?.testId !== "string" || !SAFE_ID.test(body.payload.testId)
        || !SAFE_RUN_ID.test(body.workflowRunId || "") || !body.taskId.startsWith("p59-63-" + body.payload.testId + "-")) {
        return response(403, { status: "REJECTED", reason: "P59_63_TEST_SCOPE_NOT_AUTHORIZED" });
      }
      const suffix = body.taskId.slice(("p59-63-" + body.payload.testId + "-").length);
      if (suffix === "seed") {
        const seedWorkflowRunId = body.payload.seedWorkflowRunId;
        if (alias !== P59_63_REPOSITORIES[0] || body.payload.sentinel !== "GLOBAL_CROSS_RUN_SENTINEL"
          || !SAFE_RUN_ID.test(seedWorkflowRunId || "")) {
          return response(403, { status: "REJECTED", reason: "P59_63_SEED_NOT_AUTHORIZED" });
        }
        phase63SeedPrerequisite = {
          testId: body.payload.testId, seedWorkflowRunId,
          currentWorkflowRunId: body.workflowRunId
        };
      } else {
        const hostMatch = /^host([1-4])-01$/.exec(suffix), overflowMatch = /^overflow-([1-4])$/.exec(suffix);
        if (hostMatch) {
          const slot = Number(hostMatch[1]), expectedRepo = slot % 2 === 1 ? P59_63_REPOSITORIES[0] : P59_63_REPOSITORIES[1];
          const seedWorkflowRunId = body.payload.seedWorkflowRunId;
          const priorHostWorkflowRunIds = body.payload.priorHostWorkflowRunIds;
          if (alias !== expectedRepo || body.payload.hostId !== "host" + slot || body.payload.attemptIndex !== 1
            || typeof body.payload.runnerName !== "string" || body.payload.runnerName.length < 1 || body.payload.runnerName.length > 256
            || !SAFE_RUN_ID.test(seedWorkflowRunId || "") || !Array.isArray(priorHostWorkflowRunIds)
            || priorHostWorkflowRunIds.length !== slot - 1
            || !priorHostWorkflowRunIds.every(value => typeof value === "string" && SAFE_RUN_ID.test(value))
            || new Set([seedWorkflowRunId, ...priorHostWorkflowRunIds, body.workflowRunId]).size !== slot + 1)
            return response(403, { status: "REJECTED", reason: "P59_63_HOST_ENVELOPE_NOT_AUTHORIZED" });
          phase63HostPrerequisite = {
            testId: body.payload.testId, slot, seedWorkflowRunId, priorHostWorkflowRunIds,
            currentWorkflowRunId: body.workflowRunId, currentRepository: alias
          };
        } else if (overflowMatch) {
          const index = Number(overflowMatch[1]), expectedRepo = index % 2 === 1 ? P59_63_REPOSITORIES[0] : P59_63_REPOSITORIES[1];
          const seedWorkflowRunId = body.payload.seedWorkflowRunId;
          const hostWorkflowRunIds = body.payload.hostWorkflowRunIds;
          if (alias !== expectedRepo || body.payload.hostId !== "snapshot" || body.payload.attemptIndex !== index
            || body.payload.runnerName !== "snapshot" || !SAFE_RUN_ID.test(seedWorkflowRunId || "")
            || !Array.isArray(hostWorkflowRunIds) || hostWorkflowRunIds.length !== 4
            || !hostWorkflowRunIds.every(value => typeof value === "string" && SAFE_RUN_ID.test(value))
            || new Set([seedWorkflowRunId, ...hostWorkflowRunIds, body.workflowRunId]).size !== 6)
            return response(403, { status: "REJECTED", reason: "P59_63_OVERFLOW_ENVELOPE_NOT_AUTHORIZED" });
          phase63SnapshotPrerequisite = {
            testId: body.payload.testId, seedWorkflowRunId, hostWorkflowRunIds,
            currentWorkflowRunId: body.workflowRunId
          };
        } else return response(403, { status: "REJECTED", reason: "P59_63_TASK_ID_NOT_AUTHORIZED" });
      }
      budgetScope = { testOnly: true, phaseId: "P59.63", repository: alias };
    } else if (body.payload?.testSuite === "P59.63") {
      return response(403, { status: "REJECTED", reason: "P59_63_REPOSITORY_ALIAS_REQUIRED" });
    }
    try {
      const rpc = createSwarmRunRpc(env.SWARM_RUNS, env);
      const budgetRpc = createPlatformBudgetRpc(env.PLATFORM_BUDGET, env);
      if (phase63SeedPrerequisite) {
        const seedSnapshot = await budgetRpc("snapshot", {});
        const failure = phase63SeedPrerequisiteFailure(seedSnapshot, phase63SeedPrerequisite);
        if (failure) return response(409, { status: "SEED_STAGE_PREREQUISITE_FAILED", reason: failure });
      }
      if (phase63HostPrerequisite) {
        const priorSnapshot = await budgetRpc("snapshot", {});
        const failure = phase63HostPrerequisiteFailure(priorSnapshot, phase63HostPrerequisite);
        if (failure) return response(409, { status: "HOST_STAGE_PREREQUISITE_FAILED", reason: failure });
      }
      if (phase63SnapshotPrerequisite) {
        const snapshot = await budgetRpc("snapshot", {});
        const failure = phase63SnapshotPrerequisiteFailure(snapshot, phase63SnapshotPrerequisite);
        if (failure) return response(409, { status: "SNAPSHOT_STAGE_PREREQUISITE_FAILED", reason: failure });
      }
      const prefix = typeof env.NEXUS_SHADOW_WORKER_ID === "string" ? env.NEXUS_SHADOW_WORKER_ID : "p10cr-shadow-dispatcher";
      const result = await dispatchMissionShadow({
        rpc, budgetRpc, taskId: body.taskId, workerId: prefix + "-" + crypto.randomUUID(),
        workflowRunId: body.workflowRunId || env.NEXUS_WORKFLOW_RUN_ID || crypto.randomUUID(),
        payload: body.payload, leaseSeconds: 60, budgetScope
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
