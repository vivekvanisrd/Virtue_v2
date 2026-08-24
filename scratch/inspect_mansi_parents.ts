import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Detailed Parent & Phone Inspection for MANSI Profiles...\n");

  const mansiList = await prisma.student.findMany({
    where: {
      branchId: "VIVES-RCB",
      firstName: { contains: "MANSI", mode: "insensitive" }
    },
    include: {
      family: true,
      academic: { include: { class: true, section: true } },
      collections: true
    }
  });

  console.log(`Found ${mansiList.length} MANSI profiles in DB:`);
  mansiList.forEach(s => {
    console.log(`- Student: "${s.firstName}" "${s.lastName || ''}"`);
    console.log(`  ID: ${s.id}`);
    console.log(`  AdmNo: ${s.admissionNumber}`);
    console.log(`  Class: ${s.academic?.class?.name || 'N/A'}`);
    console.log(`  Father Name: "${s.family?.fatherName}"`);
    console.log(`  Father Phone: "${s.family?.fatherPhone}"`);
    console.log(`  Mother Name: "${s.family?.motherName}"`);
    console.log(`  Mother Phone: "${s.family?.motherPhone}"`);
    console.log(`  Receipts Count: ${s.collections.length}`);
    s.collections.forEach(c => {
      console.log(`    Receipt #${c.receiptNo || 'N/A'}: ₹${c.totalPaid || c.amountPaid} | Head: ${JSON.stringify(c.allocatedTo)}`);
    });
    console.log("--------------------------------------------------");
  });
}

main().finally(() => prisma.$disconnect());
