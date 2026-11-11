import importlib.util
import pathlib
import unittest
from datetime import date
ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ops_report", ROOT / "ops_report.py")
OPS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(OPS)
class OpsReportTests(unittest.TestCase):
    def test_due_followups_and_overdue_invoices(self):
        leads = [{"lead_name":"A","company":"X","status":"qualified","next_follow_up":"2026-11-10","owner":"M"}]
        invoices = [{"invoice_id":"I-1","client":"C","amount":"100","currency":"INR","due_date":"2026-11-09","status":"sent"}]
        report = OPS.build_report(leads, invoices, date(2026,11,11))
        self.assertIn("Follow-ups due today or earlier: 1", report)
        self.assertIn("Overdue invoices: 1", report)
        self.assertIn("100.00 INR", report)
    def test_paid_invoice_excluded(self):
        report = OPS.build_report([], [{"invoice_id":"I","client":"C","amount":"10","currency":"INR","due_date":"2026-11-01","status":"paid"}], date(2026,11,11))
        self.assertIn("Open invoices: 0", report)
    def test_bad_date_fails_loudly(self):
        with self.assertRaises(ValueError):
            OPS.build_report([{"lead_name":"A","status":"open","next_follow_up":"11/12/2026"}], [], date(2026,11,11))
    def test_negative_invoice_amount_rejected(self):
        with self.assertRaises(ValueError):
            OPS.build_report([], [{"invoice_id":"I","client":"C","amount":"-1","currency":"INR","due_date":"2026-11-01","status":"sent"}], date(2026,11,11))
if __name__ == "__main__":
    unittest.main()
