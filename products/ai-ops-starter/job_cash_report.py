#!/usr/bin/env python3
"""Offline job-to-cash exception report. No accounting or payment verification."""
import argparse, csv
from datetime import date
from pathlib import Path

REQUIRED={"job_id","customer","job_status","agreed_amount","currency","invoice_id","invoice_amount","received_amount","invoice_due_date","next_follow_up","owner"}

def load_jobs(path):
    with Path(path).open(newline="",encoding="utf-8-sig") as f:
        reader=csv.DictReader(f)
        missing=REQUIRED-set(reader.fieldnames or [])
        if missing: raise ValueError("Missing columns: "+", ".join(sorted(missing)))
        rows=list(reader)
    ids=[r["job_id"].strip() for r in rows]
    if any(not x for x in ids): raise ValueError("job_id cannot be blank")
    if len(ids)!=len(set(ids)): raise ValueError("job_id must be unique")
    return rows

def money(row,key):
    try: value=float(row.get(key) or 0)
    except ValueError as e: raise ValueError(f"Invalid {key} for job {row.get('job_id')}") from e
    if value<0: raise ValueError(f"Negative {key} for job {row.get('job_id')}")
    return value

def optional_date(value,field,job_id):
    value=(value or "").strip()
    if not value: return None
    try: return date.fromisoformat(value)
    except ValueError as e: raise ValueError(f"Invalid {field} for job {job_id}; expected YYYY-MM-DD") from e

def build_report(rows,today=None):
    today=today or date.today()
    actions=[]; total_invoiced=total_received=total_balance=0.0
    lines=["# Job-to-Cash Daily Control Report",f"Generated: {today.isoformat()}","","## Portfolio snapshot"]
    for r in rows:
        job=r["job_id"].strip()
        invoice=money(r,"invoice_amount"); received=money(r,"received_amount")
        if received>invoice: raise ValueError(f"received_amount exceeds invoice_amount for job {job}")
        balance=round(invoice-received,2)
        total_invoiced+=invoice; total_received+=received; total_balance+=balance
        due=optional_date(r["invoice_due_date"],"invoice_due_date",job)
        follow=optional_date(r["next_follow_up"],"next_follow_up",job)
        if balance>0 and due and due<today:
            actions.append((due, f"- **OVERDUE RECEIVABLE (unverified):** {job} | {r['customer']} | {balance:,.2f} {r['currency']} outstanding | due {due}"))
        if follow and follow<=today:
            actions.append((follow, f"- **FOLLOW-UP DUE:** {job} | {r['customer']} | {r['job_status']} | due {follow} | owner {r['owner']}"))
        if not follow and (r["job_status"].strip().lower() not in {"closed","cancelled","paid"}):
            actions.append((today, f"- **NO NEXT ACTION:** {job} | {r['customer']} | assign a follow-up date"))
        if invoice==0 and r["job_status"].strip().lower() in {"completed","delivered"}:
            actions.append((today, f"- **INVOICE CHECK:** {job} | {r['customer']} | completed/delivered but invoice amount is zero"))
    lines += [f"- Jobs tracked: {len(rows)}",f"- Invoiced amount (entered): {total_invoiced:,.2f}",f"- Received amount (entered): {total_received:,.2f}",f"- Outstanding balance (entered, not verified): {total_balance:,.2f}","","## Priority actions"]
    lines += [x[1] for x in sorted(actions,key=lambda x:x[0])] or ["- No exceptions found in the supplied rows."]
    lines += ["","## Controls and limitations","- Figures are copied from user-entered CSV data and are not verified against bank records or payment processors.","- Outstanding balances are operational indicators, not audited receivables.","- This tool does not issue invoices, send reminders, contact customers, collect money or provide accounting/tax advice.","- Reconcile receipts against authoritative records before taking action."]
    return "\n".join(lines)+"\n"

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument("--jobs",required=True); p.add_argument("--out",default="job-cash-report.md"); a=p.parse_args()
    report=build_report(load_jobs(a.jobs)); Path(a.out).write_text(report,encoding="utf-8"); print(f"Report written: {a.out}")
if __name__=="__main__": main()
