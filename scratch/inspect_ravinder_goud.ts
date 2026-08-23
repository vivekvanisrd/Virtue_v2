import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== INSPECTING RAVINDER GOUD IN DB ===");

  const students = await prisma.student.findMany({
    where: {
      branchId: BRANCH_ID,
      OR: [
        { firstName: { contains: "RAVINDER" } },
        { lastName: { contains: "RAVINDER" } },
        { family: { fatherName: { contains: "RAVINDER" } } }
      ]
    },
    include: {
      collections: true,
      family: true,
      academic: { include: { class: true } }
    }
  });

  console.log(`Found ${students.length} student records related to RAVINDER:`);
  for (const s of students) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Student ID: ${s.id}`);
    console.log(`AdmNo: ${s.admissionNumber}`);
    console.log(`Student Name: ${s.firstName} ${s.lastName}`);
    console.log(`Father Name: ${s.family?.fatherName}`);
    console.log(`Class: ${s.academic?.class?.name || "N/A"}`);
    console.log(`Collections Count: ${s.collections.length}`);

    for (const c of s.collections) {
      console.log(`  └─ Collection ID: ${c.id} | ReceiptNo: ${c.receiptNumber} | BookNo: ${c.bookReceiptNo} | TotalPaid: ₹${c.totalPaid}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
