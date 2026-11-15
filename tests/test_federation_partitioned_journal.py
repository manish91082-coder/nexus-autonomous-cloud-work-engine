import base64
import json
import unittest

from scripts.federation_git_ref_store import (
    EVENT_CHUNK_SIZE, FederationLockError, GitHubGitRefStore,
    _apply_event, _event_for, append_event_to_chunk, event_partition_path,
)


def make_event(state, sequence_time, kind="TEST"):
    event = _event_for(state, kind, "tester", {"n": state["event_sequence"] + 1},
                       sequence_time, "test/scope", None)
    _apply_event(state, event)
    return event


class PartitionedJournalTests(unittest.TestCase):
    def test_partition_path_is_month_and_sequence_bounded(self):
        event = {"sequence": 256, "timestamp_utc": "2026-11-30T23:59:59Z"}
        self.assertEqual(
            event_partition_path("federation/locks/events", event),
            "federation/locks/events/v2/2026/11/chunk-00000000.json",
        )
        event["sequence"] = 257
        self.assertEqual(
            event_partition_path("federation/locks/events", event),
            "federation/locks/events/v2/2026/11/chunk-00000001.json",
        )

    def test_append_chunk_enforces_fixed_size_and_order(self):
        events = [
            {"sequence": 15, "timestamp_utc": "2026-11-15T06:00:00Z"},
            {"sequence": 16, "timestamp_utc": "2026-11-15T06:01:00Z"},
        ]
        self.assertEqual(len(append_event_to_chunk(events[:1], events[1])), 2)
        with self.assertRaises(FederationLockError):
            append_event_to_chunk(events, events[0])
        full = [{"sequence": i, "timestamp_utc": "2026-11-15T06:00:00Z"}
                for i in range(1, EVENT_CHUNK_SIZE + 1)]
        with self.assertRaises(FederationLockError):
            append_event_to_chunk(full, {"sequence": 257, "timestamp_utc": "2026-11-15T06:00:00Z"})

    def test_month_boundary_uses_separate_partition_even_inside_same_sequence_chunk(self):
        a = {"sequence": 20, "timestamp_utc": "2026-11-30T23:59:59Z"}
        b = {"sequence": 21, "timestamp_utc": "2026-12-01T00:00:00Z"}
        self.assertNotEqual(
            event_partition_path("events", a),
            event_partition_path("events", b),
        )
        self.assertEqual(len(append_event_to_chunk([], b)), 1)

    def test_verifier_reads_legacy_and_partitioned_events_in_one_chain(self):
        from datetime import datetime, timezone
        state = {
            "schema_version": "1.0", "federation_id": "TEST",
            "generation": 0, "next_fencing_token": 0,
            "max_active_leases": 8, "lease_seconds": 900, "heartbeat_seconds": 300,
            "leases": [], "quota_reservations": [], "idempotency_records": [],
            "event_sequence": 0, "last_event_hash": "0" * 64,
            "updated_at_utc": "2026-11-15T00:00:00Z",
        }
        times = [
            datetime(2026, 11, 15, 6, 0, tzinfo=timezone.utc),
            datetime(2026, 11, 15, 6, 1, tzinfo=timezone.utc),
            datetime(2026, 11, 15, 6, 2, tzinfo=timezone.utc),
        ]
        events = [make_event(state, stamp) for stamp in times]
        legacy = events[0]
        chunk = events[1:]
        legacy_path = "federation/locks/events/000000000001.json"
        chunk_path = "federation/locks/events/v2/2026/11/chunk-00000000.json"
        docs = {
            legacy_path: legacy,
            chunk_path: chunk,
        }
        dirs = {
            "federation/locks/events": [
                {"type": "file", "name": "000000000001.json", "path": legacy_path},
                {"type": "dir", "name": "v2", "path": "federation/locks/events/v2"},
            ],
            "federation/locks/events/v2": [
                {"type": "dir", "name": "2026", "path": "federation/locks/events/v2/2026"}
            ],
            "federation/locks/events/v2/2026": [
                {"type": "dir", "name": "11", "path": "federation/locks/events/v2/2026/11"}
            ],
            "federation/locks/events/v2/2026/11": [
                {"type": "file", "name": "chunk-00000000.json", "path": chunk_path}
            ],
        }
        store = GitHubGitRefStore.__new__(GitHubGitRefStore)
        store._read_snapshot = lambda: ("a" * 40, "b" * 40, state)

        def fake_request(method, path, payload=None):
            clean = path.split("?ref=")[0]
            prefix = "/repos/test/repo/contents/"
            target = clean[len(prefix):]
            if target in dirs:
                return dirs[target]
            if target in docs:
                value = docs[target]
                raw = json.dumps(value).encode("utf-8")
                return {"content": base64.b64encode(raw).decode("ascii")}
            raise AssertionError("unexpected API path: " + path)

        store._request = fake_request
        result = store.verify_journal()
        self.assertTrue(result["verified"])
        self.assertEqual(result["event_count"], 3)
        self.assertEqual(result["legacy_event_count"], 1)
        self.assertEqual(result["last_event_hash"], state["last_event_hash"])

    def test_corrupt_chunk_is_rejected(self):
        with self.assertRaises(FederationLockError):
            append_event_to_chunk({"not": "a list"},
                                  {"sequence": 1, "timestamp_utc": "2026-11-15T06:00:00Z"})


if __name__ == "__main__":
    unittest.main()
