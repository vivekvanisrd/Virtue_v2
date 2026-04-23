import prisma from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";
import { CounterService } from "./counter-service";
import { promoteStudentAction } from "../actions/student-actions";
import { ST_CONFIRMED, ST_PROVISIONAL } from "../constants/admission-statuses";

/**
 * 🏛️ PAYMENT SETTLEMENT SERVICE (Unified Engine)
 * 
 * The authoritative engine for reconciling Razorpay transactions with the ERP ledger.
 * Designed to be session-free for use in Webhooks and Callbacks.
 */
export const PaymentSettlementService = {
  
  /**
   * settleRazorpayTransaction
   * 
   * Orchestrates the complete settlement lifecycle:
   * 1. Live Fetch (Verification)
   * 2. Tenancy Resolution
   * 3. Ledger Adjustment (Atomic)
   */
  async settleRazorpayTransaction(params: {
    paymentId: string;
    linkId?: string;
    orderId?: string;
    source: "CALLBACK" | "WEBHOOK" | "MANUAL_SYNC";
  }) {
    console.log(`[SETTLEMENT_ENGINE] 🚀 Starting settlement for ${params.paymentId} (Source: ${params.source})`);

    // 1. AUTHORITATIVE FETCH (The confirmation details the user requested)
    let payment: any;
    try {
      payment = await razorpay.payments.fetch(params.paymentId);
    } catch (err: any) {
      console.error(`[SETTLEMENT_ENGINE] ❌ Razorpay Fetch Failed: ${err.message}`);
      throw new Error(`Razorpay connection error: ${err.message}`);
    }

    // 🛡️ STATUS GUARD: Only captured payments can be settled
    if (payment.status !== "captured" && payment.status !== "authorized") {
      console.warn(`[SETTLEMENT_ENGINE] ⚠️ Transaction ${params.paymentId} is in status: ${payment.status}. Settlement aborted.`);
      return { success: false, status: payment.status, message: "Payment not yet captured." };
    }

    // 2. EXTRACT METADATA (The Institutional DNA)
    let linkNotes: any = {};
    if (params.linkId) {
      try {
        const link = await razorpay.paymentLink.fetch(params.linkId);
        linkNotes = link.notes || {};
      } catch (e) {
        console.warn(`[SETTLEMENT_ENGINE] ⚠️ Could not fetch link notes for ${params.linkId}`);
      }
    }

    const notes = { ...(payment.notes || {}), ...linkNotes };
    const studentId = notes.studentId;
    const schoolId = notes.schoolId;
    const termsRaw = notes.terms || notes.selectedTerms || "";

    if (!studentId || !schoolId) {
      console.error(`[SETTLEMENT_ENGINE] ❌ Critical Metadata Missing (Student: ${studentId}, School: ${schoolId})`);
      throw new Error("Transaction is missing mandatory student/school metadata.");
    }

    // 3. ATOMIC LEDGER ADJUSTMENT
    try {
      const result = await prisma.$transaction(async (tx: any) => {
        
        // A. Idempotency Check (Scoped to schoolId for Tenancy Bypass)
        const existing = await tx.collection.findFirst({
          where: { 
            paymentReference: params.paymentId,
            schoolId: schoolId 
          }
        });
        if (existing) {
          console.log(`[SETTLEMENT_ENGINE] ℹ️ Transaction ${params.paymentId} already settled. Skipping.`);
          return { success: true, alreadyRecorded: true, receiptNumber: existing.receiptNumber };
        }

        // B. Load Student & Resolve Institutional Identity
        const student = await tx.student.findUnique({
          where: { id: studentId, schoolId },
          include: { 
            financial: true,
            academic: true
          }
        });
        if (!student) throw new Error(`Student ${studentId} not found in school ${schoolId}.`);

        const enrollment = await tx.academicHistory.findFirst({
            where: { studentId, schoolId },
            include: { branch: { include: { school: true } } },
            orderBy: { createdAt: 'desc' }
        });
        if (!enrollment) throw new Error("No active enrollment found for identity resolution.");

        const schoolCode = enrollment.branch.school.code || schoolId;
        const branchId = student.branchId || enrollment.branch.id || "GLOBAL";
        const branchCode = enrollment.branch.code || "MAIN";

        // C. Promotion Hook (Provisional -> Active)
        if (student.status === "Provisional") {
          const promotion = await promoteStudentAction(studentId, tx);
          if (!promotion.success) throw new Error(`Student Promotion Failed: ${promotion.error}`);
          console.log(`[SETTLEMENT_ENGINE] ✨ Student ${studentId} promoted to ACTIVE.`);
        }

        // D. Financial Year Resolution
        const activeFY = await tx.financialYear.findFirst({
          where: { schoolId, isCurrent: true }
        });
        if (!activeFY) throw new Error(`No active Financial Year found for ${schoolId}.`);

        // E. Receipt Number Generation (Golden DNA)
        const receiptNumber = await CounterService.generateReceiptNumber({
          schoolId,
          schoolCode,
          branchId,
          branchCode,
          year: new Date().getFullYear().toString()
        }, tx);

        // F. Fee Calculations
        const totalPaid = Number(payment.amount) / 100;
        const gatewayFee = Number(notes.gatewayFee || 0);
        const gst = Number(notes.gst || 0);
        const baseAmount = Number(notes.baseAmount) || (totalPaid - gatewayFee - gst);
        const lateFee = Number(notes.lateFee || 0);
        const convenience = gatewayFee + gst;

        // G. Create Collection
        const collection = await tx.collection.create({
          data: {
            receiptNumber,
            studentId,
            schoolId,
            branchId,
            financialYearId: activeFY.id,
            amountPaid: baseAmount,
            lateFeePaid: lateFee,
            convenienceFee: convenience,
            totalPaid,
            paymentMode: "Razorpay",
            paymentReference: params.paymentId,
            collectedBy: `SYSTEM_RAZORPAY_${params.source}`,
            status: "Success",
            isAutomated: true,
            allocatedTo: {
              terms: termsRaw.split(",").filter(Boolean),
              bankRrn: payment.acquirer_data?.rrn || payment.acquirer_data?.upi_transaction_id,
              customerContact: payment.contact,
              customerEmail: payment.email,
              method: payment.method,
              notes: notes.notes || "",
              source: params.source
            }
          }
        });

        // H. Journal Entry (Accrual Clearance)
        const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1110" } });
        const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1200" } });
        const serviceAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4200" } });

        if (cashAcc && arAcc) {
          const lines = [
            { accountId: cashAcc.id, debit: totalPaid, credit: 0 },
            { accountId: arAcc.id, debit: 0, credit: baseAmount + lateFee }
          ];
          if (convenience > 0 && serviceAcc) {
            lines.push({ accountId: serviceAcc.id, debit: 0, credit: convenience });
          }

          await tx.journalEntry.create({
            data: {
              schoolId,
              branchId,
              financialYearId: activeFY.id,
              entryType: "RECEIPT",
              totalDebit: totalPaid,
              totalCredit: totalPaid,
              description: `Razorpay Settlement (${params.source}) - Ref: ${params.paymentId}`,
              lines: { create: lines }
            }
          });

          await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: totalPaid } } });
          await tx.chartOfAccount.update({ where: { id: arAcc.id }, data: { currentBalance: { decrement: baseAmount + lateFee } } });
          if (convenience > 0 && serviceAcc) {
            await tx.chartOfAccount.update({ where: { id: serviceAcc.id }, data: { currentBalance: { increment: convenience } } });
          }
        }

        // I. Activity Logging
        await tx.activityLog.create({
          data: {
            schoolId,
            userId: "SYSTEM_RAZORPAY",
            entityType: "COLLECTION",
            entityId: collection.id,
            action: `SETTLED_${params.source}`,
            details: `Auto-settled Razorpay transaction ${params.paymentId} → Receipt ${receiptNumber}`
          }
        });

        return { success: true, receiptNumber };
      }, { 
        timeout: 30000,
        maxWait: 10000 
      });

      console.log(`[SETTLEMENT_ENGINE] ✅ Success: ${params.paymentId} → ${result.receiptNumber}`);
      return result;

    } catch (dbErr: any) {
      console.error(`[SETTLEMENT_ENGINE] ❌ Database Failure: ${dbErr.message}`);
      throw dbErr;
    }
  }
};
