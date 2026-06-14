import { createBranchAction, createOwnerAction } from '../src/app/developer/actions';
import prisma from '../src/lib/prisma';

async function main() {
  console.log("🧪 TESTING DEVELOPER ACTIONS (BRANCH & OWNER PROVISIONING)...");

  // We will test on the school created in the previous step
  // Let's find the latest school starting with VR
  const school = await prisma.school.findFirst({
    where: { id: { startsWith: 'VR' } },
    orderBy: { createdAt: 'desc' }
  });

  if (!school) {
    console.error("❌ No test school found. Please run verify-v2-final.ts first.");
    return;
  }

  console.log(`Using School: ${school.name} (Code: ${school.code})`);

  const branchCode = "RCB";
  const branchName = "Reddy Colony Campus";
  
  // Clean up existing test branch if any
  const existingBranchId = `${school.code}-${branchCode}`;
  await prisma.staff.deleteMany({ where: { schoolId: school.id, branchId: existingBranchId } });
  await prisma.chartOfAccount.deleteMany({ where: { schoolId: school.id, branchId: existingBranchId } });
  await prisma.activityLog.deleteMany({ where: { schoolId: school.id, branchId: existingBranchId } });
  await prisma.branch.deleteMany({ where: { id: existingBranchId } });

  console.log(`\n--- [1/2] TESTING createBranchAction with PRINCIPAL creation ---`);
  const branchResult = await createBranchAction({
    schoolId: school.id,
    branchName,
    branchCode,
    city: "Hyderabad",
    phone: "9100000001",
    createAdmin: true,
    adminFirstName: "Alekya",
    adminLastName: "Reddy",
    adminEmail: `alekya@${school.code.toLowerCase()}.com`,
    adminPhone: "9876543210"
  });

  if (branchResult.success) {
    const data = (branchResult as any).data;
    console.log(`✅ BRANCH CREATED: id=${data.branch.id}, code=${data.branch.code}`);
    console.log(`✅ PRINCIPAL CREATED: id=${data.adminResult.id}, staffCode=${data.adminResult.username}, username=${data.adminResult.username}`);
    
    // Query DB to verify staffCode sequential pattern
    const principal = await prisma.staff.findFirst({
      where: { schoolId: school.id, branchId: data.branch.id, role: 'PRINCIPAL' }
    });
    console.log(`🔍 DB STAFF CODE VERIFIED: ${principal?.staffCode} (Expected: ${school.code}-${branchCode}-PRIN-0001)`);
  } else {
    console.error("❌ BRANCH CREATION FAILED:", branchResult.error);
  }

  console.log(`\n--- [2/2] TESTING createOwnerAction ---`);
  const ownerResult = await createOwnerAction({
    schoolId: school.id,
    branchId: existingBranchId,
    firstName: "Pavan",
    lastName: "Kumar",
    email: `pavan@${school.code.toLowerCase()}.com`,
    phone: "9876543211",
    role: "OWNER"
  });

  if (ownerResult.success) {
    const data = (ownerResult as any).data;
    console.log(`✅ OWNER CREATED: id=${data.id}, username=${data.username}`);
    
    const owner = await prisma.staff.findUnique({
      where: { id: data.id }
    });
    console.log(`🔍 DB OWNER CODE VERIFIED: ${owner?.staffCode} (Expected: ${school.code}-${branchCode}-OWNR-0001)`);
  } else {
    console.error("❌ OWNER CREATION FAILED:", ownerResult.error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
