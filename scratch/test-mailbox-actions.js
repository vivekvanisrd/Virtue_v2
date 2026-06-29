const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

// Load env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("--- STARTING MAILBOX ACTIONS VERIFICATION ---");

  // Fetch a valid school and branch to test tenancy context
  const branch = await prisma.branch.findFirst({
    include: { school: true }
  });

  if (!branch) {
    console.error("❌ No branches found in DB. Run seed first.");
    return;
  }

  const schoolId = branch.schoolId;
  const branchId = branch.id;
  const testSender = "test-sender@virtueschool.in";
  const testRecipient = "test-recipient@virtueschool.in";

  console.log(`Using School: ${schoolId}, Branch: ${branchId}`);

  // 1. Create a test notice representing custom internal email
  console.log("\n1. Creating test notice...");
  const notice = await prisma.communicationLog.create({
    data: {
      schoolId,
      branchId,
      sender: `Test Admin (${testSender})`,
      recipient: testRecipient,
      subject: "Test Subject - Security Notice",
      body: "Please check your firewalls and access credentials immediately.",
      type: "CUSTOM",
      status: "SUCCESS"
    }
  });
  console.log("✅ Notice created! ID:", notice.id);
  console.log("Initial state isRead:", notice.isRead, "| readAt:", notice.readAt);

  // 2. Mark notice as read
  console.log("\n2. Marking notice as read...");
  const updatedNotice = await prisma.communicationLog.update({
    where: { id: notice.id },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });
  console.log("✅ Notice marked as read!");
  console.log("Updated state isRead:", updatedNotice.isRead, "| readAt:", updatedNotice.readAt);

  if (updatedNotice.isRead !== true || !updatedNotice.readAt) {
    throw new Error("isRead or readAt was not updated correctly!");
  }

  // 3. Send a reply linked to the original notice parentId
  console.log("\n3. Replying to notice...");
  const replyNotice = await prisma.communicationLog.create({
    data: {
      schoolId,
      branchId,
      sender: `Test Staff (${testRecipient})`,
      recipient: testSender,
      subject: `Re: ${notice.subject}`,
      body: "All firewalls checked. We are secure.\n\n----- Original Message -----\n...",
      type: "CUSTOM",
      status: "SUCCESS",
      parentId: notice.id
    }
  });
  console.log("✅ Reply notice created! ID:", replyNotice.id);
  console.log("Reply linked to parentId:", replyNotice.parentId);

  if (replyNotice.parentId !== notice.id) {
    throw new Error("parentId mismatch on reply notice!");
  }

  // Clean up test logs
  console.log("\n4. Cleaning up test records...");
  await prisma.communicationLog.deleteMany({
    where: {
      id: { in: [notice.id, replyNotice.id] }
    }
  });
  console.log("✅ Cleanup complete.");

  console.log("\n--- VERIFICATION COMPLETED SUCCESSFULLY ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
