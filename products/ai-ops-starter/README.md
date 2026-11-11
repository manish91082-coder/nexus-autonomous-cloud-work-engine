# Job-to-Cash Control Kit

An offline-first operating control kit for small service businesses, contractors, consultants and solo operators. It links each job to its quotation, invoice, receipts and next follow-up using CSV files and Python's standard library.

## What it does
- Tracks leads and follow-ups.
- Links a unique job ID to agreed value, invoice, partial receipts and entered outstanding balance.
- Flags overdue entered balances, missing next actions and completed jobs without invoices.
- Produces a daily action report.
- Runs locally with Python 3.10+ and no paid packages, API keys, GPU, database or cloud account.

## Quick start
1. Install Python 3.10+.
2. Copy the CSV templates from `templates/` into a working folder.
3. Replace sample rows with your own verified records.
4. Run:

```bash
python ops_report.py --leads templates/leads.csv --invoices templates/invoices.csv --out daily-report.md
python job_cash_report.py --jobs templates/jobs.csv --out job-cash-report.md
```

5. Open the generated Markdown reports and work through the action list.

## Important limitations
- This is a recordkeeping and exception-reporting tool, not accounting, GST, tax, CRM or payment software.
- It does not verify bank deposits, payment processor settlements or customer promises.
- It does not issue invoices, send WhatsApp/email messages, collect payments or make commitments.
- Enter only business data you are authorized to process. Never store card numbers, bank credentials, passwords, government IDs or other secrets in CSV files.
- Dates use ISO format `YYYY-MM-DD`; currency is a label and no currency conversion is performed.

## Status
The build and automated tests passed in GitHub Actions. That verifies package integrity only. No buyer validation, public sale, seller eligibility, payment settlement or revenue is implied.

## License
MIT. See LICENSE.
