# Fee Collection & Accounts Flow Audit
**"Every Rupee Must Match"** — Sovereign Mandate

---

## Architecture: The Financial Stack

```
FeeStructure (class-level template)
    └── FeeTemplateComponent[] (component × amount)
            ↓ APPLIED TO
StudentFeeComponent[] (per-student override)  ←── FinancialRecord
                                                     ├── annualTuition (legacy)
                                                     ├── totalDiscount
                                                     ├── term1Amount / term2Amount / term3Amount
                                                     └── components[] (source of truth)
                                                             ↓ PAYMENT
                                                    Collection (receipt)
                                                     ├── amountPaid (tuition portion)
                                                     ├── lateFeePaid
                                                     ├── convenienceFee
                                                     └── totalPaid = all three
                                                             ↓ JOURNALS
                                                    JournalEntry (double-entry)
                                                     ├── Debit: Bank (1110) ← totalPaid
                                                     └── Credit: AR (1200) ← amountPaid + lateFeePaid
                                                     └── Credit: ServiceCharge (4200) ← convenienceFee
```

---

## ✅ What is Working Correctly

### 1. Idempotency Guard
- `paymentReference` (Razorpay ID) checked before recording a new collection — no double posting.
- Same check in `verifyPublicRazorpayPaymentAction` for parent portal.

### 2. Atomic Transactions
- All critical writes use `prisma.$transaction()` with `maxWait: 10000, timeout: 30000`.
- Journal + Account Balance updates happen atomically with the Collection row.

### 3. Reversal Engine
- `voidPaymentAction` and `approveReceiptVoid` correctly swap debit↔credit for reversal.
- Account balances are corrected via `decrement debit` / `increment credit` of the original lines.

### 4. Term Milestone Validation
- `validateMilestone()` in `fee-utils.ts` correctly enforces 50% / 75% / 100% cumulative thresholds.
- A 1-rupee rounding buffer (`threshold - 1`) prevents false failures on Decimal rounding.

### 5. Sequential Term Lock
- Cannot pay Term 2 without Term 1, Cannot pay Term 3 without both prior terms.

---

## 🔴 CRITICAL BUGS — Rupee Discrepancies Found

### BUG 1: `outstandingDues` uses `annualTuition` instead of `StudentFeeComponent` sum

**Location:** `dashboard-actions.ts` → Lines 38–41 and 116–118

```typescript
// CURRENT (WRONG) — reads the old denormalized annualTuition column
const expectationStats = await prisma.financialRecord.aggregate({
  where: { schoolId: context.schoolId },
  _sum: { annualTuition: true, totalDiscount: true }  // ← PROBLEM
});
const expectedNet = expectedTuition - expectedDiscounts;
```

**The problem:** `annualTuition` on `FinancialRecord` is a **legacy denormalized field**. The real source of truth is `StudentFeeComponent.baseAmount - waiverAmount - discountAmount`. If students got individual waivers through `applyDiscountAction` or `removeAdHocFeeAction`, those are tracked in `StudentFeeComponent` — NOT reflected back into `annualTuition`.

**Impact:** The dashboard's "Expected Revenue", "Outstanding Dues", and "Collection Rate" can all be wrong. If a student has a ₹10,000 waiver applied via `StudentFeeComponent.waiverAmount` but `annualTuition` was not updated, the dashboard shows ₹10,000 more outstanding than reality.

**Fix Required:**
```typescript
// Instead, aggregate from StudentFeeComponent (the real source of truth)
const componentStats = await prisma.studentFeeComponent.aggregate({
  where: { schoolId: context.schoolId, isApplicable: true },
  _sum: { baseAmount: true, waiverAmount: true, discountAmount: true }
});
const expectedNet = Number(componentStats._sum.baseAmount || 0)
  - Number(componentStats._sum.waiverAmount || 0)
  - Number(componentStats._sum.discountAmount || 0);
```

---

### BUG 2: `recordBulkFeeCollection` uses `tuitionFee` as fallback instead of `annualTuition`

**Location:** `finance-actions.ts` → Line 560

