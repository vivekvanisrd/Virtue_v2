import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== DEEP INSPECTION OF K.MANSI COLLECTIONS & PROFILE ===");

  const mansi = await prisma.student.findFirst({
    where: {
      branchId: BRANCH_ID,
      OR: [
        { admissionNumber: "VM513" },
        { admissionNumber: "VM0513" },
        { firstName: { contains: "MANSI" } }
      ]
    },
    include: {
      collections: true,
      financial: {
        include: {
          components: true,
          discounts: true
        }
      },
      academic: { include: { class: true } }
    }
  });

  if (!mansi) {
    console.log("No student found!");
    return;
  }

  console.log(`Student ID: ${mansi.id}`);
  console.log(`Admission Number: ${mansi.admissionNumber}`);
  console.log(`Student Name: ${mansi.firstName} ${mansi.lastName}`);
  console.log(`Class: ${mansi.academic?.class?.name}`);

  console.log(`\nCollections count: ${mansi.collections.length}`);
  for (const c of mansi.collections) {
    console.log(`\n- Collection ID: ${c.id}`);
    console.log(`  receiptNumber: ${c.receiptNumber} | bookReceiptNo: ${c.bookReceiptNo}`);
    console.log(`  studentId: ${c.studentId}`);
    console.log(`  amountPaid / totalPaid: ${c.amountPaid} / ${c.totalPaid}`);
    console.log(`  status: ${c.status} | isDeleted: ${c.isDeleted}`);
    console.log(`  allocatedTo:`, JSON.stringify(c.allocatedTo));
  }

  // Also check if receipt #680 is linked to another student ID!
  const receipt680 = await prisma.collection.findFirst({
    where: { branchId: BRANCH_ID, bookReceiptNo: "680" },
    include: { student: true }
  });

  console.log(`\nReceipt Book #680 (₹30,000):`);
  console.log(`- ID: ${receipt680?.id}`);
  console.log(`- studentId: ${receipt680?.studentId}`);
  console.log(`- Linked Student: ${receipt680?.student?.firstName} ${receipt680?.student?.lastName} (AdmNo: ${receipt680?.student?.admissionNumber})`);

  const receipt713 = await prisma.collection.findFirst({
    where: { branchId: BRANCH_ID, bookReceiptNo: "713" },
    include: { student: true }
  });

  console.log(`\nReceipt Book #713 (₹10,000):`);
  console.log(`- ID: ${receipt713?.id}`);
  console.log(`- studentId: ${receipt713?.studentId}`);
  console.log(`- Linked Student: ${receipt713?.student?.firstName} ${receipt713?.student?.lastName} (AdmNo: ${receipt713?.student?.admissionNumber})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
