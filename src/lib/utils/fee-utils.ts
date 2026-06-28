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
  installments: (TermDetail & { key: string })[];
  ancillary?: Record<string, TermDetail>;
}

/**
 * Calculates the breakdown for annual tuition fees.
 * Term-wise: 50% / 25% / 25%
 * Annual: 100% / 0% / 0%
 * Monthly: 10 equal installments (June to March) - No discounts allowed.
 * 
 * @param annualTuition Total annual amount (Gross)
 * @param totalDiscount Sum of all applied discounts
 * @param paymentType "Term-wise", "Annual", or "Monthly"
 */
export const calculateTermBreakdown = (
  annualTuition: number | Decimal,
  totalDiscount: number | Decimal = 0,
  paymentType: string = "Term-wise"
): FeeBreakdown => {
  const tuition = typeof annualTuition === 'number' ? annualTuition : Number(annualTuition);
  const discount = paymentType === "Monthly" ? 0 : (typeof totalDiscount === 'number' ? totalDiscount : Number(totalDiscount));
  
  let t1Amt = 0, t2Amt = 0, t3Amt = 0;
  const currentYear = new Date().getFullYear();
  const installments: (TermDetail & { key: string })[] = [];

  if (paymentType === "Annual" || paymentType === "One-time" || paymentType === "One-Time") {
    t1Amt = Math.max(0, tuition - discount);
    t2Amt = 0;
    t3Amt = 0;
    installments.push({
      key: "term1",
      amount: t1Amt,
      dueDate: new Date(currentYear, 5, 10), // June 10
      isPaid: false,
      label: "Annual Settlement"
    });
  } else if (paymentType === "Monthly") {
    const netTuition = Math.max(0, tuition); // Forced 0 discount above
    const baseAmt = Math.floor(netTuition / 10);
    const remainder = netTuition - (baseAmt * 10);

    for (let m = 0; m < 10; m++) {
      const monthIndex = (5 + m) % 12; // June is index 5
      const yearOffset = Math.floor((5 + m) / 12);
      const dueDate = new Date(currentYear + yearOffset, monthIndex, 10);
      const label = `Month ${m + 1} (${dueDate.toLocaleString('en-US', { month: 'short' })})`;
      const amount = m === 9 ? (baseAmt + remainder) : baseAmt;
      
      installments.push({
        key: `month${m + 1}`,
        amount,
        dueDate,
        isPaid: false,
        label
      });
    }
    t1Amt = installments[0]?.amount || 0;
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

    installments.push(
      {
        key: "term1",
        amount: t1Amt,
        dueDate: new Date(currentYear, 5, 10),
        isPaid: false,
        label: "Term 1 (50%)"
      },
      {
        key: "term2",
        amount: t2Amt,
        dueDate: new Date(currentYear, 9, 10),
        isPaid: false,
        label: "Term 2 (25%)"
      },
      {
        key: "term3",
        amount: t3Amt,
        dueDate: new Date(currentYear + 1, 0, 10),
        isPaid: false,
        label: "Term 3 (Settlement)"
      }
    );
  }

  return {
    term1: installments.find(inst => inst.key === "term1") || installments[0] || { amount: 0, dueDate: new Date(), isPaid: false, label: "" },
    term2: installments.find(inst => inst.key === "term2") || { amount: 0, dueDate: new Date(), isPaid: false, label: "" },
    term3: installments.find(inst => inst.key === "term3") || { amount: 0, dueDate: new Date(), isPaid: false, label: "" },
    totalDiscount: discount,
    annualNet: installments.reduce((sum, inst) => sum + inst.amount, 0),
    paymentType,
    installments
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
  note: string;
  tr?: string;
}) => {
  const { vpa, name, amount, note, tr } = params;
  const formattedAmount = Number(amount).toFixed(2);
  let uri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${formattedAmount}&tn=${encodeURIComponent(note)}`;
  if (tr) {
    uri += `&tr=${encodeURIComponent(tr)}`;
  }
  return uri + `&cu=INR`;
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
