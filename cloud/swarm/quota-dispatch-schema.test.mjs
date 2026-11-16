import test from "node:test";
import assert from "node:assert/strict";
import { ensureQuotaDispatchSchema } from "./quota-dispatch-schema.mjs";

function fakeSql(initialColumns = []) {
  const columns = new Set(initialColumns);
  const statements = [];
  return {
    statements,
    exec(statement) {
      statements.push(statement);
      if (statement === "PRAGMA table_info(quota_reservations)") {
        return { toArray: () => [...columns].map(name => ({ name })) };
      }
      const alter = statement.match(/^ALTER TABLE quota_reservations ADD COLUMN ([a-z_]+) /);
      if (alter) columns.add(alter[1]);
      return { toArray: () => [] };
    }
  };
}

test("dispatch schema migration adds the trusted reservation provenance columns", () => {
  const sql = fakeSql(["reservation_id", "request_fingerprint"]);
  const result = ensureQuotaDispatchSchema(sql);
  for (const name of result.reservationColumns) {
    assert.ok(sql.statements.some(statement => statement.includes(`ADD COLUMN ${name} `)));
  }
  assert.ok(sql.statements.some(statement => statement.includes("CREATE TABLE IF NOT EXISTS quota_dispatch_receipts")));
  assert.ok(sql.statements.some(statement => statement.includes("dispatch_id TEXT PRIMARY KEY")));
  assert.ok(sql.statements.some(statement => statement.includes("reservation_id TEXT NOT NULL UNIQUE")));
  assert.ok(sql.statements.some(statement => statement.includes("CREATE TABLE IF NOT EXISTS quota_service_assertion_nonces")));
  assert.ok(sql.statements.some(statement => statement.includes("jti TEXT PRIMARY KEY")));
});

test("dispatch schema migration is idempotent for existing reservation columns", () => {
  const names = ["reservation_id", "request_fingerprint",
    "credential_assertion_jti", "credential_lease_id", "credential_installation_id",
    "credential_repository_id", "credential_lane", "credential_token_sha256"];
  const sql = fakeSql(names);
  ensureQuotaDispatchSchema(sql);
  assert.equal(sql.statements.filter(statement => statement.startsWith("ALTER TABLE")).length, 0);
  assert.equal(sql.statements.filter(statement => statement.startsWith("CREATE TABLE IF NOT EXISTS")).length, 2);
});

test("dispatch schema migration rejects a missing SQL interface", () => {
  assert.throws(() => ensureQuotaDispatchSchema(null), /SQLite exec interface/);
});
