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
    const suppliers = await prisma.inventory_suppliers.findMany({
      where: {
        school_id: schoolId,
        status: "Active",
      },
      orderBy: { supplier_name: "asc" },
    });

    return NextResponse.json({ suppliers });
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
    const { id, supplier_name, contact_person, phone, email, address, bank_details, status } = body;

    if (!supplier_name) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    if (id) {
      // 1. UPDATE SUPPLIER
      const oldSupplier = await prisma.inventory_suppliers.findUnique({ where: { id } });
      if (!oldSupplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }

      const updated = await prisma.inventory_suppliers.update({
        where: { id },
        data: {
          supplier_name,
          contact_person,
          phone,
          email,
          address,
          bank_details: bank_details || null,
          status: status || "Active",
          updated_at: new Date(),
        },
      });

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "UPDATE_SUPPLIER",
        targetTable: "inventory_suppliers",
        targetId: id,
        oldValues: oldSupplier,
        newValues: updated,
      });

      return NextResponse.json({ success: true, supplier: updated });
    } else {
      // 2. CREATE SUPPLIER
      const dup = await prisma.inventory_suppliers.findFirst({
        where: { school_id: schoolId, supplier_name },
      });
      if (dup) {
        return NextResponse.json({ error: `Supplier '${supplier_name}' already exists` }, { status: 400 });
      }

      const supplier = await prisma.inventory_suppliers.create({
        data: {
          school_id: schoolId,
          branch_id: branchId,
          supplier_name,
          contact_person,
          phone,
          email,
          address,
          bank_details: bank_details || null,
          status: status || "Active",
        },
      });

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "CREATE_SUPPLIER",
        targetTable: "inventory_suppliers",
        targetId: supplier.id,
        newValues: supplier,
      });

      return NextResponse.json({ success: true, supplier });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
