# ERP Fee System Investigation & Audit Report

This report presents a thorough investigation into the calculation, mapping, linking, and accounting entries of the institutional **Fee Collection & Accounts Flow** in the Virtue ERP system, focusing on core tuition and ancillary fees (admission, transport, caution deposits, etc.).

---

## 🔍 Investigation Overview

To audit the system, we analyzed database schema structures, server-side actions, accounting journals, and UI data-flow hooks. Our investigation revealed several critical discrepancies that cause balance drifts, P&L reporting errors, and visual mismatches on the dashboard.

Below is the structured breakdown of the **5 key findings** from this audit.

---

## 📊 Summary of Findings

| Finding | Component | Severity | Impact |
| :--- | :--- | :--- | :--- |
| **1. Sibling / Admission Discount Sync Drift** | Student Creation & Components | **CRITICAL** | Student components are created with `discountAmount: 0`, ignoring discounts applied during admission. This inflates outstanding dues on the dashboard. |
| **2. Scrambled GL Account Mappings (P&L Distortion)** | Double-Entry Posting | **HIGH** | Convenience fees are credited to *Admission Income* (`4200`), and Admission Fees are credited to *Tuition Income* (`4100`), distorting the P&L statement. |
| **3. Component Waivers Bypass Ledger & Journals** | Custom Overrides | **HIGH** | Component-level waivers update the database records but fail to post to student ledger logs or accounting journals, causing AR balance drift. |
| **4. Global Splitting of One-Time Ancillary Fees** | Installment Calculations | **MEDIUM** | One-time fees (Admission Fee, Caution Deposit) are lumped into the tuition sum and split 50%/25%/25% across term installments, rather than collected 100% upfront. |
| **5. Orphaned Transport Collection Endpoint** | Transport Billing | **LOW** | Direct transport payments write to a legacy table without clearing Accounts Receivable (`1200`) or student statement ledgers. |

---

## 🔴 Deep-Dive Analysis

### 1. Sibling / Admission Discount Sync Drift
* **How it works:** When a student is admitted via `submitStandardizedAdmissionAction` in `student-actions.ts`, the cashier can apply a discount (e.g. Sibling Concession). The system calculates the discount amount (e.g. ₹5,000) and saves it to `FinancialRecord.totalDiscount`. It also creates a `Discount` model row and logs a `DISCOUNT` ledger entry.
* **The Bug:** However, when the system creates the individual `StudentFeeComponent` rows (which are the source of truth for term-wise billing and dashboard outstanding aggregates), it initializes `discountAmount: 0` for all components:
  ```typescript
  // src/lib/actions/student-actions.ts
  components: {
    create: resolvedComponents.map(comp => ({
      schoolId: context.schoolId,
      branchId,
      componentId: comp.componentId,
      baseAmount: comp.amount,
      isApplicable: true,
      lockReason: "ADMISSION_SYNC"
      // ❌ Missing discountAmount! Defaults to 0
    }))
  }
  ```
* **The Impact:** When calculating expected net revenue (`baseAmount - waiverAmount - discountAmount`), the components return the gross amount, ignoring the ₹5,000 concession. This overstates dashboard expected revenue and outstanding dues by the discount amount.

---

### 2. Scrambled GL Account Mappings (P&L Distortion)
* **How it works:** Chart of Accounts defines:
  * `4100` -> Tuition Fee Income
  * `4200` -> Admission Fee Income
  * `4300` -> Transport Fee Income
  * `1200` -> Student Receivables (AR)
* **The Bug:** In `recordFeeCollection` and `verifyPublicRazorpayPaymentAction` (inside `finance-actions.ts`):
  * `admissionAcc` is queried using `accountCode: "4100"` (crediting Admission Fee collections to Tuition Income).
  * `serviceAcc` (convenience fee / gateway fee) is queried using `accountCode: "4200"` (crediting parent-paid gateway convenience fees to Admission Income).
  ```typescript
  // src/lib/actions/finance-actions.ts
  const admissionAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4100" } }); // ❌ Tuition Code
  const serviceAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4200" } });   // ❌ Admission Code
  ```
* **The Impact:** Parent-paid Razorpay gateway fees are misclassified as Admission Revenue, while Admission Fees are misclassified as Tuition Income. This scrambles the general ledger balances and distorts the school's financial statements.

---

### 3. Component Waivers Bypass Ledger & Journals
* **How it works:** cashiers can apply custom overrides or waivers to specific components (e.g. waiving a library fee or transport fee) via `applyComponentWaiver` in `fee-actions.ts`.
* **The Bug:** The function correctly updates the `StudentFeeComponent.waiverAmount` and the `FinancialRecord.netTuition` values in the database. However, **it does not create a `LedgerEntry`** and **does not post a double-entry `JournalEntry`** to offset the student's Accounts Receivable (`1200`).
* **The Impact:**
  1. The student's printed account statement does not show the waiver, leading to customer confusion.
  2. The General Ledger Accounts Receivable (`1200`) is never credited, leading to a permanent drift between general ledger totals and student-level dues.

---

### 4. Global Splitting of One-Time Ancillary Fees
* **How it works:** In `getStudentFeeStatus`, the system calculates installment schedules. It computes the total tuition sum by reducing ALL of the student's components:
  `tuition = components.reduce((sum, c) => sum + Number(c.baseAmount), 0)`
* **The Bug:** Because there is no filter to skip ancillary items, one-time fees (like Admission Fee and Caution Deposit) are lumped into the tuition sum and split 50%/25%/25% across Term 1, 2, and 3.
* **The Impact:** Caution deposits and admission fees, which should be paid 100% upfront, are deferred across the academic terms. Furthermore, displaying them inside the main term installments causes cashiers to be confused about whether selecting a Term payment includes or excludes ancillary fees, leading to double-counting or payment tracking errors in the UI.

---

### 5. Orphaned Transport Collection Endpoint
* **How it works:** The transport module defines `recordTransportCollectionAction` in `transport-actions.ts`, writing to a separate `TransportCollection` table, debiting Cash (`1110`) and crediting Tuition (`4100` fallback).
* **The Bug:** This action is completely orphaned and is not called anywhere in the user interface. The UI (`FeeCollectionForm.tsx`) instead collects transport fees as a component using the unified `recordFeeCollection` route.
* **The Impact:** If triggered by direct API calls or custom scripts, direct transport collections do not clear the student's Accounts Receivable (`1200`) or record on the student's Ledger statement, causing balance drift.

---

## 🛠️ Recommended Corrective Actions

To resolve these discrepancies, we propose the following changes:

1. **Admissions Concessions:** Update `submitStandardizedAdmissionAction` to sync `totalDiscountAmount` directly to the `Tuition` component's `discountAmount` field when creating student components.
2. **Account Code Mappings:** Unify account code mappings in `finance-actions.ts`:
   * Map Tuition Fee collections to `4100`.
   * Map Admission Fee collections to `4200`.
   * Map Transport Fee collections to `4300`.
   * Map Gateway Convenience fees to a dedicated service charge/bank fee account (e.g. `4500` or a bank expense code).
3. **Component Waivers:** Update `applyComponentWaiver` to post a `CREDIT` `LedgerEntry` and a double-entry `JournalEntry` (debiting a waiver expense account and crediting AR `1200`) to maintain immutable ledger sync.
4. **Ancillary Term Splitting:** Update `getStudentFeeStatus` to exclude components of type `ANCILLARY` or `DEPOSIT` from the base tuition split calculation, keeping them strictly as one-time, 100% upfront payments.
