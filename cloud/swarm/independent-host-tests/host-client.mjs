import { createHash, createHmac, randomUUID } from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const PATH = "/internal/shadow-dispatch";
const SNAPSHOT_PATH = "/internal/shadow-budget-snapshot";
const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const SENTINEL_TASK_ID = "p59-62-global-idempotency-sentinel";
const SENTINEL_PAYLOAD = Object.freeze({
  testSuite: "P59.62",
  sentinel: "GLOBAL_IDEMPOTENCY_SEED",
  evidence_proposals: [],
  claims: []
});

export function validateEndpoint(value, expectedPath = PATH) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError("TEST_ENDPOINT_INVALID_URL"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== expectedPath) {
    throw new TypeError("TEST_ENDPOINT_MUST_BE_HTTPS_INTERNAL_PATH_WITHOUT_CREDENTIALS_QUERY_OR_FRAGMENT");
  }
  return url;
}

export function buildSignedRequest({ endpoint, secret, taskId, payload, workflowRunId, taskType = "P59_003_SHADOW_DISPATCH", path = PATH, now = Date.now(), nonce = randomUUID() }) {
  const url = validateEndpoint(endpoint, path);
  if (typeof secret !== "string" || secret.length < 32) throw new TypeError("TEST_INGRESS_SECRET_INVALID");
  if (typeof taskId !== "string" || !SAFE_ID.test(taskId)) throw new TypeError("TASK_ID_INVALID");
  if (typeof workflowRunId !== "string" || !SAFE_ID.test(workflowRunId)) throw new TypeError("WORKFLOW_RUN_ID_INVALID");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("PAYLOAD_OBJECT_REQUIRED");

  const body = JSON.stringify({
    projectId: "P10CR",
    taskType,
    taskId,
    workflowRunId,
    payload
  });
  const bodyBytes = Buffer.from(body, "utf8");
  if (bodyBytes.byteLength < 1 || bodyBytes.byteLength > 8192) throw new TypeError("ENVELOPE_SIZE_INVALID");
  const timestamp = String(Math.floor(now / 1000));
  const bodyHash = createHash("sha256").update(bodyBytes).digest("hex");
  const canonical = [timestamp, nonce, "POST", path, bodyHash].join("\n");
  const signature = createHmac("sha256", secret).update(canonical).digest("base64");
  return {
    url: url.toString(),
    body,
    headers: {
      "content-type": "application/json",
      "x-nexus-dispatcher-timestamp": timestamp,
      "x-nexus-dispatcher-nonce": nonce,
      "x-nexus-dispatcher-signature": signature
    }
  };
}

function validCompletedBody(body) {
  const capabilities = body?.graphResult?.capabilities;
  const financial = body?.graphResult?.financial;
  const summary = body?.graphResult?.summary;
  return body?.budgetStatus === "SETTLED"
    && body?.eventChainValid === true
    && body?.graphDecision === "HOLD"
    && capabilities && Object.values(capabilities).every(value => value === false)
    && financial?.pcneCountedInr === 0
    && financial?.bankSettledNetReceiptsInr === 0
    && financial?.authorizedSpendInr === 0
    && summary?.rolesExecuted === 10
    && summary?.rolesPassed === 0
    && summary?.rolesHeld === 10;
}

export function classifyDispatch(result) {
  const body = result?.body;
  if (result?.httpStatus === 429 && body?.status === "WAITING_FOR_BUDGET") return "denied";
  if (result?.httpStatus !== 200) return "unexpected";
  if (body?.status === "COMPLETED" && validCompletedBody(body)) return "completed";
  if (body?.status === "DUPLICATE_SUPPRESSED"
    && body?.budgetStatus === "SETTLED"
    && body?.eventChainValid === true
    && /^[a-f0-9]{64}$/.test(body?.resultHash || "")) return "duplicate";
  return "unexpected";
}

async function postDispatch({ endpoint, secret, taskId, payload, workflowRunId }) {
  const signed = buildSignedRequest({ endpoint, secret, taskId, payload, workflowRunId });
  const response = await fetch(signed.url, {
    method: "POST",
    headers: signed.headers,
    body: signed.body,
    signal: AbortSignal.timeout(30000)
  });
  const raw = await response.text();
  if (raw.length > 16384) throw new Error("DISPATCH_RESPONSE_TOO_LARGE");
  let body;
  try { body = JSON.parse(raw); } catch { throw new Error("DISPATCH_RESPONSE_NOT_JSON"); }
  return { httpStatus: response.status, body };
}

async function postSnapshot({ endpoint, secret, workflowRunId }) {
  const signed = buildSignedRequest({
    endpoint, secret, taskId: "p59-62-budget-snapshot-readback",
    taskType: "P59_003_BUDGET_SNAPSHOT", path: SNAPSHOT_PATH,
    payload: {}, workflowRunId
  });
  const response = await fetch(signed.url, {
    method: "POST", headers: signed.headers, body: signed.body,
    signal: AbortSignal.timeout(30000)
  });
  const raw = await response.text();
  if (raw.length > 16384) throw new Error("SNAPSHOT_RESPONSE_TOO_LARGE");
  let body;
  try { body = JSON.parse(raw); } catch { throw new Error("SNAPSHOT_RESPONSE_NOT_JSON"); }
  return { httpStatus: response.status, body };
}

