import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      schoolId: true,
      branchId: true,
    }
  });
  console.log(JSON.stringify(students, null, 2));

  const staff = await prisma.staff.findMany({
    where: { email: "admin@virtue.com" },
    select: {
      id: true,
      schoolId: true,
      branchId: true,
    }
  });
  console.log("Admin Staff:", JSON.stringify(staff, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
