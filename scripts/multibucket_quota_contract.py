"""Provider-specific multi-bucket quota contracts (policy only).

No network access or persistence is implemented here. A production adapter must
read fresh telemetry and execute reserve/settle transitions in one serializable
transaction shared by every worker for the credential scope and quota window.
"""
from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Mapping


class MultiBucketQuotaError(RuntimeError):
    pass


class MultiBucketConfigurationError(MultiBucketQuotaError):
    pass


class MultiBucketExhausted(MultiBucketQuotaError):
    pass


@dataclass(frozen=True)
class QuotaBucket:
    provider: str
    credential_scope: str
    window_id: str
    bucket_id: str
    limit_units: int
    observed_remaining_units: int
    safety_reserve_units: int
    recovery_reserve_units: int
    control_plane_provider: str
    observed_at_epoch: int
    max_telemetry_age_seconds: int
    now_epoch: int

    def validate(self) -> None:
        for name, value in (
            ("provider", self.provider),
            ("credential_scope", self.credential_scope),
            ("window_id", self.window_id),
            ("bucket_id", self.bucket_id),
            ("control_plane_provider", self.control_plane_provider),
        ):
            if not isinstance(value, str) or not value or len(value) > 256:
                raise MultiBucketConfigurationError(f"invalid {name}")
        if self.provider == self.control_plane_provider:
            raise MultiBucketConfigurationError(
                "quota ledger must use a provider independent of the budgeted provider"
            )
        for name, value in (
            ("limit_units", self.limit_units),
            ("observed_remaining_units", self.observed_remaining_units),
            ("safety_reserve_units", self.safety_reserve_units),
            ("recovery_reserve_units", self.recovery_reserve_units),
            ("observed_at_epoch", self.observed_at_epoch),
            ("max_telemetry_age_seconds", self.max_telemetry_age_seconds),
            ("now_epoch", self.now_epoch),
        ):
            if not isinstance(value, int) or isinstance(value, bool) or value < 0:
                raise MultiBucketConfigurationError(f"{name} must be a non-negative integer")
        if self.limit_units == 0 or self.observed_remaining_units > self.limit_units:
            raise MultiBucketConfigurationError("invalid quota telemetry")
        age = self.now_epoch - self.observed_at_epoch
        if age < 0 or age > self.max_telemetry_age_seconds:
            raise MultiBucketConfigurationError("stale or future quota telemetry")
        if self.safety_reserve_units + self.recovery_reserve_units >= self.observed_remaining_units:
            raise MultiBucketExhausted("protected reserves consume observed capacity")


def _validate_contract(buckets: Mapping[str, QuotaBucket]) -> None:
    if not isinstance(buckets, Mapping) or not buckets:
        raise MultiBucketConfigurationError("at least one quota bucket is required")
    for key, bucket in buckets.items():
        if not isinstance(bucket, QuotaBucket) or key != bucket.bucket_id:
            raise MultiBucketConfigurationError("bucket map key/identity mismatch")
        bucket.validate()
    identities = [(b.provider, b.credential_scope, b.window_id, b.bucket_id)
                  for b in buckets.values()]
    if len(identities) != len(set(identities)):
        raise MultiBucketConfigurationError("duplicate quota bucket identity")


def empty_multibucket_ledger(buckets: Mapping[str, QuotaBucket]) -> dict:
    _validate_contract(buckets)
    return {
        "schema_version": 1,
        "buckets": {
            key: {
                "provider": b.provider,
                "credential_scope": b.credential_scope,
                "window_id": b.window_id,
                "bucket_id": b.bucket_id,
                "reserved_units": 0,
                "committed_units": 0,
                "uncertain_units": 0,
            }
            for key, b in buckets.items()
        },
        "reservations": {},
    }


def _validate_ledger(ledger: dict, buckets: Mapping[str, QuotaBucket]) -> None:
    if not isinstance(ledger, dict) or ledger.get("schema_version") != 1:
        raise MultiBucketConfigurationError("unsupported ledger schema")
    if set(ledger.get("buckets", {})) != set(buckets):
        raise MultiBucketConfigurationError("ledger bucket set differs from provider contract")
    for key, bucket in buckets.items():
        row = ledger["buckets"][key]
        expected = (bucket.provider, bucket.credential_scope, bucket.window_id, bucket.bucket_id)
        actual = (row.get("provider"), row.get("credential_scope"),
                  row.get("window_id"), row.get("bucket_id"))
        if actual != expected:
            raise MultiBucketConfigurationError("ledger/provider bucket identity mismatch")


