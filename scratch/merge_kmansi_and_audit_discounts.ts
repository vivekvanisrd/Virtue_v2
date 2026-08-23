import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== MERGING K.MANSI & AUDITING ZERO-PAYMENT DISCOUNTS ===");

  // 1. MERGE K.MANSI (VM0513 -> VM513)
  const mainMansi = await prisma.student.findFirst({
    where: { branchId: BRANCH_ID, admissionNumber: "VM513" }
  });

  const secondaryMansi = await prisma.student.findFirst({
    where: { branchId: BRANCH_ID, admissionNumber: "VM0513" }
  });

  if (mainMansi && secondaryMansi) {
    console.log(`Merging secondary K.MANSI (${secondaryMansi.id}) into main K.MANSI (${mainMansi.id})...`);

    // Move collection #713 to mainMansi
    await prisma.collection.updateMany({
      where: { studentId: secondaryMansi.id },
      data: { studentId: mainMansi.id }
    });

    await prisma.ledgerEntry.updateMany({
      where: { studentId: secondaryMansi.id },
      data: { studentId: mainMansi.id }
    });

    // Ensure transport is enabled for mainMansi
    await prisma.transportDetail.upsert({
      where: { studentId: mainMansi.id },
      update: { transportRequired: true, monthlyFee: 10000 },
      create: {
        studentId: mainMansi.id,
        schoolId: "VIVES",
        branchId: BRANCH_ID,
        transportRequired: true,
        monthlyFee: 10000
      }
    });

    // Clean up secondary student profile
    await prisma.academicRecord.deleteMany({ where: { studentId: secondaryMansi.id } });
    await prisma.familyDetail.deleteMany({ where: { studentId: secondaryMansi.id } });
    await prisma.transportDetail.deleteMany({ where: { studentId: secondaryMansi.id } });
    await prisma.financialRecord.deleteMany({ where: { studentId: secondaryMansi.id } });
    await prisma.student.deleteMany({ where: { id: secondaryMansi.id } });

    console.log("K.MANSI profiles successfully merged!");
  }

  // 2. AUDIT ZERO-PAYMENT DISCOUNTS
  const zeroPaymentStudents = await prisma.student.findMany({
    where: {
      branchId: BRANCH_ID,
      collections: { none: {} }
    },
    include: { financial: true }
  });

  console.log(`\nInspecting ${zeroPaymentStudents.length} Zero-Payment Students for 100% discount overrides...`);
  let fullDiscountCount = 0;

  for (const s of zeroPaymentStudents) {
    if (s.financial) {
      const tuition = Number(s.financial.annualTuition || 0);
      const discount = Number(s.financial.totalDiscount || 0);

      if (tuition > 0 && discount >= tuition) {
        fullDiscountCount++;
        // Reset full discount override so dues show correctly
        await prisma.financialRecord.update({
          where: { id: s.financial.id },
          data: {
            totalDiscount: 0,
            netTuition: tuition
          }
        });
      }
    }
  }

  console.log(`Reset ${fullDiscountCount} zero-payment students who had 100% discount overrides to 0 discount (full dues remaining).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
