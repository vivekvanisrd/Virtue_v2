const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const schoolId = "VIVES";
    const branchId = "VIVES-RCB";
    const ayId = "AY-2026-27-VIVES";

    const structures = await prisma.feeStructure.findMany({
      where: { schoolId, branchId, academicYearId: ayId },
      include: {
        class: true,
        components: {
          include: {
            masterComponent: true
          }
        }
      }
    });
    console.log(`Fee Structures for ${ayId}:`, structures.length);
    console.log("All structures mapping:");
    structures.forEach(s => {
      console.log(`- Class: ${s.class?.name || "N/A"} (${s.structureCode}) | Total Amount: ₹${s.totalAmount} | Name: "${s.name}"`);
      s.components.forEach(c => {
        console.log(`  * Component: "${c.masterComponent.name}" | Amount: ₹${c.amount} | Schedule: ${c.scheduleType}`);
      });
    });

  } catch (error) {
    console.error("Inspection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
