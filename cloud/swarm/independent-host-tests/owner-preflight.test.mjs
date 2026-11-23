import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { validateOwnerPreflight } from "./owner-preflight.mjs";

const base = {
  REPOSITORY: "manish91082-coder/nexus-autonomous-cloud-work-engine",
  REF: "refs/heads/master",
  EVENT_NAME: "workflow_dispatch",
  MODE: "seed",
  TEST_ID: "p59-64-owner-preflight-01",
  CURRENT_RUN_ID: "920001",
  CONFIRM_LIVE_TEST: "true",
  FREE_VERIFIED: "true",
  NAMESPACE_VERIFIED: "true",
  LIVE_TEST_APPROVED: "true",
  ENDPOINT: "https://p10cr-test.example.workers.dev/internal/shadow-dispatch",
  ENDPOINT_HOST: "p10cr-test.example.workers.dev",
  INGRESS_SECRET: "test-only-secret-material-at-least-32-characters",
  HOST_SLOT: "host1"
};

test("accepts canonical master manual seed preflight without returning secrets", () => {
  const result = validateOwnerPreflight(base);
  assert.deepEqual(result, { mode: "seed", testId: base.TEST_ID, currentRunId: "920001" });
  assert.equal(Object.hasOwn(result, "INGRESS_SECRET"), false);
});

test("rejects a non-canonical repository before any live stage", () => {
  assert.throws(() => validateOwnerPreflight({ ...base, REPOSITORY: "attacker/other-repo" }), /CANONICAL_REPOSITORY_REQUIRED/);
});

test("rejects a non-default branch even when owner flags are true", () => {
  assert.throws(() => validateOwnerPreflight({ ...base, REF: "refs/heads/feature" }), /DEFAULT_BRANCH_ONLY/);
});

test("rejects non-manual workflow events", () => {
  assert.throws(() => validateOwnerPreflight({ ...base, EVENT_NAME: "push" }), /MANUAL_WORKFLOW_DISPATCH_ONLY/);
});

test("fails closed when any owner approval or free-plan assertion is absent", () => {
  for (const key of ["CONFIRM_LIVE_TEST", "FREE_VERIFIED", "NAMESPACE_VERIFIED", "LIVE_TEST_APPROVED"]) {
    assert.throws(() => validateOwnerPreflight({ ...base, [key]: "false" }), /OWNER_PREFLIGHT_NOT_SATISFIED/);
  }
  assert.throws(() => validateOwnerPreflight({ ...base, INGRESS_SECRET: "short" }), /OWNER_PREFLIGHT_NOT_SATISFIED/);
});

test("rejects endpoint hostname mismatch, non-HTTPS and path confusion", () => {
  assert.throws(() => validateOwnerPreflight({ ...base, ENDPOINT_HOST: "other.example.workers.dev" }), /OWNER_PREFLIGHT_NOT_SATISFIED/);
  assert.throws(() => validateOwnerPreflight({ ...base, ENDPOINT: "http://p10cr-test.example.workers.dev/internal/shadow-dispatch" }), /OWNER_PREFLIGHT_NOT_SATISFIED/);
  assert.throws(() => validateOwnerPreflight({ ...base, ENDPOINT: "https://p10cr-test.example.workers.dev/internal/shadow-dispatch/extra" }), /OWNER_PREFLIGHT_NOT_SATISFIED/);
});

test("requires a valid test ID and actual numeric GitHub run ID", () => {
  assert.throws(() => validateOwnerPreflight({ ...base, TEST_ID: "../replay" }), /TEST_ID_INVALID/);
  assert.throws(() => validateOwnerPreflight({ ...base, CURRENT_RUN_ID: "run-1" }), /CURRENT_GITHUB_RUN_ID_INVALID/);
});

