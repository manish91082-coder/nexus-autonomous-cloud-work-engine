"""Conservative shared quota admission policy for federation lock-store writes.

This controls only the controller-repository GitHub REST request budget.
It does not claim to measure account-wide Actions minutes or other repos'
GITHUB_TOKEN quotas. Unknown capacity fails closed.
"""
from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone

from scripts.federation_git_ref_store import (
    FederationLockError, LockBusy, _apply_event, _event_for, iso_utc, parse_utc,
    utc_now, validate_state,
)

REQUESTS_PER_RESERVATION = 10
GLOBAL_RESERVATIONS_PER_UTC_HOUR = 36
PROJECT_CAPS = {
    "P10CR": 12,
    "FLASHLOAN-RESEARCH": 8,
    "ZCIRA": 6,
    "DAILY1000": 4,
    "OTHER": 2,
}
EMERGENCY_PROJECT = "P10CR"
EMERGENCY_CAP_PER_HOUR = 4
RESERVATION_TTL_SECONDS = 900


def _hour_start(stamp):
    return stamp.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)


def _valid_project(project_id):
    return project_id if project_id in PROJECT_CAPS else "OTHER"


def reserve_quota_transition(state, project_id, reservation_id, worker_id,
                             *, emergency=False, now=None):
    """Reserve one conservative 10-request unit for the current UTC hour.

    Reservations are retained for the whole hour even after TTL expiry: an
    abandoned worker may already have spent requests. This deliberately
    sacrifices throughput to avoid oversubscription.
    """
    validate_state(state)
    for value in (project_id, reservation_id, worker_id):
        if not isinstance(value, str) or not value or len(value) > 256:
            raise FederationLockError("invalid quota reservation identity")
    stamp = now or utc_now()
    hour = iso_utc(_hour_start(stamp))
    project = _valid_project(project_id)
    if emergency and project != EMERGENCY_PROJECT:
        raise FederationLockError("emergency quota is restricted to P10CR recovery")
    reservations = state.get("quota_reservations")
    if not isinstance(reservations, list):
        raise FederationLockError("quota reservation ledger missing or malformed")
    if any(x.get("reservation_id") == reservation_id for x in reservations):
        raise LockBusy("duplicate quota reservation id")
    current = [x for x in reservations if x.get("window_start_utc") == hour]
    if len(current) >= GLOBAL_RESERVATIONS_PER_UTC_HOUR:
        raise LockBusy("global controller API quota exhausted; WAITING_FOR_QUOTA")
    project_count = sum(1 for x in current if x.get("project_id") == project and x.get("emergency") is False)
    cap = PROJECT_CAPS[project]
    if not emergency and project_count >= cap:
        raise LockBusy("project fairness allocation exhausted; WAITING_FOR_QUOTA")
    emergency_count = sum(1 for x in current if x.get("emergency") is True)
    if emergency:
        if emergency_count >= EMERGENCY_CAP_PER_HOUR:
            raise LockBusy("reserved emergency quota exhausted; WAITING_FOR_QUOTA")
    elif len(current) - emergency_count >= GLOBAL_RESERVATIONS_PER_UTC_HOUR - EMERGENCY_CAP_PER_HOUR:
        raise LockBusy("emergency reserve protected; WAITING_FOR_QUOTA")

    new_state = copy.deepcopy(state)
    record = {
        "reservation_id": reservation_id,
        "project_id": project,
        "worker_id": worker_id,
        "window_start_utc": hour,
        "reserved_requests": REQUESTS_PER_RESERVATION,
        "emergency": bool(emergency),
        "status": "RESERVED",
        "issued_at_utc": iso_utc(stamp),
        "expires_at_utc": iso_utc(stamp + timedelta(seconds=RESERVATION_TTL_SECONDS)),
    }
    new_state["quota_reservations"].append(record)
    event = _event_for(
        new_state, "QUOTA_RESERVED", worker_id,
        {"reservation_id": reservation_id, "project_id": project,
         "window_start_utc": hour, "reserved_requests": REQUESTS_PER_RESERVATION,
         "emergency": bool(emergency)},
        stamp, f"quota/{project}", None,
    )
    _apply_event(new_state, event)
    validate_state(new_state)
    return new_state, record, event


def release_quota_transition(state, reservation_id, worker_id, *, now=None):
    """Mark a reservation released, but do not refund its hour's budget."""
    validate_state(state)
    stamp = now or utc_now()
    new_state = copy.deepcopy(state)
    record = next((x for x in new_state.get("quota_reservations", [])
                   if x.get("reservation_id") == reservation_id), None)
    if not record or record.get("worker_id") != worker_id:
        raise FederationLockError("quota reservation owner mismatch")
    if record.get("status") != "RESERVED":
        raise FederationLockError("quota reservation is not active")
    record["status"] = "RELEASED_BUDGET_RETAINED"
    record["released_at_utc"] = iso_utc(stamp)
    event = _event_for(
        new_state, "QUOTA_RELEASED_BUDGET_RETAINED", worker_id,
        {"reservation_id": reservation_id,
         "reserved_requests": record["reserved_requests"]},
        stamp, f"quota/{record['project_id']}", None,
    )
    _apply_event(new_state, event)
    validate_state(new_state)
    return new_state, record, event


class GitHubQuotaArbiter:
    """Quota reservations persisted atomically through GitHubGitRefStore."""

    def __init__(self, store):
        self.store = store

    def reserve(self, project_id, reservation_id, worker_id, *, emergency=False, now=None):
        def transition(state):
            return reserve_quota_transition(
                state, project_id, reservation_id, worker_id,
                emergency=emergency, now=now,
            )
        return self.store._mutate(transition)

    def release(self, reservation_id, worker_id, *, now=None):
        def transition(state):
            return release_quota_transition(state, reservation_id, worker_id, now=now)
        return self.store._mutate(transition)
