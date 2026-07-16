import { PrismaClient } from "@prisma/client";
import { prismaBypass } from "../src/lib/prisma";

const prisma = new PrismaClient();

async function main() {
  const guardian = await prismaBypass.guardian.findFirst({
    where: { email: "test.parent@example.com" }
  });

  if (!guardian) {
    console.error("Guardian not found.");
    return;
  }

  // Create an unread notice
  const notice = await prismaBypass.communicationLog.create({
    data: {
      schoolId: guardian.schoolId || "VIVES",
      sender: "Principal's Office (principal@virtueschool.in)",
      recipient: "test.parent@example.com",
      subject: "Annual Sports Day Event Details",
      body: "Dear Parents,\n\nWe are excited to share the schedules, tracks, and details for the upcoming Annual Sports Day. Please ensure your child is registered.\n\nBest Regards,\nPrincipal Office",
      type: "CUSTOM",
      status: "SUCCESS",
      parentId: guardian.id,
      isRead: false
    }
  });

  console.log(`✅ Unread notice successfully created! Log ID: ${notice.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
