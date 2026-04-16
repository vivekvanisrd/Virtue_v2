const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({ where: { schoolId: 'VIVA' } });
  const classes = await prisma.class.findMany({ take: 5 });
  const ay = await prisma.academicYear.findFirst({ where: { schoolId: 'VIVA', isCurrent: true } });
  
  console.log('BRANCHES:', JSON.stringify(branches, null, 2));
  console.log('CLASSES:', JSON.stringify(classes, null, 2));
  console.log('ACADEMIC_YEAR:', JSON.stringify(ay, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
