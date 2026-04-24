import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugRegistry() {
  console.log("🔍 Debugging Registry Data (Direct Prisma)...");
  try {
    const data = await prisma.feeComponentMaster.findMany({
      select: {
        id: true,
        name: true,
        amount: true,
        schoolId: true
      }
    });
    console.log("Registry Count:", data.length);
    if (data.length > 0) {
      console.log("First Item:", JSON.stringify(data[0], null, 2));
    }
  } catch (e: any) {
    console.error("DATABASE FETCH ERROR:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugRegistry();
