# ग्राहक सहायता FAQ — Recruitment Agency Revenue Assurance Desk v0.2.0

## 1. क्या इसे install करना पड़ता है?
नहीं। ZIP extract करें और `index.html` को Chrome, Edge, Firefox या Safari के आधुनिक desktop version में खोलें।

## 2. क्या internet या server चाहिए?
नहीं। यह single-file offline utility है। कोई login, cloud server, analytics या बाहरी script नहीं है।

## 3. मेरा data कहाँ save होता है?
Data उसी browser profile के local storage में रहता है जिसमें आपने app खोला है। दूसरे browser, दूसरे Windows user या दूसरे device में यह अपने-आप नहीं आएगा।

## 4. क्या Incognito / Private window में इस्तेमाल कर सकते हैं?
कर सकते हैं, लेकिन private session बंद होने पर browser data मिटा सकता है। नियमित काम के लिए normal browser profile उपयोग करें।

## 5. Backup कैसे लें?
Backup & policy tab → Export JSON backup। File को सुरक्षित स्थान पर रखें। संवेदनशील business data होने पर backup को भी सुरक्षित रखें।

## 6. नए computer पर data कैसे लाएँ?
नए computer पर app खोलें → Backup & policy → Restore backup → पहले export की गई JSON file चुनें।

## 7. क्या यह candidate database या ATS है?
नहीं। इसमें candidate names, phone, email, CV, Aadhaar या PAN दर्ज न करें। केवल anonymous placement/client/recruiter reference IDs रखें।

## 8. क्या invoice और payment promise को receipt मान सकते हैं?
नहीं। Receipt entry में केवल वह cash दर्ज करें जो वास्तव में प्राप्त हो चुका हो। Invoice, commitment या pending transfer को collected cash न मानें।

## 9. एक placement की कई installments कैसे दर्ज करें?
Cash & events tab में वही placement चुनकर हर वास्तविक receipt की date और amount अलग-अलग दर्ज करें। Outstanding balance अपने-आप calculate होगा।

## 10. Recruiter commission कैसे निकलता है?
Commission earned = actual collected cash × recruiter share percentage। Commission paid entry केवल earned unpaid balance तक स्वीकार होती है।

## 11. क्या guarantee status अपने-आप बदलता है?
Claim opened event से status Claim Open होता है। Claim resolved या replacement completed event से Fulfilled होता है। अन्य contractual निर्णय user को स्वयं दर्ज करने हैं।

## 12. Receivable ageing क्या statutory accounting ageing है?
नहीं। v0.2.0 में ageing placement date से calculate होती है, invoice due date से नहीं। इसे केवल operational indicator समझें।

## 13. Placement delete क्यों नहीं हो रहा?
यदि placement में cash receipts, guarantee events या संबंधित recruiter commission payment history है, तो audit trail बचाने के लिए deletion block होता है। ऐसे record का status बदलें; historical record मिटाने का प्रयास न करें।

## 14. क्या app GST, TDS या accounting reports बनाता है?
नहीं। यह tax, GST, TDS, invoicing, statutory accounting या legal compliance का विकल्प नहीं है।

## 15. क्या multiple staff एक साथ data देख सकते हैं?
नहीं। v0.2.0 local browser storage उपयोग करता है। Cloud sync और multi-user collaboration शामिल नहीं हैं।

## 16. क्या seller setup या custom implementation शामिल है?
नहीं। यह self-serve download है। Bespoke configuration, candidate sourcing, recruitment work या recurring consulting शामिल नहीं है।

## 17. Data खो जाए तो?
यदि backup उपलब्ध नहीं है और browser/device storage मिट गया है, तो app उस data को restore नहीं कर सकता। इसलिए नियमित JSON backup आवश्यक है।

## 18. सहायता कैसे माँगें?
जिस marketplace से product खरीदा है, उसी के order/support channel पर product version, browser version और समस्या के चरण लिखें। Candidate या client की व्यक्तिगत/गोपनीय जानकारी साझा न करें।
