const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const OLD_BRANCH_ID = 'BR-VIVA-01';
  const NEW_BRANCH_ID = 'VIVA-BR-01';
  const SCHOOL_ID = 'VIVA';

  console.log(`[MERGE] Starting consolidation for school: ${SCHOOL_ID}`);
  console.log(`[MERGE] Target: ${OLD_BRANCH_ID} -> ${NEW_BRANCH_ID}\n`);

  // Use a transaction for safety
  const result = await prisma.$transaction(async (tx) => {
    // 1. Move Staff
    const staffUpdate = await tx.staff.updateMany({
      where: { schoolId: SCHOOL_ID, branchId: OLD_BRANCH_ID },
      data: { branchId: NEW_BRANCH_ID }
    });
    console.log(`  └─ Staff members migrated: ${staffUpdate.count}`);

    // 2. Move Students (Academic Records)
    const academicUpdate = await tx.academicRecord.updateMany({
      where: { schoolId: SCHOOL_ID, branchId: OLD_BRANCH_ID },
      data: { branchId: NEW_BRANCH_ID }
    });
    console.log(`  └─ Academic records migrated: ${academicUpdate.count}`);

    // 3. Delete the old branch
    // Before deleting, check if it exists
    const branchExists = await tx.branch.findUnique({
      where: { id: OLD_BRANCH_ID }
    });

    if (branchExists) {
        await tx.branch.delete({
            where: { id: OLD_BRANCH_ID }
        });
        console.log(`  └─ Legacy branch [${OLD_BRANCH_ID}] deleted.`);
    } else {
        console.log(`  └─ Legacy branch [${OLD_BRANCH_ID}] already removed.`);
    }

    return { staffUpdate, academicUpdate };
  });

  console.log("\n✅ [MERGE] VIVA Consolidation Complete.");
}

main()
  .catch(e => {
    console.error("\n❌ [MERGE] ERROR:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
