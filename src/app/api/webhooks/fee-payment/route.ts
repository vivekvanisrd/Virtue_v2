import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

/**
 * POST /api/webhooks/fee-payment
 * Razorpay webhook handler exclusively for FeePaymentLink records.
 * Set webhook URL in Razorpay Dashboard → Webhooks → /api/webhooks/fee-payment
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret || !signature) {
      console.error("[FEE_WEBHOOK] Missing secret or signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("[FEE_WEBHOOK] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const payload = JSON.parse(body);
    const event = payload.event;

    console.log(`[FEE_WEBHOOK] Event received: ${event}`);

    if (event === "payment_link.paid") {
      const link = payload.payload?.payment_link?.entity;
      const payment = payload.payload?.payment?.entity;

      const referenceId = link?.reference_id; // This is our token

      if (referenceId) {
        const updated = await prisma.feePaymentLink.updateMany({
          where: { token: referenceId },
          data: {
            status: "PAID",
            razorpayPaymentId: payment?.id || null,
            paidAt: new Date(),
          },
        });
        console.log(`[FEE_WEBHOOK] Marked PAID — token: ${referenceId}, count: ${updated.count}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[FEE_WEBHOOK] Fatal error:", error.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
