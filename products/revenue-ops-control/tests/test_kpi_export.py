import importlib.util
import unittest
from datetime import date
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("kpi_export",ROOT/"kpi_export.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class KpiExportTests(unittest.TestCase):
    def test_kpis_and_control_invariants(self):
        leads=[{"lead_id":"1","email":"a@x.test","phone":"","status":"new","next_follow_up":"2026-11-10","owner":"A"}]
        events=[{"event_id":"m1","source":"web","text":"urgent pricing request"}]
        invoices=[{"invoice_id":"i1","amount":"100","currency":"INR","due_date":"2026-11-01","status":"sent"}]
        data=module.build_payload(leads,events,invoices,date(2026,11,11))
        self.assertEqual(data["kpis"]["followups_due"],1)
        self.assertEqual(data["kpis"]["overdue_invoices"],1)
        self.assertFalse(data["kpis"]["invoice_amount_verified"])
        self.assertTrue(data["controls"]["human_approval_required"])
        self.assertFalse(data["controls"]["messages_sent"])
        self.assertFalse(data["controls"]["payments_verified"])

    def test_empty_payload_is_valid_shape(self):
        data=module.build_payload([],[],[],date(2026,11,11))
        self.assertEqual(data["kpis"]["leads_received"],0)
        self.assertEqual(data["exceptions"],[])


if __name__=="__main__":
    unittest.main()
