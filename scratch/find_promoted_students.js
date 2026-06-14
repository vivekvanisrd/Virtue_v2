const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const provCodes = [
    "VIVES-RCB-2026-27-PROV-00001",
    "VIVES-RCB-2026-27-PROV-00002",
    "VIVES-RCB-2026-27-PROV-00003",
    "VIVES-RCB-2026-27-PROV-00004",
    "VIVES-RCB-2026-27-PROV-00005",
    "VIVES-RCB-2026-27-PROV-00006",
    "VIVES-RCB-2026-27-PROV-00007",
    "VIVES-RCB-2026-27-PROV-00008"
  ];

  const students = await prisma.student.findMany({
    where: { registrationId: { in: provCodes } },
    select: { id: true, firstName: true, lastName: true, registrationId: true, status: true, studentCode: true, admissionNumber: true }
  });
  console.log("Students matching provisional codes:");
  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
