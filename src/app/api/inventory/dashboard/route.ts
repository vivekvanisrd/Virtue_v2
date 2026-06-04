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

    // 1. Sales metrics
    // A. Online Paid Checkout Sales
    const paidLinks = await prisma.fee_payment_links.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        status: "PAID"
      },
      select: { amount: true }
    });
    const checkoutSalesVal = paidLinks.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const checkoutSalesCount = paidLinks.length;

    // B. Credit Distributions to Student Ledger
    const creditIssues = await prisma.inventory_issues.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        academic_year_id: academicYearId,
        is_credit_issue: true
      },
      select: { charge_amount: true }
    });
    const creditSalesVal = creditIssues.reduce((acc, curr) => acc + Number(curr.charge_amount || 0), 0);
    const creditSalesCount = creditIssues.length;

    const totalSalesVal = checkoutSalesVal + creditSalesVal;
    const totalSalesCount = checkoutSalesCount + creditSalesCount;

    // 2. Purchases metrics
    const grns = await prisma.inventory_goods_receipts.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        academic_year_id: academicYearId,
        status: "Active"
      },
      select: { total_amount: true }
    });
    const totalPurchasesVal = grns.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
    const totalPurchasesCount = grns.length;

    // 3. Items and Kits Counts in Catalog
    const itemsCount = await prisma.inventory_items.count({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        status: "Active",
        OR: [
          { item_type: { not: "Kit" } },
          { item_type: null }
        ]
      }
    });

    const kitsCount = await prisma.inventory_items.count({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        status: "Active",
        item_type: "Kit"
      }
    });

    // 4. Live Stock Levels: Available and Low stock count
    const liveStock = await InventoryService.getLiveStock({
      schoolId,
      branchId,
      academicYearId
    });

    const totalAvailableStock = liveStock.reduce((acc, curr) => acc + curr.current_stock, 0);
    const lowStockCount = liveStock.filter(item => item.current_stock <= item.reorder_level).length;

    // 5. Sold Stock Sum (Total quantities issued to students/classes)
    const issuedItems = await prisma.inventory_issue_items.findMany({
      where: {
        inventory_issues: {
          school_id: schoolId,
          branch_id: branchId,
          academic_year_id: academicYearId
        }
      },
      select: { quantity: true }
    });
    const totalSoldStock = issuedItems.reduce((acc, curr) => acc + curr.quantity, 0);

    return NextResponse.json({
      sales: {
        value: totalSalesVal,
        count: totalSalesCount
      },
      purchases: {
        value: totalPurchasesVal,
        count: totalPurchasesCount
      },
      catalog: {
        items: itemsCount,
        kits: kitsCount
      },
      stock: {
        available: totalAvailableStock,
        sold: totalSoldStock,
        lowStock: lowStockCount
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
