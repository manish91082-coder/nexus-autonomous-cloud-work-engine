"""Independent PostgreSQL transactional quota store.

This is an opt-in adapter, disabled by default. It is designed for an external
PostgreSQL control plane, never for the provider whose API quota it arbitrates.
All reservation transitions use serializable transactions and deterministic
row-lock ordering. No network calls, provider credentials or model inference
are performed by this module.
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Mapping, Callable, Any

from scripts.multibucket_quota_contract import (
    QuotaBucket,
    MultiBucketQuotaError,
    MultiBucketConfigurationError,
    MultiBucketExhausted,
)


class QuotaStoreError(RuntimeError):
    pass


class QuotaStoreDisabled(QuotaStoreError):
    pass


class QuotaStoreUnavailable(QuotaStoreError):
    pass


class QuotaStoreConflict(QuotaStoreError):
    pass


@dataclass(frozen=True, order=True)
class BucketKey:
    provider: str
    credential_scope: str
    window_id: str
    bucket_id: str

    def validate(self):
        for name, value in (
            ("provider", self.provider),
            ("credential_scope", self.credential_scope),
            ("window_id", self.window_id),
            ("bucket_id", self.bucket_id),
        ):
            if not isinstance(value, str) or not value or len(value) > 256:
                raise MultiBucketConfigurationError(f"invalid {name}")


class PostgresQuotaStore:
    """PostgreSQL adapter; callers must explicitly opt in and provide a DSN.

    A PostgreSQL service shared by independent hosts is the intended transaction
    boundary. SQLite, Git refs and process-local locks are deliberately not used.
    """

    def __init__(
        self,
        dsn: str | None = None,
        *,
        enabled: bool = False,
        connect: Callable[..., Any] | None = None,
        max_serialization_retries: int = 5,
    ):
        self.dsn = dsn or os.environ.get("P10CR_QUOTA_DATABASE_URL", "")
        self.enabled = enabled and os.environ.get("P10CR_QUOTA_STORE_ENABLED", "").lower() == "true"
        self._connect_factory = connect
        if not isinstance(max_serialization_retries, int) or not 0 <= max_serialization_retries <= 8:
            raise QuotaStoreError("max_serialization_retries must be 0..8")
        self.max_serialization_retries = max_serialization_retries

    def _require_enabled(self):
        if not self.enabled:
            raise QuotaStoreDisabled("transactional quota store is disabled")
        if not self.dsn and self._connect_factory is None:
            raise QuotaStoreUnavailable("independent PostgreSQL DSN is not configured")

    def _connect(self):
        if self._connect_factory is not None:
            return self._connect_factory(self.dsn)
        try:
            import psycopg
        except ImportError as exc:
            raise QuotaStoreUnavailable("install the pinned psycopg 3 adapter dependency") from exc
        return psycopg.connect(self.dsn)

    @staticmethod
    def _sqlstate(exc):
        return getattr(exc, "sqlstate", None) or getattr(getattr(exc, "__cause__", None), "sqlstate", None)

    def _transaction(self, operation):
        self._require_enabled()
        for attempt in range(self.max_serialization_retries + 1):
            try:
                with self._connect() as conn:
                    with conn.transaction():
                        conn.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
                        return operation(conn)
            except Exception as exc:
                if self._sqlstate(exc) in ("40001", "40P01") and attempt < self.max_serialization_retries:
                    time.sleep(min(0.01 * (2 ** attempt), 0.2))
                    continue
                if self._sqlstate(exc) in ("40001", "40P01"):
                    raise QuotaStoreConflict("serializable transaction retry budget exhausted") from exc
                if isinstance(exc, (MultiBucketQuotaError, QuotaStoreError)):
                    raise
                raise QuotaStoreUnavailable("transaction failed; admission remains closed") from exc
        raise QuotaStoreConflict("serializable transaction retry budget exhausted")

    def install_schema(self):
        """Install the versioned schema; explicit opt-in required."""
        from pathlib import Path
        sql = (Path(__file__).resolve().parent.parent / "migrations" /
               "phase59_34_postgres_quota_store.sql").read_text(encoding="utf-8")
        def apply(conn):
            conn.execute(sql)
            return True
        return self._transaction(apply)

    def register_bucket(self, bucket: QuotaBucket):
        """Ingest a trusted provider telemetry snapshot; never call a provider here."""
        bucket.validate()
        key = BucketKey(bucket.provider, bucket.credential_scope, bucket.window_id, bucket.bucket_id)
        def apply(conn):
            row = conn.execute(
                """SELECT provider, credential_scope, window_id, bucket_id
                   FROM p10cr_quota_buckets
                   WHERE provider=%s AND credential_scope=%s AND window_id=%s AND bucket_id=%s
                   FOR UPDATE""",
                (key.provider, key.credential_scope, key.window_id, key.bucket_id),
            ).fetchone()
            values = (
                bucket.limit_units, bucket.observed_remaining_units,
                bucket.safety_reserve_units, bucket.recovery_reserve_units,
                bucket.control_plane_provider, bucket.observed_at_epoch,
                bucket.max_telemetry_age_seconds,
            )
            if row is None:
                conn.execute(
                    """INSERT INTO p10cr_quota_buckets
                       (provider,credential_scope,window_id,bucket_id,limit_units,
                        observed_remaining_units,safety_reserve_units,recovery_reserve_units,
                        control_plane_provider,observed_at_epoch,max_telemetry_age_seconds)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (key.provider,key.credential_scope,key.window_id,key.bucket_id,*values),
                )
            else:
                conn.execute(
                    """UPDATE p10cr_quota_buckets SET limit_units=%s,
                       observed_remaining_units=%s,safety_reserve_units=%s,
                       recovery_reserve_units=%s,control_plane_provider=%s,
                       observed_at_epoch=%s,max_telemetry_age_seconds=%s,
                       committed_since_observation_units=0
                       WHERE provider=%s AND credential_scope=%s AND window_id=%s AND bucket_id=%s""",
                    (*values,key.provider,key.credential_scope,key.window_id,key.bucket_id),
                )
            return key
        return self._transaction(apply)

    @staticmethod
    def _key(value):
        if isinstance(value, BucketKey):
            value.validate()
            return value
        if isinstance(value, tuple) and len(value) == 4:
            key = BucketKey(*value)
            key.validate()
            return key
        raise MultiBucketConfigurationError("bucket identity must be BucketKey or a 4-tuple")

    def reserve(self, reservation_id: str, worker_id: str, operation: str,
                costs: Mapping[BucketKey, int], *, now_epoch: int | None = None):
        """Atomically reserve all costs or none; DB row locks are globally ordered."""
        for name, value in (("reservation_id", reservation_id), ("worker_id", worker_id), ("operation", operation)):
            if not isinstance(value, str) or not value or len(value) > 256:
                raise MultiBucketConfigurationError(f"invalid {name}")
        if not isinstance(costs, Mapping) or not costs:
            raise MultiBucketConfigurationError("at least one bucket cost is required")
        normalized = {}
        for raw_key, units in costs.items():
            key = self._key(raw_key)
            if not isinstance(units, int) or isinstance(units, bool) or units <= 0:
                raise MultiBucketConfigurationError("bucket costs must be positive integers")
            if key in normalized:
                raise MultiBucketConfigurationError("duplicate bucket key")
            normalized[key] = units
        ordered = sorted(normalized)
        stamp = int(time.time()) if now_epoch is None else now_epoch
        if not isinstance(stamp, int) or isinstance(stamp, bool) or stamp < 0:
            raise MultiBucketConfigurationError("now_epoch must be a non-negative integer")

        def apply(conn):
            if conn.execute(
                "SELECT 1 FROM p10cr_quota_reservations WHERE reservation_id=%s",
                (reservation_id,),
            ).fetchone():
                raise QuotaStoreConflict("duplicate reservation id")
            rows = {}
            for key in ordered:
                row = conn.execute(
                    """SELECT limit_units,observed_remaining_units,safety_reserve_units,
                       recovery_reserve_units,control_plane_provider,observed_at_epoch,
                       max_telemetry_age_seconds,reserved_units,committed_since_observation_units,
                       uncertain_units
                       FROM p10cr_quota_buckets
                       WHERE provider=%s AND credential_scope=%s AND window_id=%s AND bucket_id=%s
                       FOR UPDATE""",
                    (key.provider,key.credential_scope,key.window_id,key.bucket_id),
                ).fetchone()
                if row is None:
                    raise MultiBucketConfigurationError("quota telemetry bucket is not registered")
                (limit_units,remaining,safety,recovery,control_provider,observed_at,max_age,
                 reserved,committed_since,uncertain) = row
                if control_provider == key.provider:
                    raise MultiBucketConfigurationError("quota control plane uses budgeted provider")
                age = stamp - observed_at
                if age < 0 or age > max_age:
                    raise MultiBucketConfigurationError("stale or future provider telemetry")
                available = remaining - safety - recovery - reserved - committed_since - uncertain
                units = normalized[key]
                if units > available:
                    raise MultiBucketExhausted(f"{key.bucket_id} exhausted; WAITING_FOR_QUOTA")
                rows[key] = (reserved, units)
            conn.execute(
                """INSERT INTO p10cr_quota_reservations
                   (reservation_id,worker_id,operation,status,created_at_epoch)
                   VALUES (%s,%s,%s,'RESERVED',%s)""",
                (reservation_id,worker_id,operation,stamp),
            )
            for key in ordered:
                reserved, units = rows[key]
                conn.execute(
                    """INSERT INTO p10cr_quota_reservation_items
                       (reservation_id,provider,credential_scope,window_id,bucket_id,reserved_units)
                       VALUES (%s,%s,%s,%s,%s,%s)""",
                    (reservation_id,key.provider,key.credential_scope,key.window_id,key.bucket_id,units),
                )
                conn.execute(
                    """UPDATE p10cr_quota_buckets SET reserved_units=reserved_units+%s
                       WHERE provider=%s AND credential_scope=%s AND window_id=%s AND bucket_id=%s""",
                    (units,key.provider,key.credential_scope,key.window_id,key.bucket_id),
                )
            return {"reservation_id":reservation_id,"worker_id":worker_id,
                    "reserved_by_bucket":{k.bucket_id:normalized[k] for k in ordered},"status":"RESERVED"}
        return self._transaction(apply)

    def settle(self, reservation_id: str, worker_id: str, actual_by_bucket: Mapping[str, int]):
        if not isinstance(actual_by_bucket, Mapping):
            raise MultiBucketConfigurationError("actual_by_bucket must be a mapping")
        def apply(conn):
            parent = conn.execute(
                "SELECT worker_id,status FROM p10cr_quota_reservations WHERE reservation_id=%s FOR UPDATE",
                (reservation_id,),
            ).fetchone()
            if parent is None or parent[0] != worker_id or parent[1] != "RESERVED":
                raise QuotaStoreConflict("reservation owner/state mismatch")
            items = conn.execute(
                """SELECT provider,credential_scope,window_id,bucket_id,reserved_units
                   FROM p10cr_quota_reservation_items WHERE reservation_id=%s
                   ORDER BY provider,credential_scope,window_id,bucket_id""",
                (reservation_id,),
            ).fetchall()
            expected = {row[3]:row[4] for row in items}
            if set(actual_by_bucket) != set(expected):
                raise MultiBucketConfigurationError("settlement must report every reserved bucket")
            for bucket_id, units in actual_by_bucket.items():
                if not isinstance(units,int) or isinstance(units,bool) or units < 0:
                    raise MultiBucketConfigurationError("actual usage must be non-negative integers")
                if units > expected[bucket_id]:
                    raise MultiBucketExhausted(f"{bucket_id} actual use exceeded reservation")
            for provider,scope,window,bucket_id,reserved in items:
                actual = actual_by_bucket[bucket_id]
                conn.execute(
                    """UPDATE p10cr_quota_buckets
                       SET reserved_units=reserved_units-%s,
                           committed_since_observation_units=committed_since_observation_units+%s
                       WHERE provider=%s AND credential_scope=%s AND window_id=%s AND bucket_id=%s""",
                    (reserved,actual,provider,scope,window,bucket_id),
                )
                conn.execute(
                    """UPDATE p10cr_quota_reservation_items SET actual_units=%s
                       WHERE reservation_id=%s AND provider=%s AND credential_scope=%s
                       AND window_id=%s AND bucket_id=%s""",
                    (actual,reservation_id,provider,scope,window,bucket_id),
                )
            conn.execute(
                "UPDATE p10cr_quota_reservations SET status='SETTLED' WHERE reservation_id=%s",
                (reservation_id,),
            )
            return {"reservation_id":reservation_id,"status":"SETTLED","actual_by_bucket":dict(actual_by_bucket)}
        return self._transaction(apply)

    def mark_uncertain(self, reservation_id: str, worker_id: str):
        def apply(conn):
            parent = conn.execute(
                "SELECT worker_id,status FROM p10cr_quota_reservations WHERE reservation_id=%s FOR UPDATE",
                (reservation_id,),
            ).fetchone()
            if parent is None or parent[0] != worker_id or parent[1] != "RESERVED":
                raise QuotaStoreConflict("reservation owner/state mismatch")
            items = conn.execute(
                """SELECT provider,credential_scope,window_id,bucket_id,reserved_units
                   FROM p10cr_quota_reservation_items WHERE reservation_id=%s
                   ORDER BY provider,credential_scope,window_id,bucket_id""",
                (reservation_id,),
            ).fetchall()
            for provider,scope,window,bucket_id,reserved in items:
                conn.execute(
                    """UPDATE p10cr_quota_buckets SET reserved_units=reserved_units-%s,
                       uncertain_units=uncertain_units+%s
                       WHERE provider=%s AND credential_scope=%s AND window_id=%s AND bucket_id=%s""",
                    (reserved,reserved,provider,scope,window,bucket_id),
                )
            conn.execute(
                "UPDATE p10cr_quota_reservations SET status='UNCERTAIN_BUDGET_RETAINED' WHERE reservation_id=%s",
                (reservation_id,),
            )
            return {"reservation_id":reservation_id,"status":"UNCERTAIN_BUDGET_RETAINED"}
        return self._transaction(apply)

    def snapshot(self, key: BucketKey):
        self._require_enabled()
        key.validate()
        with self._connect() as conn:
            row = conn.execute(
                """SELECT limit_units,observed_remaining_units,safety_reserve_units,
                   recovery_reserve_units,reserved_units,committed_since_observation_units,
                   uncertain_units,observed_at_epoch,max_telemetry_age_seconds
                   FROM p10cr_quota_buckets
                   WHERE provider=%s AND credential_scope=%s AND window_id=%s AND bucket_id=%s""",
                (key.provider,key.credential_scope,key.window_id,key.bucket_id),
            ).fetchone()
        if row is None:
            raise MultiBucketConfigurationError("quota bucket is not registered")
        names=("limit_units","observed_remaining_units","safety_reserve_units","recovery_reserve_units",
               "reserved_units","committed_since_observation_units","uncertain_units",
               "observed_at_epoch","max_telemetry_age_seconds")
        return dict(zip(names,row))
