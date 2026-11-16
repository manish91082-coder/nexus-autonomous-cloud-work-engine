import test from "node:test";
import assert from "node:assert/strict";
import { verifyServiceAssertion } from "./service-assertion.mjs";
const enc=new TextEncoder();
function b64u(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/=/g,"").split("+").join("-").split("/").join("_");}
let pair,jwk; const now=1_800_000_000;
async function sign(claims){
 const h=b64u(enc.encode(JSON.stringify({alg:"ES256",kid:"sa-test-v1",typ:"JWT"})));
 const p=b64u(enc.encode(JSON.stringify(claims)));
 const sig=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},pair.privateKey,enc.encode(h+"."+p));
 return h+"."+p+"."+b64u(new Uint8Array(sig));
}
function claims(overrides={}){return {iss:"nexus.test.service",aud:"nexus.test.quota-ledger",
 principal:"quota-maintenance-primary",actions:["expireReservations","reconcileUncertain"],
 partition_scope:["github-app-installation:42113"],issued_at:now-5,expires_at:now+60,
 jti:"sa-test-assertion-000001",key_version:"sa-test-v1",...overrides};}
function base(extra={}){return {publicKeys:{"sa-test-v1":jwk},issuer:"nexus.test.service",audience:"nexus.test.quota-ledger",nowEpoch:now,...extra};}
test("verifies primary maintenance assertion with explicit partition",async()=>{
 pair=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
 jwk=await crypto.subtle.exportKey("jwk",pair.publicKey);
 const result=await verifyServiceAssertion({assertion:await sign(claims()),...base(),action:"expireReservations",partition:"github-app-installation:42113"});
 assert.equal(result.principal,"quota-maintenance-primary"); assert.equal(result.partitionScope[0],"github-app-installation:42113");
});
test("rejects wrong action, partition, principal and issuer",async()=>{
 const assertion=await sign(claims());
 await assert.rejects(()=>verifyServiceAssertion({assertion,...base(),action:"snapshot"}),/action not authorized/);
 await assert.rejects(()=>verifyServiceAssertion({assertion,...base(),partition:"github-app-installation:999"}),/partition not authorized/);
 await assert.rejects(()=>verifyServiceAssertion({assertion,...base(),principal:"quota-observer"}),/principal mismatch/);
 await assert.rejects(()=>verifyServiceAssertion({assertion,...base({issuer:"attacker"})}),/issuer or audience mismatch/);
});
test("rejects overbroad observer policy, wildcard scope, expired and excessive TTL",async()=>{
 const observer={...claims(),principal:"quota-observer",actions:["snapshot","expireReservations"]};
 await assert.rejects(()=>verifyServiceAssertion({assertion:await sign(observer),...base()}),/principal\/action policy/);
 const wildcard={...claims(),partition_scope:["*"]};
 await assert.rejects(()=>verifyServiceAssertion({assertion:await sign(wildcard),...base()}),/explicit installation partition/);
 const expired={...claims(),expires_at:now-1};
 await assert.rejects(()=>verifyServiceAssertion({assertion:await sign(expired),...base()}),/time window/);
 const long={...claims(),expires_at:now+121};
 await assert.rejects(()=>verifyServiceAssertion({assertion:await sign(long),...base()}),/time window/);
});
test("rejects tampered signature and unknown key",async()=>{
 const assertion=await sign(claims());
 await assert.rejects(()=>verifyServiceAssertion({assertion,...base({publicKeys:{}})}),/unknown service signing key/);
 const parts=assertion.split("."); parts[2]=b64u(new Uint8Array(64).fill(9));
 await assert.rejects(()=>verifyServiceAssertion({assertion:parts.join("."),...base()}),/signature invalid/);
});
