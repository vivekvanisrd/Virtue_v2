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

    const pos = await prisma.inventory_purchase_orders.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      },
      include: {
        inventory_suppliers: {
          select: {
            supplier_name: true,
            contact_person: true,
          },
        },
        inventory_po_items: {
          include: {
            inventory_items: {
              select: {
                item_code: true,
                item_name: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ pos });
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
    const { id, supplier_id, academic_year_id, remarks, status, items } = body;

    if (!supplier_id || !academic_year_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields or item list" }, { status: 400 });
    }

    // Calculate total order amount
    let totalAmount = 0;
    const poItemsData = items.map((itm: any) => {
      const qty = Number(itm.quantity_ordered);
      const rate = Number(itm.rate);
      const amount = qty * rate;
      totalAmount += amount;
      return {
        item_id: itm.item_id,
        quantity_ordered: qty,
        rate,
        amount,
      };
    });

    if (id) {
      // 1. UPDATE EXISTING PO
      const result = await prisma.$transaction(async (tx) => {
        const oldPO = await tx.inventory_purchase_orders.findUnique({
          where: { id },
          include: { inventory_po_items: true },
        });

        if (!oldPO) throw new Error("Purchase Order not found");
        if (oldPO.status === "Received" || oldPO.status === "Partially Received") {
          throw new Error("Cannot edit a Purchase Order that has already received stock");
        }

        const updated = await tx.inventory_purchase_orders.update({
          where: { id },
          data: {
            supplier_id,
            status: status || oldPO.status,
            total_amount: totalAmount,
            remarks,
            updated_at: new Date(),
          },
        });

        // Delete old items and insert updated ones
        await tx.inventory_po_items.deleteMany({ where: { po_id: id } });

        await tx.inventory_po_items.createMany({
          data: poItemsData.map(itm => ({
            po_id: id,
            ...itm,
          })),
        });

        const fullUpdated = await tx.inventory_purchase_orders.findUnique({
          where: { id },
          include: { inventory_po_items: true },
        });

        await InventoryService.logAudit({
          schoolId,
          branchId,
          userId: staffId,
          username: staffName,
          actionType: "UPDATE_PO",
          targetTable: "inventory_purchase_orders",
          targetId: id,
          oldValues: oldPO,
          newValues: fullUpdated,
        });

        return fullUpdated;
      });

      return NextResponse.json({ success: true, po: result });
    } else {
      // 2. CREATE NEW PO
      const result = await prisma.$transaction(async (tx) => {
        // Auto generate po number
        const dateStr = new Date().getFullYear();
        const randId = Date.now().toString().slice(-5);
        const poNumber = `PO-${dateStr}-${randId}`;

        const po = await tx.inventory_purchase_orders.create({
          data: {
            school_id: schoolId,
            branch_id: branchId,
            academic_year_id,
            po_number: poNumber,
            supplier_id,
            status: status || "Draft",
            total_amount: totalAmount,
            remarks,
            created_by: staffId,
          },
        });

        await tx.inventory_po_items.createMany({
          data: poItemsData.map(itm => ({
            po_id: po.id,
            ...itm,
          })),
        });

        const fullPO = await tx.inventory_purchase_orders.findUnique({
          where: { id: po.id },
          include: { inventory_po_items: true },
        });

        await InventoryService.logAudit({
          schoolId,
          branchId,
          userId: staffId,
          username: staffName,
          actionType: "CREATE_PO",
          targetTable: "inventory_purchase_orders",
          targetId: po.id,
          newValues: fullPO,
        });

        return fullPO;
      });

      return NextResponse.json({ success: true, po: result });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
