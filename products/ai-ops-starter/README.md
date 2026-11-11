# Zero-Cost AI Operations Starter Kit

A small, offline-first operations kit for solo operators and micro-businesses. It organizes leads, follow-ups, invoices and cash collection in plain CSV files, then produces a daily action report with Python's standard library.

## What is included
- Lead pipeline CSV template
- Invoice and payment follow-up CSV template
- Daily report generator (no API keys, cloud account, GPU, database or paid package)
- Sample data and automated tests
- Hindi quick-start guide

## Who it is for
Consultants, small agencies, freelancers, service businesses and solo operators who need a simple operating rhythm before adopting a full CRM/ERP.

## Quick start
1. Install Python 3.10+.
2. Copy `templates/leads.csv` and `templates/invoices.csv` into a working folder.
3. Replace sample rows with your own records.
4. Run:

```bash
python ops_report.py --leads templates/leads.csv --invoices templates/invoices.csv --out daily-report.md
```

5. Open `daily-report.md` and work through the action list.

## Data handling
- All processing is local. No data is uploaded.
- Use synthetic/sample data for demos.
- Do not store card numbers, bank credentials, passwords, government IDs or other secrets in CSV files.
- The tool does not send messages, issue invoices, collect payments or make commitments on your behalf.
- Dates must use ISO format `YYYY-MM-DD`. Currency is a label only; no currency conversion is performed.

## Limitations
This is a lightweight starter kit, not accounting software, a CRM, a tax tool, or a substitute for professional advice. Validate records and local legal requirements independently.

## License
MIT. See LICENSE.
