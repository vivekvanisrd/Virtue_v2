import { promoteStudentAction } from "../src/lib/actions/student-actions.ts";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  const studentId = "3c745abc-126e-43bb-bf65-7b97548bd83b"; // Priya
  console.log("Testing promotion for Priya...");
  
  const res = await promoteStudentAction(studentId);
  console.log("Promotion Result:", JSON.stringify(res, null, 2));

  if (res.success) {
    const updated = await prisma.student.findUnique({ where: { id: studentId } });
    console.log("Updated Student Record:", JSON.stringify(updated, null, 2));
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
