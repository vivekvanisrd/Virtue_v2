import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("--- STAFF AUDIT ---");
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
  console.table(staff);

  console.log("\n--- SCHOOLS AUDIT ---");
  const schools = await prisma.school.findMany({
    include: {
      _count: {
        select: {
          branches: true,
          staff: true,
          students: true
        }
      }
    }
  });
  console.table(schools.map(s => ({
    id: s.id,
    name: s.name,
    code: s.code,
    branches: s._count.branches,
    staff: s._count.staff,
    students: s._count.students
  })));

  console.log("\n--- BRANCHES AUDIT ---");
  const branches = await prisma.branch.findMany({
    include: {
      school: {
        select: { name: true }
      }
    }
  });
  console.table(branches.map(b => ({
    id: b.id,
    name: b.name,
    code: b.code,
    school: b.school?.name
  })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
