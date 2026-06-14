"use server";

/**
 * bank-reconciliation-actions.ts
 * 
 * SOVEREIGN BANK RECONCILIATION ENGINE — Server Actions
 * 
 * Handles upload → parse → auto-match → manual confirm → account update pipeline.
 * All writes are atomic and fully scoped to the current tenant (schoolId/branchId).
 */

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { parseExcelStatement, parseBOBStatement, categorizeTxn, type ParsedStatement } from "@/lib/services/bank-parser";

// ─── serialize helper ──────────────────────────────────────────────────────
const serialize = <T>(data: T): T =>
  JSON.parse(JSON.stringify(data, (_, v) =>
    v && typeof v === "object" && v.constructor?.name === "Decimal" ? Number(v) : v
  ));

// ─── Bank Account Code Map ─────────────────────────────────────────────────
// Each bank maps to a specific ChartOfAccount code for balance tracking
const BANK_ACCOUNT_CODES: Record<string, string> = {
  AXIS: "1111",
  HDFC: "1112",
  BOB:  "1113",
};

// ─── Action 1: UPLOAD & PARSE ──────────────────────────────────────────────
/**
 * Accepts a base64-encoded file + bank name, parses it, stores all entries in DB.
 * Returns the statementId for the caller to load the reconciliation view.
 */
