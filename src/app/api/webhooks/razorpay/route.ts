import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { recordFeeCollection } from "@/lib/actions/finance-actions";

/**
 * POST /api/webhooks/razorpay
 * 
 * Secure endpoint for Razorpay real-time reconciliation.
 * Handles the "order.paid" event to ensure students are settled even if 
 * the parent closes their browser session before redirection.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // LOCAL SIMULATION BYPASS (for testing without a tunnel)
    const simulationHeader = req.headers.get("x-razorpay-simulation");
    const isLocalSim = process.env.NODE_ENV === "development" && simulationHeader === "VIRTUE_SIM_FIX_369";

    if (!secret && !isLocalSim) {
      console.error("[RAZORPAY_WEBHOOK] ❌ Secret is missing in environment variables.");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    if (!signature && !isLocalSim) {
      return NextResponse.json({ error: "Missing Cryptographic Signature" }, { status: 401 });
    }

    // 1. Digital Signature Verification (HMAC-SHA256)
    const expectedSignature = isLocalSim ? (signature || "SIM_SIG") : crypto
      .createHmac("sha256", secret!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature && !isLocalSim) {
      console.error("[RAZORPAY_WEBHOOK] ❌ Cryptographic mismatch detect.");
      
      // LOG FAILURE TO DATABASE (for User-facing transparency)
      await prisma.activityLog.create({
        data: {
          schoolId: "VIVA", // Default school for V2 global webhooks
          userId: "SYSTEM_RAZORPAY",
          entityType: "WEBHOOK",
          entityId: "SIGNATURE_FAIL",
          action: "REJECTED",
          details: `Signature Mismatch. Check RAZORPAY_WEBHOOK_SECRET vs Dashboard. Signature: ${(signature || "NONE").slice(0, 8)}...`,
          ipAddress: req.headers.get("x-forwarded-for") || "unknown"
        }
      });

      return NextResponse.json({ error: "Invalid Signature" }, { status: 403 });
    }

    // 2. Parse Event Payload
    const payload = JSON.parse(body);
    const event = payload.event;
    
    // Log the successful receipt of the webhook before processing
    await prisma.activityLog.create({
        data: {
            schoolId: "VIVA",
            userId: "SYSTEM_RAZORPAY",
            entityType: "WEBHOOK",
            entityId: event,
            action: "RECEIVED",
            details: `Incoming ${event} for payment ${payload.payload.payment?.entity?.id || 'unknown'}`,
            ipAddress: req.headers.get("x-forwarded-for") || "unknown"
        }
    });

    console.log(`[RAZORPAY_WEBHOOK] 🔔 Received Event: ${event}`);

    // 3. Handle Successful Settlements (Orders & Payment Links)
    if (event === "order.paid" || event === "payment.captured") {
      const payment = payload.payload.payment?.entity || {};
      const order = payload.payload.order?.entity || {};
      
      // Multi-entity notes fallback (Check payment first, then order)
      const notes = { ...(order.notes || {}), ...(payment.notes || {}) };
      const termsRaw = notes.terms || notes.selectedTerms || "";
      const studentId = notes.studentId;

      if (studentId) {
        await processCollectionFlow({
          referenceId: payment.id || order.id,
          studentId: studentId,
          terms: termsRaw.split(",").filter(Boolean),
          baseAmount: Number(notes.baseAmount || (payment.amount / 100) / 1.0177),
          lateFee: Number(notes.lateFee || 0),
          convenienceFee: Number(notes.convenienceFee || (payment.amount / 100) - ((payment.amount / 100) / 1.0177)),
          bankRrn: payment.acquirer_data?.rrn || payment.acquirer_data?.upi_transaction_id,
          customerContact: payment.contact,
          customerEmail: payment.email
        });
      } else {
        console.warn(`[RAZORPAY_WEBHOOK] ⚠️ Payment ${payment.id || order.id} received but no studentId found in notes.`);
      }
    }

    if (event === "payment_link.paid") {
      const link = payload.payload.payment_link.entity;
      const notes = link.notes || {};
      const termsRaw = notes.terms || notes.selectedTerms || "";

      if (notes.type === "FEE_COLLECTION" || notes.type === "FEE_COLLECTION_V2" || notes.type === "FEE_COLLECTION_V2_TAXED") {
        const studentId = notes.studentId;
        const terms = termsRaw.split(",").filter(Boolean);
        const totalPaid = link.amount_paid / 100;
        
        const baseAmount = totalPaid / 1.0177; 
        const convenienceFee = totalPaid - baseAmount;

        await processCollectionFlow({
          referenceId: link.id,
          studentId,
          terms,
          baseAmount,
          lateFee: 0,
          convenienceFee
        });
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error(`[RAZORPAY_WEBHOOK] 🚨 Fatal Processing Error: ${error.message}`);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * processCollectionFlow
 * 
 * SESSION-FREE reconciliation engine for Razorpay webhooks.
 * Uses the studentId from payment notes to discover school context directly.
 * Does NOT call getTenantContext() — Razorpay has no user session.
 */
