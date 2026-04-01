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

    if (!secret) {
      console.error("[RAZORPAY_WEBHOOK] ❌ Secret is missing in environment variables.");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: "Missing Cryptographic Signature" }, { status: 401 });
    }

    // 1. Digital Signature Verification (HMAC-SHA256)
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("[RAZORPAY_WEBHOOK] ❌ Cryptographic mismatch detect. Unauthorized payload.");
      return NextResponse.json({ error: "Invalid Signature" }, { status: 403 });
    }

    // 2. Parse Event Payload
    const payload = JSON.parse(body);
    const event = payload.event;
    
    console.log(`[RAZORPAY_WEBHOOK] 🔔 Received Event: ${event}`);

    // 3. Handle Successful Settlements (Orders & Payment Links)
    if (event === "order.paid") {
      const order = payload.payload.order.entity;
      const notes = order.notes;

      if (notes.type === "FEE_COLLECTION_V2") {
        await processCollectionFlow({
          referenceId: order.id,
          studentId: notes.studentId,
          terms: notes.terms.split(","),
          baseAmount: Number(notes.baseAmount),
          lateFee: Number(notes.lateFee || 0),
          convenienceFee: Number(notes.convenienceFee || 0)
        });
      }
    }

    if (event === "payment_link.paid") {
      const link = payload.payload.payment_link.entity;
      const notes = link.notes;

      if (notes.type === "FEE_COLLECTION" || notes.type === "FEE_COLLECTION_V2") {
        const studentId = notes.studentId;
        const terms = notes.terms.split(",");
        const totalPaid = link.amount_paid / 100; // Paisa to INR
        
        // On generic links, we assume the 2% is part of the total
        const baseAmount = totalPaid / 1.02; 
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
    waiverReason: "[Auto-Settled via Webhook]"
  });

  if (result.success) {
    console.log(`[RAZORPAY_WEBHOOK] ✅ Successfully settled dues for Student ${data.studentId}`);
  } else {
    console.error(`[RAZORPAY_WEBHOOK] ❌ Settlement failed: ${result.error}`);
  }
}
