# ERP Fee Reconciliation & Receipt Audit Report (Ucban Sheet)

This report presents a cross-reconciliation of payment receipt data parsed from the **Ucban** sheet of **E:\accounts\sorted fee 2025 2026.xlsx** against active student records in the Virtue ERP database.

## 📊 Executive Summary

* **Total Receipts Processed**: **1286**
* **Successfully Matched Receipts**: **1122** (87.2%)
* **Unmatched Receipts**: **72**
* **Ambiguous Matches**: **92**
* **Total Collected in Excel**: **₹11,989,800.00**
  * **Cash Collections**: **₹4,492,200.00**
  * **Online Collections**: **₹7,497,600.00**
  * **Matched Payments Value**: **₹10,620,000.00**
  * **Unmatched Payments Value**: **₹432,300.00**
  * **Ambiguous Payments Value**: **₹939,500.00**

---

## 🔍 Unmatched Receipts (Action Required)

These receipts could not be resolved to any active student record. Please verify names and cohorts.

| Row | Sl No | Receipt No | Date | Name in Excel | Class | Cash | Online | Total | Remarks | Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 78 | 1046 | 062 | 09/02/2026 | **T. Megnadh** | 1st | ₹0.0 | ₹10,000.0 | ₹10,000.0 |  | *No student record matching name and class criteria.* |
| 133 | 1097 | 114 | 27/02/2026 | **V. Upendra** | PG | ₹1,000.0 | ₹5,300.0 | ₹6,300.0 |  | *No student record matching name and class criteria.* |
| 183 | 1139 | 157 | 06/03/2026 | **T. Meghnadh** | 1st | ₹8,000.0 | ₹8,000.0 | ₹16,000.0 |  | *No student record matching name and class criteria.* |
| 208 | 1163 | 181 | 11/03/2026 | **G. Anush Reddy** | 5th | ₹14,000.0 | ₹0.0 | ₹14,000.0 |  | *No student record matching name and class criteria.* |
| 222 | 1175 | 193 | 13/03/2026 | **B. Aadya Sri** | Nur | ₹0.0 | ₹2,000.0 | ₹2,000.0 |  | *No student record matching name and class criteria.* |
| 230 | 1183 | 201 | 14/03/2026 | **A. Nithin** | 7th | ₹0.0 | ₹18,000.0 | ₹18,000.0 |  | *No student record matching name and class criteria.* |
| 232 | 1185 | 203 | 14/03/2026 | **K. Vishnu** | 3rd | ₹5,000.0 | ₹0.0 | ₹5,000.0 |  | *No student record matching name and class criteria.* |
| 236 | 1189 | 207 | 16/03/2026 | **P. Yashika** | 2nd | ₹10,000.0 | ₹0.0 | ₹10,000.0 |  | *No student record matching name and class criteria.* |
| 242 | 1195 | 213 | 17/03/2026 | **M. Sai Kiran** | 8th | ₹20,000.0 | ₹0.0 | ₹20,000.0 |  | *No student record matching name and class criteria.* |
| 247 | 1200 | 218 | 17/03/2026 | **K. Mahathi** | 2nd | ₹0.0 | ₹8,000.0 | ₹8,000.0 |  | *No student record matching name and class criteria.* |
| 248 | 1201 | 219 | 18/03/2026 | **S. Niharika** | 6th | ₹0.0 | ₹14,000.0 | ₹14,000.0 |  | *No student record matching name and class criteria.* |
| 249 | 1202 | 220 | 18/03/2026 | **S. Hemanth** | 4th | ₹0.0 | ₹12,000.0 | ₹12,000.0 |  | *No student record matching name and class criteria.* |
| 254 | 1207 | 225 | 19/03/2026 | **N. Lavanya** | 2nd | ₹0.0 | ₹10,000.0 | ₹10,000.0 |  | *No student record matching name and class criteria.* |
| 255 | 1208 | 226 | 19/03/2026 | **CH. Vamshi** | UKG | ₹0.0 | ₹8,000.0 | ₹8,000.0 |  | *No student record matching name and class criteria.* |
| 258 | 1211 | 229 | 20/03/2026 | **R. Sai Charan** | 7th | ₹0.0 | ₹17,000.0 | ₹17,000.0 |  | *No student record matching name and class criteria.* |
| 259 | 1212 | 230 | 20/03/2026 | **R. Tejaswini** | 5th | ₹0.0 | ₹12,000.0 | ₹12,000.0 |  | *No student record matching name and class criteria.* |
| 263 | 1216 | 234 | 20/03/2026 | **K. Pragna** | 1st | ₹0.0 | ₹8,000.0 | ₹8,000.0 |  | *No student record matching name and class criteria.* |
| 264 | 1217 | 235 | 21/03/2026 | **B. Sai Kumar** | 6th | ₹10,000.0 | ₹0.0 | ₹10,000.0 |  | *No student record matching name and class criteria.* |
| 330 | 283 | 5066 | 2025-07-26 00:00:00 | **G. Saimouni** | 5th | ₹2,500.0 | ₹0.0 | ₹2,500.0 | Transport  | *No student record matching name and class criteria.* |
| 331 | 284 | 5066 | 2025-07-26 00:00:00 | **G. Vigneth** | 4th | ₹2,500.0 | ₹0.0 | ₹2,500.0 | Transport  | *No student record matching name and class criteria.* |
| 388 | 479 | 5133 | 2025-09-16 00:00:00 | **K. Harisankerthan** | 4th | ₹0.0 | ₹5,000.0 | ₹5,000.0 | Transport fee / T/P | *No student record matching name and class criteria.* |
| 445 | 745 | 5192 | 14/11/2025 | **M. Haaygoury** | 5th | ₹1,000.0 | ₹2,000.0 | ₹3,000.0 | Transport | *No student record matching name and class criteria.* |
| 527 | 947 | 5270 | 23/01/2026 | **B. Aadya Sri** | Nur | ₹0.0 | ₹1,000.0 | ₹1,000.0 |  | *No student record matching name and class criteria.* |
| 528 | 948 | 5271 | 23/01/2026 | **A. Vivek** | Nur | ₹0.0 | ₹2,000.0 | ₹2,000.0 |  | *No student record matching name and class criteria.* |
| 538 | 958 | 5281 | 24/01/2026 | **B. Aditya Sree** | Nur | ₹0.0 | ₹5,000.0 | ₹5,000.0 |  | *No student record matching name and class criteria.* |
| 615 | 839 | 5352 | 24/12/2025 | **T. Meghnad** | 1st | ₹0.0 | ₹10,000.0 | ₹10,000.0 |  | *No student record matching name and class criteria.* |
| 665 | 3 | 5402 | 2025-06-10 00:00:00 | **M. Hayyagreva** | 4th | ₹28,000.0 | ₹0.0 | ₹28,000.0 | School fee | *No student record matching name and class criteria.* |
| 744 | 78 | 5468 | 2025-06-26 00:00:00 | **B. Vishnadh** | 3rd | ₹0.0 | ₹5,000.0 | ₹5,000.0 | Transport  | *No student record matching name and class criteria.* |
| 745 | 79 | 5469 | 2025-06-26 00:00:00 | **V. Harsha Vardhan Charry** | Nur | ₹0.0 | ₹5,000.0 | ₹5,000.0 | School fee | *No student record matching name and class criteria.* |
| 762 | 98 | 5485 | 2025-07-02 00:00:00 | **V. Jeswanth Reddy** | 4th | ₹0.0 | ₹30,000.0 | ₹30,000.0 | School fee | *No student record matching name and class criteria.* |
| 778 | 116 | 5501 | 2025-07-03 00:00:00 | **E. Sai Ganesh** | LKG | ₹0.0 | ₹7,000.0 | ₹7,000.0 | School fee | *No student record matching name and class criteria.* |
| 797 | 144 | 5521 | 2025-07-05 00:00:00 | **C. Lasya Priya** | 4th | ₹0.0 | ₹10,000.0 | ₹10,000.0 | School fee | *No student record matching name and class criteria.* |
| 843 | 204 | 5568 | 2025-07-14 00:00:00 | **N. Arjun (MNB)** | 1st | ₹10,000.0 | ₹0.0 | ₹10,000.0 | School fee | *No student record matching name and class criteria.* |
| 851 | 212 | 5576 | 2025-07-14 00:00:00 | **N. Bhanucheran** | 2nd | ₹0.0 | ₹5,000.0 | ₹5,000.0 | School fee | *No student record matching name and class criteria.* |
| 880 | 281 | 5605 | 2025-07-26 00:00:00 | **G. Saimurari** | 5th | ₹15,000.0 | ₹0.0 | ₹15,000.0 | School fee | *No student record matching name and class criteria.* |
| 881 | 282 | 5606 | 2025-07-26 00:00:00 | **G. Vignatej** | 4th | ₹15,000.0 | ₹0.0 | ₹15,000.0 | School fee | *No student record matching name and class criteria.* |
| 953 | 398 | 5684 | 2025-09-01 00:00:00 | **C. Vanikapriya** | 3rd | ₹0.0 | ₹11,000.0 | ₹11,000.0 | T/F | *No student record matching name and class criteria.* |
| 1008 | 466 | 5741 | 2025-09-13 00:00:00 | **P. Vishal Teja** | 2nd | ₹28,000.0 | ₹0.0 | ₹28,000.0 | S/P | *No student record matching name and class criteria.* |
| 1039 | 510 | 5772 | 2025-10-06 00:00:00 | **P. Sai Haran** | Nur | ₹5,000.0 | ₹0.0 | ₹5,000.0 | School fee | *No student record matching name and class criteria.* |
| 1068 | 556 | 5801 | 2025-10-09 00:00:00 | **E. Sai Ganesh** | LKG | ₹0.0 | ₹7,000.0 | ₹7,000.0 | School fee | *No student record matching name and class criteria.* |
| 1142 | 647 | 5884 | 2025-10-13 00:00:00 | **K. Vaibhav** | 6th | ₹0.0 | ₹6,000.0 | ₹6,000.0 | School fee | *No student record matching name and class criteria.* |
| 1143 | 648 | 5885 | 2025-10-13 00:00:00 | **B. Bharat Nandan** | Nur | ₹0.0 | ₹2,000.0 | ₹2,000.0 | School fee | *No student record matching name and class criteria.* |
| 1220 | 744 | 5962 | 12/11/2025 | **M. Haasyagoury** | 5th | ₹9,000.0 | ₹0.0 | ₹9,000.0 | School fee | *No student record matching name and class criteria.* |
| 1234 | 763 | 5976 | 24/11/2025 | **T. Krithika Reddy** | Nur | ₹0.0 | ₹3,000.0 | ₹3,000.0 | Admission fee | *No student record matching name and class criteria.* |
| 1260 | 1 | DEPOSIT | 2025-06-11 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1261 | 26 | DEPOSIT | 2025-06-16 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1262 | 71 | DEPOSIT | 2025-06-24 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1263 | 85 | DEPOSIT | 2025-06-28 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1264 | 93 | DEPOSIT | 2025-07-01 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1265 | 151 | DEPOSIT | 2025-07-07 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1266 | 175 | DEPOSIT | 2025-07-08 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1267 | 198 | DEPOSIT | 2025-07-12 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1268 | 199 | DEPOSIT | 2025-07-11 00:00:00 | **Transport Collection** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Transport summary | *No student record matching name and class criteria.* |
| 1269 | 229 | DEPOSIT | 2025-07-15 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1270 | 255 | DEPOSIT | 2025-07-22 00:00:00 | **Cash To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1271 | 286 | DEPOSIT | 2025-07-26 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1272 | 621 | DEPOSIT | 2025-10-13 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1273 | 703 | DEPOSIT | 2025-10-21 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1274 | 708 | DEPOSIT | 2025-10-28 00:00:00 | **To Deposit (Through Kulkarni Sir)** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit entry | *No student record matching name and class criteria.* |
| 1277 | 936 | DEPOSIT | 2026-01-22 00:00:00 | **To Deposit** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Deposit summary | *No student record matching name and class criteria.* |
| 1278 | 989 | DEPOSIT | 2026-01-30 00:00:00 | **Cash Total** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Handwritten summary | *No student record matching name and class criteria.* |
| 1283 | 232 | NOTE | 2025-07-16 00:00:00 | **Cash amount handed over to Akshitha Madam** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Handwritten side note | *No student record matching name and class criteria.* |
| 1284 | 248 | NOTE | 2025-07-17 00:00:00 | **Cash amount handed over to Akshitha Madam** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Handwritten side note | *No student record matching name and class criteria.* |
| 1285 | 254 | NOTE | 2025-07-19 00:00:00 | **Cash amount handed over to Akshitha Madam** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Handwritten side note | *No student record matching name and class criteria.* |
| 1286 | 279 | NOTE | 2025-07-25 00:00:00 | **Cash handed over to Akshitha Madam** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Handwritten side note | *No student record matching name and class criteria.* |
| 1287 | 280 | NOTE | 2025-07-25 00:00:00 | **Online total noted** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Handwritten summary note | *No student record matching name and class criteria.* |
| 1288 | 285 | NOTE | 2025-07-26 00:00:00 | **Cash handed over to Akshitha Madam** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Handwritten side note | *No student record matching name and class criteria.* |
| 1289 | 295 | NOTE | 2025-07-28 00:00:00 | **Cash handed over to Akshitha Madam** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Handwritten side note | *No student record matching name and class criteria.* |
| 1290 | 305 | NOTE | 2025-07-31 00:00:00 | **July cash total** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Monthly total note | *No student record matching name and class criteria.* |
| 1291 | 306 | NOTE | 2025-07-31 00:00:00 | **July online total** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Monthly total note | *No student record matching name and class criteria.* |
| 1292 | 307 | NOTE | 2025-07-31 00:00:00 | **July grand total** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Grand total note | *No student record matching name and class criteria.* |
| 1293 | 707 | NOTE | 2025-10-22 00:00:00 | **20,000 cash handed over to Akshitha Madam** | UNCLEAR | ₹0.0 | ₹0.0 | ₹0.0 | Handwritten side note | *No student record matching name and class criteria.* |

