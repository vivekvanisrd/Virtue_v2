import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRegistryAccounts() {
  try {
    const components = await prisma.feeComponentMaster.findMany({
        where: { schoolId: 'VIVES' }
    });
    console.log("--- Registry Component Account Codes ---");
    components.forEach(c => {
        console.log(` - ${c.name}: AccountCode = ${c.accountCode}`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRegistryAccounts();
