const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId: "VIVES" },
      orderBy: { startDate: "desc" }
    });

    const activeAY = academicYears.find(ay => ay.isCurrent) || academicYears[0];

    const sql = `
      SELECT 
        i.item_code,
        i.item_name,
        i.category,
        COALESCE(o.quantity, 0)::integer as opening_qty,
        COALESCE(r.received_qty, 0)::integer as received_qty,
        COALESCE(iss.issued_qty, 0)::integer as issued_qty,
        (
          COALESCE(o.quantity, 0) + 
          COALESCE(r.received_qty, 0) - 
          COALESCE(iss.issued_qty, 0)
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
      WHERE i.school_id = $1 AND i.branch_id = $2
        AND i.category IN ('Notebooks', 'Textbooks')
      ORDER BY i.category ASC, i.item_name ASC
    `;

    const items = await prisma.$queryRawUnsafe(sql, "VIVES", "VIVES-RCB", activeAY.id);
    
    const activeItems = items.filter(itm => itm.current_stock > 0);
    console.log("ACTIVE_BOOKS_START");
    console.log(JSON.stringify(activeItems, null, 2));
    console.log("ACTIVE_BOOKS_END");

    const categoriesSum = {};
    items.forEach(itm => {
      if (!categoriesSum[itm.category]) {
        categoriesSum[itm.category] = { count: 0, totalStock: 0 };
      }
      categoriesSum[itm.category].count++;
      categoriesSum[itm.category].totalStock += itm.current_stock;
    });
    console.log("SUMS:", categoriesSum);

  } catch (error) {
    console.error("Failed to query notebooks/textbooks stock:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
