const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reconcileStuden2() {
  const studentId = "1077d363-3341-49e7-92d9-9ad48f1edb71"; // Studen2 S2
  const paymentId = "pay_SYHr3rn0OGektN";
  
  console.log(`🚀 Reconciling payment ${paymentId} for Studen2 S2...`);

  // Check if already exists
  const existing = await prisma.collection.findFirst({
    where: { paymentReference: paymentId }
  });

  if (existing) {
    console.log("ALREADY RECONCILED.");
    return;
  }

  try {
    // We assume it's for Term 1 based on the sequence
    await prisma.collection.create({
      data: {
        studentId,
        receiptNumber: `VIVA-REC-FY 2026-AUTO-S2-PAY`,
        schoolId: "VIVA",
        branchId: "VIVA-BR-01",
        financialYearId: "FY-VIVA-2026-27",
        amountPaid: "250000", // Term 1 is 2.5L
        lateFeePaid: "0",
        convenienceFee: "4426.25", // 2.5L * 1.0177 factor approx
        totalPaid: "254426.25",
        paymentMode: "Razorpay",
        paymentReference: paymentId,
        paymentDate: new Date(),
        collectedBy: "SYSTEM_RECONCILE_USER_REQUEST",
        status: "Success",
        allocatedTo: {
          terms: ["term1"],
          waiverReason: "[USER_REPORTED_MISSING] Reconciled manually after webhook check.",
          lateFeeWaived: false
        }
      }
    });
    console.log("SUCCESS: Studen2 S2 Term 1 marked as PAID.");
  } catch (err) {
    console.error("FAILED:", err.message);
  }
}

reconcileStuden2()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
