# Implementation Plan: Fee Collection & Accounts Flow Audit Fixes

This document serves as the implementation plan to resolve critical bugs and discrepancies in the institutional **Fee Collection & Accounts Flow** where expected revenues, outstanding dues, and transaction metrics fail to match the database's actual state.

## User Review Required

> [!IMPORTANT]
> 1. **Component-Sum Authority:** We will run expected revenue and outstanding due calculations based on the sum of active `StudentFeeComponent` entries (`baseAmount - waiverAmount - discountAmount`) rather than the legacy `annualTuition` field. Our database audit confirms 100% of financial records (449/449) have component relations, making this transition safe and robust.
> 2. **Uppercase Casing for Voids:** We standardize the payment status to `"VOIDED"` (uppercase) for receipt void approvals to match the casing of the ledger reversal engine, and ensure that `"VoidRequested"` states are filtered out of outstanding totals.
> 3. **Ledger Integrity:** All double-entry postings are balanced, and reversals correctly offset the debits and credits of the original receipt logs.

## Open Questions

> [!NOTE]
> All primary requirements are verified and clear. No further design decisions or open questions are pending at this stage.

---

## Proposed Changes

### Finance Backend & Actions

#### [MODIFY] [dashboard-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/dashboard-actions.ts)
*   Update `getDashboardStatsAction` to query `StudentFeeComponent` instead of `annualTuition` for expected revenue.
*   Update the class-wise stats mapping to aggregate student-level components, utilizing the legacy `annualTuition` only as a resilient fallback.
*   Ensure that collections with `"VOIDED"` or `"VoidRequested"` statuses are excluded from dashboard success metrics.

#### [MODIFY] [finance-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/finance-actions.ts)
*   Update `recordBulkFeeCollection` fallback order to standard `annualTuition || tuitionFee` to match single student validation.
*   Align `approveReceiptVoid` to set receipt status to `"VOIDED"` instead of mixed-case `"Voided"`.
*   Ensure `applyDiscountAction` updates `StudentFeeComponent.discountAmount` when altering a student's core tuition discount, avoiding discrepancy between calculation paths.
*   Harden `getStudentFeeStatus` mapping of paid terms to extract and append `ancillaryPaid` keys from collection JSON headers so ancillary fees correctly reflect as paid.
*   Remove invalid `collectionDate` write in `verifyPublicRazorpayPaymentAction` and restore backticks to `revalidatePath` dynamic templates.

---

## Verification Plan

### Automated Tests
*   Run the schema validation and client compilation:
    ```bash
    npx prisma generate
    ```
*   Execute typescript checks to ensure complete type safety across all modified files:
    ```bash
    npx tsc --noEmit
    ```
*   Run the production Next.js build to verify there are no compilation errors:
    ```bash
    npm run build
    ```

### Manual Verification
*   Verify student fee profile views on the admin dashboard, verifying that ancillary fees (e.g. transport, admission) show correct `isPaid` status.
*   Simulate fee receipts voiding and ensure dashboard stats (`outstandingDues`, `lifetimeCollected`) reflect the changes instantly.
*   Compare single vs bulk collections to verify sequential installment locking works consistently.
