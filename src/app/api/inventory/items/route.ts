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
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "Active";

    const items = await prisma.inventory_items.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        ...(category ? { category } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { item_name: "asc" },
    });

    return NextResponse.json({ items });
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
    const {
      id,
      item_code,
      item_name,
      category,
      item_type,
      unit,
      reorder_level,
      barcode,
      qr_code,
      status,
      opening_qty,
      academic_year_id,
    } = body;

    if (!item_code || !item_name || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (id) {
      // 1. UPDATE EXISTING SKU
      const oldItem = await prisma.inventory_items.findUnique({ where: { id } });
      if (!oldItem) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const updated = await prisma.inventory_items.update({
        where: { id },
        data: {
          item_code,
          item_name,
          category,
          item_type,
          unit,
          reorder_level: Number(reorder_level || 10),
          barcode: barcode || null,
          qr_code: qr_code || null,
          status: status || "Active",
          updated_at: new Date(),
        },
      });

      // Update opening stock if year and qty are provided
      if (academic_year_id && opening_qty !== undefined) {
        await prisma.inventory_opening_stock.upsert({
          where: {
            school_id_item_id_academic_year_id: {
              school_id: schoolId,
              item_id: id,
              academic_year_id,
            },
          },
          update: { quantity: Number(opening_qty), updated_at: new Date() },
          create: {
            school_id: schoolId,
            branch_id: branchId,
            item_id: id,
            academic_year_id,
            quantity: Number(opening_qty),
          },
        });
      }

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "UPDATE_ITEM",
        targetTable: "inventory_items",
        targetId: id,
        oldValues: oldItem,
        newValues: updated,
      });

      return NextResponse.json({ success: true, item: updated });
    } else {
      // 2. CREATE NEW SKU
      const dup = await prisma.inventory_items.findFirst({
        where: { school_id: schoolId, item_code },
      });
      if (dup) {
        return NextResponse.json({ error: `Item code '${item_code}' already exists` }, { status: 400 });
      }

      const item = await prisma.inventory_items.create({
        data: {
          school_id: schoolId,
          branch_id: branchId,
          item_code,
          item_name,
          category,
          item_type: item_type || "Regular",
          unit: unit || "Pcs",
          reorder_level: Number(reorder_level || 10),
          barcode: barcode || null,
          qr_code: qr_code || null,
          status: status || "Active",
        },
      });

      // Set initial opening stock if provided
      if (academic_year_id && opening_qty !== undefined) {
        await prisma.inventory_opening_stock.create({
          data: {
            school_id: schoolId,
            branch_id: branchId,
            item_id: item.id,
            academic_year_id,
            quantity: Number(opening_qty),
          },
        });
      }

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "CREATE_ITEM",
        targetTable: "inventory_items",
        targetId: item.id,
        newValues: item,
      });

      return NextResponse.json({ success: true, item });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
