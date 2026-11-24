import base64
import json
import unittest
from pathlib import Path

from scripts.p10cr_summary_schema import (
    CANONICAL_REPOSITORY,
    PROVIDER_NAME,
    TASK_TITLE,
    VERIFICATION_NOTE,
    WORKFLOW_NAME,
    WORKFLOW_PATH,
    SummaryValidationError,
    build_summary,
    decode_summary_content,
    load_json_object,
    serialize_summary,
    validate_summary,
    validate_worker_report,
)


def valid_report():
    return {
        "schema_version": "1.0",
        "timestamp_utc": "2026-11-23T12:00:00+00:00",
        "status": "DRAFT_READY_FOR_EVIDENCE_REVIEW",
        "execution_mode": "BOUNDED_AI_DRAFT_ONLY",
        "model_output_is_untrusted": True,
        "no_code_execution": True,
        "no_publication_or_money_movement": True,
        "task_id": "P59-003",
        "task_title": TASK_TITLE,
        "provider": PROVIDER_NAME,
        "model": "@cf/meta/llama-3.1-8b-instruct",
        "daily_calls_used": 1,
        "daily_call_cap": 6,
        "output": "Unverified proposal. Verify all claims independently.",
        "verification_note": VERIFICATION_NOTE,
    }


def valid_source():
    return {
        "repository": CANONICAL_REPOSITORY,
        "workflow": WORKFLOW_NAME,
        "workflow_path": WORKFLOW_PATH,
        "event": "schedule",
        "branch": "master",
        "run_id": 12345,
        "run_attempt": 1,
        "head_sha": "a" * 40,
    }


class WorkerArtifactSchemaTests(unittest.TestCase):
    def test_accepts_exact_worker_artifact_contract(self):
        self.assertEqual(validate_worker_report(valid_report()), valid_report()["output"].encode("utf-8"))

    def test_rejects_unexpected_worker_artifact_field(self):
        report = valid_report()
        report["confidence"] = 0.99
        with self.assertRaises(SummaryValidationError):
            validate_worker_report(report)

    def test_rejects_wrong_task_title(self):
        report = valid_report()
        report["task_title"] = "A different task"
        with self.assertRaises(SummaryValidationError):
            validate_worker_report(report)

    def test_rejects_unapproved_provider(self):
        report = valid_report()
        report["provider"] = "Unknown Provider"
        with self.assertRaises(SummaryValidationError):
            validate_worker_report(report)

    def test_rejects_non_utc_or_naive_timestamp(self):
        for value in ("2026-11-23T12:00:00", "2026-11-23T17:30:00+05:30", "not-a-date"):
            report = valid_report()
            report["timestamp_utc"] = value
            with self.subTest(value=value), self.assertRaises(SummaryValidationError):
                validate_worker_report(report)

    def test_rejects_boolean_usage_counter(self):
        report = valid_report()
        report["daily_calls_used"] = True
        with self.assertRaises(SummaryValidationError):
            validate_worker_report(report)

    def test_rejects_duplicate_json_keys(self):
        with self.assertRaises(SummaryValidationError):
            load_json_object(b'{"status":"DRAFT_READY_FOR_EVIDENCE_REVIEW","status":"WAITING"}', "fixture")


class PublishedSummarySchemaTests(unittest.TestCase):
    def setUp(self):
        self.report = valid_report()
        self.source = valid_source()
        self.summary = build_summary(self.source, self.report)

    def test_summary_is_strict_and_excludes_raw_model_output(self):
        validate_summary(self.summary, expected_source=self.source)
        encoded = serialize_summary(self.summary)
        decoded = encoded.decode("utf-8")
        self.assertNotIn(self.report["output"], decoded)
        self.assertIn(self.summary["model_output"]["sha256"], decoded)
        self.assertFalse(self.summary["model_output"]["raw_content_included"])

    def test_rejects_extra_top_level_or_nested_fields(self):
        extra = dict(self.summary)
        extra["notes"] = "not allowed"
        with self.assertRaises(SummaryValidationError):
            validate_summary(extra)
        extra = json.loads(json.dumps(self.summary))
        extra["provider"]["account_id"] = "not-allowed"
        with self.assertRaises(SummaryValidationError):
            validate_summary(extra)

    def test_rejects_source_provenance_mismatch(self):
        wrong = dict(self.source)
        wrong["head_sha"] = "b" * 40
        with self.assertRaises(SummaryValidationError):
            validate_summary(self.summary, expected_source=wrong)

    def test_rejects_boolean_run_id_and_raw_output_flag(self):
        invalid = json.loads(json.dumps(self.summary))
        invalid["source"]["run_id"] = True
        with self.assertRaises(SummaryValidationError):
            validate_summary(invalid)
        invalid = json.loads(json.dumps(self.summary))
        invalid["model_output"]["raw_content_included"] = True
        with self.assertRaises(SummaryValidationError):
            validate_summary(invalid)

    def test_rejects_automatic_acceptance_or_completion(self):
        invalid = json.loads(json.dumps(self.summary))
        invalid["review"]["automatic_acceptance"] = True
        with self.assertRaises(SummaryValidationError):
            validate_summary(invalid)
        invalid = json.loads(json.dumps(self.summary))
        invalid["review"]["automatic_task_completion"] = True
        with self.assertRaises(SummaryValidationError):
            validate_summary(invalid)

    def test_content_decoder_binds_summary_to_file_run_identity(self):
        encoded = base64.b64encode(serialize_summary(self.summary)).decode("ascii")
        decoded, raw = decode_summary_content(encoded, 12345, 1)
        self.assertEqual(decoded, self.summary)
        self.assertTrue(raw.endswith(b"\n"))
        with self.assertRaises(SummaryValidationError):
            decode_summary_content(encoded, 12346, 1)

    def test_content_decoder_rejects_noncanonical_json(self):
        compact = json.dumps(self.summary, separators=(",", ":")).encode("utf-8")
        encoded = base64.b64encode(compact).decode("ascii")
        with self.assertRaises(SummaryValidationError):
            decode_summary_content(encoded, 12345, 1)

    def test_content_decoder_rejects_duplicate_keys(self):
        raw = b'{"schema_version":"1.0","schema_version":"1.0"}'
        encoded = base64.b64encode(raw).decode("ascii")
        with self.assertRaises(SummaryValidationError):
            decode_summary_content(encoded, 12345, 1)

    def test_committed_json_schema_is_closed(self):
        schema_path = Path(__file__).resolve().parents[1] / "schemas" / "p10cr-worker-draft-summary-v1.schema.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        self.assertEqual(schema["$schema"], "https://json-schema.org/draft/2020-12/schema")
        self.assertIs(schema["additionalProperties"], False)
        for key in ("source", "task", "provider", "usage", "model_output", "review", "safety"):
            self.assertIs(schema["properties"][key]["additionalProperties"], False)


if __name__ == "__main__":
    unittest.main()