def reserve_multibucket_transition(
    ledger: dict,
    buckets: Mapping[str, QuotaBucket],
    reservation_id: str,
    worker_id: str,
    operation: str,
    costs: Mapping[str, int],
) -> tuple[dict, dict]:
    """Reserve every required bucket or none; caller supplies serializable transaction."""
    _validate_contract(buckets)
    _validate_ledger(ledger, buckets)
    for name, value in (("reservation_id", reservation_id),
                        ("worker_id", worker_id), ("operation", operation)):
        if not isinstance(value, str) or not value or len(value) > 256:
            raise MultiBucketConfigurationError(f"invalid {name}")
    if reservation_id in ledger["reservations"]:
        raise MultiBucketQuotaError("duplicate reservation id")
    if not isinstance(costs, Mapping) or not costs or set(costs) - set(buckets):
        raise MultiBucketConfigurationError("costs must reference known quota buckets")
    normalized = {}
    for bucket_id, units in costs.items():
        if not isinstance(units, int) or isinstance(units, bool) or units <= 0:
            raise MultiBucketConfigurationError("each required bucket cost must be positive")
        normalized[bucket_id] = units
    # Validate all buckets before mutating any: all-or-nothing admission.
    for bucket_id, units in normalized.items():
        bucket = buckets[bucket_id]
        row = ledger["buckets"][bucket_id]
        available = (bucket.observed_remaining_units - bucket.safety_reserve_units
                     - bucket.recovery_reserve_units - row["reserved_units"]
                     - row["committed_units"] - row["uncertain_units"])
        if units > available:
            raise MultiBucketExhausted(f"{bucket_id} exhausted; WAITING_FOR_QUOTA")
    new = copy.deepcopy(ledger)
    for bucket_id, units in normalized.items():
        new["buckets"][bucket_id]["reserved_units"] += units
    record = {
        "reservation_id": reservation_id,
        "worker_id": worker_id,
        "operation": operation,
        "reserved_by_bucket": normalized,
        "status": "RESERVED",
    }
    new["reservations"][reservation_id] = record
    return new, record


def settle_multibucket_transition(
    ledger: dict, reservation_id: str, worker_id: str, actual_by_bucket: Mapping[str, int]
) -> tuple[dict, dict]:
    record = ledger.get("reservations", {}).get(reservation_id)
    if not record or record.get("worker_id") != worker_id or record.get("status") != "RESERVED":
        raise MultiBucketQuotaError("reservation owner/state mismatch")
    reserved = record["reserved_by_bucket"]
    if not isinstance(actual_by_bucket, Mapping) or set(actual_by_bucket) != set(reserved):
        raise MultiBucketConfigurationError("settlement must report every reserved bucket")
    actual = {}
    for bucket_id, units in actual_by_bucket.items():
        if not isinstance(units, int) or isinstance(units, bool) or units < 0:
            raise MultiBucketConfigurationError("actual usage must be non-negative integers")
        if units > reserved[bucket_id]:
            raise MultiBucketExhausted(f"{bucket_id} actual use exceeded reservation")
        actual[bucket_id] = units
    new = copy.deepcopy(ledger)
    target = new["reservations"][reservation_id]
    for bucket_id, units in actual.items():
        row = new["buckets"][bucket_id]
        row["reserved_units"] -= reserved[bucket_id]
        row["committed_units"] += units
    target["actual_by_bucket"] = actual
    target["status"] = "SETTLED"
    return new, target


def mark_multibucket_uncertain_transition(
    ledger: dict, reservation_id: str, worker_id: str
) -> tuple[dict, dict]:
    record = ledger.get("reservations", {}).get(reservation_id)
    if not record or record.get("worker_id") != worker_id or record.get("status") != "RESERVED":
        raise MultiBucketQuotaError("reservation owner/state mismatch")
    new = copy.deepcopy(ledger)
    target = new["reservations"][reservation_id]
    for bucket_id, units in target["reserved_by_bucket"].items():
        row = new["buckets"][bucket_id]
        row["reserved_units"] -= units
        row["uncertain_units"] += units
    target["status"] = "UNCERTAIN_BUDGET_RETAINED"
    return new, target
