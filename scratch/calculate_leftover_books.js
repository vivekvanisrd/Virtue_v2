const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId: "VIVES", isCurrent: true }
    });

    if (!activeAY) {
      console.error("No active academic year found");
      return;
    }

    // 1. Get current loose stock positions for all items
    const stockSql = `
      SELECT 
        i.id,
        i.item_code,
        i.item_name,
        i.category,
        (
          COALESCE(o.quantity, 0) + 
          COALESCE(r.received_qty, 0) + 
          COALESCE(a_add.adj_qty, 0) +
          COALESCE(ret.returned_qty, 0) - 
          COALESCE(iss.issued_qty, 0) - 
          COALESCE(d.damaged_qty, 0) - 
          COALESCE(a_sub.adj_qty, 0) -
          COALESCE(exch.exchanged_qty, 0)
        )::integer as current_stock
      FROM inventory_items i
      LEFT JOIN inventory_opening_stock o ON o.item_id = i.id AND o.academic_year_id = $3
      LEFT JOIN (
          SELECT ri.item_id, SUM(ri.quantity_received) as received_qty
          FROM inventory_grn_items ri
          JOIN inventory_goods_receipts g ON g.id = ri.grn_id
          WHERE g.school_id = $1 AND g.academic_year_id = $3 AND g.status = 'Active'
          GROUP BY ri.item_id
      ) r ON r.item_id = i.id
      LEFT JOIN (
          SELECT item_id, SUM(quantity) as issued_qty
          FROM inventory_issue_items ii
          JOIN inventory_issues iss ON iss.id = ii.issue_id
          WHERE iss.school_id = $1 AND iss.academic_year_id = $3
          GROUP BY item_id
      ) iss ON iss.item_id = i.id
      LEFT JOIN (
          SELECT item_id, SUM(quantity) as damaged_qty
          FROM inventory_damaged_stock
          WHERE school_id = $1 AND academic_year_id = $3
          GROUP BY item_id
      ) d ON d.item_id = i.id
      LEFT JOIN (
          SELECT item_id, SUM(new_quantity - previous_quantity) as adj_qty
          FROM inventory_adjustments
          WHERE school_id = $1 AND academic_year_id = $3 AND adjustment_type = 'Add'
          GROUP BY item_id
      ) a_add ON a_add.item_id = i.id
      LEFT JOIN (
          SELECT item_id, SUM(previous_quantity - new_quantity) as adj_qty
          FROM inventory_adjustments
          WHERE school_id = $1 AND academic_year_id = $3 AND adjustment_type = 'Subtract'
          GROUP BY item_id
      ) a_sub ON a_sub.item_id = i.id
      LEFT JOIN (
          SELECT ri.item_id, SUM(ri.quantity) as returned_qty
          FROM inventory_return_items ri
          JOIN inventory_returns ret ON ret.id = ri.return_id
          WHERE ret.school_id = $1 AND ret.academic_year_id = $3 AND ri.status = 'Restocked'
          GROUP BY ri.item_id
      ) ret ON ret.item_id = i.id
      LEFT JOIN (
          SELECT ri.exchange_item_id as item_id, SUM(ri.exchange_quantity) as exchanged_qty
          FROM inventory_return_items ri
          JOIN inventory_returns ret ON ret.id = ri.return_id
          WHERE ret.school_id = $1 AND ret.academic_year_id = $3 AND ri.exchange_item_id IS NOT NULL
          GROUP BY ri.exchange_item_id
      ) exch ON exch.item_id = i.id
      WHERE i.school_id = $1 AND i.branch_id = $2
    `;

    const liveStock = await prisma.$queryRawUnsafe(stockSql, "VIVES", "VIVES-RCB", activeAY.id);
    const stockMap = {};
    liveStock.forEach(item => {
      stockMap[item.id] = item.current_stock;
    });

    // 2. Fetch all kits and their current stock levels
    const kitItems = liveStock.filter(s => s.category === "Kits");
    const kitStockMap = {};
    kitItems.forEach(k => {
      kitStockMap[k.item_code] = k.current_stock;
    });

    // Helper to map kit name to item code
    function getKitItemCode(kitName) {
      const clean = kitName.trim().toLowerCase();
      if (clean === "lkg") return "KIT-LKG";
      if (clean === "ukg") return "KIT-UKG";
      if (clean === "nursery") return "KIT-NURSERY";
      if (clean === "1st class") return "KIT-1-CLASS";
      if (clean === "2nd class") return "KIT-2-CLASS";
      if (clean === "3rd class") return "KIT-3-CLASS";
      if (clean === "4th class") return "KIT-4-CLASS";
      if (clean === "5th class") return "KIT-5-CLASS";
      if (clean === "6th class") return "KIT-6-CLASS";
      if (clean === "7th class") return "KIT-7-CLASS";
      if (clean === "8th class") return "KIT-8-CLASS";
      if (clean === "9th class") return "KIT-9-CLASS";
      return `KIT-${kitName.toUpperCase().replace(/\s+/g, "-")}`;
    }

    // 3. Fetch kit component mappings
    const kitDefinitions = await prisma.inventory_kits.findMany({
      where: { school_id: "VIVES", branch_id: "VIVES-RCB" },
      include: {
        inventory_kit_items: true
      }
    });

    // Calculate total required items across all kits currently in stock
    const requiredQuantities = {};
    kitDefinitions.forEach(kd => {
      const kitCode = getKitItemCode(kd.kit_name);
      const kitStock = kitStockMap[kitCode] || 0;

      kd.inventory_kit_items.forEach(ki => {
        if (!requiredQuantities[ki.item_id]) {
          requiredQuantities[ki.item_id] = 0;
        }
        requiredQuantities[ki.item_id] += ki.quantity * kitStock;
      });
    });

    // 4. Generate the report tables
    const books = liveStock.filter(s => s.category === "Notebooks" || s.category === "Textbooks");
    
    // Sort books by category, then name
    books.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.item_name.localeCompare(b.item_name);
    });

    console.log("=== LEFTOVER STOCK REPORT ===");
    console.log("| Item SKU | Item Name | Category | Loose Stock | Consumed in Kits | Leftover Stock |");
    console.log("| :--- | :--- | :--- | :---: | :---: | :---: |");
    
    books.forEach(b => {
      const currentLoose = b.current_stock;
      const consumed = requiredQuantities[b.id] || 0;
      const leftover = currentLoose - consumed;
      
      // Highlight negative or zero leftover
      const leftoverStr = leftover < 0 ? `**${leftover}**` : `${leftover}`;
      
      console.log(`| **${b.item_code}** | ${b.item_name} | ${b.category} | ${currentLoose} | ${consumed} | ${leftoverStr} |`);
    });

  } catch (error) {
    console.error("Error calculating leftover stock:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
