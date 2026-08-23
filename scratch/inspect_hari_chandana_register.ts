import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECTING HARI CHANDANA ACROSS ALL DB RECORDS & COLLECTIONS ===");

  // Find all collections for receipt 310 or matching HARI CHANDANA
  const c310 = await prisma.collection.findFirst({
    where: { branchId: "VIVES-RCB", bookReceiptNo: "310" },
    include: { student: true }
  });

  console.log("\nReceipt #310 in DB:");
  console.log(`- ReceiptNo: ${c310?.receiptNumber} | Amount: ₹${c310?.totalPaid} | Date: ${c310?.paymentDate}`);
  console.log(`- Linked Student ID: ${c310?.student?.id}`);
  console.log(`- Linked Student AdmNo: ${c310?.student?.admissionNumber}`);
  console.log(`- Linked Student Name: ${c310?.student?.firstName} ${c310?.student?.lastName}`);
  console.log(`- Metadata AllocatedTo:`, JSON.stringify(c310?.allocatedTo, null, 2));

  // Find all student records with name containing HARI CHANDANA
  const allHariChandanas = await prisma.student.findMany({
    where: {
      branchId: "VIVES-RCB",
      OR: [
        { firstName: { contains: "HARI CHANDANA" } },
        { lastName: { contains: "HARI CHANDANA" } }
      ]
    },
    include: {
      collections: true,
      academic: { include: { class: true } },
      financial: true
    }
  });

  console.log(`\nAll HARI CHANDANA Student Profiles (${allHariChandanas.length}):`);
  for (const s of allHariChandanas) {
    console.log(`\n-------------------------------------------------------------`);
    console.log(`ID: ${s.id}`);
    console.log(`Name: ${s.firstName} ${s.lastName} | AdmNo: ${s.admissionNumber}`);
    console.log(`Class: ${s.academic?.class?.name || "N/A"}`);
    console.log(`Collections: ${s.collections.length}`);
    if (s.financial) {
      console.log(`Financial: AnnualTuition=₹${s.financial.annualTuition}, NetTuition=₹${s.financial.netTuition}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
