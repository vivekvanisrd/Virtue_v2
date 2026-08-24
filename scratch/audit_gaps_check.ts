import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Running Comprehensive Gap Audit for VIVES-RCB...\n");

  const branchId = "VIVES-RCB";

  // 1. Active Student Roster & Draft Check
  const totalStudents = await prisma.student.count({ where: { branchId } });
  const draftStudents = await prisma.student.count({
    where: {
      branchId,
      OR: [
        { firstName: { startsWith: "ADM-" } },
        { admissionNumber: { startsWith: "ADM-" } },
        { firstName: { contains: "PASTED" } }
      ]
    }
  });

  console.log(`📌 1. Student Roster Audit:`);
  console.log(`   - Total Active Students: ${totalStudents}`);
  console.log(`   - Draft / Unlinked Auto-Generated Records: ${draftStudents}`);

  // 2. Shifted Records Audit (Father Phone in Father Name)
  const allStudents = await prisma.student.findMany({
    where: { branchId },
    include: { family: true }
  });

  let shiftedCount = 0;
  allStudents.forEach(s => {
    const fName = s.family?.fatherName || "";
    if (/^\d{10}$/.test(fName.trim())) {
      shiftedCount++;
    }
  });

  console.log(`\n📌 2. Shifted Data Integrity Audit:`);
  console.log(`   - Phone-as-Father Shifted Records: ${shiftedCount}`);

  // 3. Collection & Receipt Ingestion Audit
  const collections = await prisma.collection.findMany({
    where: { student: { branchId } }
  });

  let totalCollectedRupees = 0;
  let missingAllocatedCount = 0;

  collections.forEach(c => {
    const paid = Number(c.totalPaid || c.amountPaid || 0);
    totalCollectedRupees += paid;
    if (!c.allocatedTo) missingAllocatedCount++;
  });

  console.log(`\n📌 3. Collection & Financial Ledger Audit:`);
  console.log(`   - Total Ingested Collections: ${collections.length}`);
  console.log(`   - Total Revenue Collected: ₹${totalCollectedRupees.toLocaleString()}`);
  console.log(`   - Collections missing allocation metadata: ${missingAllocatedCount}`);

  // 4. K.MANSI & Profile Ledger Check
  const mansi = await prisma.student.findFirst({
    where: {
      branchId,
      firstName: { contains: "MANSI", mode: "insensitive" }
    },
    include: {
      collections: true,
      transportAssign: true
    }
  });

  if (mansi) {
    console.log(`\n📌 4. Profile Sample Check (K.MANSI - ${mansi.admissionNumber}):`);
    console.log(`   - Student ID: ${mansi.id}`);
    console.log(`   - Transport Required: ${mansi.transportRequired}`);
    console.log(`   - Ingested Receipts Count: ${mansi.collections.length}`);
    mansi.collections.forEach((c, idx) => {
      console.log(`     Receipt #${c.receiptNo || idx + 1}: ₹${c.totalPaid || c.amountPaid} | FeeHead: ${JSON.stringify(c.allocatedTo)}`);
    });
  }

  console.log("\n✅ Audit Complete!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
