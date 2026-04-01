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
          details: `Signature Mismatch. Check RAZORPAY_WEBHOOK_SECRET vs Dashboard. Signature: ${signature.slice(0, 8)}...`,
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
    if (event === "order.paid") {
      const order = payload.payload.order.entity;
      const notes = order.notes || {};
      const termsRaw = notes.terms || notes.selectedTerms || "";

      if (notes.type === "FEE_COLLECTION_V2" || notes.type === "FEE_COLLECTION_V2_TAXED") {
        await processCollectionFlow({
          referenceId: order.id,
          studentId: notes.studentId,
          terms: termsRaw.split(",").filter(Boolean),
          baseAmount: Number(notes.baseAmount),
          lateFee: Number(notes.lateFee || 0),
          convenienceFee: Number(notes.convenienceFee || 0)
        });
      }
    }

    if (event === "payment.captured") {
      const payment = payload.payload.payment.entity;
      const notes = payment.notes || {};
      const termsRaw = notes.terms || notes.selectedTerms || "";

      if (notes.type === "FEE_COLLECTION_V2" || notes.type === "FEE_COLLECTION_V2_TAXED") {
        await processCollectionFlow({
          referenceId: payment.id,
          studentId: notes.studentId,
          terms: termsRaw.split(",").filter(Boolean),
          baseAmount: Number(notes.baseAmount || (payment.amount / 100) / 1.0177),
          lateFee: Number(notes.lateFee || 0),
          convenienceFee: Number(notes.convenienceFee || (payment.amount / 100) - ((payment.amount / 100) / 1.0177)),
          bankRrn: payment.acquirer_data?.rrn || payment.acquirer_data?.upi_transaction_id,
          customerContact: payment.contact,
          customerEmail: payment.email
        });
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
 * Shared logic for atomic collection recording
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
  console.log(`[RAZORPAY_WEBHOOK] 💳 Processing Settlement: ${data.referenceId} for Student: ${data.studentId}`);

  // IDEMPOTENCY CHECK
  const existing = await prisma.collection.findFirst({
    where: { paymentReference: data.referenceId }
  });

  if (existing) {
    console.log(`[RAZORPAY_WEBHOOK] ℹ️ Transaction ${data.referenceId} already settled. Skipping.`);
    return;
  }

  const result = await recordFeeCollection({
    studentId: data.studentId,
    selectedTerms: data.terms,
    amountPaid: data.baseAmount,
    lateFeePaid: data.lateFee,
    convenienceFee: data.convenienceFee,
    paymentMode: "Razorpay",
    paymentReference: data.referenceId,
    lateFeeWaived: false,
    waiverReason: "[Auto-Settled via Webhook]",
    bankRrn: data.bankRrn,
    customerContact: data.customerContact,
    customerEmail: data.customerEmail
  });

  if (result.success) {
    console.log(`[RAZORPAY_WEBHOOK] ✅ Successfully settled dues for Student ${data.studentId}`);
  } else {
    console.error(`[RAZORPAY_WEBHOOK] ❌ Settlement failed: ${result.error}`);
  }
}
