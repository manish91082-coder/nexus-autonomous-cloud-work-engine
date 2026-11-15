import unittest

from scripts.github_api_quota_guard import ApiQuotaGuardError, GitHubApiQuotaGuard


class QuotaTelemetryTests(unittest.TestCase):
    def test_tracks_rate_limit_headers_and_request_counts(self):
        guard = GitHubApiQuotaGuard(request_ceiling=3, safety_reserve=100)
        guard.before_request()
        guard.observe({
            "X-RateLimit-Limit": "5000",
            "X-RateLimit-Remaining": "4200",
            "X-RateLimit-Reset": "1794762000",
            "Retry-After": "2",
        }, 200)
        snapshot = guard.snapshot()
        self.assertEqual(snapshot["requests_attempted"], 1)
        self.assertEqual(snapshot["rate_limit"], 5000)
        self.assertEqual(snapshot["rate_remaining"], 4200)
        self.assertEqual(snapshot["rate_reset_epoch"], 1794762000)
        self.assertEqual(snapshot["retry_after_seconds"], 2)
        self.assertEqual(snapshot["success_responses"], 1)

    def test_safety_reserve_blocks_before_next_request(self):
        guard = GitHubApiQuotaGuard(request_ceiling=10, safety_reserve=100)
        guard.before_request()
        guard.observe({"X-RateLimit-Remaining": "100"}, 200)
        with self.assertRaisesRegex(ApiQuotaGuardError, "safety reserve"):
            guard.before_request()
        self.assertEqual(guard.snapshot()["requests_attempted"], 1)

    def test_missing_rate_limit_headers_fail_closed(self):
        guard = GitHubApiQuotaGuard(request_ceiling=10, safety_reserve=10)
        guard.before_request()
        guard.observe({}, 200)
        with self.assertRaisesRegex(ApiQuotaGuardError, "telemetry unavailable"):
            guard.before_request()

    def test_hard_invocation_ceiling_counts_attempts(self):
        guard = GitHubApiQuotaGuard(request_ceiling=2, safety_reserve=0)
        for _ in range(2):
            guard.before_request()
            guard.observe({"X-RateLimit-Remaining": "4000"}, 200)
        with self.assertRaisesRegex(ApiQuotaGuardError, "request ceiling"):
            guard.before_request()
        self.assertEqual(guard.snapshot()["requests_attempted"], 2)

    def test_http_errors_are_recorded_without_refunding_attempt(self):
        guard = GitHubApiQuotaGuard(request_ceiling=3, safety_reserve=0)
        guard.before_request()
        guard.observe({"X-RateLimit-Remaining": "3000", "Retry-After": "30"}, 429)
        snapshot = guard.snapshot()
        self.assertEqual(snapshot["requests_attempted"], 1)
        self.assertEqual(snapshot["error_responses"], 1)
        self.assertEqual(snapshot["last_http_status"], 429)
        self.assertEqual(snapshot["retry_after_seconds"], 30)

    def test_transport_failure_counts_attempt_without_fabricating_headers(self):
        guard = GitHubApiQuotaGuard(request_ceiling=3, safety_reserve=0)
        guard.before_request()
        guard.observe_transport_failure()
        snapshot = guard.snapshot()
        self.assertEqual(snapshot["requests_attempted"], 1)
        self.assertEqual(snapshot["transport_failures"], 1)
        self.assertFalse(snapshot["headers_observed"])

    def test_invalid_ceiling_is_rejected(self):
        with self.assertRaises(ValueError):
            GitHubApiQuotaGuard(request_ceiling=0, safety_reserve=0)


if __name__ == "__main__":
    unittest.main()
