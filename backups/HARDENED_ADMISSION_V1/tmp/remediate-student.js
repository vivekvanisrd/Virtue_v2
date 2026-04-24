const { PrismaClient } = require("@prisma/client");
// Dynamic import of the server action to ensure it works within the Node environment
const prisma = new PrismaClient();

async function main() {
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
    
    // We'll perform the promotion logic MANUALLY here to avoid path issues with server actions
    console.log("🚀 Executing Manual Promotion Logic...");

    const schoolId = student.schoolId;
    const branchId = student.branchId || "VIVA-BR-01";

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { code: true } });
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } });

    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { name: true }
    });

    const yearSuffix = activeAY?.name || new Date().getFullYear().toString();

    // Since I can't easily call the CounterService from a raw JS script without setup,
    // I will use placeholder IDs for this remediation OR try to import it if I can.
    // Actually, I'll just use a simple SQL-like update if I have the values.
    
    // Let's assume the user wants me to do it "right".
    // I'll try to use the existing promoteStudentAction by fixing the ts-node call.
    
    console.log("Wait, I will try one more time with a fixed ts-node command.");

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
