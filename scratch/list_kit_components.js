const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const kits = await prisma.inventory_kits.findMany({
      where: {
        school_id: "VIVES",
        branch_id: "VIVES-RCB"
      },
      include: {
        inventory_kit_items: {
          include: {
            inventory_items: true
          }
        }
      }
    });

    for (const kit of kits) {
      console.log(`=== KIT: ${kit.kit_name} ===`);
      kit.inventory_kit_items.forEach(ki => {
        console.log(` - [${ki.inventory_items.item_code}] ${ki.inventory_items.item_name} (Qty: ${ki.quantity}) [Category: ${ki.inventory_items.category}]`);
      });
    }

  } catch (error) {
    console.error("Audit failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
