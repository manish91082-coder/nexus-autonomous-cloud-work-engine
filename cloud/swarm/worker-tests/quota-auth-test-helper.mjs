const encoder = new TextEncoder();

function toHex(bytes) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes) {
  let binary = "";
  for (const value of new Uint8Array(bytes)) binary += String.fromCharCode(value);
  return btoa(binary);
}

export async function createSignedRequest(env, action, input, options = {}) {
  const callerId = options.callerId ?? env.NEXUS_QUOTA_CALLER_ID;
  const secret = options.secret ?? env.NEXUS_QUOTA_CALLER_SECRET;
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const nonce = options.nonce ?? crypto.randomUUID();
  if (typeof callerId !== "string" || !callerId) throw new TypeError("callerId required");
  if (typeof secret !== "string" || secret.length < 32) throw new TypeError("test signing key too short");
  const body = JSON.stringify({ action, input });
  const bodyBytes = encoder.encode(body);
  const digest = await crypto.subtle.digest("SHA-256", bodyBytes);
  const bodyHash = toHex(digest);
  const method = "POST";
  const path = "/rpc";
  const canonical = [callerId, timestamp, nonce, method, path, bodyHash].join("\n");
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(canonical));
  return new Request("https://quota-ledger.internal/rpc", {
    method,
    headers: {
      "content-type": "application/json",
      "x-nexus-caller-id": callerId,
      "x-nexus-timestamp": String(timestamp),
      "x-nexus-nonce": nonce,
      "x-nexus-signature": toBase64(signature)
    },
    body
  });
}

export async function signedCall(stub, env, action, input, options = {}) {
  const request = await createSignedRequest(env, action, input, options);
  const response = await stub.fetch(request);
  return { httpStatus: response.status, body: await response.json() };
}
