import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const staffList = await prisma.staff.findMany({
    select: { id: true, firstName: true, lastName: true, schoolId: true, branchId: true }
  });
  console.log("Staff in DB:", staffList);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
