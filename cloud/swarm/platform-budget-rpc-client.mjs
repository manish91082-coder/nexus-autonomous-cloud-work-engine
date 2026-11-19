/**
 * Authenticated RPC client for the fixed P10CR account-scope budget object.
 * The object identity is constant; callers cannot select or partition an account.
 */
const encoder = new TextEncoder();
const OBJECT_NAME = "P10CR-account-platform-budget-v1";
function hex(bytes) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}
function base64(bytes) {
  let binary = "";
  for (const value of new Uint8Array(bytes)) binary += String.fromCharCode(value);
  return btoa(binary);
}
export function createPlatformBudgetRpc(namespace, env) {
  const callerId = env?.NEXUS_PLATFORM_BUDGET_CALLER_ID;
  const secret = env?.NEXUS_PLATFORM_BUDGET_CALLER_SECRET;
  if (!namespace || typeof namespace.get !== "function" || typeof namespace.idFromName !== "function") {
    throw new Error("PLATFORM_BUDGET_BINDING_UNAVAILABLE");
  }
  if (env?.NEXUS_PLATFORM_BUDGET_ENABLED !== "true" ||
      typeof callerId !== "string" || !callerId ||
      typeof secret !== "string" || secret.length < 32) {
    throw new Error("WAITING_FOR_BUDGET_CONFIGURATION");
  }
  const stub = namespace.get(namespace.idFromName(OBJECT_NAME));
  return async function call(action, input) {
    const body = JSON.stringify({ action, input });
    if (encoder.encode(body).byteLength > 8192) throw new TypeError("PLATFORM_BUDGET_BODY_TOO_LARGE");
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID();
    const bodyHash = hex(await crypto.subtle.digest("SHA-256", encoder.encode(body)));
    const canonical = [callerId, timestamp, nonce, "POST", "/rpc", bodyHash].join("\n");
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(canonical));
    const request = new Request("https://platform-budget.internal/rpc", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nexus-budget-caller-id": callerId,
        "x-nexus-budget-timestamp": timestamp,
        "x-nexus-budget-nonce": nonce,
        "x-nexus-budget-signature": base64(signature)
      },
      body
    });
    const response = await stub.fetch(request);
    let result;
    try { result = await response.json(); } catch { throw new Error("PLATFORM_BUDGET_INVALID_RESPONSE"); }
    return { httpStatus: response.status, ...result };
  };
}
