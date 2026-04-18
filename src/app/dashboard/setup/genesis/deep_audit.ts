import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepAudit() {
  console.log("🔍 [DEEP AUDIT] Commencing Full Database Forensics...");
  
  const sc = await prisma.school.findMany({ select: { id: true, name: true, code: true } });
  console.log("🏫 [SCHOOLS]:", JSON.stringify(sc, null, 2));

  const cl = await prisma.class.findMany({ 
    take: 5,
    select: { name: true, schoolId: true, branchId: true }
  });
  console.log("📋 [CLASSES SAMPLES]:", JSON.stringify(cl, null, 2));

  const branches = await prisma.branch.findMany({ select: { id: true, name: true, schoolId: true } });
  console.log("🏢 [BRANCHES]:", JSON.stringify(branches, null, 2));

  const principal = await prisma.staff.findFirst({
    where: { role: 'PRINCIPAL' },
    select: { firstName: true, schoolId: true, branchId: true }
  });
  console.log("👤 [PRINCIPAL IDENTITY]:", JSON.stringify(principal, null, 2));
}

deepAudit()
  .catch(function(e) { console.error(e); })
  .finally(async function() { await prisma.$disconnect(); });
