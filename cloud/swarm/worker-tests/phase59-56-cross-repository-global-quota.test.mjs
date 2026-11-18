import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { quotaLedgerObjectName } from "../quota-ledger-contract.mjs";
import { parseGitHubRateLimitHeaders } from "../github-quota-telemetry.mjs";
import { signedCall } from "./quota-auth-test-helper.mjs";

const WINDOW = "github-rate-limit-ledger";
const INSTALL_SCOPE = "github-app-installation:synthetic-phase59-56-installation";
const PROJECT_A = {
  projectId: "P10CR",
  repository: "synthetic-org/p10cr-shadow-repo",
  worker: () => env.PHASE_59_56_PROJECT_A
};
const PROJECT_B = {
  projectId: "SYNTHETIC-READONLY",
  repository: "synthetic-org/isolated-project-shadow-repo",
  worker: () => env.PHASE_59_56_PROJECT_B
};
const OPERATION = "github.rest.repositories.get.v1";

function ledgerStub(scope, windowId = WINDOW) {
  const name = quotaLedgerObjectName("github", scope, windowId);
  return env.QUOTA_LEDGER.get(env.QUOTA_LEDGER.idFromName(name));
}

async function recordCoreTelemetry(stub, scope, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const observedAtEpoch = options.observedAtEpoch ?? now;
  const resetAtEpoch = options.resetAtEpoch ?? now + 3600;
  const remaining = options.remaining ?? 100;
  const limit = options.limit ?? 100;
  const telemetry = parseGitHubRateLimitHeaders({
    headers: {
      "x-ratelimit-limit": String(limit),
      "x-ratelimit-remaining": String(remaining),
      "x-ratelimit-used": String(limit - remaining),
      "x-ratelimit-reset": String(resetAtEpoch),
      "x-ratelimit-resource": "core"
    },
    credentialScope: scope,
    observedAtEpoch,
    endpoint: "GET /repos/synthetic-org/p10cr-shadow-repo",
    method: "GET",
    status: 200
  });
  const result = await signedCall(stub, env, "recordTelemetry", {
    provider: "github",
    credentialScope: scope,
    windowId: WINDOW,
    telemetry
  });
  expect(result.httpStatus).toBe(200);
  expect(result.body.status).toBe("RECORDED");
  return telemetry;
}

function envelope(project, workflowRunId, taskId) {
  return {
    schemaVersion: "1.0",
    projectId: project.projectId,
    repository: project.repository,
    workflowRunId,
    taskId,
    requestId: "p59-56:" + project.repository.replace("/", ":") + ":" + taskId,
    operation: OPERATION
  };
}

async function invoke(project, value) {
  const response = await project.worker().fetch(
    new Request("https://synthetic-shadow.internal/shadow/quota", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value)
    })
  );
  return { httpStatus: response.status, body: await response.json(), project, envelope: value };
}

