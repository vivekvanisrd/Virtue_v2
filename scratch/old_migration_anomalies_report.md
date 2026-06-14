# Student Data Migration: Anomalies & Resolutions Report

This report lists all data anomalies detected in the source CSV file [Manjula maam(RCB_Details) (1).csv](file:///C:/Users/SriKriations/Favorites/Downloads/Manjula%20maam%28RCB_Details%29%20%281%29.csv) and details how the import script resolved them to satisfy database integrity constraints.

> [!IMPORTANT]
> **All 448 students** listed in the CSV were successfully imported. Empty placeholder rows were identified and excluded from student profiles.

## Summary of Detectable Issues

| Anomaly Type | Count | Resolution Strategy |
|---|---|---|
| **Duplicate Admission Numbers** | 18 | Retained the first instance; appended `-DUP1` to subsequent instances. |
| **Missing Primary Phone Numbers** | 28 | Imported as `null` in the database. |
| **Invalid Phone Number Length** | 7 | Imported as `null` (usually missing a digit, e.g. 9 digits instead of 10). |
| **Invalid Aadhaar Number Length** | 5 | Imported as `null` (usually 11 or 13 digits instead of 12). |
| **Missing Parent Names** | 3 | Imported with placeholders `[MISSING FATHER/MOTHER NAME]`. |
| **Missing Admission Numbers** | 6 | Auto-generated standard placeholders (e.g. `VR-MISSING-[Class]-[SNo]`). |
| **Blank Placeholder Rows** | 5 | Excluded from DB (empty rows on the CSV list). |

---

## 1. Duplicate Admission Numbers Resolved (18)
PostgreSQL enforces unique admission numbers. The duplicate admission numbers were resolved by suffixing them:

| Student Name | Details | Original No | Final Imported No |
|---|---|---|---|
| MANNE BAVAGNA | Row 32 (S.No 4, Class PP1-A) | `VR01091` | **`VR01091`** |
| PULLAIAHGARI.MEGHANSH | Row 41 (S.No 13, Class PP1-A) | `VR01284` | **`VR01284`** |
| RATHOD.PALLAVI | Row 44 (S.No 16, Class PP1-A) | `VR01335` | **`VR01335`** |
| AKULA SRYIANSH PATEL | Row 46 (S.No 18, Class PP1-A) | `VR01335` | **`VR01335-DUP1`** |
| Marjetty Anvith Nandhan | Row 60 (S.No 5, Class PP1-B) | `VR01218` | **`VR01218`** |
| Bandla Eshan Reddy | Row 62 (S.No 7, Class PP1-B) | `VR00903` | **`VR00903`** |
| Y.Srihaan Ganesh | Row 74 (S.No 19, Class PP1-B) | `VR01284` | **`VR01284-DUP1`** |
| sree ganesh | Row 75 (S.No 20, Class PP1-B) | `VR00903` | **`VR00903-DUP1`** |
| Uppari Nithya sri | Row 96 (S.No 14, Class PP2-A) | `VR01075` | **`VR01075`** |
| Gadila Sreyansh reddy | Row 104 (S.No 22, Class PP2-A) | `VR01075` | **`VR01075-DUP1`** |
| Marvelli Mahanth sai | Row 177 (S.No 15, Class 4th-B) | `VR01218` | **`VR01218-DUP1`** |
| M Harshith | Row 198 (S.No 6, Class 5th-No Sec) | `VRO1314` | **`VRO1314`** |
| Kummari Vyshnavi | Row 236 (S.No 15, Class 6th-No Sec) | `VR0690` | **`VR0690`** |
| Mupaneni Harshith | Row 260 (S.No 21, Class 7th-No Sec) | `VRO1314` | **`VRO1314-DUP1`** |
| YELMETI ROHAN GANESH | Row 341 (S.No 18, Class 2nd-A) | `VRO988` | **`VRO988`** |
| LAVUDA  VISHWANK | Row 352 (S.No 29, Class 2nd-A) | `VRO988` | **`VRO988-DUP1`** |
| TADUKA KRUTHIKA | Row 361 (S.No 7, Class 2nd-B) | `VR0690` | **`VR0690-DUP1`** |
| GOLLA NANDA KISHORE | Row 366 (S.No 12, Class 2nd-B) | `VR01091` | **`VR01091-DUP1`** |

---

## 2. Missing Parent Names (3)
These students had blank father and mother columns. They were successfully imported with placeholders:

* **sree ganesh** (Row 75 (S.No 20, Class PP1-B))
* **Vikas** (Row 78 (S.No 23, Class PP1-B))
* **SOUJANYA** (Row 319 (S.No 20, Class 1st-B))

---

## 3. Invalid Aadhaar Numbers (5)
Aadhaar numbers must be exactly 12 digits. These rows had incorrect Aadhaar card lengths and were imported as `null`:

| Student Name | Details | Aadhaar Value | Length Issue |
|---|---|---|---|
| BHANU PRIYA GANGA BOINI | Row 3 (S.No 2, Class NUR-No Sec) | `7304984497875` | 13 digits |
| CH Nainika Reddy | Row 67 (S.No 12, Class PP1-B) | `80123167551` | 11 digits |
| PUTLA YASHWANTH | Row 322 (S.No 23, Class 1st-B) | `88282536244` | 11 digits |
| MANDAGIRI AKASH | Row 324 (S.No 1, Class 2nd-A) | `52289410577` | 11 digits |
| CHILVARI.SAHASRA | Row 445 (S.No 24, Class 4th-A) | `5780857813927` | 13 digits |

---

## 4. Invalid Phone Numbers (7)
Phone numbers must be exactly 10 digits. These numbers were incomplete and imported as `null`:

| Student Name | Details | Phone Value | Length Issue |
|---|---|---|---|
| Rathod Ashwin | Row 121 (S.No 9, Class PP2-B) | `968180824` | 9 digits |
| Rukmapuram Varnika | Row 137 (S.No 25, Class PP2-B) | `944124600` | 9 digits |
| Kummari Harshith | Row 144 (S.No 3, Class 4th-A) | `944048841` | 9 digits |
| Kemishetti Lohitha kavya sri | Row 245 (S.No 6, Class 7th-No Sec) | `996373421` | 9 digits |
| Vanam Omkar | Row 271 (S.No 9, Class 8th-No Sec) | `960212836` | 9 digits |
| MASIDHUKADI DEEKSHITHA | Row 276 (S.No 14, Class 8th-No Sec) | `812157501` | 9 digits |
| GADILA KARUNYA | Row 281 (S.No 5, Class 1st-A) | `900347677` | 9 digits |

---

## 5. Missing Admission Numbers (6)
These students did not have an admission number assigned in the sheet. We auto-generated placeholders:

| Student Name | Details | Auto-generated ID |
|---|---|---|
| J Varun | Row 434 (S.No 22, Class 3rd-B) | `VR-MISSING-3rd-B-22` |

---

## 6. Excluded Blank Rows (5)
These rows were entirely blank placeholder rows in the CSV and were excluded from database entry:

* **Row 68 (S.No 13, Class PP1-B)**
* **Row 72 (S.No 17, Class PP1-B)**
* **Row 323 (S.No 24, Class NUR-No Sec)**
* **Row 354 (S.No 31, Class 2nd-A)**
* **Row 367 (S.No 13, Class 2nd-B)**