test("host stage requires a valid slot and all prior host-run IDs in order", () => {
  const host1 = { ...base, MODE: "host", HOST_SLOT: "host1", SEED_RUN_ID: "920000" };
  assert.equal(validateOwnerPreflight(host1).mode, "host");
  assert.throws(() => validateOwnerPreflight({ ...host1, HOST_SLOT: "host5" }), /HOST_SLOT_INVALID/);
  assert.throws(() => validateOwnerPreflight({ ...host1, SEED_RUN_ID: "920001" }), /SEED_AND_HOST_RUN_IDS_MUST_BE_DISTINCT|HOST_RUN_IDS_MUST_BE_DISTINCT/);
  assert.throws(() => validateOwnerPreflight({ ...host1, HOST1_RUN_ID: "920010" }), /FUTURE_HOST_RUN_ID_NOT_ALLOWED/);
  assert.throws(() => validateOwnerPreflight({ ...base, MODE: "host", HOST_SLOT: "host2", SEED_RUN_ID: "920000" }), /HOST1_WORKFLOW_RUN_ID_INVALID/);
  const host2 = { ...base, MODE: "host", HOST_SLOT: "host2", SEED_RUN_ID: "920000", HOST1_RUN_ID: "920010" };
  assert.equal(validateOwnerPreflight(host2).mode, "host");
  assert.throws(() => validateOwnerPreflight({ ...host2, HOST2_RUN_ID: "920011" }), /FUTURE_HOST_RUN_ID_NOT_ALLOWED/);
  const host3 = { ...base, MODE: "host", HOST_SLOT: "host3", SEED_RUN_ID: "920000", HOST1_RUN_ID: "920010", HOST2_RUN_ID: "920011" };
  assert.equal(validateOwnerPreflight(host3).mode, "host");
  assert.throws(() => validateOwnerPreflight({ ...host3, HOST2_RUN_ID: "" }), /HOST2_WORKFLOW_RUN_ID_INVALID/);
  const host4 = { ...base, MODE: "host", HOST_SLOT: "host4", SEED_RUN_ID: "920000", HOST1_RUN_ID: "920010", HOST2_RUN_ID: "920011", HOST3_RUN_ID: "920012" };
  assert.equal(validateOwnerPreflight(host4).mode, "host");
});

test("host stage rejects duplicate supplied prior run IDs", () => {
  const host = { ...base, MODE: "host", HOST_SLOT: "host3", SEED_RUN_ID: "920000", HOST1_RUN_ID: "920010", HOST2_RUN_ID: "920010" };
  assert.throws(() => validateOwnerPreflight(host), /HOST_RUN_IDS_MUST_BE_DISTINCT/);
});

test("snapshot requires six distinct actual workflow-run IDs", () => {
  const snapshot = {
    ...base, MODE: "snapshot", SEED_RUN_ID: "920000",
    HOST1_RUN_ID: "920011", HOST2_RUN_ID: "920012", HOST3_RUN_ID: "920013", HOST4_RUN_ID: "920014"
  };
  assert.equal(validateOwnerPreflight(snapshot).mode, "snapshot");
  assert.throws(() => validateOwnerPreflight({ ...snapshot, HOST4_RUN_ID: "920001" }), /SIX_DISTINCT_WORKFLOW_RUN_IDS_REQUIRED/);
});

test("rejects an unknown protocol mode", () => {
  assert.throws(() => validateOwnerPreflight({ ...base, MODE: "publish" }), /MODE_INVALID/);
});

test("workflow binds canonical repository/ref/event context to the preflight helper", () => {
  const workflowPath = fileURLToPath(new URL("../../../.github/workflows/phase59-63-independent-workflow-run-proof.yml", import.meta.url));
  const helperPath = fileURLToPath(new URL("./owner-preflight.mjs", import.meta.url));
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const helper = fs.readFileSync(helperPath, "utf8");
  assert.ok(workflow.includes("REPOSITORY: ${{ github.repository }}"));
  assert.ok(workflow.includes("REF: ${{ github.ref }}"));
  assert.ok(workflow.includes("EVENT_NAME: ${{ github.event_name }}"));
  assert.ok(workflow.includes("validateOwnerPreflight"));
  assert.ok(helper.includes('const CANONICAL_REF = "refs/heads/master";'));
});
