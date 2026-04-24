import { Decimal } from "@prisma/client/runtime/library";

export interface TermDetail {
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  label: string;
}

export interface FeeBreakdown {
  term1: TermDetail;
  term2: TermDetail;
  term3: TermDetail;
  totalDiscount: number;
  annualNet: number;
  paymentType: string;
}

/**
 * Calculates the breakdown for annual tuition fees.
 * Term-wise: 50% / 25% / 25%
 * Annual: 100% / 0% / 0%
 * 
 * @param annualTuition Total annual amount (Gross)
 * @param totalDiscount Sum of all applied discounts
 * @param paymentType "Term-wise" or "Annual"
 */
export const calculateTermBreakdown = (
  annualTuition: number | Decimal,
  totalDiscount: number | Decimal = 0,
  paymentType: string = "Term-wise"
): FeeBreakdown => {
  const tuition = typeof annualTuition === 'number' ? annualTuition : Number(annualTuition);
  const discount = typeof totalDiscount === 'number' ? totalDiscount : Number(totalDiscount);
  
  let t1Amt, t2Amt, t3Amt;

  if (paymentType === "Annual") {
    t1Amt = Math.max(0, tuition - discount);
    t2Amt = 0;
    t3Amt = 0;
  } else {
    // Strict legacy split: 50% / 25% / 25% with recursive discount handling
    let remainingDiscount = discount;
    
    let t3Base = Math.round(tuition * 0.25);
    let t2Base = Math.round(tuition * 0.25);
    let t1Base = Math.round(tuition * 0.5);

    // Apply discount starting from Term 3 backwards
    t3Amt = Math.max(0, t3Base - remainingDiscount);
    remainingDiscount = Math.max(0, remainingDiscount - t3Base);

    t2Amt = Math.max(0, t2Base - remainingDiscount);
    remainingDiscount = Math.max(0, remainingDiscount - t2Base);

    t1Amt = Math.max(0, t1Base - remainingDiscount);
  }

  const currentYear = new Date().getFullYear();
  
  return {
    term1: { 
        amount: t1Amt, 
        dueDate: new Date(currentYear, 5, 10), // June 10
        isPaid: false, 
        label: paymentType === "Annual" ? "Annual Settlement" : "Term 1 (50%)" 
    },
    term2: { 
        amount: t2Amt, 
        dueDate: new Date(currentYear, 9, 10), // Oct 10
        isPaid: false, 
        label: "Term 2 (25%)" 
    },
    term3: { 
        amount: t3Amt, 
        dueDate: new Date(currentYear + 1, 0, 10), // Jan 10
        isPaid: false, 
        label: "Term 3 (Settlement)" 
    },
    totalDiscount: discount,
    annualNet: t1Amt + t2Amt + t3Amt,
    paymentType
  };
};

/**
 * High-visibility late fee calculation
 * Legacy Rule: ₹5 per day from the first day late.
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
 * Validates if the payment meets the cumulative milestone (50/75/100%).
 * 
 * @param paymentFor The term being paid
 * @param newTotalPaid Total paid after this transaction
 * @param netAnnual Annual fee after all discounts
 */
export const validateMilestone = (
  paymentFor: string, 
  newTotalPaid: number, 
  netAnnual: number
): { success: boolean; required: number; percent: number } => {
  let threshold = 0;
  let percent = 0;

  if (paymentFor === "term1") { threshold = netAnnual * 0.50; percent = 50; }
  else if (paymentFor === "term2") { threshold = netAnnual * 0.75; percent = 75; }
  else if (paymentFor === "term3") { threshold = netAnnual * 1.00; percent = 100; }
  else return { success: true, required: 0, percent: 0 };

  return {
    success: newTotalPaid >= (threshold - 1), // Allow 1 rupee rounding buffer
    required: threshold,
    percent
  };
};

/**
 * Checks if Advance payment is allowed (Legacy rule: current year must be clear).
 */
export const canPayAdvance = (totalPaid: number, netAnnual: number): boolean => {
  return totalPaid >= (netAnnual - 1);
};

/**
 * Generates a standard UPI Intent string for QR code generation.
 * Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&tr=REF&tn=NOTE
 */
export const generateUPIString = (params: {
  vpa: string;
  name: string;
  amount: number;
  reference: string;
  note: string;
}) => {
  const { vpa, name, amount, reference, note } = params;
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${amount}&tr=${encodeURIComponent(reference)}&tn=${encodeURIComponent(note)}&cu=INR`;
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
