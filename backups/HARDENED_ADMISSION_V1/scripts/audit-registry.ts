import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    include: {
      _count: {
        select: { branches: true, students: true, staff: true }
      }
    }
  });

  const staff = await prisma.staff.findMany({
    include: {
      school: { select: { name: true } }
    }
  });

  console.log('--- SCHOOLS ---');
  schools.forEach(s => {
    console.log(`[${s.id}] ${s.name} - Code: ${s.code} | Br: ${s._count.branches} | Stu: ${s._count.students} | Staff: ${s._count.staff}`);
  });

  console.log('\n--- DEVELOPERS/OWNERS ---');
  staff.filter(s => s.role === 'DEVELOPER' || s.role === 'OWNER').forEach(s => {
    console.log(`${s.firstName} ${s.lastName} (${s.email}) - Role: ${s.role} | School: ${s.school?.name || 'GLOBAL'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
