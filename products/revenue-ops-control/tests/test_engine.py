import importlib.util
import tempfile
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("revenue_ops_engine", ROOT / "engine.py")
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)


class RevenueOpsTests(unittest.TestCase):
    def test_message_classification(self):
        self.assertEqual(engine.classify_message("need pricing"), ("sales_lead", "normal"))
        self.assertEqual(engine.classify_message("urgent broken today"), ("urgent_support", "high"))
        self.assertEqual(engine.classify_message("refund charged twice"), ("billing_or_complaint", "high"))

    def test_duplicate_leads(self):
        leads = [
            {"lead_id":"1","email":"A@EXAMPLE.TEST","phone":"","status":"new","next_follow_up":"","owner":"A"},
            {"lead_id":"2","email":" a@example.test ","phone":"","status":"new","next_follow_up":"","owner":"B"},
        ]
        duplicates, due = engine.analyze_leads(leads, date(2026, 11, 11))
        self.assertEqual(len(duplicates), 1)
        self.assertEqual(due, [])

    def test_due_follow_up(self):
        leads = [{"lead_id":"1","email":"a@x.test","phone":"","status":"qualified","next_follow_up":"2026-11-11","owner":"A"}]
        _, due = engine.analyze_leads(leads, date(2026, 11, 11))
        self.assertEqual(len(due), 1)

    def test_message_deduplication(self):
        event = {"event_id":"x","source":"web","text":"need a quote"}
        queue, duplicates = engine.analyze_messages([event, event])
        self.assertEqual(len(queue), 1)
        self.assertEqual(duplicates, ["x"])

    def test_invoice_totals_and_overdue(self):
        rows = [
            {"invoice_id":"a","amount":"100","currency":"INR","due_date":"2026-11-10","status":"sent"},
            {"invoice_id":"b","amount":"50","currency":"INR","due_date":"2026-11-20","status":"sent"},
            {"invoice_id":"c","amount":"20","currency":"INR","due_date":"2026-11-01","status":"paid"},
        ]
        opened, overdue, total = engine.analyze_invoices(rows, date(2026, 11, 11))
        self.assertEqual(len(opened), 2)
        self.assertEqual(len(overdue), 1)
        self.assertEqual(total, 150.0)

    def test_negative_invoice_rejected(self):
        rows = [{"invoice_id":"a","amount":"-1","currency":"INR","due_date":"2026-11-10","status":"sent"}]
        with self.assertRaises(ValueError):
            engine.analyze_invoices(rows, date(2026, 11, 11))

    def test_report_safety_language(self):
        report = engine.build_report([], [], [], date(2026, 11, 11))
        self.assertIn("nothing was sent", report)
        self.assertIn("not verified receivables", report)


if __name__ == "__main__":
    unittest.main()
