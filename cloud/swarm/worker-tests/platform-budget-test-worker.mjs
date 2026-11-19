import { createPlatformBudgetRpc } from "../platform-budget-rpc-client.mjs";
export default {
  async fetch(request, env) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/rpc") {
      return Response.json({ status: "NOT_FOUND" }, { status: 404 });
    }
    if (env?.NEXUS_PLATFORM_BUDGET_ENABLED !== "true" || !env?.PLATFORM_BUDGET) {
      return Response.json({ status: "WAITING_FOR_BUDGET" }, { status: 503 });
    }
    let body;
    try { body = await request.json(); } catch { return Response.json({ status: "REJECTED" }, { status: 400 }); }
    try {
      const call = createPlatformBudgetRpc(env.PLATFORM_BUDGET, env);
      const result = await call(body?.action, body?.input);
      return Response.json(result, { status: result.httpStatus || 200 });
    } catch (error) {
      return Response.json({ status: "REJECTED", reason: String(error?.message || "CALL_FAILED") }, { status: 400 });
    }
  }
};
