# Recruitment Agency Revenue Assurance Desk — हिंदी मार्गदर्शिका

## उद्देश्य
यह टूल recruitment agency के मालिक को placement fees, वास्तविक collections, recruiter share और replacement/guarantee अवधि का वित्तीय संचालन नियंत्रण देता है। यह ATS नहीं है।

## डेटा भरना
1. Placement reference: प्रत्येक placement के लिए unique ID।
2. Client reference: client का internal code, नाम नहीं।
3. Recruiter reference: recruiter का internal code।
4. Joining date: placement/joining date।
5. Agreed fee: client से तय placement fee।
6. Collected amount: केवल वास्तविक प्राप्त cash।
7. Recruiter share: collected amount पर लागू percentage।
8. Guarantee days: signed commercial agreement में लिखी अवधि।

## Dashboard
- Booked fees: सभी placements की agreed fee का योग।
- Cash collected: अब तक प्राप्त वास्तविक राशि।
- Outstanding: booked fee minus collected amount।
- Collection ratio: collected / booked।
- Active guarantee exposure: Active या Claim Open स्थिति वाले placements।
- 14-day watchlist: अगले 14 दिनों में समाप्त होने वाली active guarantees।

## Privacy
Candidate का नाम, phone, email, CV या अन्य personal data इस tool में न डालें। केवल reference IDs उपयोग करें। Candidate records के लिए अलग compliant ATS का उपयोग करें।

## सीमाएँ
यह accounting, GST/TDS calculator, invoice system, legal guarantee interpretation या ATS नहीं है। Guarantee days और status केवल आपके वास्तविक signed contract से लें। अंतिम वित्तीय और कानूनी निर्णय अपने records/professional adviser से verify करें।

## Backup
Backup & policy tab से JSON export करें। Browser data clear करने से पहले backup लें। Restore केवल इसी tool के valid backup file से करें।
