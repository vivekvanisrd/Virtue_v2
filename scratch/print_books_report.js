const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId: "VIVES", isCurrent: true }
    });

    if (!activeAY) {
      console.error("No active academic year");
      return;
    }

    const sql = `
      SELECT 
        i.item_code,
        i.item_name,
        i.category,
        COALESCE(o.quantity, 0)::integer as opening_qty,
        COALESCE(r.received_qty, 0)::integer as received_qty,
        COALESCE(a_add.adj_qty, 0)::integer as adjusted_add_qty,
        COALESCE(a_sub.adj_qty, 0)::integer as adjusted_sub_qty,
        COALESCE(iss.issued_qty, 0)::integer as issued_qty,
        COALESCE(d.damaged_qty, 0)::integer as damaged_qty,
        COALESCE(ret.returned_qty, 0)::integer as returned_qty,
        COALESCE(exch.exchanged_qty, 0)::integer as exchanged_qty,
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
        AND i.category IN ('Notebooks', 'Textbooks')
      ORDER BY i.category ASC, i.item_name ASC
    `;

    const stock = await prisma.$queryRawUnsafe(sql, "VIVES", "VIVES-RCB", activeAY.id);

    console.log("MARKDOWN_REPORT_START");
    console.log("| Item SKU | Item Name | Category | Opening | Received (GRN) | Adj Add (+) | Adj Sub (-) | Sold (Issued) | Current Stock |");
    console.log("| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |");
    stock.forEach(s => {
      console.log(`| **${s.item_code}** | ${s.item_name} | ${s.category} | ${s.opening_qty} | ${s.received_qty} | ${s.adjusted_add_qty} | ${s.adjusted_sub_qty} | ${s.issued_qty} | **${s.current_stock}** |`);
    });
    console.log("MARKDOWN_REPORT_END");

  } catch (error) {
    console.error("Failed to generate report:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
