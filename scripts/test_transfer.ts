import { PrismaClient } from '@prisma/client';
import { transferStaffBranchAction } from './src/lib/actions/staff-actions';

// Mock getTenantContext to simulate an OWNER
jest.mock('./src/lib/utils/tenant-context', () => ({
  getTenantContext: jest.fn().mockResolvedValue({
    schoolId: 'VIVA',
    branchId: 'RCB',
    staffId: 'DEV-BYPASS',
    role: 'DEVELOPER',
    permissions: ['*']
  })
}));

const prisma = new PrismaClient();

async function testTransfer() {
  console.log("🧪 Testing Inter-Branch Staff Transfer...");

  // 1. Find a staff in RCB
  const staff = await prisma.staff.findFirst({
    where: { branchId: 'RCB' },
    select: { id: true, staffCode: true, firstName: true }
  });

  if (!staff) {
    console.warn("⚠️ No staff found in RCB to test transfer.");
    return;
  }

  console.log(`👤 Found Staff: ${staff.firstName} (${staff.staffCode}) in RCB.`);

  // 2. Perform Transfer to MAIN campus
  // Note: Since this is an ESM script, we might need a separate runner if it fails here.
  // I'll use a direct Prisma check if the action call is complex to simulate.
  
  const result = await transferStaffBranchAction(staff.id, 'VIVA-MAIN-001'); // Assuming MAIN ID based on previous audits

  if (result.success) {
    console.log(`✅ Transfer Successful! New Code: ${result.newCode}`);
    
    // 3. Verify in DB
    const updatedStaff = await prisma.staff.findUnique({
      where: { id: staff.id },
      select: { branchId: true, staffCode: true }
    });

    console.log(`📊 DB Verification: Branch=${updatedStaff?.branchId}, Code=${updatedStaff?.staffCode}`);
    
    if (updatedStaff?.branchId === 'VIVA-MAIN-001' && updatedStaff?.staffCode?.includes('-MAIN-')) {
        console.log("🎯 IDENTITY CONSISTENCY VERIFIED.");
    } else {
        console.error("❌ IDENTITY MISMATCH AFTER TRANSFER.");
    }
  } else {
    console.error("❌ Transfer Failed:", result.error);
  }
}

// Since I can't run jest easily here, I'll provide this as a plan and do manual CLI verification.
