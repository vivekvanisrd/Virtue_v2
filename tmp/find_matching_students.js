const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findPotentialMatches() {
  const phones = ['8945678965', '9382828484'];
  
  console.log(`Searching for students linked to: ${phones.join(', ')}...`);
  
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { phone: { contains: '8945678965' } },
        { phone: { contains: '9382828484' } },
        { emergencyContact: { contains: '8945678965' } },
        { emergencyContact: { contains: '9382828484' } }
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
    emergency: s.emergencyContact,
    term1: s.financial?.term1Amount,
    netTuition: s.financial?.netTuition
  }));

  console.log(JSON.stringify(mapped, null, 2));
}

findPotentialMatches()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
