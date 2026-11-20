import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash, createHmac } from "node:crypto";
import { buildHostTaskPayload, buildSignedRequest, classifyBudgetSnapshot, classifyDispatch, readBoundedResponseText, validateEndpoint, validateRunnerName } from "./host-client.mjs";

const endpoint = "https://p59-62-test.example.workers.dev/internal/shadow-dispatch";
const secret = "p59-62-unit-test-ingress-secret-0123456789abcdef";

test("endpoint accepts only an HTTPS test dispatch path without URL credentials", () => {
  assert.equal(validateEndpoint(endpoint).pathname, "/internal/shadow-dispatch");
  for (const value of [
    "http://p59-62-test.example.workers.dev/internal/shadow-dispatch",
    "https://user:pass@p59-62-test.example.workers.dev/internal/shadow-dispatch",
    "https://p59-62-test.example.workers.dev/internal/shadow-dispatch?token=x",
    "https://p59-62-test.example.workers.dev/other",
    "https://attacker.example/internal/shadow-dispatch",
    "https://p59-62-test.example.workers.dev.attacker.example/internal/shadow-dispatch",
    "https://p59-62-test.example.workers.dev:444/internal/shadow-dispatch"
  ]) assert.throws(() => validateEndpoint(value));
});

test("signed envelope binds task, payload and distinct workflow-run identity", () => {
  const request = buildSignedRequest({
    endpoint, secret, taskId: "p59-62-task-1",
    workflowRunId: "12345:host1",
    payload: { testSuite: "P59.62", claims: [] },
    now: 1_800_000_000_000,
    nonce: "nonce-1234567890123456"
  });
  const body = JSON.parse(request.body);
  assert.equal(body.projectId, "P10CR");
  assert.equal(body.taskType, "P59_003_SHADOW_DISPATCH");
  assert.equal(body.workflowRunId, "12345:host1");
  const bodyHash = createHash("sha256").update(request.body).digest("hex");
  const canonical = [
    request.headers["x-nexus-dispatcher-timestamp"],
    request.headers["x-nexus-dispatcher-nonce"],
    "POST", "/internal/shadow-dispatch", bodyHash
  ].join("\n");
  const expected = createHmac("sha256", secret).update(canonical).digest("base64");
  assert.equal(request.headers["x-nexus-dispatcher-signature"], expected);
  assert.equal(request.body.includes(secret), false);
});

test("snapshot endpoint is separately path-bound and HMAC signed", () => {
  const snapshotPath = "/internal/shadow-budget-snapshot";
  const snapshotEndpoint = "https://p59-62-test.example.workers.dev" + snapshotPath;
  const request = buildSignedRequest({
    endpoint: snapshotEndpoint, secret, taskId: "p59-62-snapshot",
    taskType: "P59_003_BUDGET_SNAPSHOT", path: snapshotPath,
    workflowRunId: "12345:aggregate", payload: {},
    now: 1_800_000_000_000, nonce: "snapshot-nonce-123456789"
  });
  const body = JSON.parse(request.body);
  assert.equal(body.taskType, "P59_003_BUDGET_SNAPSHOT");
  const bodyHash = createHash("sha256").update(request.body).digest("hex");
  const canonical = [
    request.headers["x-nexus-dispatcher-timestamp"],
    request.headers["x-nexus-dispatcher-nonce"],
    "POST", snapshotPath, bodyHash
  ].join("\n");
  const expected = createHmac("sha256", secret).update(canonical).digest("base64");
  assert.equal(request.headers["x-nexus-dispatcher-signature"], expected);
});

test("budget snapshot classifier requires exact cap, no residual reservations and a valid event chain", () => {
  const valid = {
    httpStatus: 200,
    body: {
      status: "BUDGET_SNAPSHOT", committedDispatches: 8,
      reservedDispatches: 0, uncertainDispatches: 0,
      controlBudgetRpcRequests: 145, eventChainValid: true,
      eventCount: 400, lastEventHash: "b".repeat(64)
    }
  };
  assert.equal(classifyBudgetSnapshot(valid), "pass");
  assert.equal(classifyBudgetSnapshot({
    ...valid, body: { ...valid.body, uncertainDispatches: 1 }
  }), "unexpected");
  assert.equal(classifyBudgetSnapshot({
    ...valid, body: { ...valid.body, eventChainValid: false }
  }), "unexpected");
});

