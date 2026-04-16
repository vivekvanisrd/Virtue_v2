import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const slips = await prisma.salarySlip.findMany({
    where: { month: 3, year: 2026 },
    include: { staff: true }
  });

  console.log("TOTAL SLIPS FOR MARCH 2026:", slips.length);
  const staffNames = slips.map(s => `${s.staff.firstName} ${s.staff.lastName} (${s.staff.branchId})`);
  console.log("STAFF IN SLIPS:", staffNames);
}

main().catch(console.error).finally(() => prisma.$disconnect());
