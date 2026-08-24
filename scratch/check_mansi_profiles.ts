import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const mansiList = await prisma.student.findMany({
    where: {
      branchId: "VIVES-RCB",
      firstName: { contains: "MANSI", mode: "insensitive" }
    },
    include: {
      collections: true,
      family: true
    }
  });

  console.log(`Found ${mansiList.length} MANSI profiles:`);
  mansiList.forEach(s => {
    console.log(`- ${s.firstName} ${s.lastName} (ID: ${s.id}, AdmNo: ${s.admissionNumber}) | Transport: ${s.transportRequired}`);
    console.log(`  Father: ${s.family?.fatherName}, Phone: ${s.family?.fatherPhone}`);
    console.log(`  Collections (${s.collections.length}):`);
    s.collections.forEach(c => console.log(`    Receipt #${c.receiptNo || 'N/A'}: ₹${c.totalPaid || c.amountPaid} | Head: ${JSON.stringify(c.allocatedTo)}`));
  });
}

main().finally(() => prisma.$disconnect());
