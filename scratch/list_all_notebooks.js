const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const items = await prisma.inventory_items.findMany({
      where: {
        school_id: "VIVES",
        branch_id: "VIVES-RCB",
        category: "Notebooks"
      },
      select: {
        id: true,
        item_code: true,
        item_name: true,
        unit: true
      },
      orderBy: { item_name: "asc" }
    });

    console.log("REGISTERED_NOTEBOOKS_START");
    console.log(JSON.stringify(items, null, 2));
    console.log("REGISTERED_NOTEBOOKS_END");

  } catch (error) {
    console.error("Failed to query notebooks list:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
