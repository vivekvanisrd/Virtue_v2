import prisma from "../src/lib/prisma";

async function main() {
  process.env.SKIP_TENANCY = 'true';
  
  const owner = await (prisma as any).staff.findFirst({
    where: { schoolId: 'VIVES', role: 'OWNER' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      onboardingStatus: true,
      branchId: true,
      status: true,
      staffCode: true,
    }
  });

  console.log("\n=== VIVES OWNER CREDENTIALS ===");
  console.log(JSON.stringify(owner, null, 2));

  await (prisma as any).$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
