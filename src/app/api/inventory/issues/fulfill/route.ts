import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { InventoryService } from "@/lib/services/inventory-service";

// GET: Lookup online paid kit details and reservation items
export async function GET(req: NextRequest) {
  const schoolId = req.headers.get("x-v2-school-id");
  const branchId = req.headers.get("x-v2-branch-id");
  if (!schoolId || !branchId) {
    return NextResponse.json({ error: "Missing tenancy context" }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Receipt token is required" }, { status: 400 });
  }

  try {
    // 1. Fetch payment link record
    const paymentLink = await prisma.fee_payment_links.findUnique({
      where: { token }
    });

    if (!paymentLink) {
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }

    if (paymentLink.school_id && paymentLink.school_id !== schoolId) {
      return NextResponse.json({ error: "Access denied: Tenant mismatch." }, { status: 403 });
    }

    // 2. Fetch reservation items
    const reservations = await prisma.inventory_reservations.findMany({
      where: {
        school_id: schoolId,
        source_id: token,
      },
      include: {
        inventory_items: {
          select: {
            item_code: true,
            item_name: true,
            unit: true,
          }
        }
      }
    });

    return NextResponse.json({
      paymentLink: {
        token: paymentLink.token,
        student_name: paymentLink.student_name,
        parent_name: paymentLink.parent_name,
        phone: paymentLink.phone,
        amount: Number(paymentLink.amount),
        description: paymentLink.description,
        status: paymentLink.status,
        paid_at: paymentLink.paid_at,
        razorpay_payment_id: paymentLink.razorpay_payment_id,
        payment_method: paymentLink.payment_method,
        payment_details: paymentLink.payment_details,
      },
      reservations: reservations.map(r => ({
        id: r.id,
        item_id: r.item_id,
        quantity: r.quantity,
        status: r.status,
        item_code: r.inventory_items.item_code,
        item_name: r.inventory_items.item_name,
        unit: r.inventory_items.unit,
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Mark reservations as Fulfilled and create inventory issue
export async function POST(req: NextRequest) {
  const schoolId = req.headers.get("x-v2-school-id");
  const branchId = req.headers.get("x-v2-branch-id");
  const staffId = req.headers.get("x-v2-staff-id") || "system";
  const staffName = req.headers.get("x-v2-name") || "System";

  if (!schoolId || !branchId) {
    return NextResponse.json({ error: "Missing tenancy context" }, { status: 401 });
  }

  try {
    const { token, academic_year_id, remarks } = await req.json();

    if (!token || !academic_year_id) {
      return NextResponse.json({ error: "Token and academic year ID are required." }, { status: 400 });
    }

    // 1. Fetch payment link record
    const paymentLink = await prisma.fee_payment_links.findUnique({
      where: { token }
    });
    if (!paymentLink) {
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }
    if (paymentLink.status !== "PAID") {
      return NextResponse.json({ error: "Cannot fulfill: Payment is not completed yet." }, { status: 400 });
    }

    // 2. Fetch active reservations for this token
    const reservations = await prisma.inventory_reservations.findMany({
      where: {
        school_id: schoolId,
        source_id: token,
        status: "Reserved"
      }
    });

    if (reservations.length === 0) {
      // Check if already fulfilled
      const fulfilledCheck = await prisma.inventory_reservations.findFirst({
        where: {
          school_id: schoolId,
          source_id: token,
          status: "Fulfilled"
        }
      });
      if (fulfilledCheck) {
        return NextResponse.json({ error: "Cannot fulfill: This receipt has already been fulfilled." }, { status: 400 });
      }
      return NextResponse.json({ error: "No reserved items found for this payment token." }, { status: 400 });
    }

    // 3. Fulfill reservations and create inventory issue in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update reservations to Fulfilled
      await tx.inventory_reservations.updateMany({
        where: {
          school_id: schoolId,
          source_id: token,
          status: "Reserved"
        },
        data: {
          status: "Fulfilled"
        }
      });

      // Try to find if there's a matching kit
      let kitId: string | null = null;
      if (paymentLink.description?.startsWith("Book Kit - ")) {
        const kitName = paymentLink.description.replace("Book Kit - ", "").trim();
        const kit = await tx.inventory_kits.findFirst({
          where: { school_id: schoolId, branch_id: branchId, kit_name: kitName }
        });
        if (kit) kitId = kit.id;
      }

      // Create inventory issue
      const issue = await tx.inventory_issues.create({
        data: {
          school_id: schoolId,
          branch_id: branchId,
          academic_year_id,
          issue_date: new Date(),
          issue_type: "Student",
          remarks: remarks || `Fulfillment of online Bookstore Kit: ${paymentLink.description}`,
          kit_id: kitId,
          created_by: staffId,
        }
      });

      // Create issue items matching the reservations
      await tx.inventory_issue_items.createMany({
        data: reservations.map(r => ({
          issue_id: issue.id,
          item_id: r.item_id,
          quantity: r.quantity
        }))
      });

      const fullIssue = await tx.inventory_issues.findUnique({
        where: { id: issue.id },
        include: { inventory_issue_items: true }
      });

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "FULFILL_ONLINE_PAYMENT",
        targetTable: "inventory_issues",
        targetId: issue.id,
        newValues: fullIssue
      });

      return fullIssue;
    });

    return NextResponse.json({ success: true, issue: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
