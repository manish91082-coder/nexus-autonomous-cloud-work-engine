# Recruitment Agency Revenue Assurance Desk — हिंदी मार्गदर्शिका

## उद्देश्य
यह offline-first tool recruitment agency के placement cash-flow, recruiter commission और contractual guarantee events को नियंत्रित करता है। यह ATS, job board या recruitment service नहीं है।

## 1. Placement दर्ज करें
Placement, client और recruiter के anonymous reference IDs भरें। Joining date, agreed fee, recruiter share (%) और guarantee days दर्ज करें। शुरुआती प्राप्त राशि हो तो उसे opening receipt के रूप में रिकॉर्ड किया जाएगा।

## 2. हर वास्तविक receipt अलग दर्ज करें
Cash & events tab में placement चुनें, receipt date और वास्तविक प्राप्त राशि भरें। एक placement पर कई installments दर्ज हो सकते हैं। कुल receipt booked fee से अधिक नहीं हो सकती। Invoice, promise या pending transfer को cash receipt न मानें।

## 3. Recruiter commission reconcile करें
Commission earned = placement से वास्तव में collected cash × agreed recruiter share percentage। Commission payment केवल earned और unpaid balance तक दर्ज हो सकता है। Recruiter reference, date, amount और optional payment reference भरें।

## 4. Guarantee / replacement events
Claim opened, replacement started, replacement completed, claim resolved या waived event दर्ज करें। Event note में candidate personal information न लिखें। Claim opened से status Claim Open और resolved/completed से Fulfilled हो जाता है।

## 5. Ageing और client concentration
Ageing buckets 0–30, 31–60, 61–90 और 90+ दिन हैं। वर्तमान MVP में age placement date से गिनी जाती है, invoice due date से नहीं। इसलिए इसे conservative operational signal समझें, statutory/accounting ageing नहीं। Client concentration outstanding receivables में client reference का हिस्सा दिखाता है।

## 6. Backup / migration
JSON backup में placements, receipt events, commission payments और guarantee events शामिल हैं। पुराने v0.1.0 local data को पहली बार v0.2.0 खोलने पर migrate करने का प्रयास होता है। Migration के बाद backup export करें। पुराने और नए browser storage को manually साफ करने से पहले backup रखें।

## Privacy और सीमाएँ
Candidate name, phone, email, CV, Aadhaar, PAN या कोई personal/sensitive data दर्ज न करें। केवल anonymous references रखें। Tool local browser storage उपयोग करता है; device/browser access रखने वाला व्यक्ति local data देख सकता है। यह accounting, GST/TDS, invoice, legal contract interpretation या ATS का विकल्प नहीं है।