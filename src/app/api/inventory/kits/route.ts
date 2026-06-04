import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { InventoryService } from "@/lib/services/inventory-service";

export async function GET(req: NextRequest) {
  // Support both authenticated headers and public query parameters
  let schoolId = req.headers.get("x-v2-school-id") || req.nextUrl.searchParams.get("schoolId");
  let branchId = req.headers.get("x-v2-branch-id") || req.nextUrl.searchParams.get("branchId");

  // Fallback to first branch if none provided (e.g. first-load on public portal)
  if (!schoolId || !branchId) {
    try {
      const firstBranch = await prisma.branch.findFirst({ select: { id: true, schoolId: true } });
      if (firstBranch) {
        schoolId = schoolId || firstBranch.schoolId;
        branchId = branchId || firstBranch.id;
      }
    } catch (err) {
      console.warn("Fallback tenant lookup failed in kits api:", err);
    }
    if (!schoolId) schoolId = "VIVES";
    if (!branchId) branchId = "VIVES-RCB";
  }

  try {
    const kits = await prisma.inventory_kits.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        status: "Active",
      },
      include: {
        inventory_kit_items: {
          include: {
            inventory_items: true,
          },
        },
      },
      orderBy: { kit_name: "asc" },
    });

    return NextResponse.json({ kits });
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
    const { id, kit_name, description, total_price, status, items } = body;

    if (!kit_name) {
      return NextResponse.json({ error: "Kit name is required" }, { status: 400 });
    }

    if (id) {
      // 1. UPDATE KIT
      const oldKit = await prisma.inventory_kits.findUnique({
        where: { id },
        include: { inventory_kit_items: true }
      });
      if (!oldKit) {
        return NextResponse.json({ error: "Kit not found" }, { status: 404 });
      }

      // Use a transaction to update kit metadata and sub-items
      const updated = await prisma.$transaction(async (tx) => {
        // Update Kit details
        const k = await tx.inventory_kits.update({
          where: { id },
          data: {
            kit_name,
            description: description || null,
            total_price: Number(total_price || 0),
            status: status || "Active",
            updated_at: new Date(),
          },
        });

        // If items list is provided, synchronize it
        if (Array.isArray(items)) {
          // Delete old items
          await tx.inventory_kit_items.deleteMany({
            where: { kit_id: id },
          });

          // Insert new items
          if (items.length > 0) {
            await tx.inventory_kit_items.createMany({
              data: items.map((itm: any) => ({
                kit_id: id,
                item_id: itm.item_id,
                quantity: Number(itm.quantity || 1),
              })),
            });
          }
        }

        return k;
      });

      const newKitDetails = await prisma.inventory_kits.findUnique({
        where: { id },
        include: { inventory_kit_items: true }
      });

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "UPDATE_KIT",
        targetTable: "inventory_kits",
        targetId: id,
        oldValues: oldKit,
        newValues: newKitDetails,
      });

      return NextResponse.json({ success: true, kit: newKitDetails });
    } else {
      // 2. CREATE KIT
      const dup = await prisma.inventory_kits.findFirst({
        where: { school_id: schoolId, kit_name },
      });
      if (dup) {
        return NextResponse.json({ error: `Kit '${kit_name}' already exists` }, { status: 400 });
      }

      const kit = await prisma.$transaction(async (tx) => {
        const k = await tx.inventory_kits.create({
          data: {
            school_id: schoolId,
            branch_id: branchId,
            kit_name,
            description: description || null,
            total_price: Number(total_price || 0),
            status: status || "Active",
          },
        });

        if (Array.isArray(items) && items.length > 0) {
          await tx.inventory_kit_items.createMany({
            data: items.map((itm: any) => ({
              kit_id: k.id,
              item_id: itm.item_id,
              quantity: Number(itm.quantity || 1),
            })),
          });
        }

        return k;
      });

      const newKitDetails = await prisma.inventory_kits.findUnique({
        where: { id: kit.id },
        include: { inventory_kit_items: true }
      });

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "CREATE_KIT",
        targetTable: "inventory_kits",
        targetId: kit.id,
        newValues: newKitDetails,
      });

      return NextResponse.json({ success: true, kit: newKitDetails });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
