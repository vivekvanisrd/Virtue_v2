const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching recently updated staff members...");
  const recentStaff = await prisma.staff.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      staffCode: true,
      firstName: true,
      lastName: true,
      role: true,
      branchId: true,
      updatedAt: true,
      phone: true,
      email: true
    }
  });

  console.log("10 MOST RECENTLY UPDATED STAFF RECORDS:");
  console.table(recentStaff.map(s => ({
    id: s.id,
    code: s.staffCode,
    name: `${s.firstName} ${s.lastName}`,
    role: s.role,
    branch: s.branchId,
    phone: s.phone,
    email: s.email,
    updatedAt: s.updatedAt.toISOString()
  })));

  console.log("\nFetching recent activity logs...");
  const recentLogs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20
  });

  console.log("20 MOST RECENT ACTIVITY LOGS:");
  console.table(recentLogs.map(l => ({
    id: l.id,
    action: l.action,
    entity: l.entityType,
    entityId: l.entityId,
    details: l.details?.substring(0, 80),
    createdAt: l.createdAt.toISOString()
  })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
