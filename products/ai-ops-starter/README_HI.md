# Zero-Cost AI Operations Starter Kit

यह छोटा, offline-first operations kit छोटे व्यवसाय, consultant, freelancer और service agency के लिए बनाया गया है। यह Leads, follow-ups, invoices और payment status को साधारण CSV में रखता है और Python से daily action report बनाता है।

## इसमें क्या है?
- Lead pipeline CSV template
- Invoice और payment follow-up CSV template
- Daily report generator
- Sample records और automated tests
- कोई API key, paid package, GPU, database या cloud account आवश्यक नहीं

## शुरू कैसे करें?
1. Python 3.10 या नया संस्करण install करें।
2. `templates/leads.csv` और `templates/invoices.csv` की copy बनाकर अपने records डालें।
3. Command चलाएँ:

```bash
python ops_report.py --leads templates/leads.csv --invoices templates/invoices.csv --out daily-report.md
```

4. बनी हुई `daily-report.md` file खोलें और action list के अनुसार काम करें।

## सुरक्षा
- पूरा processing आपके local computer पर होता है। कोई data upload नहीं होता।
- Password, bank credentials, card number, government ID या secrets CSV में न रखें।
- यह software अपने-आप email/WhatsApp नहीं भेजता, invoice issue नहीं करता और payment collect नहीं करता।
- तारीख `YYYY-MM-DD` format में रखें। Currency conversion नहीं होता।

## सीमाएँ
यह lightweight starter kit है, accounting software, CRM या tax compliance system नहीं। वास्तविक business records और स्थानीय नियमों की स्वतंत्र जाँच करें।

MIT License.
