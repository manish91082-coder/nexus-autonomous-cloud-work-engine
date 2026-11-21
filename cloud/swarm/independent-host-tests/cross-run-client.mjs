import { buildSignedRequest, classifyDispatch, readBoundedResponseText, validateEndpoint, validateRunnerName } from "./host-client.mjs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const DISPATCH_PATH="/internal/shadow-dispatch", SNAPSHOT_PATH="/internal/shadow-budget-snapshot";
const REPO_A="synthetic-org/p10cr-shadow-repo-a", REPO_B="synthetic-org/p10cr-shadow-repo-b";
const SAFE_ID=/^[A-Za-z0-9._:-]{1,128}$/, SAFE_RUN_ID=/^[0-9]{1,20}$/;
const HOSTS=Object.freeze({host1:{repository:REPO_A,expectedHostId:"host1"},host2:{repository:REPO_B,expectedHostId:"host2"},host3:{repository:REPO_A,expectedHostId:"host3"},host4:{repository:REPO_B,expectedHostId:"host4"}});
function requireRunId(value,field){if(typeof value!=="string"||!SAFE_RUN_ID.test(value))throw new TypeError(field+"_INVALID");return value;}
function requireTestId(value){if(typeof value!=="string"||!SAFE_ID.test(value)||value.length>64)throw new TypeError("TEST_ID_INVALID");return value;}
function sentinelPayload(testId){return{testSuite:"P59.63",testId,testRepositoryAlias:REPO_A,sentinel:"GLOBAL_CROSS_RUN_SENTINEL",evidence_proposals:[],claims:[]};}
async function readJson(response,label){const raw=await readBoundedResponseText(response,16384);try{return{httpStatus:response.status,body:JSON.parse(raw)};}catch{throw new Error(label+"_RESPONSE_NOT_JSON");}}
async function dispatch({endpoint,secret,taskId,payload,workflowRunId,expectedHostname}){
 const signed=buildSignedRequest({endpoint,secret,taskId,payload,workflowRunId,path:DISPATCH_PATH,expectedHostname});
 return await readJson(await fetch(signed.url,{method:"POST",headers:signed.headers,body:signed.body,signal:AbortSignal.timeout(30000)}),"DISPATCH");
}
async function readSnapshot({endpoint,secret,testId,seedRunId,hostRunIds,workflowRunId,expectedHostname}){
 const url=new URL(endpoint);url.pathname=SNAPSHOT_PATH;
 const signed=buildSignedRequest({endpoint:url.toString(),secret,taskId:"p59-63-budget-snapshot-readback",taskType:"P59_003_BUDGET_SNAPSHOT",path:SNAPSHOT_PATH,workflowRunId,
  payload:{testId,seedWorkflowRunId:seedRunId,hostWorkflowRunIds:hostRunIds},expectedHostname});
 return await readJson(await fetch(signed.url,{method:"POST",headers:signed.headers,body:signed.body,signal:AbortSignal.timeout(30000)}),"SNAPSHOT");
}
export function validateSnapshot(result,{testId,seedRunId,hostRunIds,snapshotRunId}){
 const body=result?.body,expectedRuns=[seedRunId,...hostRunIds,snapshotRunId].sort();
 return result?.httpStatus===200&&body?.status==="BUDGET_SNAPSHOT"&&body?.testId===testId
  &&body?.committedDispatches===8&&body?.reservedDispatches===0&&body?.uncertainDispatches===0
  &&body?.reservationCount===8&&body?.settledReservations===8&&body?.nonSettledReservations===0
  &&body?.seedReservationCount===1&&body?.hostReservationCount===4&&body?.overflowReservationCount===3
  &&Array.isArray(body?.distinctWorkflowRunIds)&&body.distinctWorkflowRunIds.length===6
  &&body.distinctWorkflowRunIds.every((v,i)=>v===expectedRuns[i])&&body?.expectedWorkflowRunIdsMatch===true
  &&JSON.stringify(body?.distinctRepositories)===JSON.stringify([REPO_A,REPO_B])&&body?.expectedRepositoriesMatch===true
  &&body?.allReservationsPhase59_63===true&&body?.eventChainValid===true
  &&Number.isInteger(body?.eventCount)&&body.eventCount>0&&Number.isInteger(body?.controlBudgetRpcRequests)
  &&body.controlBudgetRpcRequests>0&&body.controlBudgetRpcRequests<=500&&/^[a-f0-9]{64}$/.test(body?.lastEventHash||"");
}
export async function runCrossRunClient(env=process.env){
 const expectedHostname=env.P59_63_TEST_ENDPOINT_HOST;
 const endpoint=validateEndpoint(env.NEXUS_TEST_ENDPOINT,DISPATCH_PATH,expectedHostname).toString(),secret=env.NEXUS_TEST_INGRESS_SECRET;
 if(typeof secret!=="string"||secret.length<32)throw new Error("OWNER_TEST_SECRET_MISSING");
 const mode=env.P59_63_MODE,testId=requireTestId(env.P59_63_TEST_ID),workflowRunId=requireRunId(String(env.GITHUB_RUN_ID||""),"CURRENT_WORKFLOW_RUN_ID");
 if(mode==="seed"){
  const result=await dispatch({endpoint,secret,taskId:"p59-63-"+testId+"-seed",payload:sentinelPayload(testId),workflowRunId,expectedHostname});
  if(classifyDispatch(result)!=="completed")throw new Error("P59_63_SEED_NOT_COMPLETED");
  const output={mode,testId,seedWorkflowRunId:workflowRunId,status:result.body.status};console.log("P59_63_SEED_RESULT "+JSON.stringify(output));return output;
 }
 if(mode==="host"){
  const seedRunId=requireRunId(env.P59_63_SEED_WORKFLOW_RUN_ID,"SEED_WORKFLOW_RUN_ID");
  if(seedRunId===workflowRunId)throw new Error("SEED_AND_HOST_RUN_IDS_MUST_DIFFER");
  const hostSlot=env.P59_63_HOST_SLOT,host=HOSTS[hostSlot];if(!host)throw new Error("HOST_SLOT_INVALID");
  const runnerName=validateRunnerName(env.P59_63_RUNNER_NAME||"");
  const duplicate=await dispatch({endpoint,secret,taskId:"p59-63-"+testId+"-seed",payload:sentinelPayload(testId),workflowRunId,expectedHostname});
  if(classifyDispatch(duplicate)!=="duplicate")throw new Error("P59_63_CROSS_RUN_SENTINEL_NOT_SUPPRESSED");
  const result=await dispatch({endpoint,secret,taskId:"p59-63-"+testId+"-"+hostSlot+"-01",workflowRunId,expectedHostname,
   payload:{testSuite:"P59.63",testId,testRepositoryAlias:host.repository,hostId:host.expectedHostId,runnerName,attemptIndex:1,evidence_proposals:[],claims:[]}});
  if(classifyDispatch(result)!=="completed")throw new Error("P59_63_HOST_TASK_NOT_COMPLETED");
  const output={mode,testId,hostSlot,repositoryAlias:host.repository,workflowRunId,runnerName,sentinelDuplicateSuppressed:true,uniqueTasksCompleted:1,uniqueTasksDenied:0};
  console.log("P59_63_HOST_RESULT "+JSON.stringify(output));return output;
 }
 if(mode==="snapshot"){
  const seedRunId=requireRunId(env.P59_63_SEED_WORKFLOW_RUN_ID,"SEED_WORKFLOW_RUN_ID");
  const hostRunIds=[1,2,3,4].map(i=>requireRunId(env["P59_63_HOST"+i+"_WORKFLOW_RUN_ID"],"HOST"+i+"_WORKFLOW_RUN_ID"));
  if(new Set([seedRunId,...hostRunIds,workflowRunId]).size!==6)throw new Error("ALL_SIX_WORKFLOW_RUN_IDS_MUST_BE_DISTINCT");
  const overflow=[];
  for(let i=1;i<=4;i++){
   const repository=i%2===1?REPO_A:REPO_B;
   const result=await dispatch({endpoint,secret,taskId:"p59-63-"+testId+"-overflow-"+i,workflowRunId,expectedHostname,
    payload:{testSuite:"P59.63",testId,testRepositoryAlias:repository,hostId:"snapshot",runnerName:"snapshot",attemptIndex:i,evidence_proposals:[],claims:[]}});
   overflow.push(classifyDispatch(result));
  }
  if(JSON.stringify(overflow)!==JSON.stringify(["completed","completed","completed","denied"]))throw new Error("P59_63_OVERFLOW_CONTRACT_FAILED:"+JSON.stringify(overflow));
  const result=await readSnapshot({endpoint,secret,testId,seedRunId,hostRunIds,workflowRunId,expectedHostname});
  if(!validateSnapshot(result,{testId,seedRunId,hostRunIds,snapshotRunId:workflowRunId}))throw new Error("P59_63_FINAL_SNAPSHOT_MISMATCH:"+JSON.stringify(result.body));
  const output={mode,testId,workflowRunId,distinctHostWorkflowRunIds:4,distinctRepositoryAliases:2,overflowAdmitted:3,overflowDenied:1,reservationsSettled:8,reserved:0,uncertain:0,eventChainValid:true};
  console.log("P59_63_SNAPSHOT_RESULT "+JSON.stringify(output));return output;
 }
 throw new Error("P59_63_MODE_INVALID");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runCrossRunClient().catch(error=>{console.error("P59_63_FAILURE "+String(error?.message||"UNKNOWN").slice(0,240));process.exitCode=1;});
}
