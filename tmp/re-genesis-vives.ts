import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runHardenedGenesis() {
  console.log('🏛️ Starting PaVa-EDUX Sovereign Genesis v1.0...');

  try {
    const schoolId = 'VIVES';
    const schoolCode = 'VIVES';
    const dnaVersion = 'v1';

    // 1. INSTITUTION GENESIS
    console.log('--- Phase 1: Institution DNA ---');
    const school = await prisma.school.upsert({
      where: { id: schoolId },
      update: {},
      create: {
        id: schoolId,
        name: 'VIVES School Ecosystem',
        code: schoolCode,
        status: 'Active',
        dnaVersion,
        isGenesis: true,
        metadata: { source: 'SOVEREIGN_GENESIS_V1', protocol: 'PaVa-EDUX' }
      }
    });
    console.log(`✅ Institution Anchored: ${school.id}`);

    // 2. BRANCH GENESIS
    console.log('--- Phase 2: Branch Blueprint ---');
    const hqBranchId = 'VIVES-HQ';
    const branch = await prisma.branch.upsert({
      where: { id: hqBranchId },
      update: {},
      create: {
        id: hqBranchId,
        schoolId: school.id,
        name: 'VIVES Administrative HQ',
        code: 'HQ',
        isGenesis: true,
        metadata: { type: 'HEADQUARTERS' }
      }
    });
    console.log(`✅ Branch Anchored: ${branch.id}`);

    // 3. OWNER GENESIS
    console.log('--- Phase 3: Identity Registry ---');
    const ownerId = 'VIVES-HQ-OWNR-0001';
    const passwordHash = await bcrypt.hash('PaVa@2026', 10);
    await prisma.staff.upsert({
      where: { id: ownerId },
      update: {},
      create: {
        id: ownerId,
        staffCode: ownerId,
        firstName: 'VIVES',
        lastName: 'Owner',
        email: 'owner@vives.edu',
        username: 'vives_owner',
        passwordHash,
        role: 'OWNER',
        schoolId: school.id,
        branchId: branch.id,
        status: 'Active'
      }
    });
    console.log(`✅ Owner Identity Registered: ${ownerId}`);

    // 4. ACADEMIC SESSION GENESIS (2026-27)
    console.log('--- Phase 4: Chronos Calibration ---');
    const academicYearId = 'VIVES-2026-27';
    await prisma.academicYear.upsert({
      where: { id: academicYearId },
      update: {},
      create: {
        id: academicYearId,
        name: '2026-27',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        isCurrent: true,
        isLocked: false,
        isGenesis: true,
        schoolId: school.id,
        metadata: { cycle: 'APR-MAR' }
      }
    });
    console.log(`✅ Academic Session 2026-27 Anchored.`);

    // 5. CLASS BLUEPRINT (K-10)
    console.log('--- Phase 5: Class Foundation ---');
    const classes = [
      { id: 'VIVES-PKG', name: 'Pre-KG', level: -2 },
      { id: 'VIVES-LKG', name: 'LKG', level: -1 },
      { id: 'VIVES-UKG', name: 'UKG', level: 0 },
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `VIVES-CL${i + 1}`,
        name: `Class ${i + 1}`,
        level: i + 1
      }))
    ];

    for (const cls of classes) {
      await prisma.class.upsert({
        where: { id: cls.id },
        update: {},
        create: {
            ...cls,
            isGenesis: true,
            source: 'K10_GLOBAL_V1'
        }
      });
    }
    console.log(`✅ Class Registry Initialized (${classes.length} levels).`);

    // 6. FEE MASTER BLUEPRINT
    console.log('--- Phase 6: Financial Backbone ---');
    const feeMasters = [
      { name: 'Admission Fee', type: 'CORE' },
      { name: 'Tuition Fee', type: 'CORE' },
      { name: 'Computer & Lab', type: 'ANCILLARY' },
      { name: 'Sports & Culturals', type: 'ANCILLARY' },
      { name: 'Transport Fee', type: 'ANCILLARY' },
      { name: 'Caution Deposit', type: 'DEPOSIT' }
    ];

    for (const fee of feeMasters) {
      await prisma.feeComponentMaster.upsert({
        where: { schoolId_name: { schoolId: school.id, name: fee.name } },
        update: {},
        create: {
          ...fee,
          schoolId: school.id,
          isGenesis: true,
          source: 'FEE_BLUEPRINT_V1'
        }
      });
    }
    console.log(`✅ Fee Master Registry Initialized (${feeMasters.length} components).`);

    console.log('\n🏁 GENESIS SUCCESSFUL: PaVa-EDUX v1.0 operational for VIVES.');

  } catch (error) {
    console.error('❌ GENESIS CRITICAL FAILURE:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHardenedGenesis();
