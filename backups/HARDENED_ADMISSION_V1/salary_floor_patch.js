const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 [SALARY_FLOOR] Enforcing 10,000 INR floor for missing records...");

  const res = await prisma.staffProfessional.updateMany({
    where: { 
      OR: [
        { basicSalary: 0 },
        { basicSalary: { lt: 10000 } } // Also elevate anyone below 10k as requested
      ] 
    },
    data: { basicSalary: 10000 }
  });

  console.log(`✅ [SALARY_FLOOR] Successfully updated ${res.count} records to 10,000.`);
}

main()
  .catch(e => {
    console.error("❌ [PATCH_ERROR]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
