import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const schoolId = process.argv[2] || 'VIVA';
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  console.log('School Details:', JSON.stringify(school, null, 2));
}
main().finally(() => prisma.$disconnect());
