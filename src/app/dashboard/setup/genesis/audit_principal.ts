import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditPrincipal() {
  console.log("🔍 [IDENTITY AUDIT] Checking Principal Identity for alignment...");
  
  const principal = await prisma.staff.findFirst({ 
    where: { role: 'PRINCIPAL' },
    select: { id: true, firstName: true, branchId: true, role: true, schoolId: true }
  });
  
  if (!principal) {
    console.warn("⚠️ No Principal found in Staff registry.");
    return;
  }
  
  console.log("👤 Principal Found:", JSON.stringify(principal, null, 2));

  // Check if there are any classes for the Principal's school at all
  const classes = await prisma.class.count({
    where: { schoolId: principal.schoolId }
  });
  
  console.log(`📋 Classes in school '${principal.schoolId}': ${classes}`);
}

auditPrincipal()
  .catch(function(e) { console.error(e); })
  .finally(async function() { await prisma.$disconnect(); });
