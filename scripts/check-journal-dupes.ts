import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log("🔍 Checking for JournalEntry duplicates before schema update...");
  try {
    const duplicates = await prisma.$queryRaw`
      SELECT "schoolId", "entryCode", COUNT(*) 
      FROM "JournalEntry" 
      GROUP BY "schoolId", "entryCode" 
      HAVING COUNT(*) > 1
    `;
    
    if (Array.isArray(duplicates) && duplicates.length > 0) {
      console.log("⚠️ WARNING: Found duplicates that might block the update:");
      console.log(JSON.stringify(duplicates, null, 2));
    } else {
      console.log("✅ SUCCESS: No duplicates found. You can safely run 'npx prisma db push'.");
    }
  } catch (error) {
    console.error("Error checking duplicates:", error);
    console.log("Note: If the table is empty, this check might fail but the push will be safe.");
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
