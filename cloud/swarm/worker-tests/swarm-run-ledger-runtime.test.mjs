import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { evictDurableObject } from "cloudflare:test";
import { signedCall } from "./quota-auth-test-helper.mjs";
import { swarmRunSha256 } from "../swarm-run-ledger-do.mjs";
import { swarmRunLedgerCall } from "../swarm-run-ledger-client.mjs";

const PROJECT_ID = "P10CR";
const SECRETS = {
  primary: "run-primary-test-secret-0123456789abcdef",
  "worker-a": "run-worker-a-test-secret-0123456789abcdef",
  "worker-b": "run-worker-b-test-secret-0123456789abcdef"
};

function stubFor(suffix) {
  const namespace = env.SWARM_RUN_LEDGER;
  return namespace.get(namespace.idFromName(PROJECT_ID + ":" + suffix));
}

async function call(stub, action, input, callerId = "primary", extraOptions = {}) {
  const result = await signedCall(stub, env, action, {...input,projectId:input.projectId??PROJECT_ID}, {
    callerId,
    secret: SECRETS[callerId],
    ...extraOptions
  });
  return {httpStatus:result.httpStatus,...result.body};
}

async function register(stub, suffix, options = {}) {
  return call(stub,"registerTask",{
    taskId:"P10CR:"+suffix,
    idempotencyKey:"idem:"+suffix,
    taskType:"SYNTHETIC_RESEARCH",
    payload:{fixture:"synthetic",evidenceIds:["E-001"]},
    maxAttempts:options.maxAttempts??3,
    ownerGate:options.ownerGate??false,
    nowEpoch:options.nowEpoch??1000
  });
}

