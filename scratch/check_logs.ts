import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL;
console.log("Using DB URL:", dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'NONE');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

async function main() {
  console.log("=== CHECKING ACTIVITY LOGS ===");
  try {
    const logsCount = await prisma.activityLog.count();
    console.log(`Total ActivityLog records: ${logsCount}`);

    const recentLogs = await prisma.activityLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    console.log("Recent Activity Logs:");
    console.dir(recentLogs, { depth: null });

    const errorLogs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { action: { contains: 'ERROR', mode: 'insensitive' } },
          { action: { contains: 'FAIL', mode: 'insensitive' } },
          { details: { contains: 'error', mode: 'insensitive' } },
          { details: { contains: 'fail', mode: 'insensitive' } },
          { details: { contains: 'exception', mode: 'insensitive' } },
        ]
      },
      take: 30,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${errorLogs.length} activity log entries matching error/fail filters:`);
    console.dir(errorLogs, { depth: null });
  } catch (err) {
    console.error("Error querying ActivityLog:", err);
  }

  // Check FinancialAuditLog
  try {
    const finCount = await prisma.financialAuditLog.count();
    console.log(`\nTotal FinancialAuditLog records: ${finCount}`);
    const finLogs = await prisma.financialAuditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' }
    });
    console.dir(finLogs, { depth: null });
  } catch (e: any) {
    console.log("FinancialAuditLog query error:", e.message);
  }

  // Check TransportAuditLog
  try {
    const transCount = await prisma.transportAuditLog.count();
    console.log(`\nTotal TransportAuditLog records: ${transCount}`);
    const transLogs = await prisma.transportAuditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' }
    });
    console.dir(transLogs, { depth: null });
  } catch (e: any) {
    console.log("TransportAuditLog query error:", e.message);
  }

  // Check StatutoryAuditLog
  try {
    const statCount = await prisma.statutoryAuditLog.count();
    console.log(`\nTotal StatutoryAuditLog records: ${statCount}`);
    const statLogs = await prisma.statutoryAuditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' }
    });
    console.dir(statLogs, { depth: null });
  } catch (e: any) {
    console.log("StatutoryAuditLog query error:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
