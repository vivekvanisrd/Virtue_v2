import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    take: 5,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      schoolId: true,
      branchId: true,
    }
  });
  console.log("Staff Samples:", JSON.stringify(staff, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
