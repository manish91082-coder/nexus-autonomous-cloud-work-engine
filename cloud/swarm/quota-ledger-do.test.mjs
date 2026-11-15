import test from "node:test";
import assert from "node:assert/strict";
import {
  validateQuotaRequest, availableUnits, requireQuotaStoreEnabled, QuotaLedgerError,
  QuotaLedgerExhausted
} from "./quota-ledger-contract.mjs";

const sample = (overrides={}) => ({
  provider:"github",
  credentialScope:"installation-1/repo-2",
  windowId:"github-rate-limit-ledger",
  controlPlaneProvider:"cloudflare",
  reservationId:"r1",
  workerId:"w1",
  operation:"core10",
  ...overrides
});

test("validates identity and server-side operation reference",()=>{
  assert.equal(validateQuotaRequest(sample()),true);
});
test("rejects same provider for quota ledger",()=>{
  assert.throws(()=>validateQuotaRequest(sample({controlPlaneProvider:"github"})),/must differ/);
});
test("rejects caller-supplied costs and telemetry buckets",()=>{
  assert.throws(()=>validateQuotaRequest(sample({costs:{core:1}})),/caller-supplied telemetry and costs are forbidden/);
  assert.throws(()=>validateQuotaRequest(sample({buckets:[{bucketId:"core"}]})),/caller-supplied telemetry and costs are forbidden/);
});
test("rejects missing reservation identity or operation",()=>{
  assert.throws(()=>validateQuotaRequest(sample({reservationId:""})),/reservationId/);
  assert.throws(()=>validateQuotaRequest(sample({operation:""})),/operation/);
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
