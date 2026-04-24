import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function census() {
  console.log("📊 [BLUEPRINT CENSUS] Starting Institutional Health Check...");
  
  const pCount = await prisma.platformClass.count();
  const sCount = await prisma.platformSection.count();
  const iCount = await prisma.class.count();
  
  console.log(`🌍 MASTERS: Platform Templates [${pCount} Classes, ${sCount} Sections]`);
  console.log(`🏛️ INSTITUTION: Branch Classes [${iCount}]`);
  
  if (pCount === 0) {
    console.error("⛔ [CRITICAL] Platform Template DNA is MISSING. Institutional Genesis cannot proceed.");
  }
}

census()
  .catch(function(e) { console.error(e); })
  .finally(async function() { await prisma.$disconnect(); });
