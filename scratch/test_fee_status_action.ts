import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== TESTING getStudentFeeStatus COMPONENT INTEGRATION ===");

  // Find 10 students with collections
  const studentsWithCollections = await prisma.student.findMany({
    where: {
      branchId: BRANCH_ID,
      collections: { some: {} }
    },
    take: 10,
    include: {
      collections: true,
      academic: { include: { class: true } }
    }
  });

  console.log(`Found ${studentsWithCollections.length} students with collections in DB:`);
  for (const s of studentsWithCollections) {
    console.log(`\n- Student: ${s.firstName} ${s.lastName} (AdmNo: ${s.admissionNumber}, Class: ${s.academic?.class?.name})`);
    console.log(`  Collections in DB: ${s.collections.length}`);
    for (const c of s.collections) {
      console.log(`    └─ Receipt #${c.receiptNumber} (Book #${c.bookReceiptNo}): ₹${c.totalPaid} on ${c.paymentDate}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
