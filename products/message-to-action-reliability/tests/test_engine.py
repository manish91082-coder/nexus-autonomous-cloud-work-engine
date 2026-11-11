import json, tempfile, unittest
from pathlib import Path
from products.message_to_action_reliability.engine import classify, process_events, write_outputs

class EngineTests(unittest.TestCase):
    def test_classification(self):
        self.assertEqual(classify("charged twice"),"billing_or_complaint")
        self.assertEqual(classify("urgent, broken today"),"urgent_support")
        self.assertEqual(classify("please send pricing"),"sales_lead")
    def test_duplicate_suppression(self):
        e={"event_id":"x","text":"hello"}
        rows,errors=process_events([e,e])
        self.assertEqual([r["status"] for r in rows],["awaiting_human_approval","duplicate_skipped"])
        self.assertEqual(errors,[])
    def test_retry_recovers_transient_failure(self):
        rows,errors=process_events([{"event_id":"x","text":"charged twice"}],{"x"})
        self.assertEqual(rows[0]["status"],"awaiting_human_approval")
        self.assertEqual(rows[0]["attempts"],2)
        self.assertEqual(errors[0]["error"],"simulated_transient_failure")
    def test_missing_id_is_logged(self):
        rows,errors=process_events([{"text":"no id"}])
        self.assertEqual(rows,[])
        self.assertEqual(errors[0]["error"],"missing_event_id")
    def test_outputs_created(self):
        with tempfile.TemporaryDirectory() as d:
            write_outputs([{"event_id":"x","status":"awaiting_human_approval","category":"sales_lead","priority":"normal","approval_required":"yes","summary":"hello","attempts":1,"source":"test"}],[],d)
            self.assertTrue((Path(d)/"approval_queue.csv").exists())
            self.assertTrue((Path(d)/"error_log.csv").exists())
            self.assertTrue((Path(d)/"report.md").exists())

if __name__=="__main__": unittest.main()
