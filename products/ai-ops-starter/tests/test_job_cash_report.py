import importlib.util, pathlib, unittest
from datetime import date
ROOT=pathlib.Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("job_cash_report",ROOT/"job_cash_report.py")
MOD=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(MOD)
class JobCashTests(unittest.TestCase):
 def test_overdue_partial_payment_and_followup(self):
  rows=[{"job_id":"J1","customer":"A","job_status":"completed","agreed_amount":"100","currency":"INR","invoice_id":"I1","invoice_amount":"100","received_amount":"40","invoice_due_date":"2026-11-01","next_follow_up":"2026-11-10","owner":"M"}]
  out=MOD.build_report(rows,date(2026,11,11))
  self.assertIn("60.00 INR outstanding",out); self.assertIn("FOLLOW-UP DUE",out)
 def test_duplicate_job_ids_rejected(self):
  import tempfile,csv
  row={k:"" for k in MOD.REQUIRED}; row.update(job_id="J1",customer="A")
  with tempfile.NamedTemporaryFile("w+",newline="",encoding="utf-8",delete=False) as f:
   w=csv.DictWriter(f,fieldnames=sorted(MOD.REQUIRED)); w.writeheader(); w.writerow(row); w.writerow(row); name=f.name
  with self.assertRaises(ValueError): MOD.load_jobs(name)
 def test_received_exceeding_invoice_rejected(self):
  row={k:"" for k in MOD.REQUIRED}; row.update(job_id="J1",customer="A",invoice_amount="10",received_amount="11")
  with self.assertRaises(ValueError): MOD.build_report([row],date(2026,11,11))
 def test_no_next_action_flagged(self):
  row={k:"" for k in MOD.REQUIRED}; row.update(job_id="J2",customer="B",job_status="active",invoice_amount="0",received_amount="0")
  self.assertIn("NO NEXT ACTION",MOD.build_report([row],date(2026,11,11)))
if __name__=="__main__": unittest.main()
