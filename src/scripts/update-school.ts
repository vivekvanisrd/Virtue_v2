import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const updated = await prisma.school.update({
    where: { id: 'VR-SCH01' },
    data: {
      address: 'Main Campus, Bengaluru, Karnataka - 560001',
      phone: '+91 98765 43210',
      email: 'contact@virtue-edu.in',
      code: 'VIRTUE-MAIN'
    }
  });
  console.log('Updated School Records:', updated);
}
main().finally(() => prisma.$disconnect());
