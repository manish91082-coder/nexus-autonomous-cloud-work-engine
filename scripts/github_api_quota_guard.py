"""Fail-closed per-invocation GitHub REST quota telemetry and request ceiling."""
from __future__ import annotations

import os
from dataclasses import dataclass, asdict


class ApiQuotaGuardError(RuntimeError):
    """Raised before an API call when the local quota safety envelope is exhausted."""


def _positive_int(value, name, minimum=1, maximum=10000):
    if not isinstance(value, int) or isinstance(value, bool) or not minimum <= value <= maximum:
        raise ValueError(f"{name} must be an integer in {minimum}..{maximum}")
    return value


@dataclass
class GitHubApiQuotaGuard:
    """Counts attempted REST calls and enforces a conservative invocation budget.

    Header telemetry is process-local and intentionally not persisted to GitHub,
    avoiding recursive API writes just to record API usage.
    """
    request_ceiling: int = 48
    safety_reserve: int = 100

    def __post_init__(self):
        self.request_ceiling = _positive_int(self.request_ceiling, "request_ceiling", 1, 500)
        self.safety_reserve = _positive_int(self.safety_reserve, "safety_reserve", 0, 5000)
        self.requests_attempted = 0
        self.responses_observed = 0
        self.success_responses = 0
        self.error_responses = 0
        self.transport_failures = 0
        self.rate_limit = None
        self.rate_remaining = None
        self.rate_reset_epoch = None
        self.retry_after_seconds = None
        self.headers_observed = False
        self.telemetry_missing = False
        self.last_http_status = None

    @classmethod
    def from_environment(cls):
        ceiling = int(os.getenv("NEXUS_GITHUB_API_REQUEST_CEILING", "48"))
        reserve = int(os.getenv("NEXUS_GITHUB_API_SAFETY_RESERVE", "100"))
        return cls(request_ceiling=ceiling, safety_reserve=reserve)

    def before_request(self):
        if self.requests_attempted >= self.request_ceiling:
            raise ApiQuotaGuardError("per-invocation GitHub API request ceiling reached; WAITING_FOR_QUOTA")
        if self.headers_observed:
            if self.telemetry_missing or self.rate_remaining is None:
                raise ApiQuotaGuardError("GitHub rate-limit telemetry unavailable; failing closed")
            if self.rate_remaining <= self.safety_reserve:
                raise ApiQuotaGuardError("GitHub API safety reserve reached; WAITING_FOR_QUOTA")
        self.requests_attempted += 1

    def observe(self, headers, status):
        self.responses_observed += 1
        self.last_http_status = int(status)
        if 200 <= int(status) < 400:
            self.success_responses += 1
        else:
            self.error_responses += 1
        if headers is None:
            self.headers_observed = True
            self.telemetry_missing = True
            self.rate_remaining = None
            return
        getter = getattr(headers, "get", None)
        if getter is None:
            self.headers_observed = True
            self.telemetry_missing = True
            self.rate_remaining = None
            return
        def read_int(key):
            raw = getter(key)
            try:
                return int(raw) if raw is not None else None
            except (TypeError, ValueError):
                return None
        self.headers_observed = True
        self.rate_limit = read_int("X-RateLimit-Limit")
        self.rate_remaining = read_int("X-RateLimit-Remaining")
        self.rate_reset_epoch = read_int("X-RateLimit-Reset")
        self.retry_after_seconds = read_int("Retry-After")
        self.telemetry_missing = self.rate_remaining is None

    def observe_transport_failure(self):
        self.transport_failures += 1

    def snapshot(self):
        return {
            "requests_attempted": self.requests_attempted,
            "responses_observed": self.responses_observed,
            "success_responses": self.success_responses,
            "error_responses": self.error_responses,
            "transport_failures": self.transport_failures,
            "request_ceiling": self.request_ceiling,
            "safety_reserve": self.safety_reserve,
            "rate_limit": self.rate_limit,
            "rate_remaining": self.rate_remaining,
            "rate_reset_epoch": self.rate_reset_epoch,
            "retry_after_seconds": self.retry_after_seconds,
            "headers_observed": self.headers_observed,
            "telemetry_missing": self.telemetry_missing,
            "last_http_status": self.last_http_status,
        }