---

## ⚠️ Ambiguous Receipts (Multiple Candidates Found)

These receipts matched more than one student in the database due to identical or partial names.

| Row | Sl No | Receipt No | Excel Name | Class | Total Paid | Candidates |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 11 | 987 | 006 | **D. Sahasra** | 6th | ₹15,000.0 | Dovoor Sahasra (VM0264 - 6th Grade), Erigipally Sahasra (VR01224 - 6th Grade) |
| 16 | 994 | 010 | **B. Advitharav Reddy** | 2nd | ₹8,000.0 | BAPU REDDY (VR01153 - 2nd Grade), BONAGIRI REDDY (VR0759 - 2nd Grade) |
| 29 | 1005 | 021 | **K. Sathwik** | UKG | ₹3,000.0 | Kanaknolla Sathvik (VR0999 - UKG), Tenugu Sathvik (VR01108 - UKG) |
| 65 | 1033 | 049 | **G. Manaswi Reddy** | UKG | ₹7,000.0 | Gaddam Reddy (VR01232 - UKG), Gadila reddy (VR01075-DUP1 - UKG), Gadila reddy (VR01074 - UKG), Gaddamidi Manasvi (VR01342 - UKG) |
| 80 | 1047 | 064 | **U. Shreyas** | UKG | ₹5,000.0 | Ramavath Reyansh (VR0902 - UKG), Gadila reddy (VR01075-DUP1 - UKG) |
| 90 | 1057 | 074 | **B. Advik Reddy** | 1st | ₹13,000.0 | BANDALA REDDY (VRO617 - 1st Grade), CHIRANJI REDDY (VR01082 - 1st Grade) |
| 103 | 1069 | 086 | **K. Bhavya Sri** | UKG | ₹7,000.0 | Kalivemula sri (VR0852 - UKG), Jettigari sri (VR01148 - UKG) |
| 147 | 1107 | 125 | **B. Saanvi** | 2nd | ₹3,000.0 | BONAGIRI REDDY (VR0759 - 2nd Grade), AMRODHI SAANVI (VR01222 - 2nd Grade) |
| 179 | 1136 | 154 | **G. Maanvitha** | 4th | ₹10,000.0 | Gaddam Maanvitha (VS0529 - 4th Grade), Gadeela Samanvitha (VS0455 - 4th Grade) |
| 237 | 1190 | 208 | **P. Nikhil** | UKG | ₹7,000.0 | Amgoth Nikhil (VR01156 - LKG), JAGATHI NIKHIL (VR01302 - 2nd Grade), DIRISALA.NIKIL None (VR0901 - 4th Grade) |
| 245 | 1198 | 216 | **G. Akhil** | 1st | ₹5,000.0 | Amogoth Akhil (VR01042 - UKG), Dirishala Akhil (VR0900 - 6th Grade), MANNE.KRISHNA AKHIL (VR01301 - 4th Grade), SHANKARI.AKHIL None (VR01288 - 4th Grade) |
| 251 | 1204 | 222 | **A. Vihan** | UKG | ₹5,000.0 | Masidukadi Vihaan (VR01305 - 4th Grade), Ambrodhi Vedhvihaan (VR01092 - LKG) |
| 256 | 1209 | 227 | **CH. Nithya** | LKG | ₹6,000.0 | Uppari sri (VR01075 - UKG), Pamidi sri (VM0232 - 6th Grade), KANAKANOLLA SRI (VR0916 - 2nd Grade) |
| 261 | 1214 | 232 | **M. Sanjana** | UKG | ₹9,000.0 | Lingannagari Sanjana (VS0262 - 5th Grade), Nadiminti Sanjana (VS0785 - 3rd Grade) |
| 272 | 124 | 5008 | **T. Saathwik** | UKG | ₹5,000.0 | Tenugu Sathvik (VR01108 - UKG), Kanaknolla Sathvik (VR0999 - UKG) |
| 301 | 218 | 5037 | **Sathivik** | Ukg | ₹5,000.0 | Tenugu Sathvik (VR01108 - UKG), Kanaknolla Sathvik (VR0999 - UKG) |
| 313 | 247 | 5049 | **K. Sanvi** | 4th | ₹5,000.0 | Katakam Saanvi (VS0380 - 4th Grade), Shakam sree (VR0806 - 4th Grade), Marjetty sanvi (VR01280 - 4th Grade) |
| 321 | 271 | 5057 | **D. Sahasra** | 6th | ₹4,000.0 | Dovoor Sahasra (VM0264 - 6th Grade), Erigipally Sahasra (VR01224 - 6th Grade) |
| 334 | 292 | 5069 | **B. Arush** | 3rd | ₹5,000.0 | Begari Aarush (VK0366 - 3rd Grade), Artham Aarush (VS0489 - 3rd Grade) |
| 351 | 326 | 5091 | **A. Yashwanth** | 7th | ₹10,000.0 | PUTLA YASHWANTH (VRO944 - 1st Grade), EDGI YASHWANTH (VR0747 - 2nd Grade) |
| 355 | 348 | 5095 | **K. Mansi** | 7th | ₹10,000.0 | Kulkarni Mansi (VM00513 - 3rd Grade), PATLOLLA REDDY (VRO1090 - 1st Grade) |
| 376 | 446 | 5120 | **J. Bhavya Sri** | UKG | ₹6,000.0 | Jettigari sri (VR01148 - UKG), Kalivemula sri (VR0852 - UKG) |
| 381 | 472 | 5126 | **K. Saathvik** | UKG | ₹5,000.0 | Kanaknolla Sathvik (VR0999 - UKG), Tenugu Sathvik (VR01108 - UKG) |
| 385 | 476 | 5130 | **C. Aryan** | 3rd | ₹10,000.0 | Chavan Aryan (VS0919 - 3rd Grade), Chityala tanishq (VR0676 - 3rd Grade) |
| 418 | 619 | 5164 | **J. Varshith** | 1st | ₹5,000.0 | JAI VARSHITH (VS0786 - 1st Grade), VADLA CHARY (VRO699 - 1st Grade) |
| 428 | 630 | 5174 | **D. Shreyas** | LKG | ₹5,000.0 | USARI SHEYAS (VR01293 - LKG), Vadla Shreyanshi (VRO1256 - LKG), AKULA PATEL (VR01335-DUP1 - LKG), Kore Shreyan (VR01340 - LKG) |
| 434 | 684 | 5180 | **B. Aarush** | 3rd | ₹5,000.0 | Begari Aarush (VK0366 - 3rd Grade), Artham Aarush (VS0489 - 3rd Grade) |
| 437 | 693 | 5183 | **C. Aryan** | 3rd | ₹2,000.0 | Chavan Aryan (VS0919 - 3rd Grade), Chityala tanishq (VR0676 - 3rd Grade) |
| 457 | 788 | 5204 | **B. Aarush** | 3rd | ₹2,000.0 | Begari Aarush (VK0366 - 3rd Grade), Artham Aarush (VS0489 - 3rd Grade) |
| 479 | 904 | 5234 | **C. Advaith Reddy** | 2nd | ₹14,000.0 | CHANDANAGARI REDDY (VRO1196 - 2nd Grade), BAPU REDDY (VR01153 - 2nd Grade) |
| 480 | 904 | 5234 | **C. Advaith Reddy** | 2nd | ₹5,000.0 | CHANDANAGARI REDDY (VRO1196 - 2nd Grade), BAPU REDDY (VR01153 - 2nd Grade) |
| 514 | 939 | 5262 | **J. Bhavya Sri** | UKG | ₹5,000.0 | Jettigari sri (VR01148 - UKG), Kalivemula sri (VR0852 - UKG) |
| 515 | 939 | 5262 | **J. Bhavya Sri** | UKG | ₹4,000.0 | Jettigari sri (VR01148 - UKG), Kalivemula sri (VR0852 - UKG) |
| 516 | 940 | 5263 | **U. Aadya** | UKG | ₹5,000.0 | Usari Aadhya (VR01099 - UKG), Police Aadhya (VR0895 - UKG), Usari Aaradhya (VR01100 - UKG) |
| 517 | 940 | 5263 | **U. Aadya** | UKG | ₹5,000.0 | Usari Aadhya (VR01099 - UKG), Police Aadhya (VR0895 - UKG), Usari Aaradhya (VR01100 - UKG) |
| 518 | 941 | 5264 | **U. Aaradhya** | UKG | ₹5,000.0 | Usari Aaradhya (VR01100 - UKG), Chelmeda Aaradhya (VR0941 - UKG) |
| 519 | 941 | 5264 | **U. Aaradhya** | UKG | ₹5,000.0 | Usari Aaradhya (VR01100 - UKG), Chelmeda Aaradhya (VR0941 - UKG) |
| 524 | 944 | 5267 | **A. Arushi** | 3rd | ₹10,000.0 | Begari Aarush (VK0366 - 3rd Grade), Artham Aarush (VS0489 - 3rd Grade) |
| 530 | 950 | 5273 | **S. Varshith** | Nur | ₹2,500.0 | VADLA CHARY (VRO699 - 1st Grade), JAI VARSHITH (VS0786 - 1st Grade) |
| 532 | 952 | 5275 | **T. Nithya Sree** |  | ₹2,000.0 | Uppari sri (VR01075 - UKG), Pamidi sri (VM0232 - 6th Grade), KANAKANOLLA SRI (VR0916 - 2nd Grade) |
| 552 | 972 | 5293 | **B. Aarush** | 3rd | ₹7,000.0 | Begari Aarush (VK0366 - 3rd Grade), Artham Aarush (VS0489 - 3rd Grade) |
| 553 | 973 | 5293 | **B. Aarush** | 3rd | ₹2,000.0 | Begari Aarush (VK0366 - 3rd Grade), Artham Aarush (VS0489 - 3rd Grade) |
| 606 | 830 | 5343 | **A. Advath** | 1st | ₹10,000.0 | ANDOL ADVAITH (VRO836 - 1st Grade), KOVURI ASHWATH (VRO1266 - 1st Grade) |
| 652 | 876 | 5389 | **K. Saanvi** | 4th | ₹12,000.0 | Katakam Saanvi (VS0380 - 4th Grade), Shakam sree (VR0806 - 4th Grade), Marjetty sanvi (VR01280 - 4th Grade) |
| 654 | 878 | 5391 | **T. Sathvik** | UKG | ₹15,000.0 | Tenugu Sathvik (VR01108 - UKG), Kanaknolla Sathvik (VR0999 - UKG) |
| 691 | 24 | 5422 | **N. Manasree** | LKG | ₹10,000.0 | PAMAIAHGARI.MANUSREE None (VR01333 - LKG), TALARI.MANASVI None (VRO1334 - LKG) |
| 700 | 33 | 5430 | **C. Advik** | 1st | ₹28,000.0 | CHIRANJI REDDY (VR01082 - 1st Grade), BANDALA REDDY (VRO617 - 1st Grade) |
| 705 | 38 | 5434 | **A. Saanvi** | 2nd | ₹28,000.0 | AMRODHI SAANVI (VR01222 - 2nd Grade), BONAGIRI REDDY (VR0759 - 2nd Grade) |
| 710 | 42 | 5438 | **CH. Aaradhya** | UKG | ₹14,000.0 | Chelmeda Aaradhya (VR0941 - UKG), Usari Aaradhya (VR01100 - UKG) |
| 726 | 58 | 5454 | **CH. Vysshvik Reddy** | 2nd | ₹30,000.0 | CHERLA REDDY (VR0621 - 2nd Grade), CHATYALA REDDY (VM0593 - 2nd Grade) |
| 747 | 72 | 5471 | **S. Shravni Sree** | 4th | ₹8,000.0 | Shakam sree (VR0806 - 4th Grade), Mangali sri (VR01110 - 4th Grade), Patel sri (VM0847 - 4th Grade), Golluri valli (VS0409 - 4th Grade), Marjetty sanvi (VR01280 - 4th Grade) |
| 763 | 99 | 5486 | **N. Tarak Reddy** | LKG | ₹22,000.0 | NALLA RAM (VR01079 - LKG), CH Reddy (VR01073 - LKG) |
| 779 | 117 | 5502 | **T. Saathwik** | UKG | ₹5,000.0 | Tenugu Sathvik (VR01108 - UKG), Kanaknolla Sathvik (VR0999 - UKG) |
| 801 | 148 | 5525 | **A. Aarush** | 3rd | ₹11,000.0 | Begari Aarush (VK0366 - 3rd Grade), Artham Aarush (VS0489 - 3rd Grade) |
| 807 | 156 | 5531 | **E. Sahasra** | 6th | ₹31,000.0 | Erigipally Sahasra (VR01224 - 6th Grade), Dovoor Sahasra (VM0264 - 6th Grade) |
| 818 | 167 | 5543 | **CH. Vishwak** | 1st | ₹20,000.0 | CHATYALA REDDY (VM0593 - 2nd Grade), Talari sen (VR01015 - UKG) |
| 821 | 170 | 5546 | **R. Aadhya** | UKG | ₹10,000.0 | Police Aadhya (VR0895 - UKG), Usari Aadhya (VR01099 - UKG) |
| 822 | 171 | 5547 | **V. Aaradhya** | UKG | ₹10,000.0 | Chelmeda Aaradhya (VR0941 - UKG), Usari Aaradhya (VR01100 - UKG) |
| 827 | 183 | 5552 | **K. Anvi** | 1st | ₹20,000.0 | KADIRE SAANVI (VRO646 - 1st Grade), YELLANGARI ANVI (VRO802 - 1st Grade) |
| 829 | 185 | 5554 | **H. Shaaanvi** | 1st | ₹8,000.0 | KADIRE SAANVI (VRO646 - 1st Grade), CHINTHALA SHANVI (VRO905 - 1st Grade) |
| 841 | 202 | 5566 | **A. Agastya Reddy** | LKG | ₹3,000.0 | PEDDOLLA.AGASTYA None (VR01320 - LKG), MAILARAM.ADVATH REDDY (VR01046 - LKG) |
| 845 | 206 | 5570 | **B. Advik** | 1st | ₹15,000.0 | BANDALA REDDY (VRO617 - 1st Grade), CHIRANJI REDDY (VR01082 - 1st Grade) |
| 855 | 221 | 5580 | **M. Advith** | 1st | ₹10,000.0 | ANDOL ADVAITH (VRO836 - 1st Grade), BANDALA REDDY (VRO617 - 1st Grade), CHIRANJI REDDY (VR01082 - 1st Grade) |
| 864 | 236 | 5589 | **K. Saanvi** | 4th | ₹10,000.0 | Katakam Saanvi (VS0380 - 4th Grade), Shakam sree (VR0806 - 4th Grade), Marjetty sanvi (VR01280 - 4th Grade) |
| 868 | 250 | 5593 | **G. Manaswini Reddy** | UKG | ₹9,000.0 | Gaddam Reddy (VR01232 - UKG), Gadila reddy (VR01075-DUP1 - UKG), Gadila reddy (VR01074 - UKG), Gaddamidi Manasvi (VR01342 - UKG) |
| 875 | 262 | 5600 | **K Bhavya sri** | UKG | ₹7,000.0 | Kalivemula sri (VR0852 - UKG), Jettigari sri (VR01148 - UKG) |
| 878 | 265 | 5603 | **G. Bhanutya** | 3rd | ₹5,000.0 | Kandi Bhanuteja (VM00420 - 3rd Grade), Damannagari.Anuhya None (VR0629 - 3rd Grade) |
| 884 | 289 | 5609 | **B. Arush** | 5th | ₹4,500.0 | Begari Aarush (VK0366 - 3rd Grade), Chilamantula Aarush (VR0885 - UKG), Artham Aarush (VS0489 - 3rd Grade) |
| 886 | 296 | 5611 | **CH. Sanvi** | 1st | ₹20,000.0 | CHINTHALA SHANVI (VRO905 - 1st Grade), KADIRE SAANVI (VRO646 - 1st Grade) |
| 899 | 331 | 5626 | **A. Yashwanth** | 7th | ₹10,000.0 | PUTLA YASHWANTH (VRO944 - 1st Grade), EDGI YASHWANTH (VR0747 - 2nd Grade) |
| 908 | 341 | 5636 | **K. Mansi** | 7th | ₹28,000.0 | Kulkarni Mansi (VM00513 - 3rd Grade), PATLOLLA REDDY (VRO1090 - 1st Grade) |
| 922 | 357 | 5652 | **B. Saanvi** | 2nd | ₹25,000.0 | BONAGIRI REDDY (VR0759 - 2nd Grade), AMRODHI SAANVI (VR01222 - 2nd Grade) |
| 935 | 371 | 5665 | **M. Avantika** | UKG | ₹10,000.0 | Thunki Vanshika (VR01071 - UKG), Rukmapuram Varnika (VR0985 - UKG) |
| 986 | 440 | 5719 | **B. Varshitha Reddy** | LKG | ₹5,000.0 | Bandla Reddy (VR00903 - LKG), Burigari Varshitha (VR01199 - LKG) |
| 987 | 441 | 5720 | **B. Varun Teja Reddy** | LKG | ₹5,000.0 | BURIGARI TEJ (VR01200 - LKG), Bandla Reddy (VR00903 - LKG) |
| 990 | 444 | 5723 | **J. Bhavya Sri** | UKG | ₹8,000.0 | Jettigari sri (VR01148 - UKG), Kalivemula sri (VR0852 - UKG) |
| 1014 | 480 | 5747 | **G. Manvitha** | 4th | ₹10,000.0 | Gaddam Maanvitha (VS0529 - 4th Grade), Gadeela Samanvitha (VS0455 - 4th Grade) |
| 1034 | 505 | 5767 | **P. Aadya** | UKG | ₹18,000.0 | Police Aadhya (VR0895 - UKG), Usari Aadhya (VR01099 - UKG) |
| 1035 | 506 | 5768 | **P. Mahadev Reddy** | 5th | ₹22,000.0 | Police Mahadev (VR0896 - 5th Grade), Kalivemula reddy (VM0237 - 5th Grade) |
| 1044 | 517 | 5777 | **D. Sahasra** | 6th | ₹10,000.0 | Dovoor Sahasra (VM0264 - 6th Grade), Erigipally Sahasra (VR01224 - 6th Grade) |
| 1098 | 589 | 5840 | **R. Bhavagnya** | LKG | ₹10,000.0 | MANNE BAVAGNA (VR01091 - LKG), VADLA SRI (VR01251 - LKG), Avanthika None (VR01303 - LKG) |
| 1110 | 601 | 5852 | **A. Advath** | 1st | ₹10,000.0 | ANDOL ADVAITH (VRO836 - 1st Grade), KOVURI ASHWATH (VRO1266 - 1st Grade) |
| 1130 | 635 | 5872 | **K. Sanvi** | 4th | ₹10,000.0 | Katakam Saanvi (VS0380 - 4th Grade), Shakam sree (VR0806 - 4th Grade), Marjetty sanvi (VR01280 - 4th Grade) |
| 1168 | 673 | 5910 | **B. Aarush** | 3rd | ₹4,500.0 | Begari Aarush (VK0366 - 3rd Grade), Artham Aarush (VS0489 - 3rd Grade) |
| 1176 | 688 | 5918 | **C. Aryan** | 3rd | ₹32,000.0 | Chavan Aryan (VS0919 - 3rd Grade), Chityala tanishq (VR0676 - 3rd Grade) |
| 1185 | 700 | 5927 | **J. Nikhil** | 3rd | ₹10,000.0 | JAGATHI NIKHIL (VR01302 - 2nd Grade), Amgoth Nikhil (VR01156 - LKG), DIRISALA.NIKIL None (VR0901 - 4th Grade) |
| 1186 | 701 | 5928 | **S. Sanvi Reddy** | UKG | ₹22,000.0 | Banala reddy (VR01241 - UKG), Gadila reddy (VR01075-DUP1 - UKG), Singidi Saanvi (VR0886 - UKG), Narannagari Shreyanvi (VR01022 - UKG), Gangana sai (VR01113 - UKG), Muthyala sai (VR0856 - UKG) |
| 1192 | 710 | 5934 | **J. Varshith** | 1st | ₹20,000.0 | JAI VARSHITH (VS0786 - 1st Grade), VADLA CHARY (VRO699 - 1st Grade) |
| 1199 | 720 | 5941 | **A. Aarush** | 3rd | ₹11,000.0 | Begari Aarush (VK0366 - 3rd Grade), Artham Aarush (VS0489 - 3rd Grade) |
| 1225 | 750 | 5967 | **G. Maanvitha** | 4th | ₹10,000.0 | Gaddam Maanvitha (VS0529 - 4th Grade), Gadeela Samanvitha (VS0455 - 4th Grade) |
| 1247 | 775 | 5988 | **J. Bhavya Sree** | UKG | ₹7,000.0 | Jettigari sri (VR01148 - UKG), Kalivemula sri (VR0852 - UKG) |
| 1256 | 784 | 5997 | **B. Aarush** | 3rd | ₹8,000.0 | Begari Aarush (VK0366 - 3rd Grade), Artham Aarush (VS0489 - 3rd Grade) |