```typescript
// Single-student version (Line 158) - CORRECT order
: Number(student.financial.annualTuition || student.financial.tuitionFee || 0)

// Bulk version (Line 560) - WRONG order (reversed fallback!)
: Number(student.financial.tuitionFee || student.financial.annualTuition || 0)
```

**The problem:** `tuitionFee` is a partial tuition field (legacy). In cases where `tuitionFee` has a value and `annualTuition` is higher, the bulk validation uses a LOWER base, making milestones easier to pass than reality.

**Fix Required:** Standardize both to use `annualTuition` first:
```typescript
: Number(student.financial.annualTuition || student.financial.tuitionFee || 0)
```

---

### BUG 3: `outstandingDues` on Dashboard counts VOIDED collections

**Location:** `dashboard-actions.ts` → Line 43–45

```typescript
collectionsStats = await prisma.collection.aggregate({
  where: { schoolId: context.schoolId, status: "Success" },  // ← OK
  _sum: { amountPaid: true, totalPaid: true }
})
```

This correctly filters `status: "Success"`. But then:

```typescript
const lifetimeCollected = Number(collectionsStats._sum.amountPaid || 0);
const outstandingDues = Math.max(0, expectedNet - lifetimeCollected);
```

**The problem:** `amountPaid` is the tuition-only portion, while some collections might have their receipts `VOIDED` but not filtered out (if `approveReceiptVoid` set them to `"Voided"` instead of `"VOIDED"` — note the case mismatch).

**Case Mismatch Found:**
- `voidPaymentAction` sets status to `"VOIDED"` (line 449, uppercase)
- `approveReceiptVoid` sets status to `"Voided"` (line 1461, mixed-case)
- `rejectReceiptVoid` restores to `"Success"` (line 1621, correct)
- Dashboard query filters for `status: "Success"` — correct, but `"VoidRequested"` status is NOT filtered, meaning partially-processed void requests are still counted as "Success" until explicitly voided or rejected.

**Fix Required:**
```typescript
where: { schoolId: context.schoolId, status: "Success", isDeleted: false }
```

---

### BUG 4: `classStats` on dashboard uses `annualTuition` but ignores `StudentFeeComponent`

**Location:** `dashboard-actions.ts` → Lines 138–158

```typescript
if (st.financial) {
  totalExpected += Number(st.financial.annualTuition || 0) - Number(st.financial.totalDiscount || 0);
}
totalPaid += st.collections.reduce((sum, c) => sum + Number(c.amountPaid || 0), 0);
```

Same as Bug 1 — uses the legacy `annualTuition` field. Per-student waivers from `StudentFeeComponent` are ignored, causing class-level dues to be overstated.

---

### BUG 5: `convenienceFee` excluded from `outstandingDues` calculation (minor, by design but undocumented)

The `outstandingDues` formula is:
```
Outstanding = expectedNet (annualTuition - totalDiscount) - lifetimeCollected (amountPaid)
```

`amountPaid` = tuition only. `convenienceFee` (gateway charges) and `lateFeePaid` are excluded. This is **intentionally correct** because gateway fees are income, not debt recovery. However, if the intent is to track ALL money received vs expected, then `totalPaid` should be used for `lifetimeCollected`. Currently this is inconsistent:
- `collectedToday` uses `totalPaid` (line 120)
- `lifetimeCollected` uses `amountPaid` (line 119)

This means today's collection can appear higher than the lifetime rate would suggest.

---

### BUG 6: `getStudentFeeStatus` — `isPaid` check for ancillary fees is unreliable

**Location:** `finance-actions.ts` → Lines 782–790

```typescript
isPaid: paidTerms.includes(key) || paidTerms.includes(comp.masterComponent.name),
```

**The problem:** `paidTerms` is derived from `c.allocatedTo.terms[]` which only contains string term identifiers like `["term1", "term2"]`. An ancillary fee like `"admissionFee"` or `"transportFee"` will **never** appear in `paidTerms` because those were never put there when a collection was recorded — `recordFeeCollection` only saves `selectedTerms` (which are tuition terms). So `ancillary[key].isPaid` will **always be `false`** for ancillary fees regardless of actual payment.

**Impact:** The student profile always shows ancillary fees as unpaid even if they were collected.