test("signed request rejects oversized payloads and unsafe run identities", () => {
  assert.throws(() => buildSignedRequest({
    endpoint, secret, taskId: "p59-62-large",
    workflowRunId: "run-1", payload: { data: "x".repeat(9000) }
  }));
  assert.throws(() => buildSignedRequest({
    endpoint, secret, taskId: "p59-62-invalid",
    workflowRunId: "run id", payload: {}
  }));
});

test("classifier accepts only settled, read-back-verified deterministic outcomes", () => {
  const completed = {
    httpStatus: 200,
    body: {
      status: "COMPLETED", budgetStatus: "SETTLED", eventChainValid: true, graphDecision: "HOLD",
      graphResult: {
        capabilities: {
          externalNetwork: false, modelInference: false, codeExecution: false,
          repositoryWrite: false, publication: false, accountActions: false,
          payments: false, ownerApproval: false
        },
        financial: { pcneCountedInr: 0, bankSettledNetReceiptsInr: 0, authorizedSpendInr: 0 },
        summary: { rolesExecuted: 10, rolesPassed: 0, rolesHeld: 10 }
      }
    }
  };
  assert.equal(classifyDispatch(completed), "completed");
  assert.equal(classifyDispatch({
    httpStatus: 200,
    body: { status: "DUPLICATE_SUPPRESSED", budgetStatus: "SETTLED", eventChainValid: true, resultHash: "a".repeat(64) }
  }), "duplicate");
  assert.equal(classifyDispatch({ httpStatus: 429, body: { status: "WAITING_FOR_BUDGET" } }), "denied");
  assert.equal(classifyDispatch({ httpStatus: 200, body: { status: "COMPLETED", budgetStatus: "RESERVED" } }), "unexpected");
  assert.equal(classifyDispatch({ httpStatus: 200, body: { status: "COMPLETED", budgetStatus: "SETTLED", eventChainValid: true, graphDecision: "ALLOW" } }), "unexpected");
});


test("runner name identity is non-empty, bounded and control-free", () => {
  assert.equal(validateRunnerName(" GitHub Actions 42 "), "GitHub Actions 42");
  for (const value of ["", "   ", "x".repeat(257), "runner" + String.fromCharCode(10) + "name", null]) {
    assert.throws(() => validateRunnerName(value));
  }
});


test("endpoint host allowlist rejects non-Cloudflare and deceptive suffix hosts", () => {
  assert.equal(validateEndpoint(endpoint).hostname, "p59-62-test.example.workers.dev");
  assert.throws(() => validateEndpoint("https://workers.dev/internal/shadow-dispatch"));
  assert.throws(() => validateEndpoint("https://workers.dev.attacker.example/internal/shadow-dispatch"));
  assert.throws(() => validateEndpoint("https://custom.example/internal/shadow-dispatch"));
});


test("host task payload binds the validated runner name and bounded attempt index", () => {
  assert.deepEqual(buildHostTaskPayload({
    hostId: "runner1",
    runnerName: "GitHub Actions 42",
    attemptIndex: 1
  }), {
    testSuite: "P59.62",
    hostId: "runner1",
    runnerName: "GitHub Actions 42",
    attemptIndex: 1,
    evidence_proposals: [],
    claims: []
  });
  assert.throws(() => buildHostTaskPayload({ hostId: "runner1", runnerName: "", attemptIndex: 1 }));
  assert.throws(() => buildHostTaskPayload({ hostId: "runner1", runnerName: "runner", attemptIndex: 26 }));
});

test("response body reader enforces a streaming byte ceiling", async () => {
  assert.equal(await readBoundedResponseText(new Response("ok"), 2), "ok");
  await assert.rejects(() => readBoundedResponseText(new Response("x".repeat(17)), 16), /RESPONSE_TOO_LARGE/);
});


test("owner-gated workflow enforces Cloudflare host and job-scoped identity contract", () => {
  const workflowUrl = new URL("../../../.github/workflows/phase59-62-independent-host-test.yml", import.meta.url);
  const workflow = fs.readFileSync(workflowUrl, "utf8");
  assert.match(workflow, /url\.hostname\.toLowerCase\(\)\.endsWith\("\.workers\.dev"\)/);
  assert.match(workflow, /P59_62_RUNNER_NAME: \$\{\{ runner\.name \}\}/);
  assert.match(workflow, /distinctJobScopedRunIdentities: 4/);
  assert.match(workflow, /GLOBAL_CROSS_JOB_CROSS_HOST_QUOTA_PROOF=PASS/);
  assert.doesNotMatch(workflow, /distinctWorkflowRunIdentities|runner\.id|\\\$\{\{/);
});
