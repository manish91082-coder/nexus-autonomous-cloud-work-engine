# CSV to Action

यह एक privacy-first browser utility है। यह job/invoice CSV फाइल को आपके browser में ही जाँचती है और data issues तथा अगली कार्रवाई की सूची बनाती है। MVP customer file को किसी server पर upload नहीं करता।

## उपयोग
1. आधुनिक browser में `index.html` खोलें। Installation या server की आवश्यकता नहीं।
2. CSV फाइल चुनें (अधिकतम 10 MB) या synthetic demo लोड करें।
3. **Analyze file** दबाएँ।
4. Data issues और action queue देखें।
5. Cleaned CSV या Markdown action report export करें।

## पहचाने जाने वाले कॉलम
कम-से-कम आवश्यक: `job_id`, `customer`, `job_status`, `invoice_amount`, `received_amount`।
वैकल्पिक: `invoice_due_date`, `next_follow_up`, `currency`, `owner`।
`ID`, `Client`, `Status`, `Amount`, `Paid`, `Due Date` जैसे कुछ वैकल्पिक header नाम भी पहचाने जाते हैं।
तारीख `YYYY-MM-DD` प्रारूप में होनी चाहिए।

## गोपनीयता और सीमाएँ
- फाइल browser JavaScript में locally पढ़ी जाती है। कोई file upload, analytics endpoint या remote processing नहीं है।
- CSV में password, bank credentials, card number, सरकारी पहचान संख्या या secret न रखें।
- Amounts user-entered data हैं, bank records से verified नहीं।
- अलग-अलग currencies के total को जोड़कर नहीं दिखाया जाता। FX conversion नहीं होता।
- यह accounting, tax, legal, credit या payment verification software नहीं है।
- यह reminder नहीं भेजता, customer से संपर्क नहीं करता, invoice जारी नहीं करता और payment collect नहीं करता।

## Tests
Node.js से चलाएँ: `node --test tests/csv_engine.test.cjs`।
