const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Fetch current academic years
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId: "VIVES" },
      orderBy: { startDate: "desc" }
    });
    const activeAY = academicYears.find(ay => ay.isCurrent) || academicYears[0];
    if (!activeAY) {
      console.error("No Academic Year found!");
      return;
    }
    console.log("Academic Year:", activeAY.id, "(", activeAY.name, ")");

    // 2. Find KIT-1-CLASS item
    const item = await prisma.inventory_items.findFirst({
      where: {
        school_id: "VIVES",
        branch_id: "VIVES-RCB",
        item_code: "KIT-1-CLASS"
      }
    });

    if (!item) {
      console.error("Item KIT-1-CLASS not found in database!");
      return;
    }
    console.log("Found Item SKU:", item.id, "(", item.item_name, ")");

    // 3. Update or create the opening stock
    const openingStock = await prisma.inventory_opening_stock.upsert({
      where: {
        school_id_item_id_academic_year_id: {
          school_id: "VIVES",
          item_id: item.id,
          academic_year_id: activeAY.id
        }
      },
      update: {
        quantity: 120,
        updated_at: new Date()
      },
      create: {
        school_id: "VIVES",
        branch_id: "VIVES-RCB",
        item_id: item.id,
        academic_year_id: activeAY.id,
        quantity: 120
      }
    });

    console.log("Successfully updated opening stock in database:", openingStock);

  } catch (error) {
    console.error("Database update failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
