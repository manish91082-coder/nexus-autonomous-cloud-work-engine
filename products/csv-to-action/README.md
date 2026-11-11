# CSV to Action

A privacy-first browser utility that checks job/invoice CSV files and creates a practical exception list. The MVP runs locally in the browser and does not upload customer files.

## Use
1. Open `index.html` in a modern browser. No server or installation is required.
2. Select a CSV file (up to 10 MB) or load the synthetic demo.
3. Select **Analyze file**.
4. Review data issues and the action queue.
5. Export cleaned rows or a Markdown action report.

## Recognized fields
Minimum required: `job_id`, `customer`, `job_status`, `invoice_amount`, `received_amount`.
Optional: `invoice_due_date`, `next_follow_up`, `currency`, `owner`.
Common alternate headers such as `ID`, `Client`, `Status`, `Amount`, `Paid`, `Due Date` are recognized.
Dates must be ISO `YYYY-MM-DD`. CSV quoted fields, commas and embedded newlines are supported.

## Privacy and limitations
- The selected file is read by browser JavaScript only. There is no file upload, analytics endpoint, account or remote processing in this MVP.
- Never place passwords, bank credentials, card numbers, government IDs or secrets in CSV data.
- Amounts are user-entered and not verified against bank records or payment processors.
- Mixed-currency portfolio totals are suppressed. No FX conversion is performed.
- This is not accounting, tax, legal, credit or payment verification software.
- It does not send reminders, contact customers, issue invoices or collect payments.

## Validation
Run tests with Node.js: `node --test tests/csv_engine.test.cjs`.
