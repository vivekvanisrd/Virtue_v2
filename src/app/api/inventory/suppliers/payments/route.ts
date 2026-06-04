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

    if (!academicYearId) {
      return NextResponse.json({ error: "academic_year_id query parameter is required" }, { status: 400 });
    }

    // 1. Fetch individual payment transaction logs
    const payments = await prisma.inventory_supplier_payments.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        academic_year_id: academicYearId,
      },
      include: {
        inventory_suppliers: {
          select: {
            supplier_name: true,
            contact_person: true,
            phone: true,
          },
        },
      },
      orderBy: { payment_date: "desc" },
    });

    // 2. Fetch all suppliers for the school
    const suppliers = await prisma.inventory_suppliers.findMany({
      where: {
        school_id: schoolId,
        status: "Active",
      },
      orderBy: { supplier_name: "asc" },
    });

    // 3. Fetch GRN totals grouped by supplier
    const grnTotals = await prisma.inventory_goods_receipts.groupBy({
      by: ["supplier_id"],
      where: {
        school_id: schoolId,
        academic_year_id: academicYearId,
        status: "Active",
      },
      _sum: {
        total_amount: true,
      },
    });

    // 4. Fetch Payments totals grouped by supplier
    const paymentTotals = await prisma.inventory_supplier_payments.groupBy({
      by: ["supplier_id"],
      where: {
        school_id: schoolId,
        academic_year_id: academicYearId,
      },
      _sum: {
        amount_paid: true,
      },
    });

    const grnMap = new Map<string, number>();
    grnTotals.forEach(item => {
      grnMap.set(item.supplier_id, Number(item._sum.total_amount || 0));
    });

    const payMap = new Map<string, number>();
    paymentTotals.forEach(item => {
      payMap.set(item.supplier_id, Number(item._sum.amount_paid || 0));
    });

    // Compile Accounts Payable dashboard summary
    const summary = suppliers.map(sup => {
      const totalGRN = grnMap.get(sup.id) || 0;
      const totalPaid = payMap.get(sup.id) || 0;
      const balance = totalGRN - totalPaid;

      return {
        supplier_id: sup.id,
        supplier_name: sup.supplier_name,
        contact_person: sup.contact_person,
        phone: sup.phone,
        total_grn_amount: totalGRN,
        total_paid_amount: totalPaid,
        outstanding_balance: balance,
      };
    });

    return NextResponse.json({ payments, summary });
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
    const { supplier_id, payment_date, amount_paid, payment_mode, reference_number, remarks, academic_year_id } = body;

    if (!supplier_id || !payment_date || !amount_paid || !payment_mode || !academic_year_id) {
      return NextResponse.json({ error: "Missing required payment fields" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.inventory_supplier_payments.create({
        data: {
          school_id: schoolId,
          branch_id: branchId,
          academic_year_id,
          supplier_id,
          payment_date: new Date(payment_date),
          amount_paid: Number(amount_paid),
          payment_mode,
          reference_number: reference_number || null,
          remarks: remarks || null,
          created_by: staffId,
        },
      });

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "RECORD_SUPPLIER_PAYMENT",
        targetTable: "inventory_supplier_payments",
        targetId: record.id,
        newValues: record,
      });

      return record;
    });

    return NextResponse.json({ success: true, payment: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