---

## 📈 Top 15 Matched Student Payments Summary

| Admission ID | Name | Class / Sec | Payments Count | Cash Paid | Online Paid | Total Amount Paid |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| VR0676 | **Chityala tanishq** | 3rd Grade - B | 6 | ₹47,000.0 | ₹25,000.0 | **₹72,000.0** |
| VRO811 | **PATLOLLA SACHETHAN** | 1st Grade - A | 3 | ₹69,000.0 | ₹0.0 | **₹69,000.0** |
| VM0401 | **Momula Hrithika** | 5th Grade - A | 3 | ₹20,000.0 | ₹48,000.0 | **₹68,000.0** |
| VR01304 | **Maseedukadi sahasra** | 7th Grade - A | 5 | ₹45,000.0 | ₹17,000.0 | **₹62,000.0** |
| VS01223 | **Kemishetti sri** | 7th Grade - A | 3 | ₹33,000.0 | ₹26,000.0 | **₹59,000.0** |
| VS0260 | **Chakali Hanshith** | 4th Grade - B | 5 | ₹11,000.0 | ₹44,000.0 | **₹55,000.0** |
| VR0724 | **Kuntala praneeth** | 4th Grade - B | 4 | ₹20,000.0 | ₹31,500.0 | **₹51,500.0** |
| VR0470 | **Paturu Thanvisha** | 3rd Grade - B | 3 | ₹0.0 | ₹51,000.0 | **₹51,000.0** |
| VRO820 | **GURUNOOR RITHWIKA** | 2nd Grade - A | 3 | ₹30,000.0 | ₹20,000.0 | **₹50,000.0** |
| VRO1195 | **PATLOLLA REDDY** | 2nd Grade - A | 6 | ₹16,500.0 | ₹33,000.0 | **₹49,500.0** |
| VS0294 | **Vyshali None** | 5th Grade - A | 5 | ₹35,000.0 | ₹14,000.0 | **₹49,000.0** |
| VR0978 | **Malis reddy** | 3rd Grade - A | 6 | ₹17,000.0 | ₹31,500.0 | **₹48,500.0** |
| VK465 | **Paturu Ganga** | 7th Grade - A | 2 | ₹0.0 | ₹45,000.0 | **₹45,000.0** |
| VR008-25 | **Choula Mallanna** | 8th Grade - A | 6 | ₹30,000.0 | ₹15,000.0 | **₹45,000.0** |
| VR0010-25 | **Vanam Omkar** | 8th Grade - A | 3 | ₹0.0 | ₹45,000.0 | **₹45,000.0** |
