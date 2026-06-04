const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const students = await prisma.student.findMany({
      where: {
        schoolId: "VIVES",
        branchId: "VIVES-RCB",
        status: "Active",
        isDeleted: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        studentCode: true,
        academic: {
          select: {
            classId: true,
            sectionId: true,
            class: {
              select: {
                name: true
              }
            },
            section: {
              select: {
                name: true
              }
            }
          }
        }
      },
      take: 5,
    });
    console.log("Query succeeded! Sample students:", JSON.stringify(students, null, 2));
  } catch (error) {
    console.error("Query failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
