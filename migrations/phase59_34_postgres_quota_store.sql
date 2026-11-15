-- Phase 59.34 PostgreSQL quota-store schema v1.
-- Store must be hosted independently of every provider quota it arbitrates.
CREATE TABLE IF NOT EXISTS p10cr_quota_buckets (
  provider TEXT NOT NULL,
  credential_scope TEXT NOT NULL,
  window_id TEXT NOT NULL,
  bucket_id TEXT NOT NULL,
  limit_units BIGINT NOT NULL CHECK (limit_units > 0),
  observed_remaining_units BIGINT NOT NULL CHECK (observed_remaining_units >= 0),
  safety_reserve_units BIGINT NOT NULL CHECK (safety_reserve_units >= 0),
  recovery_reserve_units BIGINT NOT NULL CHECK (recovery_reserve_units >= 0),
  control_plane_provider TEXT NOT NULL,
  observed_at_epoch BIGINT NOT NULL CHECK (observed_at_epoch >= 0),
  max_telemetry_age_seconds BIGINT NOT NULL CHECK (max_telemetry_age_seconds >= 0),
  reserved_units BIGINT NOT NULL DEFAULT 0 CHECK (reserved_units >= 0),
  committed_since_observation_units BIGINT NOT NULL DEFAULT 0 CHECK (committed_since_observation_units >= 0),
  uncertain_units BIGINT NOT NULL DEFAULT 0 CHECK (uncertain_units >= 0),
  PRIMARY KEY (provider, credential_scope, window_id, bucket_id),
  CHECK (provider <> control_plane_provider),
  CHECK (observed_remaining_units <= limit_units),
  CHECK (safety_reserve_units + recovery_reserve_units < observed_remaining_units)
);

CREATE TABLE IF NOT EXISTS p10cr_quota_reservations (
  reservation_id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RESERVED','SETTLED','UNCERTAIN_BUDGET_RETAINED')),
  created_at_epoch BIGINT NOT NULL CHECK (created_at_epoch >= 0)
);

CREATE TABLE IF NOT EXISTS p10cr_quota_reservation_items (
  reservation_id TEXT NOT NULL REFERENCES p10cr_quota_reservations(reservation_id),
  provider TEXT NOT NULL,
  credential_scope TEXT NOT NULL,
  window_id TEXT NOT NULL,
  bucket_id TEXT NOT NULL,
  reserved_units BIGINT NOT NULL CHECK (reserved_units > 0),
  actual_units BIGINT CHECK (actual_units IS NULL OR (actual_units >= 0 AND actual_units <= reserved_units)),
  PRIMARY KEY (reservation_id, provider, credential_scope, window_id, bucket_id),
  FOREIGN KEY (provider, credential_scope, window_id, bucket_id)
    REFERENCES p10cr_quota_buckets(provider, credential_scope, window_id, bucket_id)
);

CREATE INDEX IF NOT EXISTS p10cr_quota_reservation_status_idx
  ON p10cr_quota_reservations(status, created_at_epoch);