---

## ⚠️ Medium Severity Issues

### ISSUE A: `applyDiscountAction` updates `totalDiscount` on `FinancialRecord` but does NOT update `StudentFeeComponent.discountAmount`

This means:
- `annualTuition - totalDiscount` gives correct net for legacy path
- But `StudentFeeComponent.baseAmount - waiverAmount - discountAmount` gives WRONG net (discountAmount stays 0)

The two calculation paths give different results for the same student.

### ISSUE B: Double-entry journal credit is wrong when no convenience fee exists

```typescript
lines.push({ accountId: arAcc.id, debit: 0, credit: basePlusLate }); // Clear Student Debt
// totalDebit: totalInBank, totalCredit: totalInBank
```

When `gatewayFee = 0`:
- totalDebit = basePlusLate
- totalCredit = basePlusLate (from AR line only)
- ✅ Balanced — this is fine

When `gatewayFee > 0`:
- totalDebit = basePlusLate + gatewayFee
- totalCredit = basePlusLate (AR) + gatewayFee (Service) = basePlusLate + gatewayFee
- ✅ Balanced — this is fine

The journal is balanced in all cases. ✅

### ISSUE C: `requestReceiptVoid` uses `allocatedTo: { push: {...} }` 

Prisma's `push` on a JSON field is a raw array append. This works but is fragile — if `allocatedTo` is null, it will error. Should default `allocatedTo` to `{}` or check first.

---

## 🟡 Minor Issues

### MINOR 1: `verifyPublicRazorpayPaymentAction` has unused `collectionDate` field
Line 1128: `collectionDate: new Date()` — this field does not exist in the `Collection` model schema. This will either silently fail or cause a Prisma error at runtime.

### MINOR 2: `revalidatePath` template literal missing backticks
Line 1997: `revalidatePath("/admin/students/${params.studentId}")` — uses single quotes, not template literal. The path is never dynamically revalidated.

---

## Summary: Rupee Match Score

| Check | Status | Severity |
|-------|--------|----------|
| `outstandingDues` uses legacy `annualTuition` (not StudentFeeComponent) | ❌ WRONG | **CRITICAL** |
| Bulk collection uses reversed fallback (`tuitionFee` before `annualTuition`) | ❌ WRONG | **CRITICAL** |
| Voided receipts case-sensitivity mismatch (`Voided` vs `VOIDED`) | ⚠️ RISK | HIGH |
| `classStats` also uses legacy `annualTuition` | ❌ WRONG | HIGH |
| Ancillary `isPaid` always false | ❌ WRONG | MEDIUM |
| `applyDiscountAction` doesn't update `StudentFeeComponent.discountAmount` | ⚠️ DRIFT | MEDIUM |
| `collectedToday` uses `totalPaid`, lifetime uses `amountPaid` (inconsistent) | ⚠️ VISUAL | LOW |
| `collectionDate` field doesn't exist in schema | ❌ SCHEMA | LOW |
| `revalidatePath` missing template literal | 🐛 BUG | LOW |
| Double-entry journal balance | ✅ CORRECT | — |
| Idempotency guards | ✅ CORRECT | — |
| Atomic transactions | ✅ CORRECT | — |
| Sequential term lock | ✅ CORRECT | — |
| Milestone validation | ✅ CORRECT | — |

---

## Recommended Fix Order

1. **Fix Bug 1 & 4 (Dashboard Expected/Dues):** Switch `expectationStats` to aggregate `StudentFeeComponent` sums
2. **Fix Bug 2 (Bulk fallback):** Standardize to `annualTuition || tuitionFee` order
3. **Fix Bug 3 (Void status):** Add `isDeleted: false` to dashboard query; unify void status casing to `"VOIDED"`
4. **Fix Issue A (Discount drift):** When `applyDiscountAction` applies a discount, also update relevant `StudentFeeComponent.discountAmount`
5. **Fix Bug 6 (Ancillary isPaid):** Track ancillary payments in `allocatedTo` with a dedicated `ancillaryPaid[]` array
6. **Fix Minor 1 & 2:** Remove `collectionDate`, fix `revalidatePath` template literal
