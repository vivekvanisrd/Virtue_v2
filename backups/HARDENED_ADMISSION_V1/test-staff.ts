import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    select: {
      firstName: true,
      lastName: true,
      branchId: true,
      status: true
    }
  });

  console.log("TOTAL STAFF IN DB:", staff.length);
  console.log("STAFF DATA:", JSON.stringify(staff, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
