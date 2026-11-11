import importlib.util, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("travel_engine",ROOT/"engine.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class TravelDemoTests(unittest.TestCase):
 def setUp(self):
  self.packages=[{"package_id":"G1","name":"Goa","destination":"Goa","price_per_person_inr":"18000","duration_days":"4"}]
  self.lead={"lead_id":"T1","destination":"Goa","budget_inr":"40000","trip_days":"5","travellers":"2","consent_to_contact":"yes","status":"new"}
 def test_qualified_and_package_match(self):
  self.assertEqual(m.qualify(self.lead),"qualified")
  self.assertEqual(m.match_packages(self.lead,self.packages)[0]["package_id"],"G1")
 def test_consent_gate(self):
  x={**self.lead,"consent_to_contact":"no"}
  self.assertEqual(m.qualify(x),"consent_required")
 def test_budget_and_duration_gate(self):
  x={**self.lead,"budget_inr":"1000","trip_days":"2"}
  self.assertEqual(m.match_packages(x,self.packages),[])
 def test_quote_is_draft_only(self):
  q=m.quote_draft(self.lead,m.match_packages(self.lead,self.packages)[0])
  self.assertEqual(q["indicative_total_inr"],36000)
  self.assertEqual(q["status"],"draft_pending_human_approval")
 def test_booking_state_machine(self):
  self.assertEqual(m.transition_booking("new","quote_approved"),"quoted")
  with self.assertRaises(ValueError): m.transition_booking("new","booking_confirmed")
 def test_followup_stop_conditions(self):
  self.assertTrue(m.stop_followup("new",opted_out=True))
  self.assertTrue(m.stop_followup("booked"))
  self.assertFalse(m.stop_followup("new"))
 def test_no_external_actions(self):
  r=m.build_demo([self.lead],self.packages,["A"])
  self.assertFalse(r["controls"]["messages_sent"])
  self.assertFalse(r["controls"]["booking_created"])
  self.assertTrue(r["controls"]["human_approval_required"])
if __name__=="__main__": unittest.main()
