/**
 * Phase 59.45C — additive, idempotent SQLite schema migration for the
 * trusted dispatch lifecycle. This migration creates storage only; it does
 * not authorize dispatches or claim that evidence verification is integrated.
 */
const RESERVATION_COLUMNS = Object.freeze({
  credential_assertion_jti: "TEXT",
  credential_lease_id: "TEXT",
  credential_installation_id: "TEXT",
  credential_repository_id: "TEXT",
  credential_lane: "TEXT",
  credential_token_sha256: "TEXT"
});

export function ensureQuotaDispatchSchema(sql) {
  if (!sql || typeof sql.exec !== "function") {
    throw new TypeError("quota dispatch schema requires a SQLite exec interface");
  }
  const columns = sql.exec("PRAGMA table_info(quota_reservations)").toArray();
  const known = new Set(columns.map(column => column.name));
  for (const [name, type] of Object.entries(RESERVATION_COLUMNS)) {
    if (!known.has(name)) {
      sql.exec(`ALTER TABLE quota_reservations ADD COLUMN ${name} ${type}`);
    }
  }

  sql.exec(`CREATE TABLE IF NOT EXISTS quota_dispatch_receipts (
    dispatch_id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL UNIQUE,
    cla_jti TEXT NOT NULL,
    lease_id TEXT NOT NULL,
    installation_id TEXT NOT NULL,
    repository_id TEXT NOT NULL,
    operation_id TEXT NOT NULL,
    request_fingerprint TEXT NOT NULL,
    token_sha256 TEXT NOT NULL,
    response_headers_sha256 TEXT,
    response_status INTEGER,
    outcome TEXT NOT NULL,
    started_at_epoch INTEGER NOT NULL,
    completed_at_epoch INTEGER NOT NULL,
    created_at_epoch INTEGER NOT NULL
  )`);
  sql.exec(`CREATE TABLE IF NOT EXISTS quota_service_assertion_nonces (
    jti TEXT PRIMARY KEY,
    principal TEXT NOT NULL,
    action TEXT NOT NULL,
    expires_at_epoch INTEGER NOT NULL,
    consumed_at_epoch INTEGER NOT NULL
  )`);
  sql.exec("CREATE INDEX IF NOT EXISTS quota_dispatch_receipts_reservation_idx ON quota_dispatch_receipts(reservation_id)");
  sql.exec("CREATE INDEX IF NOT EXISTS quota_service_assertion_expiry_idx ON quota_service_assertion_nonces(expires_at_epoch)");
  return Object.freeze({
    reservationColumns: Object.freeze(Object.keys(RESERVATION_COLUMNS)),
    dispatchReceiptTable: "quota_dispatch_receipts",
    serviceAssertionReplayTable: "quota_service_assertion_nonces"
  });
}
