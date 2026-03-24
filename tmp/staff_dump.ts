import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      status: true,
      schoolId: true,
      branchId: true,
      firstName: true,
      lastName: true
    }
  });
  console.log(JSON.stringify(staff, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
