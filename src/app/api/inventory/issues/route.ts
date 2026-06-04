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

    const issues = await prisma.inventory_issues.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      },
      include: {
        inventory_issue_items: {
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
      orderBy: { issue_date: "desc" },
    });

    return NextResponse.json({ issues });
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
      issue_date,
      issue_type,
      class_id,
      section_id,
      student_id,
      kit_id,
      academic_year_id,
      remarks,
      items,
      is_credit_issue,
      charge_amount,
    } = body;

    if (!issue_date || !issue_type || !academic_year_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required issue fields or items" }, { status: 400 });
    }

    // 1. Availability validation check
    const checkItems = items.map((itm: any) => ({
      itemId: itm.item_id,
      quantity: Number(itm.quantity),
    }));

    const stockStatus = await InventoryService.checkStockAvailability({
      schoolId,
      branchId,
      academicYearId: academic_year_id,
      items: checkItems,
    });

    const failedItems = stockStatus.filter(s => !s.ok);
    if (failedItems.length > 0) {
      return NextResponse.json({
        error: "INSUFFICIENT_STOCK",
        message: "Some items do not have enough stock available.",
        details: failedItems,
      }, { status: 400 });
    }

    // 2. Transaction save
    const result = await prisma.$transaction(async (tx) => {
      const issue = await tx.inventory_issues.create({
        data: {
          school_id: schoolId,
          branch_id: branchId,
          academic_year_id,
          issue_date: new Date(issue_date),
          issue_type,
          class_id: class_id || null,
          section_id: section_id || null,
          student_id: student_id || null,
          kit_id: kit_id || null,
          remarks,
          is_credit_issue: is_credit_issue || false,
          charge_amount: charge_amount ? Number(charge_amount) : 0,
          created_by: staffId,
        },
      });

      await tx.inventory_issue_items.createMany({
        data: items.map(itm => ({
          issue_id: issue.id,
          item_id: itm.item_id,
          quantity: Number(itm.quantity),
          unit_price: itm.unit_price ? Number(itm.unit_price) : 0,
        })),
      });

      // Post to Student Ledger if credit issue
      if (is_credit_issue && student_id) {
        const activeFY = await tx.financialYear.findFirst({
          where: { schoolId, isCurrent: true }
        });

        await tx.ledgerEntry.create({
          data: {
            studentId: student_id,
            schoolId,
            branchId,
            financialYearId: activeFY?.id || null,
            academicYearId: academic_year_id,
            type: "CHARGE",
            amount: Number(charge_amount || 0),
            reason: `Bookstore Credit Issue - Ref ID: ${issue.id}`,
            createdBy: staffName || staffId
          }
        });

        // Double-entry accrual
        const incomeAccount = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4100" } });
        const receivableAccount = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1200" } });

        if (incomeAccount && receivableAccount && activeFY) {
          await tx.journalEntry.create({
            data: {
              schoolId,
              branchId,
              financialYearId: activeFY.id,
              entryType: "CHARGE",
              totalDebit: Number(charge_amount || 0),
              totalCredit: Number(charge_amount || 0),
              description: `Bookstore Credit Charge - Student Ref: ${student_id}`,
              lines: {
                create: [
                  { accountId: receivableAccount.id, debit: Number(charge_amount || 0), credit: 0 },
                  { accountId: incomeAccount.id, debit: 0, credit: Number(charge_amount || 0) }
                ]
              }
            }
          });
        }
      }

      const fullIssue = await tx.inventory_issues.findUnique({
        where: { id: issue.id },
        include: { inventory_issue_items: true },
      });

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "CREATE_ISSUE",
        targetTable: "inventory_issues",
        targetId: issue.id,
        newValues: fullIssue,
      });

      return fullIssue;
    });

    return NextResponse.json({ success: true, issue: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