async function processCollectionFlow(data: {
  referenceId: string;
  studentId: string;
  terms: string[];
  baseAmount: number;
  lateFee: number;
  convenienceFee: number;
  bankRrn?: string;
  customerContact?: string;
  customerEmail?: string;
}) {
  console.log(`[RAZORPAY_WEBHOOK] 💳 Processing: ${data.referenceId} → Student: ${data.studentId}`);

  // 1. Idempotency — never double-record
  const existing = await prisma.collection.findFirst({
    where: { paymentReference: data.referenceId }
  });
  if (existing) {
    console.log(`[RAZORPAY_WEBHOOK] ℹ️ ${data.referenceId} already settled. Skipping.`);
    return;
  }

  // 2. Load student to discover schoolId + branchId (no session needed)
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
    include: {
      financial: true,
      collections: { where: { status: "Success" } }
    }
  });

  if (!student) {
    console.error(`[RAZORPAY_WEBHOOK] ❌ Student not found: ${data.studentId}`);
    return;
  }

  const schoolId = student.schoolId;

  // 3. Find the active financial year for this school
  const activeFY = await prisma.financialYear.findFirst({
    where: { schoolId, isCurrent: true }
  });
  if (!activeFY) {
    console.error(`[RAZORPAY_WEBHOOK] ❌ No active Financial Year for school: ${schoolId}`);
    return;
  }

  // 4. Find the primary branch for this school
  const branch = await prisma.branch.findFirst({
    where: { schoolId }
  });
  const branchId = branch?.id || "GLOBAL";

  // 5. Atomic transaction: create Collection + Journal Entry
  try {
    await prisma.$transaction(async (tx: any) => {
      // Generate receipt number
      const { CounterService } = await import("@/lib/services/counter-service");
      const receiptNumber = await CounterService.generateReceiptNumber({
        schoolId,
        schoolCode: schoolId,
        branchId,
        branchCode: branchId.split('-').pop() || "MAIN",
        year: new Date().getFullYear().toString()
      }, tx);

      const lateFee = data.lateFee || 0;
      const convenience = data.convenienceFee || 0;
      const totalPaid = data.baseAmount + lateFee + convenience;

      const collection = await tx.collection.create({
        data: {
          receiptNumber,
          studentId: data.studentId,
          schoolId,
          branchId,
          financialYearId: activeFY.id,
          amountPaid: data.baseAmount,
          lateFeePaid: lateFee,
          convenienceFee: convenience,
          totalPaid,
          paymentMode: "Razorpay",
          paymentReference: data.referenceId,
          collectedBy: "SYSTEM_RAZORPAY",
          status: "Success",
          allocatedTo: {
            terms: data.terms,
            bankRrn: data.bankRrn,
            customerContact: data.customerContact,
            customerEmail: data.customerEmail,
            lateFeeWaived: false,
            waiverReason: "[Auto-Settled via Webhook]"
          }
        }
      });

      // Journal Entry: Debit Bank / Credit AR
      const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1110" } });
      const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1200" } });
      const serviceAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4200" } });

      if (cashAcc && arAcc) {
        const lines: any[] = [
          { accountId: cashAcc.id, debit: totalPaid, credit: 0 },
          { accountId: arAcc.id, debit: 0, credit: data.baseAmount + lateFee }
        ];
        if (convenience > 0 && serviceAcc) {
          lines.push({ accountId: serviceAcc.id, debit: 0, credit: convenience });
        }

        await tx.journalEntry.create({
          data: {
            schoolId,
            financialYearId: activeFY.id,
            entryType: "RECEIPT",
            totalDebit: totalPaid,
            totalCredit: totalPaid,
            description: `Webhook Settlement (${data.terms.join(', ')}) - ${data.referenceId}`,
            lines: { create: lines }
          }
        });

        await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: totalPaid } } });
        await tx.chartOfAccount.update({ where: { id: arAcc.id }, data: { currentBalance: { decrement: data.baseAmount + lateFee } } });
        if (convenience > 0 && serviceAcc) {
          await tx.chartOfAccount.update({ where: { id: serviceAcc.id }, data: { currentBalance: { increment: convenience } } });
        }
      }

      // Log success
      await tx.activityLog.create({
        data: {
          schoolId,
          userId: "SYSTEM_RAZORPAY",
          entityType: "COLLECTION",
          entityId: collection.id,
          action: "AUTO_SETTLED",
          details: `Webhook auto-settled ${data.referenceId} → Receipt ${receiptNumber}`
        }
      });

      console.log(`[RAZORPAY_WEBHOOK] ✅ Settled: ${data.referenceId} → Receipt: ${receiptNumber}`);
    });
  } catch (err: any) {
    console.error(`[RAZORPAY_WEBHOOK] ❌ DB Transaction failed: ${err.message}`);
  }
}
