const encoder = new TextEncoder();

function toHex(bytes) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes) {
  let binary = "";
  for (const value of new Uint8Array(bytes)) binary += String.fromCharCode(value);
  return btoa(binary);
}

export async function swarmRunLedgerCall(env, action, input) {
  if (env?.NEXUS_SWARM_RUN_LEDGER_ENABLED !== "true") {
    return {httpStatus:503,body:{status:"WAITING_FOR_CONFIGURATION",reason:"RUN_LEDGER_DISABLED"}};
  }
  const callerId=env.NEXUS_SWARM_RUN_CALLER_ID;
  const secret=env.NEXUS_SWARM_RUN_CALLER_SECRET;
  if (typeof callerId!=="string"||!callerId||typeof secret!=="string"||secret.length<32) {
    return {httpStatus:503,body:{status:"WAITING_FOR_CONFIGURATION",reason:"CALLER_IDENTITY_MISSING"}};
  }
  if (!input||typeof input!=="object"||Array.isArray(input)||typeof input.projectId!=="string") {
    return {httpStatus:400,body:{status:"REJECTED",reason:"PROJECT_ID_REQUIRED"}};
  }
  const namespace=env.SWARM_RUN_LEDGER;
  if (!namespace||typeof namespace.idFromName!=="function"||typeof namespace.get!=="function") {
    return {httpStatus:503,body:{status:"WAITING_FOR_CONFIGURATION",reason:"RUN_LEDGER_BINDING_MISSING"}};
  }
  const stub=namespace.get(namespace.idFromName(input.projectId));
  const body=JSON.stringify({action,input});
  const bodyBytes=encoder.encode(body);
  const digest=await crypto.subtle.digest("SHA-256",bodyBytes);
  const bodyHash=toHex(digest);
  const timestamp=String(Math.floor(Date.now()/1000));
  const nonce=crypto.randomUUID();
  const canonical=[callerId,timestamp,nonce,"POST","/rpc",bodyHash].join("\n");
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",key,encoder.encode(canonical));
  const request=new Request("https://swarm-run-ledger.internal/rpc",{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-nexus-caller-id":callerId,
      "x-nexus-timestamp":timestamp,
      "x-nexus-nonce":nonce,
      "x-nexus-signature":toBase64(signature)
    },
    body
  });
  const response=await stub.fetch(request);
  let result;
  try { result=await response.json(); }
  catch { result={status:"REJECTED",reason:"INVALID_LEDGER_RESPONSE"}; }
  return {httpStatus:response.status,body:result};
}
