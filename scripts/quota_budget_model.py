"""Provider-neutral quota admission model for a separately hosted transactional control plane.

This module is a policy/model layer only. It deliberately refuses to treat a
GitHub-ref write as a safe global quota database. The transactional store must
be independent of the provider quota being budgeted (for example, a future
Durable Object), and its atomic transaction must serialize all workers.
"""
from __future__ import annotations

import copy
from dataclasses import dataclass


class QuotaAdmissionError(RuntimeError):
    pass


class QuotaExhausted(QuotaAdmissionError):
    pass


class QuotaConfigurationError(QuotaAdmissionError):
    pass


@dataclass(frozen=True)
class QuotaWindow:
    provider: str
    credential_scope: str
    window_id: str
    limit_units: int
    observed_remaining_units: int
    safety_reserve_units: int
    recovery_reserve_units: int
    control_plane_provider: str

    def validate(self):
        for name, value in (
            ("provider", self.provider),
            ("credential_scope", self.credential_scope),
            ("window_id", self.window_id),
            ("control_plane_provider", self.control_plane_provider),
        ):
            if not isinstance(value, str) or not value or len(value) > 256:
                raise QuotaConfigurationError(f"invalid {name}")
        if self.provider == self.control_plane_provider:
            raise QuotaConfigurationError(
                "quota ledger must not consume the same provider budget it arbitrates"
            )
        for name, value in (
            ("limit_units", self.limit_units),
            ("observed_remaining_units", self.observed_remaining_units),
            ("safety_reserve_units", self.safety_reserve_units),
            ("recovery_reserve_units", self.recovery_reserve_units),
        ):
            if not isinstance(value, int) or isinstance(value, bool) or value < 0:
                raise QuotaConfigurationError(f"{name} must be a non-negative integer")
        if self.limit_units == 0 or self.observed_remaining_units > self.limit_units:
            raise QuotaConfigurationError("invalid provider quota telemetry")
        if self.safety_reserve_units + self.recovery_reserve_units >= self.observed_remaining_units:
            raise QuotaExhausted("safety and recovery reserves consume observed capacity")
        return True


def empty_ledger(window: QuotaWindow):
    window.validate()
    return {
        "provider": window.provider,
        "credential_scope": window.credential_scope,
        "window_id": window.window_id,
        "reserved_units": 0,
        "committed_units": 0,
        "uncertain_units": 0,
        "reservations": {},
    }


def reserve_transition(ledger, window: QuotaWindow, reservation_id, project_id,
                       worker_id, work_units, admission_overhead_units):
    """Reserve worst-case work plus admission overhead atomically.

    The caller MUST execute this transition inside a serializable transaction
    shared by every worker for this credential_scope/window_id.
    """
    window.validate()
    if not isinstance(ledger, dict) or any(
        ledger.get(k) != v for k, v in (
            ("provider", window.provider),
            ("credential_scope", window.credential_scope),
            ("window_id", window.window_id),
        )
    ):
        raise QuotaConfigurationError("ledger/window identity mismatch")
    for name, value in (("reservation_id", reservation_id),
                        ("project_id", project_id), ("worker_id", worker_id)):
        if not isinstance(value, str) or not value or len(value) > 256:
            raise QuotaConfigurationError(f"invalid {name}")
    for name, value in (("work_units", work_units),
                        ("admission_overhead_units", admission_overhead_units)):
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            raise QuotaConfigurationError(f"{name} must be a non-negative integer")
    if work_units == 0:
        raise QuotaConfigurationError("work_units must be positive")
    if reservation_id in ledger["reservations"]:
        raise QuotaAdmissionError("duplicate reservation id")
    total = work_units + admission_overhead_units
    available = (
        window.observed_remaining_units
        - window.safety_reserve_units
        - window.recovery_reserve_units
        - ledger["reserved_units"]
        - ledger["committed_units"]
        - ledger["uncertain_units"]
    )
    if total > available:
        raise QuotaExhausted("global provider budget exhausted; WAITING_FOR_QUOTA")
    new = copy.deepcopy(ledger)
    record = {
        "reservation_id": reservation_id,
        "project_id": project_id,
        "worker_id": worker_id,
        "work_units": work_units,
        "admission_overhead_units": admission_overhead_units,
        "reserved_units": total,
        "status": "RESERVED",
    }
    new["reservations"][reservation_id] = record
    new["reserved_units"] += total
    return new, record


def settle_transition(ledger, reservation_id, worker_id, actual_units):
    """Settle measured use; unknown outcomes must use mark_uncertain_transition."""
    if not isinstance(ledger, dict):
        raise QuotaConfigurationError("malformed ledger")
    record = ledger.get("reservations", {}).get(reservation_id)
    if not record or record.get("worker_id") != worker_id or record.get("status") != "RESERVED":
        raise QuotaAdmissionError("reservation owner/state mismatch")
    if not isinstance(actual_units, int) or isinstance(actual_units, bool) or actual_units < 0:
        raise QuotaConfigurationError("actual_units must be a non-negative integer")
    if actual_units > record["reserved_units"]:
        raise QuotaExhausted("actual use exceeded reservation; freeze further admission")
    new = copy.deepcopy(ledger)
    target = new["reservations"][reservation_id]
    new["reserved_units"] -= target["reserved_units"]
    new["committed_units"] += actual_units
    target["actual_units"] = actual_units
    target["status"] = "SETTLED"
    return new, target


def mark_uncertain_transition(ledger, reservation_id, worker_id):
    """Retain the entire reservation when transport outcome/usage is unknown."""
    record = ledger.get("reservations", {}).get(reservation_id)
    if not record or record.get("worker_id") != worker_id or record.get("status") != "RESERVED":
        raise QuotaAdmissionError("reservation owner/state mismatch")
    new = copy.deepcopy(ledger)
    target = new["reservations"][reservation_id]
    new["reserved_units"] -= target["reserved_units"]
    new["uncertain_units"] += target["reserved_units"]
    target["status"] = "UNCERTAIN_BUDGET_RETAINED"
    return new, target


def remaining_admissible_units(ledger, window: QuotaWindow):
    window.validate()
    if ledger.get("provider") != window.provider or ledger.get("credential_scope") != window.credential_scope or ledger.get("window_id") != window.window_id:
        raise QuotaConfigurationError("ledger/window identity mismatch")
    return max(0, window.observed_remaining_units
               - window.safety_reserve_units - window.recovery_reserve_units
               - ledger["reserved_units"] - ledger["committed_units"]
               - ledger["uncertain_units"])
