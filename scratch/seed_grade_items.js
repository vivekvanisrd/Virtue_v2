const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const school_id = "VIVES";
const branch_id = "VIVES-RCB";
const academic_year_id = "AY-2026-27-VIVES";

// 1. UNIQUE PRODUCTS CATALOG
const UNIQUE_PRODUCTS = [
  // LKG specific (Note: PP-I in image is LKG)
  { item_code: "TB-1LKG-CHMP", item_name: "Champak Set (LKG)", category: "Textbooks", unit: "Set" },
  { item_code: "ST-1LKG-STAT", item_name: "LKG Stationery Kit", category: "Stationery", unit: "Set" },
  
  // UKG specific (Note: PP-II in image is UKG)
  { item_code: "TB-2UKG-CHMP", item_name: "Champak Set (UKG)", category: "Textbooks", unit: "Set" },
  { item_code: "ST-2UKG-STAT", item_name: "UKG Stationery Kit", category: "Stationery", unit: "Set" },
  
  // 1st Class specific
  { item_code: "TB-1-CALX", item_name: "Calyx Set (1st Class)", category: "Textbooks", unit: "Set" },
  { item_code: "TB-1-TEL", item_name: "Telugu Textbook (1st Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-1-HIN", item_name: "Hindi Textbook (1st Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-1-OLY", item_name: "Olympiads (1st Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-1-INTG", item_name: "Integrated Textbook (1st Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-1-ENGCP", item_name: "English Copy Writing (1st Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-1-HINCP", item_name: "Hindi Copy Writing (1st Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "ST-1-ABAC", item_name: "Abacus (1st Class)", category: "Stationery", unit: "Pcs" },
  { item_code: "ST-1-STAT", item_name: "1st Class Stationery Kit", category: "Stationery", unit: "Set" },
  
  // 2nd Class specific
  { item_code: "TB-2-CALX", item_name: "Calyx Set (2nd Class)", category: "Textbooks", unit: "Set" },
  { item_code: "TB-2-TEL", item_name: "Telugu Textbook (2nd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-2-HIN", item_name: "Hindi Textbook (2nd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-2-OLY", item_name: "Olympiads (2nd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-2-INTG", item_name: "Integrated Textbook (2nd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-2-ENGCP", item_name: "English Copy Writing (2nd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-2-HINCP", item_name: "Hindi Copy Writing (2nd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "ST-2-ABAC", item_name: "Abacus (2nd Class)", category: "Stationery", unit: "Pcs" },
  { item_code: "ST-2-STAT", item_name: "2nd Class Stationery Kit", category: "Stationery", unit: "Set" },

  // 3rd Class specific
  { item_code: "TB-3-CALX", item_name: "Calyx Set (3rd Class)", category: "Textbooks", unit: "Set" },
  { item_code: "TB-3-TEL", item_name: "Telugu Textbook (3rd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-3-HIN", item_name: "Hindi Textbook (3rd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-3-OLY", item_name: "Olympiads (3rd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-3-INTG", item_name: "Integrated Textbook (3rd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-3-ENGCP", item_name: "English Copy Writing (3rd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-3-HINCP", item_name: "Hindi Copy Writing (3rd Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "ST-3-ABAC", item_name: "Abacus (3rd Class)", category: "Stationery", unit: "Pcs" },
  { item_code: "ST-3-STAT", item_name: "3rd Class Stationery Kit", category: "Stationery", unit: "Set" },
  
  // 7th Class specific (NCERT Textbooks)
  { item_code: "TB-7-TEL", item_name: "Telugu Textbook (7th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-7-HIN", item_name: "Hindi Textbook (7th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-7-ENG", item_name: "English Textbook (7th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-7-MAT", item_name: "Maths Textbook (7th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-7-SCI", item_name: "Science Textbook (7th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-7-SOC", item_name: "Social Textbook (7th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-7-INTG", item_name: "Integrated Textbook (7th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-7-IIT", item_name: "IIT Textbook (7th Class)", category: "Textbooks", unit: "Pcs" },

  // 8th Class specific
  { item_code: "TB-8-TEL", item_name: "Telugu Textbook (8th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-8-HIN", item_name: "Hindi Textbook (8th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-8-ENG", item_name: "English Textbook (8th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-8-MAT", item_name: "Maths Textbook (8th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-8-PHY", item_name: "Physical Science Textbook (8th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-8-BIO", item_name: "Biology Textbook (8th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-8-SOC", item_name: "Social Textbook (8th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-8-INTG", item_name: "Integrated Textbook (8th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-8-IIT", item_name: "IIT Textbook (8th Class)", category: "Textbooks", unit: "Pcs" },

  // 9th Class specific
  { item_code: "TB-9-TEL", item_name: "Telugu Textbook (9th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-9-HIN", item_name: "Hindi Textbook (9th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-9-ENG", item_name: "English Textbook (9th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-9-MAT", item_name: "Maths Textbook (9th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-9-PHY", item_name: "Physical Science Textbook (9th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-9-BIO", item_name: "Biology Textbook (9th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-9-SOC", item_name: "Social Textbook (9th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-9-INTG", item_name: "Integrated Textbook (9th Class)", category: "Textbooks", unit: "Pcs" },
  { item_code: "TB-9-IIT", item_name: "IIT Textbook (9th Class)", category: "Textbooks", unit: "Pcs" },

  // Shared / Generic items
  { item_code: "DR-GEN-DIARY", item_name: "School Diary", category: "Diaries", unit: "Pcs" },
  { item_code: "ST-GEN-COVR", item_name: "Transparent Cover Rolls", category: "Stationery", unit: "Pcs" },
  { item_code: "ST-GEN-LABL", item_name: "Sticker Labels", category: "Stationery", unit: "Pcs" },
  
  // Notebooks
  { item_code: "NB-GEN-4R200", item_name: "Four Ruled (200pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-4R100", item_name: "Four Ruled (100pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-CR200", item_name: "Check Ruled (200pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-DR200", item_name: "Double Ruled (200pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-DR100", item_name: "Double Ruled (100pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-BR200", item_name: "Broad Ruled (200pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-BR100", item_name: "Broad Ruled (100pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-MOSR200", item_name: "Math One Side Ruled (200pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-MOSR100", item_name: "Math One Side Ruled (100pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-SR200", item_name: "Single Ruled (200pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-SR100", item_name: "Single Ruled (100pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-MHR200", item_name: "Math Horizontal Ruled (200pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-MHR100", item_name: "Math Horizontal Ruled (100pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-OSSR200", item_name: "One Side Single Ruled (200pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-OSSR100", item_name: "One Side Single Ruled (100pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-5IN1", item_name: "5-in-1 Notebook", category: "Notebooks", unit: "Pcs" },
  
  // High Class Notebooks
  { item_code: "NB-GEN-LONG200", item_name: "Long Notebook (200pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-LONG100", item_name: "Long Notebook (100pgs)", category: "Notebooks", unit: "Pcs" },
  { item_code: "NB-GEN-ANSBKT", item_name: "Answer Booklet", category: "Notebooks", unit: "Pcs" },

  // Pre-assembled Kits tracked in Inventory (for Kit Bundling)
  { item_code: "KIT-LKG", item_name: "LKG Kit (Pre-assembled)", category: "Kits", unit: "Set", item_type: "Kit" },
  { item_code: "KIT-UKG", item_name: "UKG Kit (Pre-assembled)", category: "Kits", unit: "Set", item_type: "Kit" },
  { item_code: "KIT-1-CLASS", item_name: "1st Class Kit (Pre-assembled)", category: "Kits", unit: "Set", item_type: "Kit" },
  { item_code: "KIT-2-CLASS", item_name: "2nd Class Kit (Pre-assembled)", category: "Kits", unit: "Set", item_type: "Kit" },
  { item_code: "KIT-3-CLASS", item_name: "3rd Class Kit (Pre-assembled)", category: "Kits", unit: "Set", item_type: "Kit" },
  { item_code: "KIT-7-CLASS", item_name: "7th Class Kit (Pre-assembled)", category: "Kits", unit: "Set", item_type: "Kit" },
  { item_code: "KIT-8-CLASS", item_name: "8th Class Kit (Pre-assembled)", category: "Kits", unit: "Set", item_type: "Kit" },
  { item_code: "KIT-9-CLASS", item_name: "9th Class Kit (Pre-assembled)", category: "Kits", unit: "Set", item_type: "Kit" }
];

// 2. GRADE KITS AND BILLING AMOUNTS
const KITS = [
  { kit_name: "LKG", price: 3700, description: "LKG Textbook and Notebook set", items: [
    { code: "TB-1LKG-CHMP", qty: 1 },
    { code: "ST-1LKG-STAT", qty: 1 },
    { code: "NB-GEN-4R200", qty: 1 },
    { code: "NB-GEN-CR200", qty: 1 },
    { code: "NB-GEN-DR200", qty: 1 },
    { code: "ST-GEN-COVR", qty: 2 },
    { code: "ST-GEN-LABL", qty: 1 }
  ]},
  { kit_name: "UKG", price: 4700, description: "UKG Textbook and Notebook set", items: [
    { code: "TB-2UKG-CHMP", qty: 1 },
    { code: "ST-2UKG-STAT", qty: 1 },
    { code: "NB-GEN-4R200", qty: 2 },
    { code: "NB-GEN-CR200", qty: 1 },
    { code: "NB-GEN-DR200", qty: 1 },
    { code: "NB-GEN-BR100", qty: 1 },
    { code: "DR-GEN-DIARY", qty: 1 },
    { code: "ST-GEN-COVR", qty: 2 },
    { code: "ST-GEN-LABL", qty: 2 }
  ]},
  { kit_name: "1st Class", price: 8650, description: "1st Class Textbook and Notebook set", items: [
    { code: "TB-1-CALX", qty: 1 },
    { code: "TB-1-TEL", qty: 1 },
    { code: "TB-1-HIN", qty: 1 },
    { code: "TB-1-OLY", qty: 1 },
    { code: "TB-1-INTG", qty: 1 },
    { code: "TB-1-ENGCP", qty: 1 },
    { code: "TB-1-HINCP", qty: 1 },
    { code: "ST-1-ABAC", qty: 1 },
    { code: "ST-1-STAT", qty: 1 },
    { code: "DR-GEN-DIARY", qty: 1 },
    { code: "ST-GEN-COVR", qty: 2 },
    { code: "ST-GEN-LABL", qty: 2 },
    { code: "NB-GEN-4R200", qty: 4 },
    { code: "NB-GEN-4R100", qty: 3 },
    { code: "NB-GEN-MOSR200", qty: 2 },
    { code: "NB-GEN-MOSR100", qty: 4 },
    { code: "NB-GEN-DR200", qty: 2 },
    { code: "NB-GEN-DR100", qty: 1 },
    { code: "NB-GEN-BR200", qty: 2 },
    { code: "NB-GEN-BR100", qty: 1 },
    { code: "NB-GEN-5IN1", qty: 1 }
  ]},
  { kit_name: "2nd Class", price: 8250, description: "2nd Class Textbook and Notebook set", items: [
    { code: "TB-2-CALX", qty: 1 },
    { code: "TB-2-TEL", qty: 1 },
    { code: "TB-2-HIN", qty: 1 },
    { code: "TB-2-OLY", qty: 1 },
    { code: "TB-2-INTG", qty: 1 },
    { code: "TB-2-ENGCP", qty: 1 },
    { code: "TB-2-HINCP", qty: 1 },
    { code: "ST-2-ABAC", qty: 1 },
    { code: "ST-2-STAT", qty: 1 },
    { code: "DR-GEN-DIARY", qty: 1 },
    { code: "ST-GEN-COVR", qty: 2 },
    { code: "ST-GEN-LABL", qty: 2 },
    { code: "NB-GEN-4R200", qty: 4 },
    { code: "NB-GEN-4R100", qty: 2 },
    { code: "NB-GEN-MOSR200", qty: 2 },
    { code: "NB-GEN-MOSR100", qty: 1 },
    { code: "NB-GEN-DR200", qty: 2 },
    { code: "NB-GEN-DR100", qty: 1 },
    { code: "NB-GEN-BR200", qty: 2 },
    { code: "NB-GEN-BR100", qty: 1 }
  ]},
  { kit_name: "3rd Class", price: 9000, description: "3rd Class Textbook and Notebook set", items: [
    { code: "TB-3-CALX", qty: 1 },
    { code: "TB-3-TEL", qty: 1 },
    { code: "TB-3-HIN", qty: 1 },
    { code: "TB-3-OLY", qty: 1 },
    { code: "TB-3-INTG", qty: 1 },
    { code: "TB-3-ENGCP", qty: 1 },
    { code: "TB-3-HINCP", qty: 1 },
    { code: "ST-3-ABAC", qty: 1 },
    { code: "ST-3-STAT", qty: 1 },
    { code: "DR-GEN-DIARY", qty: 1 },
    { code: "ST-GEN-COVR", qty: 3 },
    { code: "ST-GEN-LABL", qty: 3 },
    { code: "NB-GEN-SR200", qty: 5 },
    { code: "NB-GEN-SR100", qty: 2 },
    { code: "NB-GEN-MHR200", qty: 3 },
    { code: "NB-GEN-MHR100", qty: 1 },
    { code: "NB-GEN-DR200", qty: 2 },
    { code: "NB-GEN-DR100", qty: 1 },
    { code: "NB-GEN-BR200", qty: 2 },
    { code: "NB-GEN-BR100", qty: 1 },
    { code: "NB-GEN-OSSR200", qty: 2 },
    { code: "NB-GEN-OSSR100", qty: 1 }
  ]},
  { kit_name: "7th Class", price: 5330, description: "7th Class Textbook and Notebook set", items: [
    { code: "TB-7-TEL", qty: 1 },
    { code: "TB-7-HIN", qty: 1 },
    { code: "TB-7-ENG", qty: 1 },
    { code: "TB-7-MAT", qty: 1 },
    { code: "TB-7-SCI", qty: 1 },
    { code: "TB-7-SOC", qty: 1 },
    { code: "TB-7-INTG", qty: 1 },
    { code: "TB-7-IIT", qty: 1 },
    { code: "DR-GEN-DIARY", qty: 1 },
    { code: "NB-GEN-LONG200", qty: 10 },
    { code: "NB-GEN-LONG100", qty: 12 },
    { code: "NB-GEN-ANSBKT", qty: 1 }
  ]},
  { kit_name: "8th Class", price: 5680, description: "8th Class Textbook and Notebook set", items: [
    { code: "TB-8-TEL", qty: 1 },
    { code: "TB-8-HIN", qty: 1 },
    { code: "TB-8-ENG", qty: 1 },
    { code: "TB-8-MAT", qty: 1 },
    { code: "TB-8-PHY", qty: 1 },
    { code: "TB-8-BIO", qty: 1 },
    { code: "TB-8-SOC", qty: 1 },
    { code: "TB-8-INTG", qty: 1 },
    { code: "TB-8-IIT", qty: 1 },
    { code: "DR-GEN-DIARY", qty: 1 },
    { code: "NB-GEN-LONG200", qty: 10 },
    { code: "NB-GEN-LONG100", qty: 12 },
    { code: "NB-GEN-ANSBKT", qty: 1 }
  ]},
  { kit_name: "9th Class", price: 5680, description: "9th Class Textbook and Notebook set", items: [
    { code: "TB-9-TEL", qty: 1 },
    { code: "TB-9-HIN", qty: 1 },
    { code: "TB-9-ENG", qty: 1 },
    { code: "TB-9-MAT", qty: 1 },
    { code: "TB-9-PHY", qty: 1 },
    { code: "TB-9-BIO", qty: 1 },
    { code: "TB-9-SOC", qty: 1 },
    { code: "TB-9-INTG", qty: 1 },
    { code: "TB-9-IIT", qty: 1 },
    { code: "DR-GEN-DIARY", qty: 1 },
    { code: "NB-GEN-LONG200", qty: 10 },
    { code: "NB-GEN-LONG100", qty: 12 },
    { code: "NB-GEN-ANSBKT", qty: 1 }
  ]}
];

async function seed() {
  console.log("🌱 Seeding Bookstore items...");
  
  // Set local RLS bypass for dev CLI execution
  process.env.SKIP_TENANCY = "true";

  // 1. CLEAN UP old VIVES kits and items to prevent duplicates/orphans
  console.log("🧹 Cleaning up old VIVES kits and items...");
  await prisma.inventory_kits.deleteMany({
    where: { school_id }
  });
  await prisma.inventory_items.deleteMany({
    where: { school_id }
  });

  const codeToIdMap = new Map();

  // 2. Create unique products catalog (both regular items and pre-assembled Kit items)
  for (const prod of UNIQUE_PRODUCTS) {
    const item = await prisma.inventory_items.create({
      data: {
        school_id,
        branch_id,
        item_code: prod.item_code,
        item_name: prod.item_name,
        category: prod.category,
        unit: prod.unit,
        item_type: prod.item_type || "Regular",
        reorder_level: 10,
        status: "Active"
      }
    });
    console.log(`+ Product SKU created: ${prod.item_name} [${prod.item_code}] - type: ${item.item_type}`);
    codeToIdMap.set(prod.item_code, item.id);
  }

  // 3. Create Grade Kits
  for (const k of KITS) {
    const kit = await prisma.inventory_kits.create({
      data: {
        school_id,
        branch_id,
        kit_name: k.kit_name,
        description: k.description,
        total_price: k.price,
        status: "Active"
      }
    });
    console.log(`+ Grade Kit created: ${k.kit_name}`);

    // Insert kit items links
    for (const kitItem of k.items) {
      const item_id = codeToIdMap.get(kitItem.code);
      if (item_id) {
        await prisma.inventory_kit_items.create({
          data: {
            kit_id: kit.id,
            item_id,
            quantity: kitItem.qty
          }
        });
      } else {
        console.warn(`⚠️ Warning: SKU ${kitItem.code} not found when mapping kit ${k.kit_name}`);
      }
    }
    console.log(`  Mapped ${k.items.length} items to ${k.kit_name} Kit.`);
  }

  console.log("✅ Bookstore Seeding Finished Successfully!");
}

seed()
  .catch(err => {
    console.error("❌ Seeding failed:", err.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
