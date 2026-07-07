const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const staffList = await prisma.staff.findMany({
    take: 3,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      staffCode: true,
      role: true,
      email: true
    }
  });

  console.log("--- ACTUAL STAFF DATA SAMPLES ---");
  staffList.forEach((s) => {
    console.log(`\nStaff: ${s.firstName} ${s.lastName || ""}`);
    console.log(`Role: ${s.role}`);
    console.log(`Actual Database ID (UUID): ${s.id}`);
    console.log(`Actual Staff Code: ${s.staffCode}`);
    console.log(`Virtual Mail ID: ${s.staffCode ? s.staffCode.toLowerCase() : "unknown"}@virtue.internal`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
