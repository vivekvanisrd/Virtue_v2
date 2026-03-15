import { Decimal } from "@prisma/client/runtime/library";

export interface FeeBreakdown {
  term1: number;
  term2: number;
  term3: number;
  totalDiscount: number;
  annualNet: number;
}

/**
 * Calculates the 50/25/25 split for annual tuition fees.
 * Realizes all discounts exclusively in the 3rd term (Late Realization).
 * 
 * @param annualTuition Total annual amount (Gross)
 * @param totalDiscount Sum of all applied discounts
 */
export const calculateTermBreakdown = (
  annualTuition: number | Decimal,
  totalDiscount: number | Decimal = 0
): FeeBreakdown => {
  const tuition = typeof annualTuition === 'number' ? annualTuition : Number(annualTuition);
  const discount = typeof totalDiscount === 'number' ? totalDiscount : Number(totalDiscount);
  
  // Strict legacy split: 50% / 25% / 25%
  const term1 = Math.round(tuition * 0.5);
  const term2 = Math.round(tuition * 0.25);
  const term3Base = Math.round(tuition * 0.25);
  
  // Realize all discounts in Term 3 (User preference)
  // If discount exceeds Term 3, we cap at zero. 
  // (In a real audit, we'd flag if discount > 25% of annual tuition)
  const term3 = Math.max(0, term3Base - discount);
  
  const annualNet = term1 + term2 + term3;
  
  return {
    term1,
    term2,
    term3,
    totalDiscount: discount,
    annualNet
  };
};

/**
 * High-visibility late fee calculation
 * Legacy Rule: ₹5 per day from the first day late.
 * 
 * @param dueDate The deadline for the fee payment
 * @returns Object with amount and days late count
 */
export const calculateLateFee = (dueDate: Date): { amount: number; daysLate: number } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  if (today <= due) {
    return { amount: 0, daysLate: 0 };
  }
  
  const diffTime = today.getTime() - due.getTime();
  const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    amount: daysLate * 5,
    daysLate
  };
};

/**
 * Formats numbers into Indian Rupee (INR) currency strings.
 */
export const formatCurrency = (amount: number | Decimal) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
};
