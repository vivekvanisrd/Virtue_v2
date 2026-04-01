const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findPotentialMatches() {
  const phones = ['9382828484'];
  
  console.log(`Searching for EVERY student linked to: ${phones.join(', ')}...`);
  
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { phone: { contains: '9382828484' } },
        { family: { fatherPhone: { contains: '9382828484' } } },
        { family: { motherPhone: { contains: '9382828484' } } }
      ]
    },
    include: {
      financial: true,
      academic: { include: { class: true } }
    }
  });

  console.log(`Found ${students.length} profile(s).`);
  
  const mapped = students.map(s => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    class: s.academic?.class?.name,
    phone: s.phone,
    term1: s.financial?.term1Amount
  }));

  console.log(JSON.stringify(mapped, null, 2));
}

findPotentialMatches()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
