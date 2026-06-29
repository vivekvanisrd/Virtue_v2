const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("--- STARTING APPROVAL ACTIONS DATABASE VERIFICATION ---");

  // Fetch a valid school, branch, and staff member to test
  const staff = await prisma.staff.findFirst({
    include: { school: true }
  });

  if (!staff) {
    console.error("❌ No staff found in DB. Run seed first.");
    return;
  }

  const schoolId = staff.schoolId;
  const branchId = staff.branchId;
  const staffId = staff.id;

  console.log(`Using Staff: ${staff.firstName} ${staff.lastName} (ID: ${staffId})`);
  console.log(`Using School: ${schoolId}, Branch: ${branchId}`);

  // 1. Create a test leave request
  console.log("\n1. Creating test leave request...");
  const request = await prisma.approvalRequest.create({
    data: {
      schoolId,
      branchId,
      staffId,
      category: "LEAVE",
      title: "Test Sick Leave Request",
      description: "Need emergency sick leave for root canal therapy.",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-03"),
      status: "PENDING"
    }
  });

  console.log("✅ Request created! ID:", request.id);
  console.log("Initial state status:", request.status);

  // 2. Query pending requests
  console.log("\n2. Querying pending requests...");
  const pending = await prisma.approvalRequest.findMany({
    where: {
      schoolId,
      status: "PENDING"
    }
  });
  console.log(`✅ Pending requests count: ${pending.length}`);
  const found = pending.find(r => r.id === request.id);
  if (!found) throw new Error("Created request was not found in pending queries!");

  // 3. Resolve the request (Approve)
  console.log("\n3. Resolving request as APPROVED...");
  const updated = await prisma.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      reviewerId: staffId, // mock reviewer as self
      reviewerName: `${staff.firstName} ${staff.lastName}`,
      reviewComments: "Approved. Take care.",
      reviewedAt: new Date()
    }
  });
  console.log("✅ Request updated!");
  console.log("New status:", updated.status, "| Comments:", updated.reviewComments);

  if (updated.status !== "APPROVED" || updated.reviewerName !== `${staff.firstName} ${staff.lastName}`) {
    throw new Error("Fields were not updated correctly!");
  }

  // 4. Clean up test records
  console.log("\n4. Cleaning up test records...");
  await prisma.approvalRequest.delete({
    where: { id: request.id }
  });
  console.log("✅ Cleanup complete.");

  console.log("\n--- DATABASE VERIFICATION COMPLETED SUCCESSFULLY ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
