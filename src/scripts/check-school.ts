import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const school = await prisma.school.findUnique({ where: { id: 'VR-SCH01' } });
  console.log('School Details:', JSON.stringify(school, null, 2));
}
main().finally(() => prisma.$disconnect());
