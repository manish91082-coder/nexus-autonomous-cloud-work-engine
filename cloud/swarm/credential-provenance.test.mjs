import test from "node:test";
import assert from "node:assert/strict";
import { verifyGitHubCredentialProvenance } from "./credential-provenance.mjs";

const b64u = value => Buffer.from(value).toString("base64url");
const json = value => b64u(JSON.stringify(value));
const token = "synthetic-test-token-never-valid-for-github";
const now = 1900000000;
let pair, jwk;

test("verifies ES256 broker proof and derives installation scope from signed claims", async () => {
  pair = await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
  jwk = await crypto.subtle.exportKey("jwk",pair.publicKey);
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  const hex = Buffer.from(digest).toString("hex");
  const header = {alg:"ES256",kid:"test-key-1",typ:"JWT"};
  const claims = {
    iss:"https://broker.test.invalid",aud:"nexus-quota-ledger",sub:"12345",
    installation_id:"42113",repository_ids:["1454085952"],
    permissions:{metadata:"read",contents:"read"},token_sha256:hex,
    issued_at:now-10,expires_at:now+300,jti:"synthetic-jti-00000001",
    credential_lane:"compute_readonly"
  };
  const signingInput = `${json(header)}.${json(claims)}`;
  const signature = await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},pair.privateKey,new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${b64u(signature)}`;
  const result = await verifyGitHubCredentialProvenance({
    assertion,bearerToken:token,publicKeys:{"test-key-1":jwk},nowEpoch:now,
    issuer:"https://broker.test.invalid",audience:"nexus-quota-ledger",appId:"12345",
    repositoryId:"1454085952",credentialLane:"compute_readonly",
    requiredPermissions:{metadata:"read",contents:"read"}
  });
  assert.equal(result.credentialScope,"github-app-installation:42113");
  assert.equal(result.installationId,"42113");
  assert.equal(result.credentialLane,"compute_readonly");
});

test("rejects bearer-token substitution", async () => {
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  const claims = {
    iss:"https://broker.test.invalid",aud:"nexus-quota-ledger",sub:"12345",
    installation_id:"42113",repository_ids:["1454085952"],permissions:{metadata:"read"},
    token_sha256:Buffer.from(digest).toString("hex"),issued_at:now-10,expires_at:now+300,
    jti:"synthetic-jti-00000002",credential_lane:"compute_readonly"
  };
  const input = `${json({alg:"ES256",kid:"test-key-1",typ:"JWT"})}.${json(claims)}`;
  const sig = await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},pair.privateKey,new TextEncoder().encode(input));
  await assert.rejects(()=>verifyGitHubCredentialProvenance({
    assertion:`${input}.${b64u(sig)}`,bearerToken:"different-token",
    publicKeys:{"test-key-1":jwk},nowEpoch:now,issuer:"https://broker.test.invalid",
    audience:"nexus-quota-ledger",appId:"12345"
  }),/token digest mismatch/);
});

test("rejects expired assertions, unknown keys, and repository mismatch", async () => {
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  const claims = {
    iss:"https://broker.test.invalid",aud:"nexus-quota-ledger",sub:"12345",
    installation_id:"42113",repository_ids:["1454085952"],permissions:{metadata:"read"},
    token_sha256:Buffer.from(digest).toString("hex"),issued_at:now-400,expires_at:now+300,
    jti:"synthetic-jti-00000003",credential_lane:"compute_readonly"
  };
  const input = `${json({alg:"ES256",kid:"test-key-1",typ:"JWT"})}.${json(claims)}`;
  const sig = await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},pair.privateKey,new TextEncoder().encode(input));
  const assertion = `${input}.${b64u(sig)}`;
  const base = {assertion,bearerToken:token,publicKeys:{"test-key-1":jwk},nowEpoch:now,
    issuer:"https://broker.test.invalid",audience:"nexus-quota-ledger",appId:"12345"};
  await assert.rejects(()=>verifyGitHubCredentialProvenance(base),/time window invalid/);
  await assert.rejects(()=>verifyGitHubCredentialProvenance({...base,publicKeys:{}}),/unknown signing key/);
  await assert.rejects(()=>verifyGitHubCredentialProvenance({...base,repositoryId:"999"}),/time window invalid/);
});
