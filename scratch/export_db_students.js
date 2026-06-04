const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  try {
    const students = await prisma.student.findMany({
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phone: true,
        status: true,
        academic: {
          select: {
            class: {
              select: {
                id: true,
                name: true
              }
            },
            section: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    const outputPath = path.join(__dirname, "db_students.json");
    fs.writeFileSync(outputPath, JSON.stringify(students, null, 2));
    console.log(`Successfully exported ${students.length} students to ${outputPath}`);
  } catch (error) {
    console.error("Export failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
