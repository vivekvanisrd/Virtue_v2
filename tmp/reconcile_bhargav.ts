import { PrismaClient } from "@prisma/client";
import { CounterService } from "../src/lib/services/counter-service";

const prisma = new PrismaClient();

/**
 * DIRECT RECONCILIATION SCRIPT (V7 - FINAL SUCCESS)
 * 
 * Reconciles the missing fee collection for Bhargav G Yadav.
 * Marks Term 1 as PAID by allocating the collection correctly.
 */
async function reconcile() {
  const studentId = "95f9ac56-cb39-498f-9876-76c867961c5f";
  const paymentId = "pay_SYFeeJyAznhwRJ";
  
  const totalPaid = 12721.25;
  const baseAmount = 12500;
  const convenienceFee = totalPaid - baseAmount;

  console.log(`[RECONCILE] Performing direct database settlement for Bhargav...`);

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { 
        school: true,
        academic: { include: { branch: true } }
      }
    });

    if (!student) throw new Error("Student not found");
    if (!student.academic?.branch) throw new Error("Student academic record or branch not found");

    const activeFY = await prisma.financialYear.findFirst({
      where: { schoolId: student.schoolId, isCurrent: true }
    });

    if (!activeFY) throw new Error("No active Financial year found for school.");

    await prisma.$transaction(async (tx) => {
      // 1. Generate Receipt Number
      const receiptNumber = await CounterService.generateReceiptNumber({
        schoolId: student.schoolId,
        schoolCode: student.school.code,
        branchId: student.academic!.branchId,
        branchCode: student.academic!.branch.code,
        year: activeFY.name.split("-")[0] 
      }, tx);

      // 2. Create the Collection record with proper Allocation
      // The UI checks the 'allocatedTo' JSON to see which terms are paid.
      await tx.collection.create({
        data: {
          studentId: student.id,
          financialYearId: activeFY.id,
          schoolId: student.schoolId,
          branchId: student.academic!.branchId,
          amountPaid: baseAmount,
          lateFeePaid: 0,
          convenienceFee: convenienceFee,
          totalPaid: totalPaid,
          paymentMode: "Razorpay",
          paymentDate: new Date(),
          paymentReference: paymentId,
          receiptNumber: receiptNumber,
          collectedBy: "SYSTEM_RECONCILE",
          status: "Success",
          isAutomated: true,
          allocatedTo: {
            terms: ["term1"],
            lateFeeWaived: false,
            waiverReason: "[CRITICAL_RECOVERY_RECONCILE]"
          }
        }
      });
    });

    console.log(`✅ SUCCESS: Bhargav's payment is now reconciled.`);
    console.log(`🔗 Transaction Reference: ${paymentId}`);
    console.log(`📝 All dues for TERM 1 are now settled.`);

  } catch (err: any) {
    console.error(`❌ FAILED: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

reconcile();
