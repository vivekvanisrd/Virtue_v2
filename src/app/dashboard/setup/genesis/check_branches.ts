import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBranches() {
  console.log("🔍 [IDENTITY CENSUS] Analyzing Institutional Branches for school 'VIVES'...");
  
  const branches = await prisma.branch.findMany({ 
    where: { schoolId: 'VIVES' },
    select: { id: true, name: true, code: true }
  });
  
  console.log("🏫 Branches Found:", JSON.stringify(branches, null, 2));

  const classCounts = await prisma.class.groupBy({
    by: ['branchId'],
    _count: true,
    where: { schoolId: 'VIVES' }
  });

  console.log("📊 Class Distribution:", JSON.stringify(classCounts, null, 2));
}

checkBranches()
  .catch(function(e) { console.error(e); })
  .finally(async function() { await prisma.$disconnect(); });
