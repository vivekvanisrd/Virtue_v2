import prisma from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

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
 * calculateStudentLedger
 * 
 * The Single Source of Truth for Student Financials (V3 Elite ERP).
 * Aggregates all Academic and Transport sub-ledgers into a unified view.
 */
export async function calculateStudentLedger(studentId: string): Promise<StudentLedgerData> {
  // 1. Fetch all financial components
  const [financial, transport, collections, transportCollections, creditNotes] = await Promise.all([
    prisma.financialRecord.findUnique({
      where: { studentId },
      include: { feeStructure: true }
    }),
    prisma.transportAssignment.findUnique({
      where: { studentId },
      include: { route: true, stop: true }
    }),
    prisma.collection.findMany({
      where: { studentId, status: "Success" },
      orderBy: { paymentDate: 'desc' }
    }),
    prisma.transportCollection.findMany({
      where: { studentId },
      orderBy: { paymentDate: 'desc' }
    }),
    prisma.creditNote.findMany({
      where: { studentId },
      orderBy: { paymentDate: 'desc' }
    })
  ]);

  // 2. Academic Calculation
  const grossAcademic = Number(financial?.feeStructure?.totalAmount || 0);
  const totalDiscounts = Number(financial?.totalDiscount || 0);
  const netAcademic = grossAcademic - totalDiscounts;
  const academicPaid = collections.reduce((sum: number, c: any) => sum + Number(c.totalPaid), 0);
  const refundsToAcademic = creditNotes.reduce((sum: number, cn: any) => sum + Number(cn.amount), 0);
  
  const academicDue = netAcademic - academicPaid + refundsToAcademic;

  // 3. Transport Calculation
  const monthlyFare = Number(transport?.monthlyFare || 0);
  const transportMonths = transport?.transportMonths || 10;
  const grossTransport = monthlyFare * transportMonths;
  const transportWaivers = Number(transport?.transportWaiver || 0);
  const netTransport = grossTransport - transportWaivers;
  const transportPaid = transportCollections.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
  
  const transportDue = netTransport - transportPaid;

  // 4. Combined History Timeline
  const history = [
    ...collections.map((c: any) => ({
      type: 'PAYMENT',
      source: 'ACADEMIC',
      amount: Number(c.totalPaid),
      date: c.paymentDate,
      reference: c.receiptNumber,
      mode: c.paymentMode
    })),
    ...transportCollections.map(c => ({
      type: 'PAYMENT',
      source: 'TRANSPORT',
      amount: Number(c.amount),
      date: c.paymentDate,
      reference: c.receiptNo,
      mode: 'CASH' // Default for standalone transport usually
    })),
    ...creditNotes.map(cn => ({
      type: 'REFUND',
      source: 'CREDIT_NOTE',
      amount: -Number(cn.amount),
      date: cn.paymentDate,
      reference: cn.cnNumber,
      reason: cn.reason
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
