const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst({
    where: { id: 'VIVA' },
    include: {
      branches: true,
      classes: true,
      academicYears: { where: { isCurrent: true } }
    }
  });
  console.log(JSON.stringify(school, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
