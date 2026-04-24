import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 [PROD SYNC CHECK] Starting...");
  
  // 1. Check School Visibility
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  console.log(`✅ [DB] Found ${schools.length} schools in production.`);
  
  // 2. Check Developer Account
  const devEmail = "pavan@virtueschool.com";
  const dev = await prisma.staff.findFirst({
    where: { email: devEmail },
    select: { id: true, firstName: true, role: true, passwordHash: true }
  });
  
  if (dev) {
    console.log(`✅ [AUTH] Developer account found: ${dev.firstName} (${dev.role})`);
    const isV1Hash = dev.passwordHash?.includes('$2'); // Argon2/BCrypt check
    console.log(`ℹ️ [AUTH] Password Hash Present: ${!!dev.passwordHash} (Format: ${isV1Hash ? "Standard" : "Legacy/Other"})`);
  } else {
    console.warn(`❌ [AUTH] Developer account NOT found in production!`);
    
    // Fallback: Check globally if there are ANY staff
    const staffCount = await prisma.staff.count();
    console.log(`ℹ️ [DB] Total staff records in DB: ${staffCount}`);
  }

  // 3. Check Tenancy Setup (Global count)
  const students = await prisma.student.count();
  console.log(`✅ [DATA] Total global students: ${students}`);
}

main()
  .catch(e => {
    console.error("❌ [ERROR] Remote sync check failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
