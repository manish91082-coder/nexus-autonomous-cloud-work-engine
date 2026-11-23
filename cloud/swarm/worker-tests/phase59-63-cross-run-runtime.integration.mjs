import { describe,it,expect } from "vitest";
import { env } from "cloudflare:workers";
import { createPlatformBudgetRpc } from "../platform-budget-rpc-client.mjs";
const ingressSecret="p59-63-ingress-test-secret-0123456789abcdef";
const repoA="synthetic-org/p10cr-shadow-repo-a",repoB="synthetic-org/p10cr-shadow-repo-b";
function hex(bytes){return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,"0")).join("");}
function b64(bytes){let s="";for(const v of new Uint8Array(bytes))s+=String.fromCharCode(v);return btoa(s);}
async function call(body,path="/internal/shadow-dispatch"){
 const raw=JSON.stringify(body),timestamp=String(Math.floor(Date.now()/1000)),nonce=crypto.randomUUID();
 const hash=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw)));
 const canonical=[timestamp,nonce,"POST",path,hash].join("\n");
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(ingressSecret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(canonical));
 const response=await env.PHASE_59_63_MISSION_DISPATCHER.fetch(new Request("https://p59-63.internal"+path,{method:"POST",
  headers:{"content-type":"application/json","x-nexus-dispatcher-timestamp":timestamp,"x-nexus-dispatcher-nonce":nonce,
  "x-nexus-dispatcher-signature":b64(signature)},body:raw}));
 return {httpStatus:response.status,...await response.json()};
}
const envelope=(taskId,workflowRunId,payload,taskType="P59_003_SHADOW_DISPATCH")=>({projectId:"P10CR",taskType,taskId,workflowRunId,payload});
describe("Phase59.63 independent workflow-run / cross-repository Workerd proof",()=>{
 it("settles one seed, four host run identities and three overflow tasks under shared cap eight",async()=>{
  const budget=createPlatformBudgetRpc(env.PHASE_59_63_PLATFORM_BUDGET,env);
  expect((await budget("testReset",{})).status).toBe("TEST_RESET");
  const testId="phase63-workerd-proof";
  const sentinel={testSuite:"P59.63",testId,testRepositoryAlias:repoA,sentinel:"GLOBAL_CROSS_RUN_SENTINEL",evidence_proposals:[],claims:[]};
  const seed=await call(envelope("p59-63-"+testId+"-seed","810001",sentinel));
  expect(seed.httpStatus).toBe(200);expect(seed.status).toBe("COMPLETED");
  const hostRuns=["810011","810012","810013","810014"],slots=["host1","host2","host3","host4"];
  const duplicates=await Promise.all(hostRuns.map(id=>call(envelope("p59-63-"+testId+"-seed",id,sentinel))));
  expect(duplicates.every(x=>x.status==="DUPLICATE_SUPPRESSED")).toBe(true);
  const hostPayload=(i,prior)=>({
   testSuite:"P59.63",testId,testRepositoryAlias:i%2===0?repoA:repoB,hostId:slots[i],runnerName:"workerd-host-"+(i+1),
   attemptIndex:1,seedWorkflowRunId:"810001",priorHostWorkflowRunIds:prior,evidence_proposals:[],claims:[]});
  const forgedSeed=await call(envelope("p59-63-"+testId+"-host1-01","810011",{
   ...hostPayload(0,[]),seedWorkflowRunId:"810099"}));
  expect(forgedSeed.httpStatus).toBe(409);expect(forgedSeed.reason).toBe("SEED_RESERVATION_NOT_SETTLED_OR_RUN_MISMATCH");
  const prematureHost2=await call(envelope("p59-63-"+testId+"-host2-01","810012",hostPayload(1,["810010"])));
  expect(prematureHost2.httpStatus).toBe(409);expect(prematureHost2.reason).toBe("PRIOR_HOST_RESERVATION_NOT_SETTLED_OR_RUN_MISMATCH");
  const hosts=[];
  const host1=await call(envelope("p59-63-"+testId+"-host1-01",hostRuns[0],hostPayload(0,[])));
  hosts.push(host1);expect(host1.status).toBe("COMPLETED");
  const prematureHost3=await call(envelope("p59-63-"+testId+"-host3-01",hostRuns[2],hostPayload(2,[hostRuns[0],"810012"])));
  expect(prematureHost3.httpStatus).toBe(409);expect(prematureHost3.reason).toBe("PRIOR_HOST_RESERVATION_NOT_SETTLED_OR_RUN_MISMATCH");
  const host2=await call(envelope("p59-63-"+testId+"-host2-01",hostRuns[1],hostPayload(1,[hostRuns[0]])));
  hosts.push(host2);expect(host2.status).toBe("COMPLETED");
  const swappedHost3=await call(envelope("p59-63-"+testId+"-host3-01",hostRuns[2],hostPayload(2,[hostRuns[1],hostRuns[0]])));
  expect(swappedHost3.httpStatus).toBe(409);expect(swappedHost3.reason).toBe("PRIOR_HOST_RESERVATION_NOT_SETTLED_OR_RUN_MISMATCH");
  const host3=await call(envelope("p59-63-"+testId+"-host3-01",hostRuns[2],hostPayload(2,[hostRuns[0],hostRuns[1]])));
  hosts.push(host3);expect(host3.status).toBe("COMPLETED");
  const host4=await call(envelope("p59-63-"+testId+"-host4-01",hostRuns[3],hostPayload(3,[hostRuns[0],hostRuns[1],hostRuns[2]])));
  hosts.push(host4);expect(host4.status).toBe("COMPLETED");
  const snapshotRun="810099",overflow=[];
  for(let i=1;i<=4;i++)overflow.push(await call(envelope("p59-63-"+testId+"-overflow-"+i,snapshotRun,{
   testSuite:"P59.63",testId,testRepositoryAlias:i%2===1?repoA:repoB,hostId:"snapshot",runnerName:"snapshot",
   attemptIndex:i,evidence_proposals:[],claims:[]})));
  expect(overflow.slice(0,3).every(x=>x.status==="COMPLETED")).toBe(true);
  expect(overflow[3].httpStatus).toBe(429);expect(overflow[3].status).toBe("WAITING_FOR_BUDGET");
  const snap=await call(envelope("p59-63-budget-snapshot-readback",snapshotRun,{
   testId,seedWorkflowRunId:"810001",hostWorkflowRunIds:hostRuns},"P59_003_BUDGET_SNAPSHOT"),"/internal/shadow-budget-snapshot");
  expect(snap.httpStatus).toBe(200);expect(snap.status).toBe("BUDGET_SNAPSHOT");
  expect(snap.committedDispatches).toBe(8);expect(snap.reservedDispatches).toBe(0);expect(snap.uncertainDispatches).toBe(0);
  expect(snap.reservationCount).toBe(8);expect(snap.settledReservations).toBe(8);expect(snap.nonSettledReservations).toBe(0);
  expect(snap.seedReservationCount).toBe(1);expect(snap.hostReservationCount).toBe(4);expect(snap.overflowReservationCount).toBe(3);
  expect(snap.distinctWorkflowRunIds).toHaveLength(6);expect(snap.expectedWorkflowRunIdsMatch).toBe(true);
  expect(snap.seedWorkflowRunIdMatch).toBe(true);expect(snap.snapshotWorkflowRunIdMatch).toBe(true);
  expect(snap.hostSlotWorkflowRunIds).toEqual({host1:"810011",host2:"810012",host3:"810013",host4:"810014"});
  expect(snap.expectedHostSlotWorkflowRunIdsMatch).toBe(true);
  expect(snap.distinctRepositories).toEqual([repoA,repoB]);expect(snap.expectedRepositoriesMatch).toBe(true);
  expect(snap.allReservationsPhase59_63).toBe(true);expect(snap.eventChainValid).toBe(true);
  const swapped=await call(envelope("p59-63-budget-snapshot-readback",snapshotRun,{
   testId,seedWorkflowRunId:"810001",hostWorkflowRunIds:["810012","810011","810013","810014"]},"P59_003_BUDGET_SNAPSHOT"),"/internal/shadow-budget-snapshot");
  expect(swapped.httpStatus).toBe(200);expect(swapped.expectedWorkflowRunIdsMatch).toBe(true);
  expect(swapped.expectedHostSlotWorkflowRunIdsMatch).toBe(false);
 });
});