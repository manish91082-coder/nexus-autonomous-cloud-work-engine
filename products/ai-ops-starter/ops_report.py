#!/usr/bin/env python3
"""Offline daily operations report generator. Python standard library only."""
import argparse
import csv
from datetime import date, datetime
from pathlib import Path

def read_csv(path, required):
    with Path(path).open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        missing = set(required) - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"{path}: missing required columns: {', '.join(sorted(missing))}")
        return list(reader)

def parse_date(value, field):
    try:
        return date.fromisoformat((value or "").strip())
    except ValueError as exc:
        raise ValueError(f"Invalid {field} date {value!r}; expected YYYY-MM-DD") from exc

def build_report(leads, invoices, today=None):
    today = today or date.today()
    active_leads = [r for r in leads if (r.get("status") or "").strip().lower() not in {"won", "lost", "closed"}]
    due_leads = []
    for row in active_leads:
        raw = (row.get("next_follow_up") or "").strip()
        if raw:
            due = parse_date(raw, "next_follow_up")
            if due <= today:
                due_leads.append((due, row))
    open_invoices, overdue = [], []
    total_open = 0.0
    for row in invoices:
        status = (row.get("status") or "").strip().lower()
        if status in {"paid", "cancelled", "void"}:
            continue
        try:
            amount = float(row.get("amount") or 0)
        except ValueError as exc:
            raise ValueError(f"Invalid invoice amount for {row.get('invoice_id')}") from exc
        if amount < 0:
            raise ValueError(f"Negative invoice amount for {row.get('invoice_id')}")
        due = parse_date(row.get("due_date"), "due_date")
        total_open += amount
        open_invoices.append(row)
        if due < today:
            overdue.append((due, row, amount))
    lines = [
        "# Daily Operations Report",
        f"Generated for: {today.isoformat()}",
        "",
        "## Executive snapshot",
        f"- Active leads: {len(active_leads)}",
        f"- Follow-ups due today or earlier: {len(due_leads)}",
        f"- Open invoices: {len(open_invoices)}",
        f"- Overdue invoices: {len(overdue)}",
        f"- Open invoice amount (sum of entered amounts, not verified receivables): {total_open:,.2f}",
        "",
        "## Priority actions",
    ]
    actions = []
    for due, row in sorted(due_leads, key=lambda x: x[0]):
        actions.append((due, f"- Follow up: {row.get('lead_name','(unnamed)')} | {row.get('company','')} | due {due.isoformat()} | owner {row.get('owner','')}"))
    for due, row, amount in sorted(overdue, key=lambda x: x[0]):
        actions.append((due, f"- Review overdue invoice: {row.get('invoice_id','')} | {row.get('client','')} | {amount:,.2f} {row.get('currency','')} | due {due.isoformat()}"))
    lines.extend(item[1] for item in sorted(actions, key=lambda x: x[0]))
    if not actions:
        lines.append("- No dated follow-up or overdue-invoice actions found.")
    lines.extend(["", "## Data quality reminders", "- Confirm each record is current before acting.", "- Amounts are copied from the CSV; this report does not verify payment or bank balances.", "- No messages, invoices or payments were sent or initiated."])
    return "\n".join(lines) + "\n"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--leads", required=True)
    parser.add_argument("--invoices", required=True)
    parser.add_argument("--out", default="daily-report.md")
    args = parser.parse_args()
    leads = read_csv(args.leads, {"lead_name", "status", "next_follow_up"})
    invoices = read_csv(args.invoices, {"invoice_id", "client", "amount", "currency", "due_date", "status"})
    report = build_report(leads, invoices)
    Path(args.out).write_text(report, encoding="utf-8")
    print(f"Report written: {args.out}")

if __name__ == "__main__":
    main()
