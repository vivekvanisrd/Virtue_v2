import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const staff = await prisma.staff.findMany({ select: { id: true, userId: true, schoolId: true, role: true, email: true } });
  console.log('Staff Records:', JSON.stringify(staff, null, 2));
}
main().finally(() => prisma.$disconnect());
