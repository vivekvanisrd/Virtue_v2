import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { razorpay } from "@/lib/razorpay";
import prisma from "@/lib/prisma";

/**
 * GET /api/payments/verify
 *
 * Called when Razorpay redirects the parent back after payment.
 * Razorpay appends these query params to the callback_url:
 *   - razorpay_payment_id
 *   - razorpay_payment_link_id
 *   - razorpay_payment_link_reference_id
 *   - razorpay_payment_link_status
 *   - razorpay_signature
 *
 * This endpoint verifies the payment cryptographically and records
 * it in the ERP ledger — completely session-free.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const paymentId = searchParams.get("razorpay_payment_id");
  const linkId = searchParams.get("razorpay_payment_link_id");
  const referenceId = searchParams.get("razorpay_payment_link_reference_id");
  const linkStatus = searchParams.get("razorpay_payment_link_status");
  const signature = searchParams.get("razorpay_signature");

  // --- 1. Basic Sanity Check ---
  if (!paymentId || !linkId || referenceId === null || !linkStatus || !signature) {
    return NextResponse.json({ error: "Missing Razorpay callback parameters." }, { status: 400 });
  }

  // --- 2. Reject non-paid statuses immediately ---
  if (linkStatus !== "paid") {
    console.warn(`[PAYMENT_VERIFY] ⚠️ Link ${linkId} returned status: ${linkStatus}. Not recording.`);
    return NextResponse.json({ status: linkStatus, recorded: false });
  }

  // --- 3. Cryptographic Signature Verification ---
  // NOTE: Payment Link callbacks are signed with KEY_SECRET (not webhook secret)
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error("[PAYMENT_VERIFY] ❌ RAZORPAY_KEY_SECRET missing.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  // Signature for payment link callbacks = HMAC of: linkId|referenceId|linkStatus|paymentId
  const body = `${linkId}|${referenceId}|${linkStatus}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error(`[PAYMENT_VERIFY] ❌ Signature mismatch for payment ${paymentId}.`);
    return NextResponse.json({ error: "Invalid signature." }, { status: 403 });
  }

  // --- 4. Idempotency — already recorded? Return success immediately ---
  const existing = await prisma.collection.findFirst({
    where: { paymentReference: paymentId },
  });
  if (existing) {
    console.log(`[PAYMENT_VERIFY] ℹ️ ${paymentId} already settled (receipt ${existing.receiptNumber}). Skipping.`);
    return NextResponse.json({
      status: "already_recorded",
      recorded: true,
      receiptNumber: existing.receiptNumber,
    });
  }

  // --- 5. Fetch full payment details from Razorpay (to get notes) ---
  let payment: any;
  try {
    payment = await razorpay.payments.fetch(paymentId);
  } catch (err: any) {
    console.error(`[PAYMENT_VERIFY] ❌ Failed to fetch payment from Razorpay: ${err.message}`);
    return NextResponse.json({ error: "Could not fetch payment details from Razorpay." }, { status: 502 });
  }

  // --- 6. Also fetch payment link to get its notes (more reliable for studentId) ---
  let linkNotes: Record<string, string> = {};
  try {
    const link: any = await razorpay.paymentLink.fetch(linkId);
    linkNotes = link.notes || {};
  } catch (err: any) {
    console.warn(`[PAYMENT_VERIFY] ⚠️ Could not fetch payment link notes: ${err.message}`);
  }

  // Merge notes: link notes take priority (they were set by our server at creation time)
  const notes: Record<string, string> = { ...(payment.notes || {}), ...linkNotes };
  const studentId = notes.studentId;
  const termsRaw = notes.terms || notes.selectedTerms || "";

  if (!studentId) {
    // Log for manual reconciliation but don't crash
    console.warn(`[PAYMENT_VERIFY] ⚠️ Payment ${paymentId} verified but no studentId in notes. Manual reconciliation needed.`);
    await prisma.activityLog.create({
      data: {
        schoolId: notes.schoolId || "VIVA",
        userId: "SYSTEM_RAZORPAY",
        entityType: "PAYMENT_VERIFY",
        entityId: paymentId,
        action: "MISSING_STUDENT",
        details: `Verified payment ${paymentId} (₹${payment.amount / 100}) — no studentId in notes. Needs manual assignment.`,
        ipAddress: req.headers.get("x-forwarded-for") || "callback",
      },
    });
    return NextResponse.json({
      status: "verified_no_student",
      recorded: false,
      message: "Payment verified but could not auto-assign: no studentId in notes.",
    });
  }

  // --- 7. Parse Batch or Single Student ---
  let batchData: Array<{ studentId: string, amount: number, terms: string[] }> = [];
  if (notes.batch) {
    batchData = notes.batch.split("|").map(s => {
      const parts = s.split(":");
      return { studentId: parts[0], amount: Number(parts[1]), terms: parts[2].split(",") };
    });
  } else if (studentId) {
    const totalPaid = payment.amount / 100;
    const baseAmount = Number(notes.baseAmount) || totalPaid / 1.0177;
    const lateFee = Number(notes.lateFee) || 0;
    batchData = [{ studentId, amount: baseAmount + lateFee, terms: termsRaw.split(",").filter(Boolean) }];
  }

  // Calculate Gateway fee to split evenly across all batches
  const totalPaid = payment.amount / 100;
  const batchBaseTotal = batchData.reduce((sum, b) => sum + b.amount, 0);
  const totalConvenienceFee = Number(notes.gatewayFee)
    ? Number(notes.gatewayFee) + Number(notes.gst || 0)
    : totalPaid - batchBaseTotal;
  const perStudentConvenienceFee = batchData.length > 0 ? totalConvenienceFee / batchData.length : 0;

  // --- 8. Atomic DB BATCH Transaction ---
  let receiptNumbers: string[] = [];
  
  try {
    await prisma.$transaction(async (tx: any) => {
      const { CounterService } = await import("@/lib/services/counter-service");

      for (const batchItem of batchData) {
        const studentRecord = await tx.student.findUnique({ where: { id: batchItem.studentId } });
        if (!studentRecord) throw new Error(`Student ${batchItem.studentId} not found.`);

        // NEW: Promotion Hook for Provisional (Temp) Students
        if (studentRecord.status === "Provisional") {
          const { promoteStudentAction } = await import("@/lib/actions/student-actions");
          const promotion = await promoteStudentAction(batchItem.studentId, tx);
          if (!promotion.success) {
            throw new Error(`Promotion failed for student ${batchItem.studentId}: ${promotion.error}`);
          }
          console.log(`[PAYMENT_PROMOTION] ✅ Student ${batchItem.studentId} promoted to ACTIVE.`);
        }

        const schoolId = studentRecord.schoolId;
        const activeFY = await tx.financialYear.findFirst({ where: { schoolId, isCurrent: true } });
        if (!activeFY) throw new Error(`No active FY for school ${schoolId}.`);

        const branch = await tx.branch.findFirst({ where: { schoolId } });
        const branchId = branch?.id || "GLOBAL";

        const receiptNumber = await CounterService.generateReceiptNumber({
          schoolId,
          schoolCode: schoolId,
          branchId,
          branchCode: branchId.split("-").pop() || "MAIN",
          year: new Date().getFullYear().toString(),
        }, tx);

        const totalRecorded = batchItem.amount + perStudentConvenienceFee;

        const collection = await tx.collection.create({
          data: {
            receiptNumber,
            studentId: batchItem.studentId,
            schoolId,
            branchId,
            financialYearId: activeFY.id,
            amountPaid: batchItem.amount,
            lateFeePaid: 0, 
            convenienceFee: perStudentConvenienceFee,
            totalPaid: totalRecorded,
            paymentMode: "Razorpay",
            paymentReference: paymentId,
            collectedBy: "SYSTEM_RAZORPAY_CALLBACK",
            status: "Success",
            allocatedTo: {
              terms: batchItem.terms,
              bankRrn: payment.acquirer_data?.rrn || payment.acquirer_data?.upi_transaction_id,
              customerContact: payment.contact,
              customerEmail: payment.email,
              lateFeeWaived: false,
              waiverReason: "[Auto-Settled via Payment Link Callback]",
              isBatchItem: batchData.length > 1
            },
          },
        });

        // Journal entry
        const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1110" } });
        const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1200" } });
        const serviceAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4200" } });

        if (cashAcc && arAcc) {
          const lines: any[] = [
            { accountId: cashAcc.id, debit: totalRecorded, credit: 0 },
            { accountId: arAcc.id, debit: 0, credit: batchItem.amount },
          ];
          if (perStudentConvenienceFee > 0 && serviceAcc) {
            lines.push({ accountId: serviceAcc.id, debit: 0, credit: perStudentConvenienceFee });
          }

          await tx.journalEntry.create({
            data: {
              schoolId,
              financialYearId: activeFY.id,
              entryType: "RECEIPT",
              totalDebit: totalRecorded,
              totalCredit: totalRecorded,
              description: `Callback Settlement (${batchItem.terms.join(", ")}) — ${paymentId}`,
              lines: { create: lines },
            },
          });

          await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: totalRecorded } } });
          await tx.chartOfAccount.update({ where: { id: arAcc.id }, data: { currentBalance: { decrement: batchItem.amount } } });
          if (perStudentConvenienceFee > 0 && serviceAcc) {
            await tx.chartOfAccount.update({ where: { id: serviceAcc.id }, data: { currentBalance: { increment: perStudentConvenienceFee } } });
          }
        }

        // Audit log
        await tx.activityLog.create({
          data: {
            schoolId,
            userId: "SYSTEM_RAZORPAY",
            entityType: "COLLECTION",
            entityId: collection.id,
            action: "CALLBACK_SETTLED_BATCH",
            details: `Callback auto-settled ${paymentId} → Receipt ${receiptNumber}`,
          },
        });

        receiptNumbers.push(receiptNumber);
      }
    });

    console.log(`[PAYMENT_VERIFY] ✅ Settled BATCH: ${paymentId} → Receipts: ${receiptNumbers.join(", ")}`);
    return NextResponse.json({ status: "recorded", recorded: true, receiptNumber: receiptNumbers.join(", ") });

  } catch (err: any) {
    console.error(`[PAYMENT_VERIFY] ❌ DB Error: ${err.message}`);
    return NextResponse.json({ error: "Database error recording payment." }, { status: 500 });
  }
}
