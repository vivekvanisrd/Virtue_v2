const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const records = await prisma.financialRecord.findMany({
      include: {
        student: {
          include: {
            academic: {
              include: {
                class: true
              }
            }
          }
        }
      }
    });

    console.log("Total records found:", records.length);
    records.forEach(r => {
      console.log(`- Student: ${r.student.firstName} ${r.student.lastName || ""} (ID: ${r.student.id}) | Class: ${r.student.academic?.class?.name || "N/A"} | Tuition: ₹${r.tuitionFee}`);
    });

  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
