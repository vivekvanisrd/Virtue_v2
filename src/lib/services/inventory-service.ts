import prisma from "../prisma";

export type LiveStockRecord = {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  item_type: string | null;
  unit: string;
  reorder_level: number;
  barcode: string | null;
  qr_code: string | null;
  status: string;
  opening_qty: number;
  received_qty: number;
  adjusted_add_qty: number;
  adjusted_sub_qty: number;
  issued_qty: number;
  damaged_qty: number;
  current_stock: number;
};

export const InventoryService = {
  /**
   * getLiveStock
   * 
   * Calculates current inventory for items inside a school & branch
   * using a single optimized raw PostgreSQL query.
   */
  async getLiveStock(params: {
    schoolId: string;
    branchId: string;
    academicYearId: string;
    itemId?: string;
  }): Promise<LiveStockRecord[]> {
    let sql = `
      SELECT 
        i.id::text,
        i.item_code,
        i.item_name,
        i.category,
        i.item_type,
        i.unit,
        i.reorder_level,
        i.barcode,
        i.qr_code,
        i.status,
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
    `;

    const args: any[] = [params.schoolId, params.branchId, params.academicYearId];
    if (params.itemId) {
      args.push(params.itemId);
      sql += ` AND i.id = $4`;
    }
    sql += ` ORDER BY i.item_name ASC`;

    return prisma.$queryRawUnsafe(sql, ...args);
  },

  /**
   * logAudit
   * 
   * Writes modification logs directly into system audit tables.
   */
  async logAudit(params: {
    schoolId: string;
    branchId: string;
    userId: string;
    username: string;
    actionType: string;
    targetTable: string;
    targetId: string;
    oldValues?: any;
    newValues?: any;
  }) {
    try {
      await prisma.inventory_audit_logs.create({
        data: {
          school_id: params.schoolId,
          branch_id: params.branchId,
          user_id: params.userId,
          username: params.username,
          action_type: params.actionType,
          target_table: params.targetTable,
          target_id: params.targetId,
          old_values: params.oldValues || null,
          new_values: params.newValues || null,
        },
      });
    } catch (e: any) {
      console.error("⚠️ Failed to write audit log:", e.message);
    }
  },

  /**
   * checkStockAvailability
   * 
   * Validates if items have enough quantity for outward transactions.
   */
  async checkStockAvailability(params: {
    schoolId: string;
    branchId: string;
    academicYearId: string;
    items: { itemId: string; quantity: number }[];
  }): Promise<{ itemId: string; itemName: string; available: number; requested: number; ok: boolean }[]> {
    const results = [];
    const stockMap = new Map<string, number>();

    // Load live stock values
    const liveStock = await this.getLiveStock({
      schoolId: params.schoolId,
      branchId: params.branchId,
      academicYearId: params.academicYearId,
    });

    liveStock.forEach(item => {
      stockMap.set(item.id, item.current_stock);
    });

    for (const request of params.items) {
      const available = stockMap.get(request.itemId) || 0;
      const dbItem = liveStock.find(i => i.id === request.itemId);
      results.push({
        itemId: request.itemId,
        itemName: dbItem ? dbItem.item_name : "Unknown Item",
        available,
        requested: request.quantity,
        ok: available >= request.quantity,
      });
    }

    return results;
  },

  /**
   * reserveInventoryForPayment
   * 
   * Extracts the kit name from the paid payment link description,
   * queries the kit items, and inserts reservation rows.
   */
  async reserveInventoryForPayment(token: string): Promise<boolean> {
    try {
      const linkRecord = await prisma.fee_payment_links.findUnique({
        where: { token }
      });
      if (!linkRecord || linkRecord.status !== "PAID") {
        console.warn(`[RESERVATION] Payment link '${token}' not found or not paid.`);
        return false;
      }

      // Check if reservations already exist for this source
      const existingReservations = await prisma.inventory_reservations.findFirst({
        where: { source_id: token }
      });
      if (existingReservations) {
        console.info(`[RESERVATION] Stock reservations already exist for payment token '${token}'.`);
        return true;
      }

      const schoolId = linkRecord.school_id;
      const branchId = linkRecord.branch_id;
      if (!schoolId || !branchId) {
        console.error("[RESERVATION] Missing school_id or branch_id in link record. Aborting.");
        return false;
      }
      const description = linkRecord.description || "";

      let kitName = "";
      if (description.startsWith("Book Kit - ")) {
        kitName = description.replace("Book Kit - ", "").trim();
      } else {
        console.info(`[RESERVATION] Payment description '${description}' is not a standard book kit. Skipping automatic reservations.`);
        return false;
      }

      const kit = await prisma.inventory_kits.findFirst({
        where: {
          school_id: schoolId,
          branch_id: branchId,
          kit_name: kitName,
          status: "ACTIVE"
        },
        include: {
          inventory_kit_items: true
        }
      });
      if (!kit) {
        console.warn(`[RESERVATION] Active inventory kit '${kitName}' not found in database for school '${schoolId}' and branch '${branchId}'.`);
        return false;
      }

      const activeAY = await prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true }
      });
      const academicYearId = activeAY?.id || "default-ay";

      // Resolve Kit Catalog Item Code
      const cleanKitName = kitName.trim().toLowerCase();
      let kitCode = `KIT-${kitName.toUpperCase().replace(/\s+/g, "-")}`;
      if (cleanKitName === "lkg") kitCode = "KIT-LKG";
      else if (cleanKitName === "ukg") kitCode = "KIT-UKG";
      else if (cleanKitName === "nursery") kitCode = "KIT-NURSERY";
      else if (cleanKitName === "1st class") kitCode = "KIT-1-CLASS";
      else if (cleanKitName === "2nd class") kitCode = "KIT-2-CLASS";
      else if (cleanKitName === "3rd class") kitCode = "KIT-3-CLASS";
      else if (cleanKitName === "4th class") kitCode = "KIT-4-CLASS";
      else if (cleanKitName === "5th class") kitCode = "KIT-5-CLASS";
      else if (cleanKitName === "6th class") kitCode = "KIT-6-CLASS";
      else if (cleanKitName === "7th class") kitCode = "KIT-7-CLASS";
      else if (cleanKitName === "8th class") kitCode = "KIT-8-CLASS";
      else if (cleanKitName === "9th class") kitCode = "KIT-9-CLASS";

      const kitItem = await prisma.inventory_items.findFirst({
        where: {
          school_id: schoolId,
          branch_id: branchId,
          item_code: kitCode
        }
      });

      if (!kitItem) {
        console.warn(`[RESERVATION] Catalog item for kit code '${kitCode}' not found in database.`);
        return false;
      }

      await prisma.inventory_reservations.create({
        data: {
          school_id: schoolId,
          branch_id: branchId,
          academic_year_id: academicYearId,
          item_id: kitItem.id,
          quantity: 1,
          source_type: "ONLINE_SALE",
          source_id: token,
          status: "Reserved"
        }
      });
      console.log(`[RESERVATION] Successfully reserved Kit SKU '${kitCode}' for payment '${token}'.`);
      return true;
    } catch (err: any) {
      console.error("[RESERVATION] Error creating inventory reservations:", err.message);
      return false;
    }
  }
};
