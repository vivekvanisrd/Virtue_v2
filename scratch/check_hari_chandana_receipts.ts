import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== INSPECTING HARI CHANDANA IN DB ===");

  const students = await prisma.student.findMany({
    where: {
      branchId: BRANCH_ID,
      OR: [
        { firstName: { contains: "HARI" } },
        { lastName: { contains: "HARI" } },
        { firstName: { contains: "CHANDANA" } },
        { lastName: { contains: "CHANDANA" } },
        { admissionNumber: { contains: "HARI" } }
      ]
    },
    include: {
      collections: true,
      financial: true,
      academic: { include: { class: true } }
    }
  });

  console.log(`Found ${students.length} student records for HARI / CHANDANA:`);
  for (const s of students) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Student ID: ${s.id}`);
    console.log(`AdmNo: ${s.admissionNumber}`);
    console.log(`Name: ${s.firstName} ${s.lastName}`);
    console.log(`Class: ${s.academic?.class?.name || "N/A"}`);
    console.log(`Collections Count: ${s.collections.length}`);

    if (s.collections.length > 0) {
      for (const c of s.collections) {
        console.log(`  └─ Collection ID: ${c.id} | ReceiptNo: ${c.receiptNumber} | BookNo: ${c.bookReceiptNo} | TotalPaid: ₹${c.totalPaid} | Date: ${c.paymentDate}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
