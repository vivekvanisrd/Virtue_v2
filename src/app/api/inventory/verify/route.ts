import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { InventoryService } from "@/lib/services/inventory-service";

export async function POST(req: NextRequest) {
  const schoolId = req.headers.get("x-v2-school-id");
  const branchId = req.headers.get("x-v2-branch-id");
  const staffId = req.headers.get("x-v2-staff-id") || "system";
  const staffName = req.headers.get("x-v2-name") || "System";

  if (!schoolId || !branchId) {
    return NextResponse.json({ error: "Missing tenancy context" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { items, adjustment_date, academic_year_id } = body;

    if (!items || !Array.isArray(items) || items.length === 0 || !adjustment_date || !academic_year_id) {
      return NextResponse.json({ error: "Missing required verification fields or items" }, { status: 400 });
    }

    // 1. Fetch current live stock levels to establish system counts
    const liveStock = await InventoryService.getLiveStock({
      schoolId,
      branchId,
      academicYearId: academic_year_id,
    });

    const liveStockMap = new Map<string, number>();
    liveStock.forEach(itm => {
      liveStockMap.set(itm.id, itm.current_stock);
    });

    const adjustmentsToMake: any[] = [];

    for (const verificationItem of items) {
      const { item_id, physical_qty, reason } = verificationItem;

      if (!item_id || physical_qty === undefined) {
        continue;
      }

      const systemQty = liveStockMap.get(item_id) ?? 0;
      const physicalQty = Number(physical_qty);

      if (systemQty !== physicalQty) {
        const adjustmentType = physicalQty > systemQty ? "Add" : "Subtract";
        adjustmentsToMake.push({
          item_id,
          previous_quantity: systemQty,
          new_quantity: physicalQty,
          adjustment_type: adjustmentType,
          reason: reason || `Stocktake discrepancy adjustment (${adjustmentType})`,
        });
      }
    }

    if (adjustmentsToMake.length === 0) {
      return NextResponse.json({ success: true, message: "Physical count matches system stock perfectly. No adjustments logged." });
    }

    // 2. Perform adjustments inside a single transaction
    const results = await prisma.$transaction(async (tx) => {
      const records = [];
      for (const adj of adjustmentsToMake) {
        const record = await tx.inventory_adjustments.create({
          data: {
            school_id: schoolId,
            branch_id: branchId,
            academic_year_id,
            adjustment_date: new Date(adjustment_date),
            item_id: adj.item_id,
            previous_quantity: adj.previous_quantity,
            new_quantity: adj.new_quantity,
            adjustment_type: adj.adjustment_type,
            reason: adj.reason,
            logged_by: staffId,
          },
        });

        await InventoryService.logAudit({
          schoolId,
          branchId,
          userId: staffId,
          username: staffName,
          actionType: "STOCK_RECONCILE",
          targetTable: "inventory_adjustments",
          targetId: record.id,
          newValues: record,
        });

        records.push(record);
      }
      return records;
    });

    return NextResponse.json({ success: true, adjustedRecords: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
