import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * mirror_staff_to_main.ts
 * 
 * 1. Creates the 'MAIN' branch if it doesn't exist.
 * 2. Mirrors all staff from 'RCB' branch to 'MAIN' branch.
 * 3. Updates 'virtuetest1' to point to 'MAIN'.
 */
async function mirrorStaff() {
  console.log('--- VIRTUE V2: BRANCH MIRRORING (RCB -> MAIN) ---');

  const schoolId = 'cm1u7f32k0000uxkhlrl8t683';
  
  // 1. Ensure MAIN branch exists
  const mainBranch = await prisma.branch.upsert({
    where: { 
      schoolId_code: { schoolId, code: 'MAIN' } 
    },
    update: {},
    create: {
      schoolId,
      code: 'MAIN',
      name: 'Main Branch'
    }
  });

  console.log(`Target Branch: MAIN (ID: ${mainBranch.id})`);

  // 2. Fetch all staff from RCB branch
  const rcbBranch = await prisma.branch.findFirst({
    where: { schoolId, code: 'RCB' }
  });

  if (!rcbBranch) {
    console.error('Error: RCB branch not found.');
    return;
  }

  const rcbStaff = await prisma.staff.findMany({
    where: { branchId: rcbBranch.id },
    include: {
      professional: true,
      bank: true,
      statutory: true
    }
  });

  console.log(`Found ${rcbStaff.length} staff members in RCB. Mirroring to MAIN...`);

  let count = 0;
  for (const staff of rcbStaff) {
    // Check if already exists in MAIN (by code or email in this specific branch)
    const existing = await prisma.staff.findFirst({
      where: { branchId: mainBranch.id, staffCode: staff.staffCode }
    });

    if (existing) {
      console.log(` - Skipping ${staff.firstName} (Already in MAIN)`);
      continue;
    }

    // Clone root staff record
    const { id, branchId, createdAt, updatedAt, ...staffData } = staff;
    
    await prisma.staff.create({
      data: {
        ...staffData,
        branchId: mainBranch.id,
        // Cloning relations
        professional: staff.professional ? {
          create: {
            ...Object.fromEntries(Object.entries(staff.professional).filter(([k]) => k !== 'id' && k !== 'staffId'))
          }
        } : undefined,
        bank: staff.bank ? {
          create: {
            ...Object.fromEntries(Object.entries(staff.bank).filter(([k]) => k !== 'id' && k !== 'staffId'))
          }
        } : undefined,
        statutory: staff.statutory ? {
          create: {
            ...Object.fromEntries(Object.entries(staff.statutory).filter(([k]) => k !== 'id' && k !== 'staffId'))
          }
        } : undefined
      }
    });

    count++;
    if (count % 10 === 0) console.log(` - Progress: ${count}/${rcbStaff.length} mirrored...`);
  }

  // 3. Point Principal to MAIN
  await prisma.staff.updateMany({
    where: { username: 'virtuetest1', schoolId },
    data: { branchId: mainBranch.id }
  });

  console.log('\n--- MIRRORING COMPLETE ---');
  console.log(`Successfully mirrored ${count} staff records to Main branch.`);
  console.log(`Principal 'virtuetest1' successfully switched to MAIN branch.`);
}

mirrorStaff()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
