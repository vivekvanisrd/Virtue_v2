import { PrismaClient } from "@prisma/client";
import { promoteStudentAction } from "../src/lib/actions/student-actions";

async function main() {
  const prisma = new PrismaClient();
  try {
    const student = await prisma.student.findFirst({
      where: {
        firstName: { contains: "Studen1" },
        lastName: { contains: "Success" },
        status: "Provisional"
      }
    });

    if (!student) {
      console.log("❌ Student 'Studen1 Success' not found in Provisional status.");
      return;
    }

    console.log(`🔗 Found Student: ${student.firstName} ${student.lastName} (${student.id})`);
    console.log("🚀 Executing Promotion...");

    const res = await promoteStudentAction(student.id);

    if (res.success) {
      console.log("✅ Promotion Successful!");
      const updated = await prisma.student.findUnique({
        where: { id: student.id }
      });
      console.log("--- UPDATED RECORD ---");
      console.log(JSON.stringify(updated, null, 2));
    } else {
      console.error("❌ Promotion Failed:", res.error);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
