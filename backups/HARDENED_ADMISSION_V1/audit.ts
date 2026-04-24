import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function audit() {
  const school = await p.school.findUnique({ where: { id: 'VIVES' } });
  const branches = await p.branch.findMany({ where: { schoolId: 'VIVES' } });
  const staff = await p.staff.findMany({ 
    where: { schoolId: 'VIVES' },
    include: { branch: true }
  });
  
  console.log('--- AUDIT DATA ---');
  console.log(JSON.stringify({ school, branches, staff }, null, 2));
}

audit().finally(() => p.$disconnect());
