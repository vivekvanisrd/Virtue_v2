/**
 * Payment-mode constants shared between client components (the fee-collection
 * form) and server actions (recordPayment, report aggregations). Deliberately
 * its own tiny file with zero imports: fee-actions.ts has "use server" (which
 * only allows async function exports, not plain constants/types), and
 * shared.ts pulls in server-only auth code at module scope — either would
 * break a "use client" component that imported it.
 */
export const NON_CASH_PAYMENT_MODES = ["Online", "UPI", "Card", "Cheque", "Bank Transfer"] as const;
export const PAYMENT_MODES = ["Cash", ...NON_CASH_PAYMENT_MODES] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];