describe("Phase 59.56 synthetic cross-repository installation quota", () => {
  it("shares one installation partition across two repository clients and distinct run envelopes", async () => {
    const stub = ledgerStub(INSTALL_SCOPE);
    await recordCoreTelemetry(stub, INSTALL_SCOPE, { resetAtEpoch: 4102444800 });

    // Both callers are separate Worker identities and separate synthetic
    // repository/project envelopes. They share only the installation quota
    // scope and Durable Object namespace; no other repository is contacted.
    const attempts = Array.from({ length: 16 }, (_, index) => {
      const project = index % 2 === 0 ? PROJECT_A : PROJECT_B;
      return {
        project,
        envelope: envelope(project, "gha-run-" + String(index % 4), "task-" + String(index + 1).padStart(2, "0"))
      };
    });
    const results = await Promise.all(attempts.map(item => invoke(item.project, item.envelope)));

    const admitted = results.filter(item => item.body.status === "SHADOW_COMPLETED");
    const denied = results.filter(item => item.body.status === "WAITING_FOR_QUOTA");
    expect(new Set(attempts.map(item => item.envelope.repository)).size).toBe(2);
    expect(new Set(attempts.map(item => item.envelope.workflowRunId)).size).toBe(4);
    expect(admitted, JSON.stringify(results.map(item => item.body))).toHaveLength(2);
    expect(denied, JSON.stringify(results.map(item => item.body))).toHaveLength(14);
    expect(admitted.every(item => item.body.settlementStatus === "SETTLED")).toBe(true);
    expect(results.every(item => item.body.externalNetworkRequests === 0)).toBe(true);
    expect(results.every(item => item.body.providerRequestIssued === (item.body.status === "SHADOW_COMPLETED"))).toBe(true);
    expect(results.reduce((sum, item) => sum + item.body.mockProviderCalls, 0)).toBe(2);

    const snapshot = await signedCall(stub, env, "snapshot", {
      provider: "github",
      credentialScope: INSTALL_SCOPE,
      windowId: WINDOW
    });
    expect(snapshot.body.identity.credential_scope).toBe(INSTALL_SCOPE);
    expect(snapshot.body.reservations).toHaveLength(2);
    expect(snapshot.body.reservations.every(item => item.status === "SETTLED")).toBe(true);
    const core = snapshot.body.buckets.find(item => item.bucket_id === "core");
    expect(core.committed_units).toBe(2);
    expect(core.reserved_units).toBe(0);
    expect(core.uncertain_units).toBe(0);
    expect(snapshot.body.secondaryEndpointPoints).toHaveLength(2);

    // A retry in a later run uses the same repository/task idempotency key.
    // The Durable Object suppresses it before the provider fixture is called.
    const prior = admitted[0];
    const retryEnvelope = { ...prior.envelope, workflowRunId: "gha-run-retry-99" };
    const replay = await invoke(prior.project, retryEnvelope);
    expect(replay.body.status).toBe("DUPLICATE_SUPPRESSED");
    expect(replay.body.providerRequestIssued).toBe(false);
    expect(replay.body.mockProviderCalls).toBe(0);
    const afterReplay = await signedCall(stub, env, "snapshot", {
      provider: "github",
      credentialScope: INSTALL_SCOPE,
      windowId: WINDOW
    });
    expect(afterReplay.body.reservations).toHaveLength(2);
    expect(afterReplay.body.providerResponseJournal).toHaveLength(2);
  });

  it("keeps provider reset windows separately accounted under one installation identity", async () => {
    const scope = "github-app-installation:synthetic-phase59-56-window-rollover";
    const stub = ledgerStub(scope);
    const now = Math.floor(Date.now() / 1000);
    await recordCoreTelemetry(stub, scope, {
      observedAtEpoch: now,
      resetAtEpoch: now + 5,
      remaining: 100
    });

    const firstInput = {
      provider: "github",
      credentialScope: scope,
      windowId: WINDOW,
      controlPlaneProvider: "cloudflare",
      reservationId: "p59-56-window-one",
      workerId: "p59-56-window-test",
      operation: "core1"
    };
    const first = await signedCall(stub, env, "reserve", firstInput);
    expect(first.body.status).toBe("RESERVED");
    const firstSettlement = await signedCall(stub, env, "settle", {
      ...firstInput,
      actualByBucket: { core: 1 }
    });
    expect(firstSettlement.body.status).toBe("SETTLED");

    // The ledger accepts a later provider window only after the prior reset
    // has actually elapsed. Wait through the synthetic five-second window.
    await new Promise(resolve => setTimeout(resolve, 5200));
    const nextObservedAt = Math.floor(Date.now() / 1000);
    await recordCoreTelemetry(stub, scope, {
      observedAtEpoch: nextObservedAt,
      resetAtEpoch: nextObservedAt + 3600,
      remaining: 100
    });
    const secondInput = {
      ...firstInput,
      reservationId: "p59-56-window-two"
    };
    const second = await signedCall(stub, env, "reserve", secondInput);
    expect(second.body.status).toBe("RESERVED");

    const snapshot = await signedCall(stub, env, "snapshot", {
      provider: "github",
      credentialScope: scope,
      windowId: WINDOW
    });
    const windows = new Set(snapshot.body.buckets.map(item => item.provider_window_id));
    expect(windows.size).toBe(2);
    expect(snapshot.body.buckets.some(item => item.committed_units === 1)).toBe(true);
    expect(snapshot.body.buckets.some(item => item.reserved_units === 1)).toBe(true);
  });
});
