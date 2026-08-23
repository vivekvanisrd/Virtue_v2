import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== SEARCHING EXACT K.MANSI & VM513 IN DB ===");

  const students = await prisma.student.findMany({
    where: {
      branchId: BRANCH_ID,
      OR: [
        { admissionNumber: { contains: "513" } },
        { firstName: { contains: "MANSI" } },
        { lastName: { contains: "MANSI" } }
      ]
    },
    include: {
      collections: true,
      transport: true,
      financial: true,
      academic: { include: { class: true } }
    }
  });

  console.log(`Found ${students.length} student records containing 513 or MANSI:`);
  for (const s of students) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Student ID: ${s.id}`);
    console.log(`AdmNo: "${s.admissionNumber}"`);
    console.log(`Name: "${s.firstName} ${s.lastName}"`);
    console.log(`Class: "${s.academic?.class?.name}"`);
    console.log(`Transport Required: ${s.transport?.transportRequired}`);
    console.log(`Collections Count: ${s.collections.length}`);

    for (const c of s.collections) {
      console.log(`  └─ Receipt #${c.receiptNumber} (Book #${c.bookReceiptNo}): ₹${c.totalPaid} | Date: ${c.paymentDate} | AllocatedTo:`, JSON.stringify(c.allocatedTo));
    }
  }

  // Check collections with bookReceiptNo 680 and 713 directly!
  const c680 = await prisma.collection.findFirst({
    where: { branchId: BRANCH_ID, bookReceiptNo: "680" },
    include: { student: true }
  });

  console.log(`\nDirect Receipt Book #680 in DB:`);
  console.log(`- ReceiptNo: ${c680?.receiptNumber} | Amount: ₹${c680?.totalPaid} | Date: ${c680?.paymentDate}`);
  console.log(`- Student: ${c680?.student?.firstName} ${c680?.student?.lastName} (AdmNo: ${c680?.student?.admissionNumber})`);
  console.log(`- AllocatedTo:`, JSON.stringify(c680?.allocatedTo));

  const c713 = await prisma.collection.findFirst({
    where: { branchId: BRANCH_ID, bookReceiptNo: "713" },
    include: { student: true }
  });

  console.log(`\nDirect Receipt Book #713 in DB:`);
  console.log(`- ReceiptNo: ${c713?.receiptNumber} | Amount: ₹${c713?.totalPaid} | Date: ${c713?.paymentDate}`);
  console.log(`- Student: ${c713?.student?.firstName} ${c713?.student?.lastName} (AdmNo: ${c713?.student?.admissionNumber})`);
  console.log(`- AllocatedTo:`, JSON.stringify(c713?.allocatedTo));
}

main().catch(console.error).finally(() => prisma.$disconnect());
