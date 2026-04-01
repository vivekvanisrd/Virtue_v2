/**
 * CRITICAL DIAGNOSIS NOTES
 * 
 * FOR pay_SYKTynJRaScyWf:
 * - Webhook RECEIVED: 4x (payment.captured x3, order.paid x1) ✅
 * - Collection in DB: ❌ NONE
 * - Settlement Outcome Log: ❌ NONE (no AUTO_SETTLED, no FAILED, no ERROR)
 * 
 * CONCLUSION: processCollectionFlow is being entered but CRASHING silently
 * before reaching any log statement.
 * 
 * The crash is happening BEFORE the log statements in the transaction.
 * The old code was calling recordFeeCollection() which calls getTenantContext()
 * which returns empty schoolId → FY lookup fails → throws error → caught by
 * the outer try/catch in POST() → returns 500 to Razorpay silently.
 * 
 * The NEW session-free code fixes this, but hasn't deployed yet because git push is still running.
 */
