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

  // Create an unread interactive notice
  const notice = await prismaBypass.communicationLog.create({
    data: {
      schoolId: guardian.schoolId || "VIVES",
      sender: "Principal's Office (principal@virtueschool.in)",
      recipient: "test.parent@example.com",
      subject: "Science Museum Field Trip Attendance",
      body: "Dear Parents,\n\nWe are organizing a field trip to the science museum. Please confirm if your child will attend.\n\n---OPTIONS---\nAccept, Decline",
      type: "CUSTOM",
      status: "SUCCESS",
      parentId: guardian.id,
      isRead: false
    }
  });

  console.log(`✅ Interactive notice successfully created! Log ID: ${notice.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
