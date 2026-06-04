const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Search all items in the database matching various possible names
    const items = await prisma.inventory_items.findMany({
      where: {
        school_id: "VIVES",
        branch_id: "VIVES-RCB",
        OR: [
          { item_name: { contains: "Check", mode: "insensitive" } },
          { item_name: { contains: "Square", mode: "insensitive" } },
          { item_name: { contains: "Grid", mode: "insensitive" } },
          { item_code: { contains: "CR", mode: "insensitive" } },
          { item_code: { contains: "SQ", mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        item_code: true,
        item_name: true,
        category: true,
        item_type: true
      }
    });

    console.log("SEARCH_RESULTS_ALL_ITEMS:", items);

    // 2. Check if any Check-Ruled or Square-Ruled items are included in ANY kits
    const kitItems = await prisma.inventory_kit_items.findMany({
      include: {
        inventory_kits: true,
        inventory_items: true
      }
    });

    const checkKitItems = kitItems.filter(ki => {
      const name = (ki.inventory_items?.item_name || "").toLowerCase();
      const code = (ki.inventory_items?.item_code || "").toLowerCase();
      return name.includes("check") || name.includes("square") || code.includes("cr") || code.includes("sq");
    });

    console.log("KIT_ITEMS_MATCHING_KEYWORDS:", checkKitItems.map(ki => ({
      kitName: ki.inventory_kits.kit_name,
      itemName: ki.inventory_items.item_name,
      itemCode: ki.inventory_items.item_code,
      quantity: ki.quantity
    })));

  } catch (error) {
    console.error("Audit failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
