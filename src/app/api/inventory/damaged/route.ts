import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { InventoryService } from "@/lib/services/inventory-service";

export async function GET(req: NextRequest) {
  const schoolId = req.headers.get("x-v2-school-id");
  const branchId = req.headers.get("x-v2-branch-id");
  if (!schoolId || !branchId) {
    return NextResponse.json({ error: "Missing tenancy context" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academic_year_id");

    const damaged = await prisma.inventory_damaged_stock.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      },
      include: {
        inventory_items: {
          select: {
            item_code: true,
            item_name: true,
            unit: true,
          },
        },
      },
      orderBy: { log_date: "desc" },
    });

    return NextResponse.json({ damaged });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
    const { log_date, item_id, quantity, reason, academic_year_id } = body;

    if (!log_date || !item_id || !quantity || !reason || !academic_year_id) {
      return NextResponse.json({ error: "Missing required damaged stock fields" }, { status: 400 });
    }

    // 1. Verify availability of the item before damage logging
    const stockStatus = await InventoryService.checkStockAvailability({
      schoolId,
      branchId,
      academicYearId: academic_year_id,
      items: [{ itemId: item_id, quantity: Number(quantity) }],
    });

    if (!stockStatus[0].ok) {
      return NextResponse.json({
        error: "INSUFFICIENT_STOCK_FOR_DAMAGE_LOG",
        message: `Cannot log ${quantity} damaged units because only ${stockStatus[0].available} are available.`,
      }, { status: 400 });
    }

    // 2. Insert record
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.inventory_damaged_stock.create({
        data: {
          school_id: schoolId,
          branch_id: branchId,
          academic_year_id,
          log_date: new Date(log_date),
          item_id,
          quantity: Number(quantity),
          reason,
          logged_by: staffId,
        },
      });

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "LOG_DAMAGE",
        targetTable: "inventory_damaged_stock",
        targetId: record.id,
        newValues: record,
      });

      return record;
    });

    return NextResponse.json({ success: true, damaged: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
