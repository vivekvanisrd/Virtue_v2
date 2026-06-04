const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId: "VIVES", isCurrent: true }
    });

    const sql = `
      SELECT 
        i.item_code,
        i.item_name,
        i.category,
        COALESCE(o.quantity, 0)::integer as opening_qty,
        COALESCE(a_add.adj_qty, 0)::integer as adjusted_add_qty,
        COALESCE(a_sub.adj_qty, 0)::integer as adjusted_sub_qty,
        (
          COALESCE(o.quantity, 0) + 
          COALESCE(a_add.adj_qty, 0) - 
          COALESCE(a_sub.adj_qty, 0)
        )::integer as current_stock
      FROM inventory_items i
      LEFT JOIN inventory_opening_stock o ON o.item_id = i.id AND o.academic_year_id = $3
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
      WHERE i.school_id = $1 AND i.branch_id = $2
        AND (i.item_code = 'KIT-LKG' OR i.item_code = 'TB-1LKG-CHMP' OR i.item_code = 'NB-GEN-CR200')
    `;

    const stock = await prisma.$queryRawUnsafe(sql, "VIVES", "VIVES-RCB", activeAY.id);
    console.log("UPDATED STOCK POSITIONS:");
    console.log(JSON.stringify(stock, null, 2));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
