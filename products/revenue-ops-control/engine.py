#!/usr/bin/env python3
"""Offline lead-to-cash control demo. Python standard library only."""
import argparse
import csv
import json
from collections import defaultdict
from datetime import date
from pathlib import Path


def load_csv(path, required):
    with Path(path).open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        missing = set(required) - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"{path}: missing columns: {', '.join(sorted(missing))}")
        return list(reader)


def norm(value):
    return "".join((value or "").strip().lower().split())


def parse_day(value, field):
    try:
        return date.fromisoformat((value or "").strip())
    except ValueError as exc:
        raise ValueError(f"Invalid {field}: {value!r}; expected YYYY-MM-DD") from exc


def classify_message(text):
    value = (text or "").casefold()
    if any(k in value for k in ("refund", "charged twice", "payment failed", "complaint")):
        return "billing_or_complaint", "high"
    if any(k in value for k in ("urgent", "broken", "not working", "today", "deadline")):
        return "urgent_support", "high"
    if any(k in value for k in ("quote", "pricing", "price", "demo", "interested")):
        return "sales_lead", "normal"
    return "general", "normal"


def analyze_leads(rows, today):
    seen, duplicate_rows, due = set(), [], []
    for index, row in enumerate(rows, start=2):
        email, phone = norm(row.get("email")), norm(row.get("phone"))
        identity = ("email", email) if email else (("phone", phone) if phone else None)
        if identity and identity in seen:
            duplicate_rows.append((index, row.get("lead_id", "")))
        elif identity:
            seen.add(identity)
        status = norm(row.get("status"))
        if status not in {"won", "lost", "closed"} and (row.get("next_follow_up") or "").strip():
            due_day = parse_day(row["next_follow_up"], "next_follow_up")
            if due_day <= today:
                due.append((due_day, index, row))
    return duplicate_rows, due


def analyze_messages(events):
    seen, queue, duplicates = set(), [], []
    for event in events:
        event_id = str(event.get("event_id", "")).strip()
        if not event_id:
            raise ValueError("Message event missing event_id")
        # Fingerprint stable event content, excluding ingestion-only metadata.
        key = (event_id, str(event.get("source", "")), str(event.get("text", "")))
        if key in seen:
            duplicates.append(event_id)
            continue
        seen.add(key)
        category, priority = classify_message(str(event.get("text", "")))
        queue.append({
            "event_id": event_id,
            "source": event.get("source", "unknown"),
            "category": category,
            "priority": priority,
            "status": "awaiting_human_approval",
            "summary": " ".join(str(event.get("text", "")).split())[:200],
        })
    return queue, duplicates


def analyze_invoices(rows, today):
    open_rows, overdue = [], []
    total = 0.0
    for index, row in enumerate(rows, start=2):
        status = norm(row.get("status"))
        if status in {"paid", "cancelled", "void"}:
            continue
        try:
            amount = float(row.get("amount") or 0)
        except ValueError as exc:
            raise ValueError(f"Invalid invoice amount at row {index}") from exc
        if amount < 0:
            raise ValueError(f"Negative invoice amount at row {index}")
        due = parse_day(row.get("due_date"), "due_date")
        total += amount
        open_rows.append((index, row, amount, due))
        if due < today:
            overdue.append((index, row, amount, due))
    return open_rows, overdue, total


def build_report(leads, events, invoices, today=None):
    today = today or date.today()
    duplicate_leads, due_leads = analyze_leads(leads, today)
    message_queue, duplicate_messages = analyze_messages(events)
    open_invoices, overdue_invoices, total_open = analyze_invoices(invoices, today)

    lines = [
        "# Revenue Operations Control Report",
        f"Report date: {today.isoformat()}",
        "",
        "## Executive snapshot",
        f"- Leads received: {len(leads)}",
        f"- Duplicate lead records flagged: {len(duplicate_leads)}",
        f"- Follow-ups due today or earlier: {len(due_leads)}",
        f"- Unique messages in approval queue: {len(message_queue)}",
        f"- Duplicate message events skipped: {len(duplicate_messages)}",
        f"- Open invoices: {len(open_invoices)}",
        f"- Overdue invoices: {len(overdue_invoices)}",
        f"- Entered open invoice amount: {total_open:,.2f} (not bank-verified)",
        "",
        "## Priority exceptions",
    ]
    exceptions = []
    for row_no, lead_id in duplicate_leads:
        exceptions.append(f"- [DATA QUALITY] Duplicate lead identity at CSV row {row_no}; lead_id={lead_id}")
    for due, row_no, row in due_leads:
        exceptions.append(f"- [FOLLOW-UP] lead_id={row.get('lead_id','')}; due={due}; owner={row.get('owner','')}; row={row_no}")
    for row_no, row, amount, due in overdue_invoices:
        exceptions.append(f"- [RECEIVABLE REVIEW] invoice={row.get('invoice_id','')}; amount={amount:.2f} {row.get('currency','')}; due={due}; row={row_no}")
    lines.extend(exceptions or ["- No exceptions found in supplied records."])
    lines.extend(["", "## Message approval queue"])
    for item in message_queue:
        lines.append(f"- {item['event_id']} | {item['category']} | {item['priority']} | {item['status']} | {item['summary']}")
    if not message_queue:
        lines.append("- No messages.")
    lines.extend([
        "",
        "## Controls and limitations",
        "- All message actions remain pending human approval; nothing was sent.",
        "- Lead duplicate matching uses exact normalized email, falling back to phone; ambiguous matches need human review.",
        "- Invoice totals are sums of entered CSV amounts, not verified receivables or bank balances.",
        "- No external systems were accessed or modified; no payments or bookings were verified.",
    ])
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--leads", required=True)
    parser.add_argument("--messages", required=True)
    parser.add_argument("--invoices", required=True)
    parser.add_argument("--out", default="revenue-ops-report.md")
    args = parser.parse_args()
    leads = load_csv(args.leads, {"lead_id", "email", "phone", "status", "next_follow_up", "owner"})
    invoices = load_csv(args.invoices, {"invoice_id", "amount", "currency", "due_date", "status"})
    events = json.loads(Path(args.messages).read_text(encoding="utf-8"))
    report = build_report(leads, events, invoices)
    Path(args.out).write_text(report, encoding="utf-8")
    print(f"report_written={args.out}")


if __name__ == "__main__":
    main()
