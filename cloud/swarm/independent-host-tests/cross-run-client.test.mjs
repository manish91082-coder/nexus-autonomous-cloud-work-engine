import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";import {fileURLToPath} from "node:url";import {validateSnapshot} from "./cross-run-client.mjs";
const testId="phase63-unit",seed="810001",hosts=["810011","810012","810013","810014"],snapshotRun="810099";
const repoA="synthetic-org/p10cr-shadow-repo-a",repoB="synthetic-org/p10cr-shadow-repo-b";
test("snapshot validator requires six distinct workflow-run IDs and two fixed repository aliases",()=>{
 const valid={httpStatus:200,body:{status:"BUDGET_SNAPSHOT",testId,committedDispatches:8,reservedDispatches:0,uncertainDispatches:0,reservationCount:8,
 settledReservations:8,nonSettledReservations:0,seedReservationCount:1,hostReservationCount:4,overflowReservationCount:3,
 distinctWorkflowRunIds:[seed,...hosts,snapshotRun].sort(),distinctRepositories:[repoA,repoB],expectedWorkflowRunIdsMatch:true,
 expectedRepositoriesMatch:true,allReservationsPhase59_63:true,eventChainValid:true,eventCount:80,controlBudgetRpcRequests:40,lastEventHash:"a".repeat(64)}};
 assert.equal(validateSnapshot(valid,{testId,seedRunId:seed,hostRunIds:hosts,snapshotRunId:snapshotRun}),true);
 const duplicate=structuredClone(valid);duplicate.body.distinctWorkflowRunIds[0]=duplicate.body.distinctWorkflowRunIds[1];
 assert.equal(validateSnapshot(duplicate,{testId,seedRunId:seed,hostRunIds:hosts,snapshotRunId:snapshotRun}),false);
 const oneRepo=structuredClone(valid);oneRepo.body.distinctRepositories=[repoA];
 assert.equal(validateSnapshot(oneRepo,{testId,seedRunId:seed,hostRunIds:hosts,snapshotRunId:snapshotRun}),false);
 const uncertain=structuredClone(valid);uncertain.body.uncertainDispatches=1;
 assert.equal(validateSnapshot(uncertain,{testId,seedRunId:seed,hostRunIds:hosts,snapshotRunId:snapshotRun}),false);
});
test("workflow is manual-only, read-only and owner-gated",()=>{
 const path=fileURLToPath(new URL("../../../.github/workflows/phase59-63-independent-workflow-run-proof.yml",import.meta.url));
 const workflow=fs.readFileSync(path,"utf8");
 assert.match(workflow,/workflow_dispatch:/);assert.match(workflow,/contents: read/);
 assert.match(workflow,/environment: p10cr-independent-host-owner-approved/);
 assert.doesNotMatch(workflow,/^\s{2}(push|pull_request|schedule|workflow_run):/m);
 assert.doesNotMatch(workflow,/actions:\s*write|contents:\s*write/);
 assert.match(workflow,/confirm_live_test/);assert.match(workflow,/P59_003_CLOUDFLARE_FREE_VERIFIED/);
 assert.match(workflow,/P59_003_PHASE63_LIVE_TEST_APPROVED/);
});
test("workflow has four host slots and uses actual GITHUB_RUN_ID",()=>{
 const path=fileURLToPath(new URL("../../../.github/workflows/phase59-63-independent-workflow-run-proof.yml",import.meta.url));
 const workflow=fs.readFileSync(path,"utf8");for(const slot of ["host1","host2","host3","host4"])assert.match(workflow,new RegExp(slot));
 assert.match(workflow,/GITHUB_RUN_ID/);for(const key of ["host1_workflow_run_id","host2_workflow_run_id","host3_workflow_run_id","host4_workflow_run_id"])assert.match(workflow,new RegExp(key));
});


test("manual workflow pins the exact endpoint host and requires a fresh operator-supplied test ID",()=>{
 const path=fileURLToPath(new URL("../../../.github/workflows/phase59-63-independent-workflow-run-proof.yml",import.meta.url));
 const workflow=fs.readFileSync(path,"utf8");
 assert.match(workflow,/P59_003_TEST_ENDPOINT_HOST/);
 assert.match(workflow,/ENDPOINT_HOST/);
 assert.match(workflow,/u\.hostname\.toLowerCase\(\)===pinned/);
 assert.doesNotMatch(workflow,/default:\s*["']p59-63-manual-01["']/);
});
