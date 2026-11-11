#!/usr/bin/env python3
"""Export auditable machine-readable KPIs from the offline Revenue Ops demo."""
import argparse
import json
from datetime import date
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from engine import load_csv, analyze_leads, analyze_messages, analyze_invoices


def build_payload(leads, events, invoices, today=None):
    today = today or date.today()
    duplicate_leads, due_leads = analyze_leads(leads, today)
    message_queue, duplicate_messages = analyze_messages(events)
    open_invoices, overdue_invoices, total_open = analyze_invoices(invoices, today)
    exceptions = []
    for row_no, lead_id in duplicate_leads:
        exceptions.append({"type":"duplicate_lead","source_row":row_no,"lead_id":lead_id})
    for due, row_no, row in due_leads:
        exceptions.append({"type":"followup_due","source_row":row_no,"lead_id":row.get("lead_id",""),"due_date":due.isoformat(),"owner":row.get("owner","")})
    for row_no, row, amount, due in overdue_invoices:
        exceptions.append({"type":"overdue_invoice","source_row":row_no,"invoice_id":row.get("invoice_id",""),"amount":amount,"currency":row.get("currency",""),"due_date":due.isoformat()})
    return {
        "schema_version":"1.0.0",
        "report_date":today.isoformat(),
        "data_scope":"user_supplied_records_only",
        "kpis":{
            "leads_received":len(leads),
            "duplicate_leads_flagged":len(duplicate_leads),
            "followups_due":len(due_leads),
            "unique_messages_awaiting_approval":len(message_queue),
            "duplicate_messages_skipped":len(duplicate_messages),
            "open_invoices":len(open_invoices),
            "overdue_invoices":len(overdue_invoices),
            "entered_open_invoice_amount":round(total_open,2),
            "invoice_amount_verified":False
        },
        "exceptions":exceptions,
        "message_approval_queue":message_queue,
        "duplicate_message_event_ids":duplicate_messages,
        "controls":{
            "external_systems_modified":False,
            "messages_sent":False,
            "payments_verified":False,
            "human_approval_required":True
        }
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--leads",required=True)
    p.add_argument("--messages",required=True)
    p.add_argument("--invoices",required=True)
    p.add_argument("--out",default="revenue-ops-report.json")
    a=p.parse_args()
    leads=load_csv(a.leads,{"lead_id","email","phone","status","next_follow_up","owner"})
    invoices=load_csv(a.invoices,{"invoice_id","amount","currency","due_date","status"})
    events=json.loads(Path(a.messages).read_text(encoding="utf-8"))
    payload=build_payload(leads,events,invoices)
    Path(a.out).write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\\n",encoding="utf-8")
    print(f"json_written={a.out}")


if __name__=="__main__":
    main()
