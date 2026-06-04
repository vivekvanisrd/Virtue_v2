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

    const returns = await prisma.inventory_returns.findMany({
      where: {
        school_id: schoolId,
        branch_id: branchId,
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      },
      include: {
        inventory_return_items: {
          include: {
            inventory_items: {
              select: {
                item_code: true,
                item_name: true,
                unit: true,
              },
            },
            exchange_item: {
              select: {
                item_code: true,
                item_name: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: { return_date: "desc" },
    });

    return NextResponse.json({ returns });
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
      return_date,
      return_type,
      student_id,
      academic_year_id,
      remarks,
      items,
      refund_ledger,
      refund_amount,
    } = body;

    if (!return_date || !return_type || !academic_year_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required return fields or items" }, { status: 400 });
    }

    // 1. If it's an exchange, validate stock availability for replacement items
    const exchangeItemsToVerify = items
      .filter((itm: any) => itm.exchange_item_id && Number(itm.exchange_quantity || 0) > 0)
      .map((itm: any) => ({
        itemId: itm.exchange_item_id,
        quantity: Number(itm.exchange_quantity),
      }));

    if (exchangeItemsToVerify.length > 0) {
      const stockStatus = await InventoryService.checkStockAvailability({
        schoolId,
        branchId,
        academicYearId: academic_year_id,
        items: exchangeItemsToVerify,
      });

      const failedItems = stockStatus.filter(s => !s.ok);
      if (failedItems.length > 0) {
        return NextResponse.json({
          error: "INSUFFICIENT_EXCHANGE_STOCK",
          message: "Some replacement items do not have enough stock available.",
          details: failedItems,
        }, { status: 400 });
      }
    }

    // 2. Execute database operations inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      const retRecord = await tx.inventory_returns.create({
        data: {
          school_id: schoolId,
          branch_id: branchId,
          academic_year_id,
          return_date: new Date(return_date),
          return_type,
          student_id: student_id || null,
          remarks,
          created_by: staffId,
        },
      });

      await tx.inventory_return_items.createMany({
        data: items.map((itm: any) => ({
          return_id: retRecord.id,
          item_id: itm.item_id,
          quantity: Number(itm.quantity),
          status: itm.status || "Restocked",
          exchange_item_id: itm.exchange_item_id || null,
          exchange_quantity: itm.exchange_item_id ? Number(itm.exchange_quantity || 1) : null,
        })),
      });

      // Post CREDIT to Student Ledger if requested
      if (refund_ledger && student_id && Number(refund_amount || 0) > 0) {
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
            type: "CREDIT",
            amount: Number(refund_amount),
            reason: `Bookstore Credit Return - Ref ID: ${retRecord.id}`,
            createdBy: staffName || staffId
          }
        });

        // Double-entry reversal / credit note
        const incomeAccount = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4100" } });
        const receivableAccount = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1200" } });

        if (incomeAccount && receivableAccount && activeFY) {
          await tx.journalEntry.create({
            data: {
              schoolId,
              branchId,
              financialYearId: activeFY.id,
              entryType: "CREDIT",
              totalDebit: Number(refund_amount),
              totalCredit: Number(refund_amount),
              description: `Bookstore Credit Note - Student Ref: ${student_id}`,
              lines: {
                create: [
                  { accountId: incomeAccount.id, debit: Number(refund_amount), credit: 0 },
                  { accountId: receivableAccount.id, debit: 0, credit: Number(refund_amount) }
                ]
              }
            }
          });
        }
      }

      const fullReturn = await tx.inventory_returns.findUnique({
        where: { id: retRecord.id },
        include: { inventory_return_items: true },
      });

      await InventoryService.logAudit({
        schoolId,
        branchId,
        userId: staffId,
        username: staffName,
        actionType: "CREATE_RETURN",
        targetTable: "inventory_returns",
        targetId: retRecord.id,
        newValues: fullReturn,
      });

      return fullReturn;
    });

    return NextResponse.json({ success: true, return: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
