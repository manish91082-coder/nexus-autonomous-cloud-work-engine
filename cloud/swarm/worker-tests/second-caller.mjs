
/**
 * Auxiliary Worker representing a separately deployed caller.
 * It binds to the main Worker's Durable Object class by script name, so both
 * Workers resolve the same provider/credential/window namespace and object ID.
 */
function quotaLedgerObjectName(provider, credentialScope, windowId) {
  for (const [field, value] of Object.entries({provider, credentialScope, windowId})) {
    if (typeof value !== "string" || value.length < 1 || value.length > 256) {
      throw new TypeError(`invalid ${field}`);
    }
  }
  return JSON.stringify([provider, credentialScope, windowId]);
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return Response.json({ status: "REJECTED", error: "POST required" }, { status: 405 });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ status: "REJECTED", error: "invalid JSON" }, { status: 400 });
    }
    const input = body?.input;
    if (!input || !["reserve", "settle", "markUncertain", "snapshot"].includes(body.action)) {
      return Response.json({ status: "REJECTED", error: "invalid action/input" }, { status: 400 });
    }
    const name = quotaLedgerObjectName(input.provider, input.credentialScope, input.windowId);
    const id = env.QUOTA_LEDGER.idFromName(name);
    const stub = env.QUOTA_LEDGER.get(id);
    let result;
    switch (body.action) {
      case "reserve":
        result = await stub.reserve(input);
        break;
      case "settle":
        result = await stub.settle(input);
        break;
      case "markUncertain":
        result = await stub.markUncertain(input);
        break;
      case "snapshot":
        result = await stub.snapshot();
        break;
    }
    return Response.json(result);
  }
};
