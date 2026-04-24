# Razorpay Webhook Reconciliation Status

## What we've achieved so far:
1. **Session-Free Verification API (`/api/payments/verify`)**: A cryptographically secure endpoint that intercepts Razorpay callbacks and atomically records them in the ERP ledger without relying on user sessions.
2. **Webhook Endpoint (`/api/webhooks/razorpay`)**: Dedicated endpoint to ensure silent payment failures are reconciled directly from Razorpay.
3. **Test-Pay Environment (`/test-pay`)**: A standalone test lab to safely simulate Razorpay payment loops using the test environment and keys.
4. **Callback Handler (`RazorpayCallbackHandler.tsx`)**: Reconciles cleanly by calling the verification URL automatically in the background and presenting a toast notification before stripping URL parameters.

## Identified Gap: Sibling Batch Links
Currently, in `FeeCollectionForm.tsx`, when users select multiple siblings for a bulk payment:
```typescript
    const res = await createPaymentLinkAction({
      amount: total,
      studentId: primary.student.id, // <-- Only primary student ID is passed!
      notes: `Consolidated Payment for ${settlements.length} items`,
      terms: allTerms,
    });
```
Because only the *primary* sibling's ID is stored in the Razorpay Notes, our webhooks will subsequently credit ALL of the paid terms to the primary sibling, resulting in skewed ledger records for the remaining siblings. 

## Next Steps When Resuming:
- Overhaul `createPaymentLinkAction` (and `/api/webhooks/razorpay`, `/api/payments/verify`) to accept and properly parse an array of student IDs and map them to their correct respective terms upon settlement callback.
