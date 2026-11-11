#!/usr/bin/env python3
"""Synthetic travel sales workflow demo. No messaging, booking or payment integrations."""
import argparse, csv, json
from pathlib import Path

def load_csv(path):
    with Path(path).open(newline="",encoding="utf-8-sig") as f: return list(csv.DictReader(f))

def qualify(lead):
    budget=float(lead.get("budget_inr") or 0)
    days=int(lead.get("trip_days") or 0)
    destination=(lead.get("destination") or "").strip()
    if not destination or budget<=0 or days<=0: return "needs_information"
    if lead.get("consent_to_contact","").strip().lower() not in {"yes","true","1"}: return "consent_required"
    return "qualified"

def match_packages(lead, packages):
    dest=(lead.get("destination") or "").strip().casefold()
    budget=float(lead.get("budget_inr") or 0)
    days=int(lead.get("trip_days") or 0)
    matches=[]
    for p in packages:
        if p["destination"].strip().casefold()!=dest: continue
        price=float(p["price_per_person_inr"]); duration=int(p["duration_days"])
        if price<=budget and duration<=days:
            matches.append({**p,"price_per_person_inr":price,"duration_days":duration,
                            "budget_headroom_inr":round(budget-price,2)})
    return sorted(matches,key=lambda x:(x["price_per_person_inr"],-x["duration_days"]))

def assign_owner(lead, owners):
    if not owners: return None
    # Deterministic round-robin key; no claim of live workload balancing.
    key=sum(ord(c) for c in (lead.get("lead_id") or ""))
    return owners[key % len(owners)]

def next_followup(lead, qualification, matches):
    if qualification!="qualified": return "human_review"
    if not matches: return "package_research"
    return "salesperson_review"

def quote_draft(lead, package):
    total=round(package["price_per_person_inr"]*int(lead.get("travellers") or 1),2)
    return {"status":"draft_pending_human_approval","package_id":package["package_id"],
            "travellers":int(lead.get("travellers") or 1),"indicative_total_inr":total,
            "disclaimer":"Indicative demo quote only. Availability, taxes, inclusions and final price require human confirmation."}

def transition_booking(current, event):
    allowed={"new":{"quote_approved"},"quote_approved":{"customer_confirmed"},
             "customer_confirmed":{"supplier_confirmed"},"supplier_confirmed":{"payment_verified"},
             "payment_verified":{"booking_confirmed"}}
    if event not in allowed.get(current,set()): raise ValueError(f"Invalid booking transition: {current} -> {event}")
    return {"quote_approved":"quoted","customer_confirmed":"customer_confirmed",
            "supplier_confirmed":"supplier_confirmed","payment_verified":"payment_verified",
            "booking_confirmed":"booked"}[event]

def stop_followup(status, opted_out=False, booked=False, closed=False):
    return bool(opted_out or booked or closed or status in {"lost","do_not_contact","booked"})

def build_demo(leads, packages, owners):
    rows=[]
    for lead in leads:
        q=qualify(lead); matches=match_packages(lead,packages)
        owner=assign_owner(lead,owners) if q=="qualified" else None
        quote=quote_draft(lead,matches[0]) if q=="qualified" and matches else None
        rows.append({"lead_id":lead.get("lead_id"),"qualification":q,
          "matched_packages":[{"package_id":p["package_id"],"name":p["name"],
             "price_per_person_inr":p["price_per_person_inr"],"duration_days":p["duration_days"]} for p in matches],
          "assigned_owner":owner,"next_action":next_followup(lead,q,matches),
          "quote":quote,"followup_stopped":stop_followup(lead.get("status",""),lead.get("opted_out","").lower()=="yes",
              lead.get("status","").lower()=="booked",lead.get("status","").lower()=="closed"),
          "external_action":"none","approval_required":True})
    return {"schema_version":"1.0.0","demo_only":True,"records":rows,
      "controls":{"messages_sent":False,"booking_created":False,"payment_verified":False,
                  "supplier_inventory_checked":False,"human_approval_required":True}}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--leads",required=True);p.add_argument("--packages",required=True)
    p.add_argument("--owners",required=True);p.add_argument("--out",default="travel-demo.json")
    a=p.parse_args()
    result=build_demo(load_csv(a.leads),load_csv(a.packages),json.loads(Path(a.owners).read_text()))
    Path(a.out).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("demo_written="+a.out)
if __name__=="__main__": main()
