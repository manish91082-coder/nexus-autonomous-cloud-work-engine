const CANONICAL_REPOSITORY = "manish91082-coder/nexus-autonomous-cloud-work-engine";
const CANONICAL_REF = "refs/heads/master";
const DISPATCH_PATH = "/internal/shadow-dispatch";
const SAFE_TEST_ID = /^[A-Za-z0-9._:-]{1,64}$/;
const SAFE_RUN_ID = /^[0-9]{1,20}$/;
const SAFE_WORKER_HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+workers\.dev$/;
const HOST_SLOT_ORDER = Object.freeze(["host1", "host2", "host3", "host4"]);

function requireRunId(value, field) {
  if (typeof value !== "string" || !SAFE_RUN_ID.test(value)) {
    throw new Error(field + "_INVALID");
  }
  return value;
}

export function validateOwnerPreflight(env) {
  if (env.REPOSITORY !== CANONICAL_REPOSITORY) {
    throw new Error("CANONICAL_REPOSITORY_REQUIRED");
  }
  if (env.REF !== CANONICAL_REF) {
    throw new Error("DEFAULT_BRANCH_ONLY");
  }
  if (env.EVENT_NAME !== "workflow_dispatch") {
    throw new Error("MANUAL_WORKFLOW_DISPATCH_ONLY");
  }

  const mode = env.MODE;
  if (!["seed", "host", "snapshot"].includes(mode)) {
    throw new Error("MODE_INVALID");
  }

  const testId = env.TEST_ID;
  if (typeof testId !== "string" || !SAFE_TEST_ID.test(testId)) {
    throw new Error("TEST_ID_INVALID");
  }

  const currentRunId = requireRunId(env.CURRENT_RUN_ID, "CURRENT_GITHUB_RUN_ID");
  const pinnedHost = env.ENDPOINT_HOST || "";
  const endpointText = env.ENDPOINT || "";
  let endpointValid = false;
  try {
    const endpoint = new URL(endpointText);
    endpointValid = endpoint.protocol === "https:"
      && !endpoint.username
      && !endpoint.password
      && !endpoint.search
      && !endpoint.hash
      && !endpoint.port
      && SAFE_WORKER_HOST.test(pinnedHost)
      && endpoint.hostname === pinnedHost
      && endpoint.pathname === DISPATCH_PATH;
  } catch {
    endpointValid = false;
  }

  if (!(
    env.CONFIRM_LIVE_TEST === "true"
    && env.FREE_VERIFIED === "true"
    && env.NAMESPACE_VERIFIED === "true"
    && env.LIVE_TEST_APPROVED === "true"
    && endpointValid
    && typeof env.INGRESS_SECRET === "string"
    && env.INGRESS_SECRET.length >= 32
  )) {
    throw new Error("OWNER_PREFLIGHT_NOT_SATISFIED");
  }

  if (mode === "seed") {
    const suppliedPriorRunIds = ["SEED_RUN_ID", ...HOST_SLOT_ORDER.map(slot => slot.toUpperCase() + "_RUN_ID")]
      .some(key => env[key] !== undefined && env[key] !== null && env[key] !== "");
    if (suppliedPriorRunIds) throw new Error("SEED_STAGE_MUST_NOT_INCLUDE_PRIOR_RUN_IDS");
  }

  if (mode === "host") {
    const slotIndex = HOST_SLOT_ORDER.indexOf(env.HOST_SLOT);
    if (slotIndex < 0) throw new Error("HOST_SLOT_INVALID");
    const seedRunId = requireRunId(env.SEED_RUN_ID, "SEED_WORKFLOW_RUN_ID");
    const priorSlots = HOST_SLOT_ORDER.slice(0, slotIndex);
    const notYetRunSlots = HOST_SLOT_ORDER.slice(slotIndex);
    const priorHostIds = priorSlots.map(slot => requireRunId(
      env[slot.toUpperCase() + "_RUN_ID"], slot.toUpperCase() + "_WORKFLOW_RUN_ID"
    ));
    for (const slot of notYetRunSlots) {
      const value = env[slot.toUpperCase() + "_RUN_ID"];
      if (value !== undefined && value !== null && value !== "") {
        throw new Error("FUTURE_HOST_RUN_ID_NOT_ALLOWED");
      }
    }
    const allIds = [seedRunId, ...priorHostIds, currentRunId];
    if (new Set(allIds).size !== allIds.length) throw new Error("HOST_RUN_IDS_MUST_BE_DISTINCT");
  }

  if (mode === "snapshot") {
    const seedRunId = requireRunId(env.SEED_RUN_ID, "SEED_WORKFLOW_RUN_ID");
    const hostRunIds = [1, 2, 3, 4].map(index =>
      requireRunId(env["HOST" + index + "_RUN_ID"], "HOST" + index + "_WORKFLOW_RUN_ID")
    );
    const allIds = [seedRunId, ...hostRunIds, currentRunId];
    if (new Set(allIds).size !== 6) throw new Error("SIX_DISTINCT_WORKFLOW_RUN_IDS_REQUIRED");
  }

  return Object.freeze({ mode, testId, currentRunId });
}
