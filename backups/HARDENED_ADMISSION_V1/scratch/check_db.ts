import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const result = await prisma.$queryRaw`
      SELECT Column_Name 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'FeeComponentMaster';
    `;
    console.log("Columns in FeeComponentMaster:", result);
  } catch (e) {
    console.error("Error checking columns:", e);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
