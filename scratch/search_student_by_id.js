const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const studentId = "02197e56-487f-4ad2-b3d7-ed1a6cd2661f";
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        academic: { include: { class: true } },
        financial: true
      }
    });
    console.log("Student found:", JSON.stringify(student, null, 2));
  } catch (error) {
    console.error("Error searching student:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