export function classifyBudgetSnapshot(result) {
  const body = result?.body;
  return result?.httpStatus === 200
    && body?.status === "BUDGET_SNAPSHOT"
    && body?.committedDispatches === 8
    && body?.reservedDispatches === 0
    && body?.uncertainDispatches === 0
    && body?.eventChainValid === true
    && Number.isInteger(body?.eventCount) && body.eventCount > 0
    && Number.isInteger(body?.controlBudgetRpcRequests)
    && body.controlBudgetRpcRequests > 0 && body.controlBudgetRpcRequests <= 500
    && /^[a-f0-9]{64}$/.test(body?.lastEventHash || "")
    ? "pass" : "unexpected";
}

function appendOutputs(values) {
  const target = process.env.GITHUB_OUTPUT;
  if (!target) return;
  const lines = Object.entries(values).map(([key, value]) => key + "=" + String(value));
  fs.appendFileSync(target, lines.join("\n") + "\n", { encoding: "utf8" });
}

export async function runHostClient(env = process.env) {
  const endpoint = validateEndpoint(env.NEXUS_TEST_ENDPOINT).toString();
  const secret = env.NEXUS_TEST_INGRESS_SECRET;
  if (typeof secret !== "string" || secret.length < 32) throw new Error("OWNER_TEST_SECRET_MISSING");
  const mode = env.P59_62_MODE;
  const workflowRunIdentity = String(env.GITHUB_RUN_ID || "") + ":" + String(env.GITHUB_JOB || "");
  if (!SAFE_ID.test(workflowRunIdentity)) throw new Error("WORKFLOW_RUN_IDENTITY_INVALID");

  if (mode === "snapshot") {\n    const snapshotUrl = new URL(endpoint);\n    snapshotUrl.pathname = SNAPSHOT_PATH;\n    const result = await postSnapshot({ endpoint: snapshotUrl.toString(), secret, workflowRunId: workflowRunIdentity });\n    if (classifyBudgetSnapshot(result) !== "pass") throw new Error("GLOBAL_BUDGET_SNAPSHOT_RECONCILIATION_FAILED");\n    const outputs = { snapshot_committed_dispatches: result.body.committedDispatches, snapshot_reserved_dispatches: result.body.reservedDispatches, snapshot_uncertain_dispatches: result.body.uncertainDispatches, snapshot_event_count: result.body.eventCount, snapshot_event_chain_valid: result.body.eventChainValid, snapshot_control_rpc_requests: result.body.controlBudgetRpcRequests };\n    appendOutputs(outputs);\n    return outputs;\n  }\n\n  if (mode === "seed") {
    const result = await postDispatch({
      endpoint, secret, taskId: SENTINEL_TASK_ID,
      payload: SENTINEL_PAYLOAD, workflowRunId: workflowRunIdentity
    });
    if (classifyDispatch(result) !== "completed") throw new Error("GLOBAL_SENTINEL_SEED_NOT_COMPLETED");
    const outputs = { seed_completed: 1, seed_workflow_run_identity: workflowRunIdentity };
    appendOutputs(outputs);
    return outputs;
  }

  if (mode !== "host") throw new Error("P59_62_MODE_INVALID");
  const hostId = env.P59_62_HOST_ID;
  if (typeof hostId !== "string" || !SAFE_ID.test(hostId)) throw new Error("HOST_ID_INVALID");
  const attempts = Number(env.P59_62_ATTEMPTS || 25);
  if (attempts !== 25) throw new Error("HOST_ATTEMPTS_MUST_EQUAL_25");

  const duplicateResult = await postDispatch({
    endpoint, secret, taskId: SENTINEL_TASK_ID,
    payload: SENTINEL_PAYLOAD, workflowRunId: workflowRunIdentity
  });
  const duplicateClass = classifyDispatch(duplicateResult);
  if (duplicateClass !== "duplicate") throw new Error("CROSS_RUN_DUPLICATE_NOT_SUPPRESSED");

  const runnerId = String(env.RUNNER_ID || "");
  if (!SAFE_ID.test(runnerId)) throw new Error("RUNNER_ID_INVALID");
  const requests = Array.from({ length: attempts }, (_, index) => postDispatch({
    endpoint,
    secret,
    taskId: "p59-62-" + hostId + "-" + String(index + 1).padStart(2, "0"),
    workflowRunId: workflowRunIdentity,
    payload: {
      testSuite: "P59.62",
      hostId,
      runnerId,
      attemptIndex: index + 1,
      evidence_proposals: [],
      claims: []
    }
  }));
  const results = await Promise.all(requests);
  const counts = { completed: 0, denied: 0, duplicates: 1, unexpected: 0 };
  for (const result of results) counts[classifyDispatch(result)] += 1;

  if (counts.unexpected !== 0 || counts.completed + counts.denied !== 25 || counts.duplicates !== 1) {
    throw new Error("HOST_RESULT_CLASSIFICATION_FAILED:" + JSON.stringify(counts));
  }
  const outputs = {
    ...counts,
    runner_id: runnerId,
    workflow_run_identity: workflowRunIdentity
  };
  appendOutputs(outputs);
  return outputs;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runHostClient().then(result => {
    console.log("P59_62_HOST_RESULT " + JSON.stringify(result));
  }).catch(error => {
    console.error("P59_62_HOST_FAILURE " + String(error?.message || "UNKNOWN").slice(0, 240));
    process.exitCode = 1;
  });
}
