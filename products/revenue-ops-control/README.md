# Revenue Operations Control Demo

Offline-first portfolio demonstration of a lead-to-cash control pipeline. Python standard library only; synthetic data only.

## Run
```bash
python products/revenue-ops-control/engine.py --leads products/revenue-ops-control/samples/leads.csv --messages products/revenue-ops-control/samples/messages.json --invoices products/revenue-ops-control/samples/invoices.csv --out /tmp/revenue-ops-report.md
python -m unittest discover -s products/revenue-ops-control/tests -v
```

## What it demonstrates
- Lead identity normalization and duplicate detection by normalized email/phone
- Lead lifecycle and overdue follow-up detection
- Inbound message triage using deterministic rules, duplicate event suppression and human approval queue
- Invoice aging and outstanding amounts based only on entered sample records
- Cross-module daily exception report with source row references
- Data quality checks and safe failure on malformed dates/amounts

## Safety and limitations
No external API, CRM, WhatsApp, email, bank or payment connection. No message is sent, invoice issued, payment verified or external record modified. No LLM is used. All outputs are advisory and require human review. Data is synthetic. This is a portfolio prototype, not production accounting/CRM software.
