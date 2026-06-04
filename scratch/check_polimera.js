const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const student = await prisma.student.findFirst({
      where: {
        firstName: { contains: "Polimera", mode: "insensitive" }
      },
      include: {
        academic: {
          include: {
            class: true,
            section: true
          }
        },
        financial: {
          include: {
            components: {
              include: {
                masterComponent: true
              }
            },
            feeStructure: {
              include: {
                components: {
                  include: {
                    masterComponent: true
                  }
                }
              }
            }
          }
        },
        ledgerEntries: true,
        collections: true
      }
    });

    console.log("Student details:", JSON.stringify(student, null, 2));

  } catch (error) {
    console.error("Inspection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
