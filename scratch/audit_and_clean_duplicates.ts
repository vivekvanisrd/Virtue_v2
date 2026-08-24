import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteStudentCascaded(studentId: string) {
  await prisma.academicRecord.deleteMany({ where: { studentId } });
  await prisma.familyDetail.deleteMany({ where: { studentId } });
  await prisma.address.deleteMany({ where: { studentId } });
  await prisma.financialRecord.deleteMany({ where: { studentId } });
  await prisma.medicalRecord.deleteMany({ where: { studentId } });
  await prisma.bankDetail.deleteMany({ where: { studentId } });
  await prisma.previousSchool.deleteMany({ where: { studentId } });
  await prisma.student.deleteMany({ where: { id: studentId } });
}

async function main() {
  console.log("🔍 Cascaded Clean of Empty Duplicate Profiles & Transport Details in VIVES-RCB...\n");

  // 1. Create/Update TransportDetail for K.MANSI (de289753-73a7-4e88-b7a9-9de12e486507)
  const mansiMain = await prisma.student.update({
    where: { id: "de289753-73a7-4e88-b7a9-9de12e486507" },
    data: {
      transport: {
        upsert: {
          create: { transportRequired: true },
          update: { transportRequired: true }
        }
      }
    }
  });
  console.log(`✅ Upserted TransportDetail for K.MANSI (${mansiMain.admissionNumber})`);

  // 2. Delete empty duplicate K.MANSI (f46cfca5-1b33-41dd-a3bb-230ae04d4e0a - VMOO513)
  await deleteStudentCascaded("f46cfca5-1b33-41dd-a3bb-230ae04d4e0a");
  console.log(`✅ Cleaned empty duplicate K.MANSI (VMOO513)`);

  // 3. Delete empty duplicate P.MANSI REDDY (65c785c6-7505-4582-962c-5a40b27e2121 - VRO1090)
  await deleteStudentCascaded("65c785c6-7505-4582-962c-5a40b27e2121");
  console.log(`✅ Cleaned empty duplicate P.MANSI REDDY (VRO1090)`);

  // 4. Final Active Roster & Collection Re-verification
  const finalCount = await prisma.student.count({ where: { branchId: "VIVES-RCB" } });
  const finalCollections = await prisma.collection.count({ where: { student: { branchId: "VIVES-RCB" } } });
  console.log(`\n📌 Final Gap Audit Verification:`);
  console.log(`   - Active Students in VIVES-RCB: ${finalCount}`);
  console.log(`   - Total Ingested Receipts: ${finalCollections}`);
}

main().finally(() => prisma.$disconnect());
