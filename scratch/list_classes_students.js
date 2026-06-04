const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const studentsByClass = await prisma.academicRecord.groupBy({
      by: ["classId"],
      _count: {
        id: true
      },
      where: {
        academicYear: "AY-2025-26-VIVES"
      }
    });

    const classes = await prisma.class.findMany({
      where: { schoolId: "VIVES" }
    });

    const classMap = {};
    classes.forEach(c => {
      classMap[c.id] = c.name;
    });

    console.log("Students by Class in 2025-26:");
    studentsByClass.forEach(s => {
      console.log(`- ${classMap[s.classId] || s.classId}: ${s._count.id} students`);
    });

  } catch (error) {
    console.error("Failed to list classes:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
