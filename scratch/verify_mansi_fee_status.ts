import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== VERIFYING K.MANSI (VM513) FEE STATUS IN ERP ENGINE ===");

  const mansi = await prisma.student.findFirst({
    where: { branchId: BRANCH_ID, admissionNumber: "VM513" },
    include: {
      collections: true,
      financial: true
    }
  });

  if (!mansi) {
    console.log("K.MANSI not found!");
    return;
  }

  console.log(`Student ID: ${mansi.id}`);
  console.log(`Admission Number: ${mansi.admissionNumber}`);
  console.log(`Name: ${mansi.firstName} ${mansi.lastName}`);
  console.log(`Collections Count: ${mansi.collections.length}`);

  let tuitionPaid = 0;
  let transportPaid = 0;
  let totalPaid = 0;

  for (const c of mansi.collections) {
    const paid = Number(c.totalPaid || c.amountPaid || 0);
    totalPaid += paid;
    const mode = (c.allocatedTo as any)?.feeHead?.toLowerCase() || "tuition";

    if (mode.includes("transport")) {
      transportPaid += paid;
    } else {
      tuitionPaid += paid;
    }

    console.log(`- Receipt #${c.receiptNumber} (Book #${c.bookReceiptNo}): ₹${paid} | Mode: ${(c.allocatedTo as any)?.feeHead}`);
  }

  console.log(`\nTotals for K.MANSI:`);
  console.log(`- Tuition Paid:   ₹${tuitionPaid}  (Expected: ₹30,000)`);
  console.log(`- Transport Paid: ₹${transportPaid}  (Expected: ₹10,000)`);
  console.log(`- Total Paid:     ₹${totalPaid}  (Expected: ₹40,000)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
