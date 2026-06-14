const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("=== FINANCIAL AUDIT LOGS ===");
    const auditLogs = await prisma.financialAuditLog.findMany({ take: 20 });
    console.log(JSON.stringify(auditLogs, null, 2));

    console.log("\n=== ACTIVITY LOGS ===");
    const activityLogs = await prisma.activityLog.findMany({ 
      where: {
        entityType: 'COLLECTION'
      },
      take: 20 
    });
    console.log(JSON.stringify(activityLogs, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
