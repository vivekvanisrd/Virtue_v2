import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const years = await prisma.academicYear.findMany();
  console.log(JSON.stringify(years, null, 2));

  const schools = await prisma.school.findMany({ select: { id: true, code: true } });
  console.log("Schools:", JSON.stringify(schools, null, 2));

  const branches = await prisma.branch.findMany({ select: { id: true, code: true, schoolId: true } });
  console.log("Branches:", JSON.stringify(branches, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