describe("Phase 59.53 durable swarm run ledger", () => {
  it("uses standard SHA-256 for event and payload integrity", () => {
    expect(swarmRunSha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(swarmRunSha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("registers idempotently and rejects task or idempotency identity substitution", async () => {
    const stub=stubFor("register-idempotency");
    const first=await register(stub,"register-001");
    expect(first.status).toBe("REGISTERED");
    const duplicate=await register(stub,"register-001");
    expect(duplicate.status).toBe("EXISTING");
    const conflict=await call(stub,"registerTask",{
      projectId:PROJECT_ID,taskId:"P10CR:register-001",idempotencyKey:"idem:register-001",
      taskType:"SYNTHETIC_RESEARCH",payload:{fixture:"changed"},maxAttempts:3,ownerGate:false,nowEpoch:1001
    });
    expect(conflict.status).toBe("REJECTED");
    expect(conflict.error.message).toMatch(/task identity or policy conflict/);
    const keyReuse=await call(stub,"registerTask",{
      projectId:PROJECT_ID,taskId:"P10CR:register-002",idempotencyKey:"idem:register-001",
      taskType:"SYNTHETIC_RESEARCH",payload:{fixture:"synthetic",evidenceIds:["E-001"]},
      maxAttempts:3,ownerGate:false,nowEpoch:1002
    });
    expect(keyReuse.status).toBe("REJECTED");
    expect(keyReuse.error.message).toMatch(/idempotency key already belongs/);
    const snapshot=await call(stub,"snapshot",{projectId:PROJECT_ID});
    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.tasks[0].status).toBe("READY");
    expect((await call(stub,"verifyEventChain",{projectId:PROJECT_ID})).status).toBe("VALID");
  });

  it("serializes two independent worker claims and binds caller identity to worker identity", async () => {
    const stub=stubFor("two-worker-claim");
    await register(stub,"claim-race",{nowEpoch:2000});
    const [a,b]=await Promise.all([
      call(stub,"claimTask",{taskId:"P10CR:claim-race",workerId:"worker-a",leaseSeconds:60,maxConcurrency:5,nowEpoch:2001},"worker-a"),
      call(stub,"claimTask",{taskId:"P10CR:claim-race",workerId:"worker-b",leaseSeconds:60,maxConcurrency:5,nowEpoch:2001},"worker-b")
    ]);
    expect([a.status,b.status].sort()).toEqual(["ALREADY_LEASED","CLAIMED"]);
    const claimed=a.status==="CLAIMED"?a:b;
    const loser=a.status==="ALREADY_LEASED"?a:b;
    expect(claimed.fenceToken).toBe(1);
    expect(loser.workerId).toBe(claimed.workerId);
    const heartbeat=await call(stub,"heartbeat",{
      taskId:"P10CR:claim-race",workerId:claimed.workerId,fenceToken:1,leaseSeconds:120,nowEpoch:2002
    },claimed.workerId);
    expect(heartbeat.status).toBe("HEARTBEAT_OK");
    expect(heartbeat.expiresAtEpoch).toBe(2122);
    const spoof=await call(stub,"claimTask",{
      taskId:"P10CR:claim-race",workerId:claimed.workerId==="worker-a"?"worker-b":"worker-a",
      leaseSeconds:60,maxConcurrency:5,nowEpoch:2002
    },claimed.workerId);
    expect(spoof.status).toBe("REJECTED");
    expect(spoof.error.message).toMatch(/not bound to worker identity/);
    expect((await call(stub,"verifyEventChain",{projectId:PROJECT_ID})).status).toBe("VALID");
  });

  it("persists checkpoints across eviction and fences stale workers after lease recovery", async () => {
    const stub=stubFor("lease-fencing-recovery");
    await register(stub,"fence-001",{nowEpoch:3000});
    const first=await call(stub,"claimTask",{
      taskId:"P10CR:fence-001",workerId:"worker-a",leaseSeconds:15,maxConcurrency:5,nowEpoch:3001
    },"worker-a");
    expect(first.status).toBe("CLAIMED");
    expect(first.fenceToken).toBe(1);
    const checkpoint=await call(stub,"checkpoint",{
      taskId:"P10CR:fence-001",workerId:"worker-a",fenceToken:1,
      checkpoint:{stage:"EVIDENCE_COLLECTED",cursor:7},nowEpoch:3002
    },"worker-a");
    expect(checkpoint.status).toBe("CHECKPOINT_SAVED");
    await evictDurableObject(stub);
    const afterRestart=await call(stub,"snapshot",{projectId:PROJECT_ID});
    expect(afterRestart.tasks[0].checkpoint).toEqual({cursor:7,stage:"EVIDENCE_COLLECTED"});
    expect(afterRestart.leases[0].fenceToken).toBe(1);

    const recovery=await call(stub,"recoverExpiredLeases",{projectId:PROJECT_ID,nowEpoch:3017});
    expect(recovery.status).toBe("LEASE_RECOVERY_COMPLETE");
    expect(recovery.recoveredCount).toBe(1);
    const stale=await call(stub,"checkpoint",{
      taskId:"P10CR:fence-001",workerId:"worker-a",fenceToken:1,
      checkpoint:{stage:"STALE_WRITE"},nowEpoch:3018
    },"worker-a");
    expect(stale.status).toBe("REJECTED");
    expect(stale.error.message).toMatch(/stale fencing token|lease expired/);

    const waiting=await call(stub,"claimTask",{
      taskId:"P10CR:fence-001",workerId:"worker-b",leaseSeconds:60,maxConcurrency:5,nowEpoch:3077
    },"worker-b");
    expect(waiting.status).toBe("CLAIMED");
    expect(waiting.fenceToken).toBe(2);
    const oldFinish=await call(stub,"finishTask",{
      taskId:"P10CR:fence-001",workerId:"worker-a",fenceToken:1,success:true,
      result:{decision:"GO"},nowEpoch:3078
    },"worker-a");
    expect(oldFinish.status).toBe("REJECTED");

    const checkpoint2=await call(stub,"checkpoint",{
      taskId:"P10CR:fence-001",workerId:"worker-b",fenceToken:2,
      checkpoint:{stage:"REVIEWED",reviewCount:2},nowEpoch:3078
    },"worker-b");
    expect(checkpoint2.status).toBe("CHECKPOINT_SAVED");
    const result={decision:"HOLD",modelInferenceUsed:false,externalNetworkRequests:0};
    const finished=await call(stub,"finishTask",{
      taskId:"P10CR:fence-001",workerId:"worker-b",fenceToken:2,success:true,result,nowEpoch:3079
    },"worker-b");
    expect(finished.status).toBe("COMPLETED");
    const replay=await call(stub,"finishTask",{
      taskId:"P10CR:fence-001",workerId:"worker-b",fenceToken:2,success:true,result,nowEpoch:3080
    },"worker-b");
    expect(replay.status).toBe("ALREADY_COMPLETED");
    const wrongOwnerReplay=await call(stub,"finishTask",{
      taskId:"P10CR:fence-001",workerId:"worker-a",fenceToken:1,success:true,result,nowEpoch:3081
    },"worker-a");
    expect(wrongOwnerReplay.status).toBe("REJECTED");
    const final=await call(stub,"snapshot",{projectId:PROJECT_ID});
    expect(final.tasks[0].status).toBe("COMPLETED");
    expect(final.leases).toHaveLength(0);
    expect((await call(stub,"verifyEventChain",{projectId:PROJECT_ID})).status).toBe("VALID");
  });

  it("blocks owner-gated tasks and dead-letters a lease that exhausts its retry budget", async () => {
    const stub=stubFor("owner-gate-dead-letter");
    await register(stub,"owner-gated",{ownerGate:true,nowEpoch:4000});
    const gated=await call(stub,"claimTask",{
      taskId:"P10CR:owner-gated",workerId:"worker-a",leaseSeconds:15,maxConcurrency:5,nowEpoch:4001
    },"worker-a");
    expect(gated.status).toBe("OWNER_APPROVAL_REQUIRED");

    await register(stub,"dead-letter",{maxAttempts:1,nowEpoch:5000});
    const claim=await call(stub,"claimTask",{
      taskId:"P10CR:dead-letter",workerId:"worker-a",leaseSeconds:15,maxConcurrency:5,nowEpoch:5001
    },"worker-a");
    expect(claim.status).toBe("CLAIMED");
    const recovery=await call(stub,"recoverExpiredLeases",{projectId:PROJECT_ID,nowEpoch:5017});
    expect(recovery.recoveredCount).toBe(1);
    const snapshot=await call(stub,"snapshot",{projectId:PROJECT_ID});
    const task=snapshot.tasks.find(item=>item.taskId==="P10CR:dead-letter");
    expect(task.status).toBe("DEAD_LETTER");
    const noClaim=await call(stub,"claimTask",{
      taskId:"P10CR:dead-letter",workerId:"worker-b",leaseSeconds:60,maxConcurrency:5,nowEpoch:6000
    },"worker-b");
    expect(noClaim.status).toBe("NOT_CLAIMABLE");
    expect((await call(stub,"verifyEventChain",{projectId:PROJECT_ID})).status).toBe("VALID");
  });

  it("signs authenticated client RPCs into the canonical P10CR project cell", async () => {
    const input={
      projectId:PROJECT_ID,taskId:"P10CR:client-smoke",idempotencyKey:"idem:client-smoke",
      taskType:"SYNTHETIC_RESEARCH",payload:{fixture:"client"},maxAttempts:2,ownerGate:false
    };
    const registered=await swarmRunLedgerCall(env,"registerTask",input);
    expect(registered.httpStatus).toBe(200);
    expect(registered.body.status).toBe("REGISTERED");
    const snapshot=await swarmRunLedgerCall(env,"snapshot",{projectId:PROJECT_ID});
    expect(snapshot.body.tasks.some(task=>task.taskId==="P10CR:client-smoke")).toBe(true);
  });

  it("fails closed on credential-like task data and the disabled client path", async () => {
    const stub=stubFor("secret-data-rejection");
    const rejected=await call(stub,"registerTask",{
      taskId:"P10CR:secret-data",idempotencyKey:"idem:secret-data",taskType:"SYNTHETIC",
      payload:{source:"fixture",apiKey:"must-not-persist"},maxAttempts:1,ownerGate:false,nowEpoch:8000
    });
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.error.message).toMatch(/credential-like field is forbidden/);
    const disabled=await swarmRunLedgerCall({...env,NEXUS_SWARM_RUN_LEDGER_ENABLED:"false"},"snapshot",{projectId:PROJECT_ID});
    expect(disabled.httpStatus).toBe(503);
    expect(disabled.body.reason).toBe("RUN_LEDGER_DISABLED");
  });

  it("rejects cross-project state access and replays of authenticated RPC nonces", async () => {
    const stub=stubFor("auth-project-isolation");
    const mismatch=await call(stub,"registerTask",{
      projectId:"OTHER",taskId:"OTHER:task",idempotencyKey:"other:idem",taskType:"SYNTHETIC",
      payload:{},maxAttempts:1,ownerGate:false,nowEpoch:7000
    });
    expect(mismatch.status).toBe("REJECTED");
    expect(mismatch.error.message).toMatch(/project cell identity mismatch/);

    const input={
      projectId:PROJECT_ID,taskId:"P10CR:nonce-task",idempotencyKey:"idem:nonce-task",
      taskType:"SYNTHETIC",payload:{fixture:true},maxAttempts:1,ownerGate:false,nowEpoch:7001
    };
    const nonce="nonce-phase53-replay-0001";
    const first=await call(stub,"registerTask",input,"primary",{nonce});
    expect(first.status).toBe("REGISTERED");
    const replay=await call(stub,"registerTask",input,"primary",{nonce});
    expect(replay.httpStatus).toBe(409);
    expect(replay.reason).toBe("REPLAYED_NONCE");
  });
});
