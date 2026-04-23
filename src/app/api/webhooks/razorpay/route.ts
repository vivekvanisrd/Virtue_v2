import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { PaymentSettlementService } from "@/lib/services/payment-settlement-service";

/**
 * POST /api/webhooks/razorpay
 * 
 * Secure endpoint for Razorpay real-time reconciliation.
 * Uses the Unified Settlement Engine to ensure Ledger-First integrity.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Digital Signature Verification
    if (!secret || !signature) {
      console.error("[RAZORPAY_WEBHOOK] ❌ Missing secret or signature.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("[RAZORPAY_WEBHOOK] ❌ Cryptographic mismatch detected.");
      return NextResponse.json({ error: "Invalid Signature" }, { status: 403 });
    }

    // Parse Event Payload
    const payload = JSON.parse(body);
    const event = payload.event;
    
    console.log(`[RAZORPAY_WEBHOOK] 🔔 Received Event: ${event}`);

    // Handle Payment Link Paid Event
    if (event === "payment_link.paid") {
      const link = payload.payload.payment_link.entity;
      const payment = payload.payload.payment?.entity;
      
      if (!payment || !payment.id) {
         console.warn("[RAZORPAY_WEBHOOK] ⚠️ payment_link.paid received but no payment entity found in payload.");
         return NextResponse.json({ received: true });
      }

      await PaymentSettlementService.settleRazorpayTransaction({
        paymentId: payment.id,
        linkId: link.id,
        source: "WEBHOOK"
      });
    }

    // Handle Direct Order Paid Event
    if (event === "order.paid") {
      const payment = payload.payload.payment?.entity;
      const order = payload.payload.order?.entity;

      if (payment && payment.id) {
        await PaymentSettlementService.settleRazorpayTransaction({
          paymentId: payment.id,
          orderId: order?.id,
          source: "WEBHOOK"
        });
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error(`[RAZORPAY_WEBHOOK] 🚨 Fatal Processing Error: ${error.message}`);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
