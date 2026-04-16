import { PrismaClient } from '@prisma/client';
import { BackupService } from '../src/lib/services/backup-service';

const prisma = new PrismaClient();
const TARGET_SCHOOL = 'V-VIV-HQ';
const MAIN_BRANCH_ID = 'c36a2c86-8c91-43dc-9506-96a775c2cc29';

async function finalGovernanceMigration() {
  console.log("🏙️ Starting Final Governance Migration...");

  // 1. BACKUP (Safety First)
  try {
    await BackupService.createSnapshot();
    console.log("✅ Safety Backup Created.");
  } catch (e) {
    console.error("❌ Migration Aborted: Failed to create safety backup.", e.message);
    process.exit(1);
  }

  // 2. ORPHAN PURGE
  const TENANT_MODELS = [
    'student', 'staff', 'academicRecord', 'academicHistory',
    'financialRecord', 'collection', 'enquiry', 'activityLog',
    'book', 'libraryMember', 'examResult', 'attendance'
  ];

  console.log("\n🧹 Purging Orphans...");
  for (const modelName of TENANT_MODELS) {
    try {
      const result = await (prisma as any)[modelName].updateMany({
        where: {
          schoolId: TARGET_SCHOOL,
          branchId: null
        },
        data: {
          branchId: MAIN_BRANCH_ID
        }
      });
      console.log(`- ${modelName}: Updated ${result.count} orphans.`);
    } catch (e) {
      console.error(`- ${modelName}: ❌ Update failed - ${e.message}`);
    }
  }

  // 3. FINAL VERIFICATION
  console.log("\n🧪 Final Verification...");
  let grandOrphans = 0;
  for (const modelName of TENANT_MODELS) {
    const count = await (prisma as any)[modelName].count({
      where: {
        schoolId: TARGET_SCHOOL,
        branchId: null
      }
    });
    grandOrphans += count;
    if (count > 0) console.warn(`- ${modelName}: Still has ${count} orphans!`);
  }

  if (grandOrphans === 0) {
    console.log("\n✨ MIGRATION SUCCESSFUL: All institutional records are now deterministically jailed.");
  } else {
    console.error(`\n⚠️ MIGRATION INCOMPLETE: ${grandOrphans} orphans remain.`);
  }

  await prisma.$disconnect();
}

finalGovernanceMigration().catch(console.error);
