# ERP Sibling Flow Investigation & Audit Report

This report presents a deep-dive investigation into the Sibling flow in the Virtue ERP system—from sibling admission, sibling matching algorithms, and billing validation, to accounting ledger and journal impacts.

---

## 🔍 Sibling Discovery (Matching) Analysis & Recommendation

### The Problem with Current Matching Logic
Currently, the system attempts to auto-discover siblings in the backend via `findPotentialSiblings` using:
1. **Father's Phone Number** (`family.fatherPhone`)
2. **Mother's Phone Number** (`family.motherPhone`)
3. **Student's Phone Number** (`phone`)
4. **Permanent Address** (`address.permanentAddress`)

As you correctly pointed out, this introduces severe vulnerabilities:
*   **Phone Numbers:** Student phone numbers are irrelevant (minors do not own phones). Parent phone numbers can be faked or duplicated to falsely claim sibling discounts.
*   **Address:** Residential address matching is highly unreliable. In high-density settings (e.g. large apartment complexes), unrelated children living in the same building will share the exact same address, leading to incorrect sibling flagging.

### 🛡️ Recommended Autoritative Match (Aadhaar-First)
To eliminate fraud and incorrect matches, we recommend transitioning to a **parental identity validation key** (Aadhaar):
*   **Primary Match:** Match on **Father's Aadhaar Number** (`family.fatherAadhaar`) OR **Mother's Aadhaar Number** (`family.motherAadhaar`).
*   **Why Aadhaar is the Best Option:** Aadhaar is a unique 12-digit biometric ID. If two student profiles share the same father or mother Aadhaar, they are mathematically guaranteed to be siblings.
*   **Fallback Match:** If Aadhaar is not provided, the system should match on a **Double-Phone check** (both father's AND mother's phone numbers must match) combined with **Surname/Last Name matching**, instead of a single phone or address.

---

## 🔴 Sibling Payments: Deep Investigation of Bulk Collection

We investigated how sibling transactions are recorded in the backend. Currently, the system provides a "Bulk Sibling Fee Collection" (`recordBulkFeeCollection` in `finance-actions.ts`). 

Our audit revealed **critical accounting discrepancies** in this bulk path:

### 1. Missing Student Ledger Entries (Drift)
*   In the standard single-student collection (`recordFeeCollection`), the system creates a `LedgerEntry` row (`type: "PAYMENT"`) for the student's statement of accounts.
*   In the bulk path (`recordBulkFeeCollection`), the system creates the `Collection` rows, but **it never creates `LedgerEntry` records for the students!**
*   **The Impact:** Sibling profiles will show **no payment logs** in their individual accounts statement, even though their balance shows as settled in collections.

### 2. Consolidated Journal Entries (Reconciliation Bottleneck)
*   The bulk transaction bundles all payments (e.g., Student A: ₹15,000, Student B: ₹10,000) and posts a **single consolidated `JournalEntry`** for the batch total (e.g., Debit Cash/Bank: ₹25,000, Credit Receivables `1200`: ₹25,000).
*   **The Impact:** The journal description does not log which student paid how much, making audit trails and bank reconciliation extremely difficult.

### 3. Bypassed Confirmation/Promotion Engine
*   When a provisional student makes their first payment, a milestone check in `recordFeeCollection` elevates them to `ST_CONFIRMED` and allocates their official Admission ID.
*   The bulk path completely bypasses this lifecycle promotion check, meaning promoted siblings will remain permanently stuck in `ST_PROVISIONAL` status.

---

## 🛠️ Recommended Action: Decommission Combined Bulk Payment

Since you noted *"I never say we collect sibling combined fee"*, and given the severe ledger and journal integrity issues in the bulk transaction path, we recommend:

1. **Decommission `recordBulkFeeCollection`:** Remove the bulk payment option and the sibling checkout list from the POS panel.
2. **Individual Student Transactions:** Force cashiers to process payments **individually** for each student. This guarantees that:
   * Each student gets their own official transaction receipt and receipt number.
   * Individual ledger statements (`LedgerEntry`) register the payment correctly.
   * Double-entry journal lines are recorded per student, providing a clean audit trail.
   * Student lifecycle promotions (Provisional to Confirmed) trigger automatically upon milestone clearance.
3. **Use Sibling Status Only for Discounts:** Sibling linkings should be used **strictly at the admission stage** to apply the authorized "Sibling Discount" component, with no combined transaction pooling.
