import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStructure() {
  const structureId = "968ab66b-ab8a-4d55-97fc-d970ead750a2";
  const structure = await prisma.feeStructure.findUnique({
    where: { id: structureId },
    include: { components: { include: { masterComponent: true } } }
  });
  console.log("Structure:", structure?.name);
  console.log("Components:", structure?.components.map(c => ({ name: c.masterComponent.name, amount: c.amount })));
  process.exit(0);
}

checkStructure();
