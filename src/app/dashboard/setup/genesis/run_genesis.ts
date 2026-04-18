import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runDirectGenesis() {
  console.log("🚀 [DIRECT GENESIS] Initiating Institutional Provisioning...");
  
  const schoolId = "VIVES";
  const branch = await prisma.branch.findFirst({ where: { schoolId } });
  
  if (!branch) {
    console.error("❌ ERROR: No Branch found for school VIVES.");
    return;
  }
  
  console.log(`🏛️ Target Branch: ${branch.name} (${branch.id})`);
  
  const templates = await prisma.platformClass.findMany({ include: { sections: true } });
  console.log(`🧬 Clining ${templates.length} templates...`);

  for (const tc of templates) {
    const newClass = await prisma.class.create({
      data: {
        name: tc.name,
        level: tc.level,
        schoolId,
        branchId: branch.id,
        source: `PLATFORM_TEMPLATE_${tc.id}`
      }
    });

    for (const ts of tc.sections) {
      await prisma.section.create({
        data: {
          name: ts.name,
          classId: newClass.id,
          schoolId,
          branchId: branch.id,
          source: `PLATFORM_TEMPLATE_${ts.id}`
        }
      });
    }
  }

  console.log("✅ [DIRECT GENESIS] Academic Structure Synchronized Successfully.");
}

runDirectGenesis()
  .catch(function(e) { console.error(e); })
  .finally(async function() { await prisma.$disconnect(); });
