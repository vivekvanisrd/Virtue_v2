const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const schoolId = "VIVES";
    const branchId = "VIVES-RCB";
    const ayId = "AY-2025-26-VIVES";

    // 1. Get Academic Years
    const ays = await prisma.academicYear.findMany({
      where: { schoolId }
    });
    console.log("Academic Years in DB:", JSON.stringify(ays, null, 2));

    // 2. Get Classes for the branch
    const classes = await prisma.class.findMany({
      where: { schoolId, branchId }
    });
    console.log(`Classes count for ${branchId}:`, classes.length);
    console.log("Sample Classes:", JSON.stringify(classes.slice(0, 5), null, 2));

    // 3. Get Fee Component Masters
    const feeComps = await prisma.feeComponentMaster.findMany({
      where: { schoolId }
    });
    console.log("Fee Component Masters in DB:", JSON.stringify(feeComps.map(c => ({ id: c.id, name: c.name, type: c.type })), null, 2));

    // 4. Get Existing Fee Structures for 2025-26
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
    if (structures.length > 0) {
      console.log("Sample Fee Structure:", JSON.stringify(structures[0], null, 2));
    }

  } catch (error) {
    console.error("Inspection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
