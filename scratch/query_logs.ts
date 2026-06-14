import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching recent activities and logins from database...");
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      school: {
        select: { name: true }
      }
    }
  });

  if (logs.length === 0) {
    console.log("No logs found in the ActivityLog table.");
    return;
  }

  console.log("\n=================== RECENT USER ACTIVITIES & LOGINS ===================");
  for (const log of logs) {
    const localTime = new Date(log.createdAt).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    
    console.log(`[${localTime}] User: ${log.userId} | School: ${log.school?.name || log.schoolId}`);
    console.log(`  Action: ${log.action}`);
    if (log.details) {
      console.log(`  Details: ${log.details}`);
    }
    console.log("-----------------------------------------------------------------------");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
