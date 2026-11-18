/**
 * Internal HMAC client for the P10CR SwarmRunDO service binding.
 * Uses only the Durable Object stub; never global fetch or an external URL.
 */
const encoder = new TextEncoder();
function hex(bytes) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}
function base64(bytes) {
  let binary = "";
  for (const value of new Uint8Array(bytes)) binary += String.fromCharCode(value);
  return btoa(binary);
}
export function createSwarmRunRpc(namespace, env) {
  const callerId = env?.NEXUS_SWARM_RUN_CALLER_ID;
  const secret = env?.NEXUS_SWARM_RUN_CALLER_SECRET;
  if (!namespace || typeof namespace.get !== "function" || typeof namespace.idFromName !== "function") {
    throw new Error("SWARM_RUN_NAMESPACE_UNAVAILABLE");
  }
  if (callerId !== "dispatcher" || typeof secret !== "string" || secret.length < 32) {
    throw new Error("SWARM_RUN_DISPATCHER_CREDENTIALS_UNAVAILABLE");
  }
  const stub = namespace.get(namespace.idFromName("P10CR-project-cell"));
  return async function call(action, input) {
    if (typeof action !== "string" || !/^[A-Za-z]+$/.test(action)) throw new TypeError("INVALID_SWARM_ACTION");
    const body = JSON.stringify({ action, input });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID();
    const bodyHash = hex(await crypto.subtle.digest("SHA-256", encoder.encode(body)));
    const canonical = [callerId, timestamp, nonce, "POST", "/rpc", bodyHash].join("\n");
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(canonical));
    const request = new Request("https://swarm-run.internal/rpc", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nexus-caller-id": callerId,
        "x-nexus-timestamp": timestamp,
        "x-nexus-nonce": nonce,
        "x-nexus-signature": base64(signature)
      },
      body
    });
    const response = await stub.fetch(request);
    let result;
    try { result = await response.json(); } catch { throw new Error("SWARM_RUN_RPC_INVALID_RESPONSE"); }
    return { ...result, httpStatus: response.status };
  };
}
