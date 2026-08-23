import { prismaBypass as prisma } from "../src/lib/prisma";

const SCHOOL_ID = "VIVES";

async function main() {
  console.log("=== CHECKING DB COLLECTIONS FOR VIVES ===");

  const collections = await prisma.collection.findMany({
    where: { schoolId: SCHOOL_ID },
    include: {
      student: { select: { firstName: true, lastName: true, admissionNumber: true } }
    }
  });

  console.log(`Total Collection Payment Receipts in DB for VIVES: ${collections.length}`);

  if (collections.length > 0) {
    console.log("Sample DB Collections:");
    console.log(collections.slice(0, 5).map(c => ({
      receiptNo: c.receiptNo,
      student: `${c.student?.firstName} ${c.student?.lastName}`,
      admNo: c.student?.admissionNumber,
      amount: c.totalPaid,
      date: c.paymentDate,
      mode: c.paymentMode
    })));
  }
}

main().catch(console.error);
