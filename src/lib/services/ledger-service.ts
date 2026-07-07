import prisma from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export interface TransportPaymentEvent {
  type: 'PAYMENT';
  source: 'TRANSPORT';
  amount: number;
  date: Date;
  reference: string;
  mode: string;
}

export interface TransportCalculationResult {
  transportPaid: number;
  transportEvents: TransportPaymentEvent[];
}

export interface StudentLedgerData {
  academic: {
    gross: number;
    discounts: number;
    net: number;
    paid: number;
    due: number;
  };
  transport: {
    annual: number;
    waivers: number;
    net: number;
    paid: number;
    due: number;
  };
  totalDue: number;
  history: any[];
}

/**
 * calculateTransportCollections
 * 
 * Reusable single source of truth helper for transport collections.
 * Parses unified collections and extracts transport payments.
 */
export function calculateTransportCollections(collections: any[]): TransportCalculationResult {
  let transportPaid = 0;
  const transportEvents: TransportPaymentEvent[] = [];

  for (const c of collections) {
    const allocated = c.allocatedTo as {
      ancillaryPaid?: Array<{ key: string; amount: number; label?: string }>;
    } | null;

    if (allocated && Array.isArray(allocated.ancillaryPaid)) {
      for (const item of allocated.ancillaryPaid) {
        if (item && (item.key === 'transportFee' || item.key === 'transport')) {
          const amt = Number(item.amount || 0);
          if (amt > 0) {
            transportPaid += amt;
            transportEvents.push({
              type: 'PAYMENT',
              source: 'TRANSPORT',
              amount: amt,
              date: new Date(c.paymentDate),
              reference: c.receiptNumber,
              mode: c.paymentMode || 'CASH'
            });
          }
        }
      }
    }
  }

  return { transportPaid, transportEvents };
}

/**
 * calculateStudentLedger
 * 
 * The Single Source of Truth for Student Financials (V3 Elite ERP).
 * Aggregates all Academic and Transport sub-ledgers into a unified view.
 */
export async function calculateStudentLedger(studentId: string): Promise<StudentLedgerData> {
  // 1. Fetch all financial components (V2 models only, no legacy tables)
  const [financial, transport, collections, creditNotes] = await Promise.all([
    prisma.financialRecord.findUnique({
      where: { studentId },
      include: { feeStructure: true }
    }),
    prisma.studentTransport.findFirst({
      where: { studentId, isDeleted: false },
      include: { route: true, pickupStop: true, dropStop: true }
    }),
    prisma.collection.findMany({
      where: { studentId, status: "Success" },
      orderBy: { paymentDate: 'desc' }
    }),
    prisma.creditNote.findMany({
      where: { studentId }
    })
  ]);

  // 2. Transport Calculation via V2 helper
  const { transportPaid, transportEvents } = calculateTransportCollections(collections);

  // 3. Academic Calculation (subtracting transportPaid to prevent double-counting)
  const grossAcademic = Number(financial?.feeStructure?.totalAmount || 0);
  const totalDiscounts = Number(financial?.totalDiscount || 0);
  const netAcademic = grossAcademic - totalDiscounts;
  const academicPaid = Math.max(0, collections.reduce((sum: number, c: any) => sum + Number(c.totalPaid), 0) - transportPaid);
  const refundsToAcademic = creditNotes.reduce((sum: number, cn: any) => sum + Number(cn.amount), 0);
  
  const academicDue = netAcademic - academicPaid + refundsToAcademic;

  // 4. Transport V2 Fee Calculation
  const monthlyFare = Number(transport?.monthlyFee || 0);
  const transportMonths = 10; // V2 default billing cycle
  const grossTransport = monthlyFare * transportMonths;
  const transportWaivers = 0; // V2 currently does not have a separate waivers field in the schema
  const netTransport = grossTransport - transportWaivers;
  const transportDue = netTransport - transportPaid;

  // 5. Combined History Timeline
  const history = [
    ...collections.map((c: any) => {
      let unifiedTransportAmt = 0;
      const allocated = c.allocatedTo as any;
      if (allocated && Array.isArray(allocated.ancillaryPaid)) {
        const transportItem = allocated.ancillaryPaid.find((a: any) => a && (a.key === 'transportFee' || a.key === 'transport'));
        if (transportItem) {
          unifiedTransportAmt = Number(transportItem.amount || 0);
        }
      }
      
      const academicAmt = Number(c.totalPaid) - unifiedTransportAmt;
      const events: any[] = [];
      if (academicAmt > 0) {
        events.push({
          type: 'PAYMENT',
          source: 'ACADEMIC',
          amount: academicAmt,
          date: c.paymentDate,
          reference: c.receiptNumber,
          mode: c.paymentMode
        });
      }
      return events;
    }).flat(),
    ...transportEvents,
    ...creditNotes.map(cn => ({
      type: 'REFUND',
      source: 'CREDIT_NOTE',
      amount: -Number(cn.amount),
      date: new Date(), // Fallback as CreditNote model doesn't store a date in schema
      reference: `CN-${cn.id.substring(0, 8)}`,
      reason: cn.reason || 'Credit Note'
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    academic: {
      gross: grossAcademic,
      discounts: totalDiscounts,
      net: netAcademic,
      paid: academicPaid,
      due: academicDue
    },
    transport: {
      annual: grossTransport,
      waivers: transportWaivers,
      net: netTransport,
      paid: transportPaid,
      due: transportDue
    },
    totalDue: academicDue + transportDue,
    history
  };
}
