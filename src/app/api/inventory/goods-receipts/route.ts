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

    const grns = await prisma.inventory_goods_receipts.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      },
      include: {
        inventory_suppliers: {
          select: {
            supplier_name: true,
          },
        },
        inventory_grn_items: {
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
      orderBy: { receipt_date: "desc" },
    });

    return NextResponse.json({ grns });
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
    const { po_id, supplier_id, invoice_number, receipt_date, academic_year_id, remarks, items } = body;

    if (!supplier_id || !invoice_number || !receipt_date || !academic_year_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required receipt fields or items" }, { status: 400 });
    }

    let totalAmount = 0;
    const grnItemsData = items.map((itm: any) => {
      const qty = Number(itm.quantity_received);
      const rate = Number(itm.rate);
      const amount = qty * rate;
      totalAmount += amount;
      return {
        item_id: itm.item_id,
        quantity_received: qty,
        rate,
        amount,
      };
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate GRN number
      const dateStr = new Date().getFullYear();
      const randId = Date.now().toString().slice(-5);
      const grnNumber = `GRN-${dateStr}-${randId}`;

      // 2. Create Goods Receipt note
      const grn = await tx.inventory_goods_receipts.create({
        data: {
          school_id: schoolId,
          branch_id: branchId,
          academic_year_id,
          grn_number: grnNumber,
          po_id: po_id || null,
          supplier_id,
          invoice_number,
          receipt_date: new Date(receipt_date),
          total_amount: totalAmount,
          remarks,
          created_by: staffId,
        },
      });

      // 3. Create GRN items
      await tx.inventory_grn_items.createMany({
        data: grnItemsData.map(itm => ({
          grn_id: grn.id,
          ...itm,
        })),
      });

      // 4. Update Purchase Order if linked
      if (po_id) {
        for (const item of grnItemsData) {
          // Increment received quantity on PO items
          await tx.inventory_po_items.updateMany({
            where: {
              po_id,
              item_id: item.item_id,
            },
            data: {
              quantity_received: {
                increment: item.quantity_received,
              },
            },
          });
        }

        // Check if all items in PO are fully received
        const poItems = await tx.inventory_po_items.findMany({
          where: { po_id },
        });

        let allReceived = true;
        let anyReceived = false;

        poItems.forEach(pi => {
          if (pi.quantity_received >= pi.quantity_ordered) {
            anyReceived = true;
          } else {
            allReceived = false;
            if (pi.quantity_received > 0) anyReceived = true;
          }
        });

        const newPOStatus = allReceived 
          ? "Received" 
          : anyReceived 
            ? "Partially Received" 
            : "Approved";

        await tx.inventory_purchase_orders.update({
          where: { id: po_id },
          data: { status: newPOStatus },
        });
      }

      const fullGRN = await tx.inventory_goods_receipts.findUnique({
        where: { id: grn.id },
        include: { inventory_grn_items: true },
      });

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "CREATE_GRN",
        targetTable: "inventory_goods_receipts",
        targetId: grn.id,
        newValues: fullGRN,
      });

      return fullGRN;
    });

    return NextResponse.json({ success: true, grn: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
