import { getSovereignIdentity } from "../../auth/backbone";

export async function requireIdentity() {
  const identity = await getSovereignIdentity();
  if (!identity) {
    throw new Error("SECURE_AUTH_REQUIRED: please log in again.");
  }
  return identity;
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalizes a parent/contact phone number to a plain 10-digit Indian mobile
 * number, accepting common input variants (+91/91 country code, a leading 0,
 * stray spaces, or the ".0" that Excel imports produce from float-typed
 * cells). Returns an error instead of guessing when the result still isn't a
 * plausible Indian mobile number (10 digits, starting 6-9) — seen in real
 * data as a wrong digit count or a bad prefix, neither of which is safe to
 * silently "fix".
 */
export function normalizeIndianPhone(raw: string | null | undefined): { value: string | null; error?: string } {
  if (!raw || !raw.trim()) return { value: null };
  let digits = raw.trim().replace(/\.0$/, "").replace(/[\s\-()]/g, "");
  digits = digits.replace(/^\+?91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { value: null, error: `"${raw}" is not a valid 10-digit Indian mobile number.` };
  }
  return { value: digits };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Basic structural email validation — not a full RFC 5322 check, just enough to catch typos. */
export function isValidEmail(raw: string | null | undefined): { value: string | null; error?: string } {
  if (!raw || !raw.trim()) return { value: null };
  const trimmed = raw.trim();
  if (!EMAIL_RE.test(trimmed)) {
    return { value: null, error: `"${trimmed}" is not a valid email address.` };
  }
  return { value: trimmed.toLowerCase() };
}

export const ANCILLARY_FIELDS = [
  "admissionFee",
  "cautionDeposit",
  "computerFee",
  "developmentFee",
  "examFee",
  "labFee",
  "libraryFee",
  "miscellaneousFee",
  "sportsFee",
  "transportFee",
] as const;

type FinancialRecordLike = Record<string, unknown> | null | undefined;

// Fixed vocabulary for what a payment is "for" — used by the fee-collection
// form's dropdown and matched against here to compute term-wise paid status.
// Free text is still accepted (recordPayment doesn't restrict it), but only
// these exact labels are recognized for term breakdown purposes.
export const FEE_HEADS = ["Term 1", "Term 2", "Term 3", "Admission Fee", "Transport Fee", "General"] as const;

export type TermStatus = "not-set" | "due" | "partial" | "paid";

/**
 * Term-wise due/paid/status for a student — matches the legacy system's own
 * rule exactly (src/lib/utils/fee-utils.ts: calculateTermBreakdown), not a
 * new one invented for /simple: annual tuition splits 50% / 25% / 25% across
 * Term 1/2/3, and any discount is subtracted starting from Term 3 backward
 * (only spilling into Term 2, then Term 1, if the discount is bigger than a
 * full term's share — which basically never happens for a normal discount).
 * Computed live from tuitionFee + totalDiscount, not from the stored
 * FinancialRecord.term1Amount/term2Amount/term3Amount columns — those hold
 * the pre-discount 50/25/25 base (for compatibility with the legacy system,
 * which reads them as a plain threshold elsewhere) and would double-apply
 * the discount if also used as "due" here. Paid-per-term still comes from
 * whichever collections were tagged "Term 1"/"Term 2"/"Term 3".
 */
export function computeTermBreakdown(
  financial: FinancialRecordLike,
  collections: { amountPaid: unknown; allocatedTo: unknown }[]
) {
  const termPaid = { term1: 0, term2: 0, term3: 0 };
  for (const c of collections) {
    const head = (c.allocatedTo as any)?.feeHead;
    if (head === "Term 1") termPaid.term1 += toNumber(c.amountPaid);
    else if (head === "Term 2") termPaid.term2 += toNumber(c.amountPaid);
    else if (head === "Term 3") termPaid.term3 += toNumber(c.amountPaid);
  }

  const tuition = toNumber((financial as Record<string, unknown> | null | undefined)?.["tuitionFee"]);
  const discount = toNumber((financial as Record<string, unknown> | null | undefined)?.["totalDiscount"]);
  const t3Base = Math.round(tuition * 0.25);
  const t2Base = Math.round(tuition * 0.25);
  const t1Base = Math.round(tuition * 0.5);

  let remainingDiscount = discount;
  const t3Due = Math.max(0, t3Base - remainingDiscount);
  remainingDiscount = Math.max(0, remainingDiscount - t3Base);
  const t2Due = Math.max(0, t2Base - remainingDiscount);
  remainingDiscount = Math.max(0, remainingDiscount - t2Base);
  const t1Due = Math.max(0, t1Base - remainingDiscount);

  const build = (due: number, paid: number) => {
    const status: TermStatus = due <= 0 ? "not-set" : paid >= due ? "paid" : paid > 0 ? "partial" : "due";
    return { due, paid, status };
  };
  return {
    term1: build(t1Due, termPaid.term1),
    term2: build(t2Due, termPaid.term2),
    term3: build(t3Due, termPaid.term3),
  };
}

/**
 * Single source of truth for "what does this student owe in total".
 * Used by both fee-actions.ts and report-actions.ts — two diverging
 * implementations of this is exactly the bug that made the old
 * finance-actions.ts unreliable (see project memory / PR notes).
 */
export function computeTuitionAndAncillary(financial: FinancialRecordLike) {
  if (!financial) {
    return { tuition: 0, ancillary: [] as { label: string; amount: number }[] };
  }
  const tuition = toNumber(financial["netTuition"] ?? financial["tuitionFee"]);
  const ancillary = ANCILLARY_FIELDS.map((field) => ({
    label: field,
    amount: toNumber((financial as Record<string, unknown>)[field]),
  })).filter((row) => row.amount !== 0);
  return { tuition, ancillary };
}
