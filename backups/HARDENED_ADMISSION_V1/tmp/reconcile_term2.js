const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reconcileTerm2() {
  const studentId = "1077d363-3341-49e7-92d9-9ad48f1edb71"; // Studen2 S2
  const paymentId = "pay_SYIXAfVWPjcZu4";
  
  console.log(`🚀 Reconciling Term 2 payment ${paymentId} for Studen2 S2...`);

  // Check if already exists
  const existing = await prisma.collection.findFirst({
    where: { paymentReference: paymentId }
  });

  if (existing) {
    console.log("ALREADY RECONCILED.");
    return;
  }

  try {
    await prisma.collection.create({
      data: {
        studentId,
        receiptNumber: `VIVA-REC-FY 2026-AUTO-S2-TERM2`,
        schoolId: "VIVA",
        branchId: "VIVA-BR-01",
        financialYearId: "FY-VIVA-2026-27",
        amountPaid: "125000", // Term 2 is 1.25L
        lateFeePaid: "0",
        convenienceFee: "2213.12", // 1.25L * 1.0177 factor approx
        totalPaid: "127213.12",
        paymentMode: "Razorpay",
        paymentReference: paymentId,
        paymentDate: new Date(),
        collectedBy: "SYSTEM_RECONCILE_FIX_V3",
        status: "Success",
        allocatedTo: {
          terms: ["term2"],
          waiverReason: "[USER_REPORTED_REFRESH_ISSUE] Reconciled after deep sync failure.",
          lateFeeWaived: false
        }
      }
    });
    console.log("SUCCESS: Studen2 S2 Term 2 marked as PAID.");
  } catch (err) {
    console.error("FAILED:", err.message);
  }
}

reconcileTerm2()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
