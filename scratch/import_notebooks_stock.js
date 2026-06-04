const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const schoolId = "VIVES";
    const branchId = "VIVES-RCB";

    // 1. Fetch current academic year
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: "desc" }
    });
    const activeAY = academicYears.find(ay => ay.isCurrent) || academicYears[0];
    if (!activeAY) {
      console.error("No Academic Year found!");
      return;
    }
    console.log("Academic Year:", activeAY.id, "(", activeAY.name, ")");

    // 2. Add missing Check Ruled (100pgs) SKU if not exists
    const checkRuled100 = await prisma.inventory_items.upsert({
      where: {
        school_id_item_code: {
          school_id: schoolId,
          item_code: "NB-GEN-CR100"
        }
      },
      update: {
        item_name: "Check Ruled (100pgs)",
        category: "Notebooks",
        item_type: "Regular",
        unit: "Pcs",
        reorder_level: 10,
        status: "Active"
      },
      create: {
        school_id: schoolId,
        branch_id: branchId,
        item_code: "NB-GEN-CR100",
        item_name: "Check Ruled (100pgs)",
        category: "Notebooks",
        item_type: "Regular",
        unit: "Pcs",
        reorder_level: 10,
        status: "Active"
      }
    });
    console.log("Check Ruled (100pgs) Item registered:", checkRuled100.id);

    // 3. Define the leftover stock mapping list
    const leftoverStock = [
      { code: "NB-GEN-CR200", qty: 41 },    // 1) Check ruled (200 pgs)
      { code: "NB-GEN-4R100", qty: 199 },   // 2) Four ruled (100 pgs)
      { code: "NB-GEN-BR100", qty: 84 },    // 3) Broad ruled (100 pgs)
      { code: "NB-GEN-MHR200", qty: 385 },  // 4) Math horizontal (200 pgs)
      { code: "NB-GEN-MHR100", qty: 182 },  // 5) Math horizontal (100 pgs)
      { code: "NB-GEN-OSSR200", qty: 37 },  // 6) One side single ruled (200 pgs)
      { code: "NB-GEN-DR200", qty: 38 },    // 7) Double ruled (200 pgs)
      { code: "NB-GEN-MOSR200", qty: 56 },  // 8) Math plain (200 pgs) -> Math One Side Ruled
      { code: "NB-GEN-MOSR100", qty: 186 }, // 9) Math plain (100 pgs) -> Math One Side Ruled
      { code: "NB-GEN-CR100", qty: 40 },    // 10) Check ruled (100 pgs)
      { code: "NB-GEN-4R200", qty: 8 },     // 11) Four ruled (200 pgs)
      { code: "NB-GEN-SR200", qty: 5 },     // 12) Single ruled (200 pgs)
      { code: "NB-GEN-DR100", qty: 75 },    // 13) Double ruled (100 pgs)
      { code: "NB-GEN-LONG100", qty: 23 },  // 14) Double ruled long (100 pgs) -> Long Notebook (100pgs)
      { code: "NB-GEN-LONG200", qty: 184 }  // 15) One side ruled long (10) + 16) Long plain N/B (174) -> Long Notebook (200pgs)
    ];

    console.log("Starting stock upsert operations...");
    for (const itemStock of leftoverStock) {
      // Find the item ID
      const item = await prisma.inventory_items.findFirst({
        where: {
          school_id: schoolId,
          branch_id: branchId,
          item_code: itemStock.code
        }
      });

      if (!item) {
        console.error(`Item with code ${itemStock.code} not found! Skipping stock update.`);
        continue;
      }

      // Upsert opening stock quantity
      const openingStock = await prisma.inventory_opening_stock.upsert({
        where: {
          school_id_item_id_academic_year_id: {
            school_id: schoolId,
            item_id: item.id,
            academic_year_id: activeAY.id
          }
        },
        update: {
          quantity: itemStock.qty,
          updated_at: new Date()
        },
        create: {
          school_id: schoolId,
          branch_id: branchId,
          item_id: item.id,
          academic_year_id: activeAY.id,
          quantity: itemStock.qty
        }
      });

      console.log(`Updated stock: [${item.item_code}] ${item.item_name} -> Opening Quantity: ${openingStock.quantity}`);
    }

    console.log("All stock updates successfully committed to database!");

  } catch (error) {
    console.error("Stock import failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
