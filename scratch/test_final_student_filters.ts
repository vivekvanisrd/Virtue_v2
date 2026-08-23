import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== VERIFYING FINAL STUDENT DIRECTORY & SEARCH FOR RAVINDER GOUD ===");

  // Find students matching RAVINDER in family or student name
  const students = await prisma.student.findMany({
    where: {
      branchId: "VIVES-RCB",
      OR: [
        { firstName: { contains: "RAVINDER", mode: 'insensitive' } },
        { lastName: { contains: "RAVINDER", mode: 'insensitive' } },
        { family: { fatherName: { contains: "RAVINDER", mode: 'insensitive' } } }
      ]
    },
    include: {
      family: true,
      collections: { where: { status: "Success" } },
      academic: { include: { class: true } }
    }
  });

  console.log(`Matched ${students.length} real active student records for RAVINDER:`);
  for (const s of students) {
    console.log(`- Student: ${s.firstName} ${s.lastName} | AdmNo: ${s.admissionNumber} | Class: ${s.academic?.class?.name || "N/A"}`);
    console.log(`  Father: ${s.family?.fatherName} | Collections: ${s.collections.length}`);
    for (const c of s.collections) {
      console.log(`    └─ Receipt #${c.receiptNumber} (Book #${c.bookReceiptNo}): ₹${c.totalPaid}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
