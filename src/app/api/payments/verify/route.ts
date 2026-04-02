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

  const paymentId       = searchParams.get("razorpay_payment_id");
  const linkId          = searchParams.get("razorpay_payment_link_id");
  const referenceId     = searchParams.get("razorpay_payment_link_reference_id");
  const linkStatus      = searchParams.get("razorpay_payment_link_status");
  const signature       = searchParams.get("razorpay_signature");

  // --- 1. Basic Sanity Check ---
  if (!paymentId || !linkId || !referenceId || !linkStatus || !signature) {
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
  const termsRaw  = notes.terms || notes.selectedTerms || "";

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

  // --- 7. Resolve student context ---
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });
  if (!student) {
    console.error(`[PAYMENT_VERIFY] ❌ Student not found: ${studentId}`);
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const schoolId = student.schoolId;

  const activeFY = await prisma.financialYear.findFirst({
    where: { schoolId, isCurrent: true },
  });
  if (!activeFY) {
    console.error(`[PAYMENT_VERIFY] ❌ No active financial year for school: ${schoolId}`);
    return NextResponse.json({ error: "No active financial year." }, { status: 422 });
  }

  const branch = await prisma.branch.findFirst({ where: { schoolId } });
  const branchId = branch?.id || "GLOBAL";

  // --- 8. Calculate amounts ---
  const totalPaid       = payment.amount / 100; // Razorpay stores in paise
  const baseAmount      = Number(notes.baseAmount) || totalPaid / 1.0177;
  const lateFee         = Number(notes.lateFee) || 0;
  const convenienceFee  = Number(notes.gatewayFee) 
                          ? Number(notes.gatewayFee) + Number(notes.gst || 0)
                          : totalPaid - baseAmount - lateFee;
  const terms           = termsRaw.split(",").filter(Boolean);

  // --- 9. Atomic DB Transaction ---
  let receiptNumber = "";
  try {
    await prisma.$transaction(async (tx: any) => {
      const { CounterService } = await import("@/lib/services/counter-service");
      receiptNumber = await CounterService.generateReceiptNumber({
        schoolId,
        schoolCode: schoolId,
        branchId,
        branchCode: branchId.split("-").pop() || "MAIN",
        year: new Date().getFullYear().toString(),
      }, tx);

      const totalRecorded = baseAmount + lateFee + convenienceFee;

      const collection = await tx.collection.create({
        data: {
          receiptNumber,
          studentId,
          schoolId,
          branchId,
          financialYearId: activeFY.id,
          amountPaid: baseAmount,
          lateFeePaid: lateFee,
          convenienceFee,
          totalPaid: totalRecorded,
          paymentMode: "Razorpay",
          paymentReference: paymentId,
          collectedBy: "SYSTEM_RAZORPAY_CALLBACK",
          status: "Success",
          allocatedTo: {
            terms,
            bankRrn: payment.acquirer_data?.rrn || payment.acquirer_data?.upi_transaction_id,
            customerContact: payment.contact,
            customerEmail: payment.email,
            lateFeeWaived: false,
            waiverReason: "[Auto-Settled via Payment Link Callback]",
          },
        },
      });

      // Journal entry
      const cashAcc    = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1110" } });
      const arAcc      = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1200" } });
      const serviceAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4200" } });

      if (cashAcc && arAcc) {
        const lines: any[] = [
          { accountId: cashAcc.id, debit: totalRecorded, credit: 0 },
          { accountId: arAcc.id, debit: 0, credit: baseAmount + lateFee },
        ];
        if (convenienceFee > 0 && serviceAcc) {
          lines.push({ accountId: serviceAcc.id, debit: 0, credit: convenienceFee });
        }

        await tx.journalEntry.create({
          data: {
            schoolId,
            financialYearId: activeFY.id,
            entryType: "RECEIPT",
            totalDebit: totalRecorded,
            totalCredit: totalRecorded,
            description: `Callback Settlement (${terms.join(", ")}) — ${paymentId}`,
            lines: { create: lines },
          },
        });

        await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: totalRecorded } } });
        await tx.chartOfAccount.update({ where: { id: arAcc.id }, data: { currentBalance: { decrement: baseAmount + lateFee } } });
        if (convenienceFee > 0 && serviceAcc) {
          await tx.chartOfAccount.update({ where: { id: serviceAcc.id }, data: { currentBalance: { increment: convenienceFee } } });
        }
      }

      // Audit log
      await tx.activityLog.create({
        data: {
          schoolId,
          userId: "SYSTEM_RAZORPAY",
          entityType: "COLLECTION",
          entityId: collection.id,
          action: "CALLBACK_SETTLED",
          details: `Callback auto-settled ${paymentId} → Receipt ${receiptNumber}`,
        },
      });
    });

    console.log(`[PAYMENT_VERIFY] ✅ Settled: ${paymentId} → Receipt: ${receiptNumber}`);
    return NextResponse.json({ status: "recorded", recorded: true, receiptNumber });

  } catch (err: any) {
    console.error(`[PAYMENT_VERIFY] ❌ DB Error: ${err.message}`);
    return NextResponse.json({ error: "Database error recording payment." }, { status: 500 });
  }
}
