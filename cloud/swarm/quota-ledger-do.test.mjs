import test from "node:test";
import assert from "node:assert/strict";
import {
  validateQuotaRequest, availableUnits, requireQuotaStoreEnabled, QuotaLedgerError,
  QuotaLedgerExhausted
} from "./quota-ledger-do.mjs";

const sample = (overrides={}) => ({
  provider:"github", credentialScope:"installation-1/repo-2", windowId:"hour-1",
  controlPlaneProvider:"cloudflare", reservationId:"r1", workerId:"w1", operation:"search+core",
  buckets:[
    {bucketId:"core",limitUnits:5000,observedRemainingUnits:1000,safetyReserveUnits:100,
     recoveryReserveUnits:100,observedAtEpoch:1000,maxTelemetryAgeSeconds:60,nowEpoch:1020},
    {bucketId:"search",limitUnits:30,observedRemainingUnits:20,safetyReserveUnits:2,
     recoveryReserveUnits:2,observedAtEpoch:1000,maxTelemetryAgeSeconds:60,nowEpoch:1020}
  ],
  costs:{core:20,search:3}, ...overrides
});

test("validates provider credential window and all bucket telemetry",()=>{
  assert.equal(validateQuotaRequest(sample()),true);
});
test("rejects stale and future telemetry",()=>{
  assert.throws(()=>validateQuotaRequest(sample({buckets:[{...sample().buckets[0],observedAtEpoch:1}]})),/stale\/future/);
  assert.throws(()=>validateQuotaRequest(sample({buckets:[{...sample().buckets[0],observedAtEpoch:2000}]})),/stale\/future/);
});
test("rejects same provider for quota ledger",()=>{
  assert.throws(()=>validateQuotaRequest(sample({controlPlaneProvider:"github"})),/must differ/);
});
test("rejects partial or unknown bucket costs",()=>{
  assert.throws(()=>validateQuotaRequest(sample({costs:{unknown:1}})),/known buckets/);
});
test("available units deduct reserved committed uncertain and protected reserves",()=>{
  assert.equal(availableUnits({observedRemainingUnits:100,safetyReserveUnits:10,recoveryReserveUnits:10},
    {reservedUnits:5,committedUnits:20,uncertainUnits:5}),50);
});
test("disabled feature flag fails closed",()=>{
  assert.throws(()=>requireQuotaStoreEnabled({}),/disabled/);
});
test("missing binding fails closed even if flag set",()=>{
  assert.throws(()=>requireQuotaStoreEnabled({NEXUS_QUOTA_STORE_ENABLED:"true"}),/binding missing/);
});
test("exhaustion is a distinct error class",()=>{
  assert.ok(new QuotaLedgerExhausted("x") instanceof QuotaLedgerError);
});
