import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { InventoryService } from "@/lib/services/inventory-service";

function getKitItemCode(kitName: string): string {
  const clean = kitName.trim().toLowerCase();
  if (clean === "lkg") return "KIT-LKG";
  if (clean === "ukg") return "KIT-UKG";
  if (clean === "nursery") return "KIT-NURSERY";
  if (clean === "1st class") return "KIT-1-CLASS";
  if (clean === "2nd class") return "KIT-2-CLASS";
  if (clean === "3rd class") return "KIT-3-CLASS";
  if (clean === "4th class") return "KIT-4-CLASS";
  if (clean === "5th class") return "KIT-5-CLASS";
  if (clean === "6th class") return "KIT-6-CLASS";
  if (clean === "7th class") return "KIT-7-CLASS";
  if (clean === "8th class") return "KIT-8-CLASS";
  if (clean === "9th class") return "KIT-9-CLASS";
  return `KIT-${kitName.toUpperCase().replace(/\s+/g, "-")}`;
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
    const { kit_id, quantity, academic_year_id } = await req.json();
    const qtyToDisassemble = Number(quantity);

    if (!kit_id || !qtyToDisassemble || qtyToDisassemble <= 0 || !academic_year_id) {
      return NextResponse.json({ error: "Kit ID, valid positive quantity, and academic year ID are required." }, { status: 400 });
    }

    // 1. Fetch the Class Kit details with components
    const kit = await prisma.inventory_kits.findFirst({
      where: { id: kit_id, school_id: schoolId },
      include: {
        inventory_kit_items: {
          include: {
            inventory_items: true
          }
        }
      }
    });

    if (!kit) {
      return NextResponse.json({ error: "Class Kit not found." }, { status: 404 });
    }

    if (kit.inventory_kit_items.length === 0) {
      return NextResponse.json({ error: "Cannot disassemble a kit with no mapped items." }, { status: 400 });
    }

    // 2. Find the pre-assembled kit item in the catalog
    const kitCode = getKitItemCode(kit.kit_name);
    const kitItem = await prisma.inventory_items.findFirst({
      where: { school_id: schoolId, branch_id: branchId, item_code: kitCode }
    });

    if (!kitItem) {
      return NextResponse.json({ error: `Pre-assembled Kit catalog product not found. Code expected: ${kitCode}` }, { status: 404 });
    }

    // 3. Fetch current live stock for all items
    const liveStock = await InventoryService.getLiveStock({
      schoolId,
      branchId,
      academicYearId: academic_year_id
    });

    const stockMap = new Map<string, number>();
    liveStock.forEach(s => stockMap.set(s.id, s.current_stock));

    const kitItemStock = stockMap.get(kitItem.id) || 0;

    // 4. Validate sufficient stock of the kit itself to disassemble
    if (kitItemStock < qtyToDisassemble) {
      return NextResponse.json({
        error: `Insufficient stock of ${kit.kit_name} Kit to disassemble. Available: ${kitItemStock}, Requested: ${qtyToDisassemble}.`
      }, { status: 400 });
    }

    // 5. Execute transaction to subtract kit stock and add to individual stocks
    const result = await prisma.$transaction(async (tx) => {
      // Create subtraction adjustment for the Pre-assembled Kit item
      const kitAdjustment = await tx.inventory_adjustments.create({
        data: {
          school_id: schoolId,
          branch_id: branchId,
          academic_year_id,
          item_id: kitItem.id,
          adjustment_date: new Date(),
          adjustment_type: "Subtract",
          previous_quantity: kitItemStock,
          new_quantity: kitItemStock - qtyToDisassemble,
          reason: `Kit Disassembly - Decomposed ${qtyToDisassemble} sets into component items`,
          logged_by: staffId
        }
      });

      // Create addition adjustments for each constituent item
      const itemAdjustments = [];
      for (const ki of kit.inventory_kit_items) {
        const itemStock = stockMap.get(ki.item_id) || 0;
        const addQty = ki.quantity * qtyToDisassemble;
        
        const record = await tx.inventory_adjustments.create({
          data: {
            school_id: schoolId,
            branch_id: branchId,
            academic_year_id,
            item_id: ki.item_id,
            adjustment_date: new Date(),
            adjustment_type: "Add",
            previous_quantity: itemStock,
            new_quantity: itemStock + addQty,
            reason: `Kit Disassembly - Unpacked ${qtyToDisassemble} sets of ${kit.kit_name} Kit`,
            logged_by: staffId
          }
        });
        itemAdjustments.push(record);
      }

      return { kitAdjustment, itemAdjustments };
    }, {
      timeout: 20000
    });

    // 6. Log audit trail
    await InventoryService.logAudit({
      schoolId,
      branchId,
      userId: staffId,
      username: staffName,
      actionType: "KIT_DISASSEMBLY",
      targetTable: "inventory_adjustments",
      targetId: result.kitAdjustment.id,
      newValues: {
        kit_name: kit.kit_name,
        quantity_disassembled: qtyToDisassemble,
        constituent_items_added: result.itemAdjustments
      }
    });

    return NextResponse.json({ success: true, quantity_disassembled: qtyToDisassemble });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
