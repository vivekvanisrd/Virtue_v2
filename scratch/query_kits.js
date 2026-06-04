const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const school_id = "VIVES";
const branch_id = "VIVES-RCB";
const academic_year_id = "AY-2026-27-VIVES";

const KIT_STOCKS = [
  { code: "KIT-NURSERY", name: "Nursery Kit (Pre-assembled)", class_name: "Nursery", stock: 140, price: 2700 },
  { code: "KIT-LKG", name: "LKG Kit (Pre-assembled)", class_name: "LKG", stock: 140, price: 3700 },
  { code: "KIT-UKG", name: "UKG Kit (Pre-assembled)", class_name: "UKG", stock: 140, price: 4700 },
  { code: "KIT-1-CLASS", name: "1st Class Kit (Pre-assembled)", class_name: "1st Class", stock: 119, price: 8650 },
  { code: "KIT-2-CLASS", name: "2nd Class Kit (Pre-assembled)", class_name: "2nd Class", stock: 90, price: 8250 },
  { code: "KIT-3-CLASS", name: "3rd Class Kit (Pre-assembled)", class_name: "3rd Class", stock: 80, price: 9000 },
  { code: "KIT-4-CLASS", name: "4th Class Kit (Pre-assembled)", class_name: "4th Class", stock: 60, price: 8650 },
  { code: "KIT-5-CLASS", name: "5th Class Kit (Pre-assembled)", class_name: "5th Class", stock: 60, price: 8650 },
  { code: "KIT-6-CLASS", name: "6th Class Kit (Pre-assembled)", class_name: "6th Class", stock: 30, price: 5100 },
  { code: "KIT-7-CLASS", name: "7th Class Kit (Pre-assembled)", class_name: "7th Class", stock: 20, price: 5330 },
  { code: "KIT-8-CLASS", name: "8th Class Kit (Pre-assembled)", class_name: "8th Class", stock: 25, price: 5680 },
  { code: "KIT-9-CLASS", name: "9th Class Kit (Pre-assembled)", class_name: "9th Class", stock: 15, price: 5680 }
];

async function main() {
  console.log("🌱 Processing Kit Stocks Seeding...");

  for (const item of KIT_STOCKS) {
    // 1. Check or create the catalog product (item_type = Kit)
    let dbItem = await prisma.inventory_items.findFirst({
      where: { school_id, item_code: item.code }
    });

    if (!dbItem) {
      dbItem = await prisma.inventory_items.create({
        data: {
          school_id,
          branch_id,
          item_code: item.code,
          item_name: item.name,
          category: "Kits",
          unit: "Set",
          item_type: "Kit",
          reorder_level: 5,
          status: "Active"
        }
      });
      console.log(`+ Created product SKU for kit: ${item.name}`);
    } else {
      console.log(`* Product SKU already exists for kit: ${item.name}`);
    }

    // 2. Check or create the Class Kit definition
    let dbKit = await prisma.inventory_kits.findFirst({
      where: { school_id, kit_name: item.class_name }
    });

    if (!dbKit) {
      dbKit = await prisma.inventory_kits.create({
        data: {
          school_id,
          branch_id,
          kit_name: item.class_name,
          description: `${item.class_name} Textbook and Notebook set`,
          total_price: item.price,
          status: "Active"
        }
      });
      console.log(`+ Created Class Kit definition: ${item.class_name}`);
    } else {
      // Update price if it differs
      if (Number(dbKit.total_price) !== item.price) {
        await prisma.inventory_kits.update({
          where: { id: dbKit.id },
          data: { total_price: item.price }
        });
        console.log(`* Updated Class Kit price for: ${item.class_name} to ${item.price}`);
      }
    }

    // 3. Upsert opening stock for the pre-assembled kit
    await prisma.inventory_opening_stock.upsert({
      where: {
        school_id_item_id_academic_year_id: {
          school_id,
          item_id: dbItem.id,
          academic_year_id
        }
      },
      update: {
        quantity: item.stock,
        updated_at: new Date()
      },
      create: {
        school_id,
        branch_id,
        item_id: dbItem.id,
        academic_year_id,
        quantity: item.stock
      }
    });
    console.log(`=> Set opening stock for ${item.name} to ${item.stock} sets.`);
  }

  console.log("✅ Kit Stocks Seeding Completed Successfully!");
}

main()
  .catch(err => console.error("❌ Seeding failed:", err.message))
  .finally(() => prisma.$disconnect());