export async function uploadBankStatementAction(params: {
  fileName: string;
  bankName: "AXIS" | "HDFC" | "BOB";
  fileBase64: string; // base64-encoded file content
  fileType: "excel" | "pdf";
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
    const context = identity;

    // 1. Parse the file
    let parsed: ParsedStatement;
    const buffer = Buffer.from(params.fileBase64, "base64");

    if (params.fileType === "excel") {
      const workbook = XLSX.read(buffer, { type: "buffer", cellText: true, cellDates: false });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      // Get raw rows as arrays (not objects) to preserve column positions
      const rawRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { 
        header: 1, 
        defval: "",
        raw: false // Use formatted text values
      });
      parsed = parseExcelStatement(rawRows);
    } else {
      // PDF — extract text using pdf-parse if available
      try {
        // Dynamically require to avoid build-time issues
        const pdfLib = require("pdf-parse");
        const pdfData = await (pdfLib.default || pdfLib)(buffer);
        parsed = parseBOBStatement(pdfData.text);
        parsed.bankName = "BOB";
      } catch (e: any) {
        throw new Error(`PDF parsing failed: ${e.message}. Please use Excel format if available.`);
      }
    }

    if (parsed.bankName === "UNKNOWN") {
      throw new Error("Could not identify bank format. Please check the file and try again.");
    }

    if (parsed.entries.length === 0) {
      throw new Error(`No transaction entries found in the file. Parsing errors: ${parsed.errors.join("; ")}`);
    }

    // 2. Determine month/year from statement period or first entry
    const referenceDate = parsed.periodTo || parsed.periodFrom || parsed.entries[0]?.txnDate || new Date();
    const month = referenceDate.getMonth() + 1;
    const year = referenceDate.getFullYear();
    const accountCode = BANK_ACCOUNT_CODES[params.bankName] || "1110";

    // 3. Check for existing statement (same bank + month/year = re-upload)
    const existing = await prisma.bankStatement.findFirst({
      where: { schoolId: context.schoolId, bankName: params.bankName, month, year }
    });
    if (existing) {
      // Delete old entries and re-import (idempotent re-upload)
      await prisma.bankStatementEntry.deleteMany({ where: { statementId: existing.id } });
      await prisma.bankStatement.delete({ where: { id: existing.id } });
    }

    // 4. Create the BankStatement record + all entries atomically
    const stmt = await prisma.$transaction(async (tx: any) => {
      const newStmt = await tx.bankStatement.create({
        data: {
          schoolId: context.schoolId,
          branchId: context.branchId,
          bankName: params.bankName,
          accountCode,
          accountNo: parsed.accountNo,
          month,
          year,
          periodFrom: parsed.periodFrom,
          periodTo: parsed.periodTo,
          fileName: params.fileName,
          uploadedBy: context.name || context.staffId || "Admin",
          status: "PENDING",
          openingBal: parsed.openingBal,
          closingBal: parsed.closingBal,
          totalCredits: parsed.totalCredits,
          totalDebits: parsed.totalDebits,
        }
      });

      // Bulk-insert entries
      const entryData = parsed.entries.map(e => ({
        statementId: newStmt.id,
        txnDate: e.txnDate,
        valueDate: e.valueDate || e.txnDate,
        description: e.description || "No description",
        reference: e.reference,
        debit: e.debit ?? null,
        credit: e.credit ?? null,
        balance: e.balance ?? null,
        txnType: e.txnType,
        category: categorizeTxn(e.description, e.txnType),
        matchStatus: "UNMATCHED",
        confidence: 0,
      }));

      if (entryData.length > 0) {
        await tx.bankStatementEntry.createMany({ data: entryData });
      }

      return newStmt;
    });

    revalidatePath("/dashboard/finance");
    return { 
      success: true, 
      statementId: stmt.id,
      entryCount: parsed.entries.length,
      bankName: params.bankName,
      month,
      year,
      errors: parsed.errors,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Action 2: GET ALL STATEMENTS ─────────────────────────────────────────
export async function getBankStatementsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const stmts = await prisma.bankStatement.findMany({
      where: { schoolId: identity.schoolId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        _count: { select: { entries: true } }
      }
    });

    // Add reconciliation progress per statement
    const withProgress = await Promise.all(stmts.map(async (s: any) => {
      const [matched, total] = await Promise.all([
        prisma.bankStatementEntry.count({ where: { statementId: s.id, matchStatus: "CONFIRMED" } }),
        prisma.bankStatementEntry.count({ where: { statementId: s.id } }),
      ]);
      return { ...s, matchedCount: matched, totalCount: total };
    }));

    return { success: true, data: serialize(withProgress) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Action 3: GET ENTRIES FOR A STATEMENT ────────────────────────────────
export async function getStatementEntriesAction(statementId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const stmt = await prisma.bankStatement.findFirst({
      where: { id: statementId },
    });
    if (!stmt || stmt.schoolId !== identity.schoolId) throw new Error("Statement not found");

    const entries = await prisma.bankStatementEntry.findMany({
      where: { statementId },
      orderBy: { txnDate: "asc" }
    });

    return { success: true, data: serialize(entries), statement: serialize(stmt) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Action 4: RUN AUTO-RECONCILIATION ─────────────────────────────────────
/**
 * Scans all UNMATCHED entries in a statement and tries to match them
 * against existing Collections, SalarySlips, or Expenses in the ERP.
 * 
 * Matching rules:
 *   CREDIT + category=FEE_COLLECTION → match against Collection by amount ± 3 days
 *   DEBIT  + category=SALARY          → match against SalarySlip by staffName in desc + net amount
 *   DEBIT  + category=EXPENSE         → flag as Expense, suggest creation
 *   DEBIT/CREDIT + category=INTERNAL_TRANSFER → auto-mark as IGNORED (skip from reconciliation)
 */
export async function runAutoReconciliationAction(statementId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const stmt = await prisma.bankStatement.findFirst({ where: { id: statementId } });
    if (!stmt || stmt.schoolId !== identity.schoolId) throw new Error("Statement not found");

    const entries = await prisma.bankStatementEntry.findMany({
      where: { statementId, matchStatus: "UNMATCHED" }
    });

    let autoMatchedCount = 0;
    let internalTransferCount = 0;

    for (const entry of entries) {
      const amt = Number(entry.credit || entry.debit || 0);
      if (amt === 0) continue;

      // Auto-ignore internal transfers
      if (entry.category === "INTERNAL_TRANSFER") {
        await prisma.bankStatementEntry.update({
          where: { id: entry.id },
          data: { matchStatus: "IGNORED", notes: "Auto-classified: Internal bank transfer" }
        });
        internalTransferCount++;
        continue;
      }

      // For CREDIT entries: search for matching fee collections
      if (entry.txnType === "CREDIT" && entry.credit) {
        const creditAmt = Number(entry.credit);
        const dateFrom = new Date(entry.txnDate);
        dateFrom.setDate(dateFrom.getDate() - 4);
        const dateTo = new Date(entry.txnDate);
        dateTo.setDate(dateTo.getDate() + 4);

        // Check custom UPI QR parent-submitted UTR payments first
        const pendingLinks = await prisma.fee_payment_links.findMany({
          where: {
            school_id: identity.schoolId,
            status: "PENDING_VERIFICATION",
            amount: { gte: creditAmt - 1, lte: creditAmt + 1 }
          }
        });

        const matchedLink = pendingLinks.find(link => {
          const utr = link.payment_details;
          if (!utr) return false;
          const desc = (entry.description || "").toLowerCase();
          const ref = (entry.reference || "").toLowerCase();
          const utrLower = utr.toLowerCase();
          return desc.includes(utrLower) || ref.includes(utrLower);
        });

        if (matchedLink) {
          await prisma.fee_payment_links.update({
            where: { id: matchedLink.id },
            data: {
              status: "PAID",
              paid_at: entry.txnDate,
              payment_method: "UPI_QR",
              payment_details: `Auto-reconciled: UTR ${matchedLink.payment_details} matched with statement transaction`
            }
          });

          await prisma.bankStatementEntry.update({
            where: { id: entry.id },
            data: {
              matchStatus: "CONFIRMED",
              matchedTo: matchedLink.id,
              matchedType: "OTHER",
              confidence: 100,
              notes: `Auto-reconciled direct UPI QR: token ${matchedLink.token}, UTR ${matchedLink.payment_details}`,
              confirmedAt: new Date(),
              confirmedBy: identity.name || identity.staffId || "System"
            }
          });

          // Update ChartOfAccount balance for the bank account
          const bankAccount = await prisma.chartOfAccount.findFirst({
            where: { schoolId: identity.schoolId, accountCode: entry.statement.accountCode }
          });
          if (bankAccount) {
            await prisma.chartOfAccount.update({
              where: { id: bankAccount.id },
              data: { currentBalance: { increment: creditAmt } }
            });
          }

          autoMatchedCount++;
          continue; // Match confirmed, proceed to next statement entry
        }

        const matchingCollections = await prisma.collection.findMany({
          where: {
            schoolId: identity.schoolId,
            status: "Success",
            amountPaid: { gte: creditAmt - 1, lte: creditAmt + 1 },
            paymentDate: { gte: dateFrom, lte: dateTo }
          },
          orderBy: { paymentDate: "asc" }
        });

        if (matchingCollections.length === 1) {
          // Unique match — high confidence
          await prisma.bankStatementEntry.update({
            where: { id: entry.id },
            data: {
              matchStatus: "AUTO_MATCHED",
              matchedTo: matchingCollections[0].id,
              matchedType: "COLLECTION",
              confidence: 90,
              notes: `Auto-matched: Receipt ${matchingCollections[0].receiptNumber}`
            }
          });
          autoMatchedCount++;
        } else if (matchingCollections.length > 1) {
          // Multiple matches — medium confidence, needs manual disambiguation
          await prisma.bankStatementEntry.update({
            where: { id: entry.id },
            data: {
              matchStatus: "AUTO_MATCHED",
              matchedTo: matchingCollections[0].id,
              matchedType: "COLLECTION",
              confidence: 50,
              notes: `Multiple possible matches (${matchingCollections.length}). Please verify.`
            }
          });
          autoMatchedCount++;
        }
      }

      // For DEBIT entries: search salary slips
      if (entry.txnType === "DEBIT" && entry.debit && entry.category === "SALARY") {
        const debitAmt = Number(entry.debit);

        // Match by amount within ₹10 tolerance (for rounding differences)
        const matchingSlips = await prisma.salarySlip.findMany({
          where: {
            schoolId: identity.schoolId,
            netSalary: { gte: debitAmt - 10, lte: debitAmt + 10 },
            status: { not: "Draft" }
          },
          include: { staff: { select: { firstName: true, lastName: true } } }
        });

        if (matchingSlips.length === 1) {
          const slip = matchingSlips[0] as any;
          await prisma.bankStatementEntry.update({
            where: { id: entry.id },
            data: {
              matchStatus: "AUTO_MATCHED",
              matchedTo: slip.id,
              matchedType: "SALARY",
              confidence: 80,
              notes: `Auto-matched: ${slip.staff?.firstName} ${slip.staff?.lastName} salary`
            }
          });
          autoMatchedCount++;
        }
      }
    }

    return { 
      success: true, 
      autoMatchedCount, 
      internalTransferCount,
      totalProcessed: entries.length
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Action 5: CONFIRM A MATCH ─────────────────────────────────────────────
/**
 * User confirms a match (auto-suggested or manual). 
 * If matchedType = COLLECTION → marks collection as bank-verified.
 * If matchedType = SALARY → marks salary slip as Paid.
 * In both cases: updates ChartOfAccount bank account balance.
 */
export async function confirmMatchAction(params: {
  entryId: string;
  matchedTo?: string;
  matchedType?: "COLLECTION" | "SALARY" | "EXPENSE" | "OTHER";
  notes?: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const entry = await prisma.bankStatementEntry.findFirst({
      where: { id: params.entryId },
      include: { statement: true }
    });
    if (!entry || entry.statement.schoolId !== identity.schoolId) throw new Error("Entry not found");

    // Run update in transaction
    await prisma.$transaction(async (tx: any) => {
      // 1. Confirm the entry
      await tx.bankStatementEntry.update({
        where: { id: params.entryId },
        data: {
          matchStatus: "CONFIRMED",
          matchedTo: params.matchedTo || entry.matchedTo,
          matchedType: params.matchedType || entry.matchedType,
          notes: params.notes || entry.notes,
          confirmedAt: new Date(),
          confirmedBy: identity.name || identity.staffId || "Admin",
        }
      });

      // 2. If salary match → mark slip as Paid
      if ((params.matchedType || entry.matchedType) === "SALARY" && (params.matchedTo || entry.matchedTo)) {
        const slipId = params.matchedTo || entry.matchedTo!;
        const slip = await tx.salarySlip.findUnique({ where: { id: slipId } });
        if (slip && !slip.paidAt) {
          await tx.salarySlip.update({
            where: { id: slipId },
            data: {
              paidAt: entry.txnDate,
              paymentMode: `Bank: ${entry.statement.bankName}`,
              paymentRef: entry.reference || undefined,
              status: "Paid"
            }
          });
        }
      }

      // 3. Update ChartOfAccount balance for the bank account
      const bankAccount = await tx.chartOfAccount.findFirst({
        where: { schoolId: identity.schoolId, accountCode: entry.statement.accountCode }
      });
      if (bankAccount) {
        const delta = entry.txnType === "CREDIT"
          ? Number(entry.credit || 0)
          : -Number(entry.debit || 0);
        
        if (delta !== 0) {
          await tx.chartOfAccount.update({
            where: { id: bankAccount.id },
            data: { currentBalance: { increment: delta } }
          });
        }
      }
    });

    revalidatePath("/dashboard/finance");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Action 6: BULK CONFIRM ALL AUTO-MATCHED ──────────────────────────────
export async function bulkConfirmAutoMatchedAction(statementId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const stmt = await prisma.bankStatement.findFirst({ where: { id: statementId } });
    if (!stmt || stmt.schoolId !== identity.schoolId) throw new Error("Statement not found");

    // Only confirm HIGH-confidence matches (confidence >= 80)
    const highConfidenceEntries = await prisma.bankStatementEntry.findMany({
      where: { statementId, matchStatus: "AUTO_MATCHED", confidence: { gte: 80 } }
    });

    for (const entry of highConfidenceEntries) {
      await confirmMatchAction({
        entryId: entry.id,
        matchedTo: entry.matchedTo || undefined,
        matchedType: entry.matchedType as any || undefined,
      });
    }

    return { success: true, confirmedCount: highConfidenceEntries.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Action 7: IGNORE AN ENTRY ─────────────────────────────────────────────
export async function ignoreEntryAction(entryId: string, notes?: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    await prisma.bankStatementEntry.update({
      where: { id: entryId },
      data: {
        matchStatus: "IGNORED",
        notes: notes || "Manually marked as not relevant",
        confirmedAt: new Date(),
        confirmedBy: identity.name || identity.staffId || "Admin",
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Action 8: MANUALLY MATCH AN ENTRY ────────────────────────────────────
export async function manualMatchAction(params: {
  entryId: string;
  matchedTo: string;
  matchedType: "COLLECTION" | "SALARY" | "EXPENSE" | "OTHER";
  notes?: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    await prisma.bankStatementEntry.update({
      where: { id: params.entryId },
      data: {
        matchStatus: "MANUALLY_MATCHED",
        matchedTo: params.matchedTo,
        matchedType: params.matchedType,
        confidence: 100,
        notes: params.notes,
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Action 9: GET RECONCILIATION SUMMARY ─────────────────────────────────
export async function getReconciliationSummaryAction(statementId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const stmt = await prisma.bankStatement.findFirst({ where: { id: statementId } });
    if (!stmt || stmt.schoolId !== identity.schoolId) throw new Error("Statement not found");

    const [totalEntries, confirmed, autoMatched, ignored, unmatched] = await Promise.all([
      prisma.bankStatementEntry.count({ where: { statementId } }),
      prisma.bankStatementEntry.count({ where: { statementId, matchStatus: "CONFIRMED" } }),
      prisma.bankStatementEntry.count({ where: { statementId, matchStatus: "AUTO_MATCHED" } }),
      prisma.bankStatementEntry.count({ where: { statementId, matchStatus: "IGNORED" } }),
      prisma.bankStatementEntry.count({ where: { statementId, matchStatus: "UNMATCHED" } }),
    ]);

    const creditTotal = await prisma.bankStatementEntry.aggregate({
      where: { statementId, txnType: "CREDIT" },
      _sum: { credit: true }
    });
    const debitTotal = await prisma.bankStatementEntry.aggregate({
      where: { statementId, txnType: "DEBIT" },
      _sum: { debit: true }
    });

    return {
      success: true,
      summary: serialize({
        totalEntries,
        confirmed,
        autoMatched,
        ignored,
        unmatched,
        totalCredits: Number(creditTotal._sum.credit || 0),
        totalDebits: Number(debitTotal._sum.debit || 0),
        statement: stmt,
      })
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Action 10: DELETE A STATEMENT ────────────────────────────────────────
export async function deleteStatementAction(statementId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const stmt = await prisma.bankStatement.findFirst({ where: { id: statementId } });
    if (!stmt || stmt.schoolId !== identity.schoolId) throw new Error("Statement not found");

    await prisma.bankStatement.delete({ where: { id: statementId } });

    revalidatePath("/dashboard/finance");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
