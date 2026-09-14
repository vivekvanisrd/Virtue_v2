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
