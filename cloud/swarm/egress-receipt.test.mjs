import test from "node:test";
import assert from "node:assert/strict";
import { verifyEgressDispatchReceipt } from "./egress-receipt.mjs";

const now = 1900000000;
let pair, jwk;
const b64u = value => Buffer.from(value).toString("base64url");
const json = value => b64u(JSON.stringify(value));
const digest = "a".repeat(64);
const claims = () => ({
  iss:"https://egress.test.invalid",aud:"nexus-quota-ledger",
  cla_jti:"synthetic-cla-jti-000001",lease_id:"synthetic-lease-000001",
  installation_id:"42113",repository_id:"1454085952",
  operation_id:"github.rest.repositories.get.v1",method:"GET",
  canonical_url_sha256:digest,request_body_sha256:digest,
  request_fingerprint:digest,token_sha256:digest,
  dispatch_id:"synthetic-dispatch-000001",started_at:now-2,
  completed_at:now-1,response_status:200,outcome:"response_received"
});
async function sign(value) {
  const input = `${json({alg:"ES256",kid:"egress-test-key-1",typ:"JWT"})}.${json(value)}`;
  const signature = await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},pair.privateKey,new TextEncoder().encode(input));
  return `${input}.${b64u(signature)}`;
}
const base = () => ({
  issuer:"https://egress.test.invalid",audience:"nexus-quota-ledger",
  publicKeys:{"egress-test-key-1":jwk},nowEpoch:now,
  claJti:"synthetic-cla-jti-000001",leaseId:"synthetic-lease-000001",
  installationId:"42113",repositoryId:"1454085952",
  operationId:"github.rest.repositories.get.v1",method:"GET",
  canonicalUrlSha256:digest,requestBodySha256:digest,
  requestFingerprint:digest,tokenSha256:digest,
  dispatchId:"synthetic-dispatch-000001"
});

test("verifies a signed response receipt and binds it to the expected CLA/request", async () => {
  pair = await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
  jwk = await crypto.subtle.exportKey("jwk",pair.publicKey);
  const result = await verifyEgressDispatchReceipt({receipt:await sign(claims()),...base()});
  assert.equal(result.outcome,"response_received");
  assert.equal(result.responseStatus,200);
  assert.equal(result.installationId,"42113");
});

test("rejects changed binding, unknown key and tampered signature", async () => {
  const receipt = await sign(claims());
  await assert.rejects(()=>verifyEgressDispatchReceipt({receipt,...base(),leaseId:"other-lease-00000001"}),/binding mismatch/);
  await assert.rejects(()=>verifyEgressDispatchReceipt({receipt,...base(),publicKeys:{}}),/unknown egress signing key/);
  const parts=receipt.split(".");
  parts[2]=b64u(Buffer.alloc(64,7));
  await assert.rejects(()=>verifyEgressDispatchReceipt({receipt:parts.join("."),...base()}),/signature invalid/);
});

test("rejects ambiguous outcomes claiming a response status and invalid time windows", async () => {
  const uncertain={...claims(),outcome:"outcome_uncertain",response_status:200};
  const uncertainReceipt = await sign(uncertain);\n  await assert.rejects(()=>verifyEgressDispatchReceipt({receipt:uncertainReceipt,...base()}),/null response status/);
  const stale={...claims(),completed_at:now+301};
  const staleReceipt = await sign(stale);\n  await assert.rejects(()=>verifyEgressDispatchReceipt({receipt:staleReceipt,...base()}),/time window invalid/);
});

test("accepts uncertain outcomes only without a response status", async () => {
  const uncertain={...claims(),outcome:"outcome_uncertain",response_status:null};
  const result=await verifyEgressDispatchReceipt({receipt:await sign(uncertain),...base()});
  assert.equal(result.outcome,"outcome_uncertain");
  assert.equal(result.responseStatus,null);
});
