# MSME Ops Desk Lite — उपयोगकर्ता मार्गदर्शिका (हिंदी)

## 1. शुरू कैसे करें
1. `index.html` फाइल को डाउनलोड करें।
2. Chrome, Edge या Firefox में फाइल खोलें।
3. किसी account, login, server या internet connection की जरूरत नहीं है।
4. पहली बार खोलने पर सभी रिकॉर्ड खाली रहेंगे। अपना वास्तविक डेटा स्वयं भरें।

## 2. उपलब्ध टूल

### Margin & break-even
- Selling price और variable cost डालें।
- Fixed monthly cost और target surplus डालें।
- टूल contribution per unit, contribution margin, break-even units और target units निकालता है।
- यदि contribution शून्य या negative है, तो break-even meaningful नहीं है।

### Cash runway
- उपलब्ध operating cash और अनुमानित monthly net cash outflow डालें।
- परिणाम केवल सरल अनुमान है; वास्तविक cash-flow forecast नहीं।

### Stock reorder
- Average daily usage, supplier lead time, safety-stock days और current stock डालें।
- Reorder point = average daily usage × (lead time + safety-stock days)।
- यह formula तभी उपयोगी है जब usage और lead-time inputs विश्वसनीय हों।

### Receivables
- Customer का निजी नाम, फोन, पता या अन्य personal data न डालें। Internal reference/Invoice ID उपयोग करें।
- Due amount, due date और received amount दर्ज करें।
- Balance और overdue age स्वतः दिखेंगे।

### Daily sales
- Date, reference, sales amount और optional note दर्ज करें।
- CSV export से spreadsheet में आगे analysis कर सकते हैं।

## 3. Data सुरक्षा और backup
- रिकॉर्ड केवल उसी browser profile की local storage में रहते हैं।
- कोई server upload, analytics, tracking या external script नहीं है।
- Browser data clear करने पर records मिट सकते हैं।
- Overview → Export backup से JSON backup बनाएं।
- नए device/browser में Restore backup से वही JSON file restore करें।
- Backup file को सुरक्षित रखें; इसमें आपके business records हो सकते हैं।

## 4. सीमाएँ
- यह full ERP, accounting package, GST engine, invoicing system या inventory ledger नहीं है।
- कोई tax, legal, accounting, investment या credit advice नहीं दी जाती।
- कोई cloud sync, multi-user access, password protection या encrypted database नहीं है।
- डेटा की सत्यता और final business decision की जिम्मेदारी उपयोगकर्ता की है।
