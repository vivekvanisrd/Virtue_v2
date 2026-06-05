const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const staffId = "cfe827ad-d63f-4362-b637-51002ab0ac84";
  console.log("Fetching staff record for ID:", staffId);
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      professional: true,
      statutory: true,
      bank: true,
    }
  });
  console.log("STAFF RECORD:", JSON.stringify(staff, null, 2));

  // Let's also fetch the last 5 logs for staff updates
  const logs = await prisma.activityLog.findMany({
    where: { entityType: "STAFF" },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  console.log("RECENT STAFF LOGS:", JSON.stringify(logs, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
