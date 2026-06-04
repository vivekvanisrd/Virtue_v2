const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId: "VIVES" },
      orderBy: { startDate: "desc" }
    });

    const activeAY = academicYears.find(ay => ay.isCurrent) || academicYears[0];
    if (!activeAY) {
      console.error("No Academic Year found!");
      return;
    }

    const sql = `
      SELECT 
        i.item_code,
        i.item_name,
        i.category,
        i.item_type,
        i.unit,
        COALESCE(o.quantity, 0)::integer as opening_qty,
        COALESCE(r.received_qty, 0)::integer as received_qty,
        COALESCE(iss.issued_qty, 0)::integer as issued_qty,
        COALESCE(d.damaged_qty, 0)::integer as damaged_qty,
        COALESCE(ret.returned_qty, 0)::integer as returned_qty,
        (
          COALESCE(o.quantity, 0) + 
          COALESCE(r.received_qty, 0) + 
          COALESCE(ret.returned_qty, 0) - 
          COALESCE(iss.issued_qty, 0) - 
          COALESCE(d.damaged_qty, 0)
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
          SELECT ri.item_id, SUM(ri.quantity) as returned_qty
          FROM inventory_return_items ri
          JOIN inventory_returns ret ON ret.id = ri.return_id
          WHERE ret.school_id = $1 AND ret.academic_year_id = $3 AND ri.status = 'Restocked'
          GROUP BY ri.item_id
      ) ret ON ret.item_id = i.id
      WHERE i.school_id = $1 AND i.branch_id = $2
      ORDER BY i.item_name ASC
    `;

    const stock = await prisma.$queryRawUnsafe(sql, "VIVES", "VIVES-RCB", activeAY.id);
    
    // Filter active stock
    const activeStock = stock.filter(s => s.current_stock > 0 || s.opening_qty > 0 || s.received_qty > 0 || s.issued_qty > 0);
    
    console.log("ACTIVE_STOCK_START");
    console.log(JSON.stringify(activeStock, null, 2));
    console.log("ACTIVE_STOCK_END");

    console.log("TOTAL_ITEMS_COUNT:", stock.length);
    console.log("ACTIVE_STOCK_ITEMS_COUNT:", activeStock.length);

  } catch (error) {
    console.error("Failed to query stock position:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
