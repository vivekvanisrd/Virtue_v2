import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * migrate_dual_id.ts
 * 
 * BACKFILL SCRIPT:
 * 1. Generates the mandatory permanent 'registrationId' (STU-0000001) for all existing students.
 * 2. Maintains existing 'studentCode' (Display ID).
 */
async function backfillRegistrationIds() {
  console.log('--- VIRTUE V2: DUAL-ID MIGRATION (PERMANENT REGISTRATION) ---');

  const students = await prisma.student.findMany({
    where: { registrationId: null },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${students.length} students requiring Registration IDs...`);

  let count = 0;
  for (const student of students) {
    // 1. Get next perpetual sequence from TenancyCounter
    const counter = await prisma.tenancyCounter.upsert({
      where: {
        schoolId_branchId_type_year: {
          schoolId: student.schoolId,
          branchId: "GLOBAL",
          type: "REGISTRATION",
          year: "GLOBAL"
        }
      },
      update: { lastValue: { increment: 1 } },
      create: {
        schoolId: student.schoolId,
        branchId: "GLOBAL",
        type: "REGISTRATION",
        year: "GLOBAL",
        lastValue: 1
      }
    });

    const regId = `STU-${counter.lastValue.toString().padStart(7, '0')}`;

    // 2. Update student record
    await prisma.student.update({
      where: { id: student.id },
      data: { registrationId: regId }
    });

    count++;
    if (count % 50 === 0) console.log(` - Progress: ${count}/${students.length} migrated...`);
  }

  console.log('\n--- MIGRATION COMPLETE ---');
  console.log(`Successfully assigned Registration IDs to ${count} students.`);
}

backfillRegistrationIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
