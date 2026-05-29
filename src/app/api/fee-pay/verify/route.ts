import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

/**
 * GET /api/fee-pay/verify
 * Razorpay redirects here after parent completes payment.
 * Verifies signature, marks link as PAID, then redirects to thank-you page.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;

  const paymentId = searchParams.get("razorpay_payment_id");
  const linkId = searchParams.get("razorpay_payment_link_id");
  const referenceId = searchParams.get("razorpay_payment_link_reference_id") || "";
  const linkStatus = searchParams.get("razorpay_payment_link_status");
  const signature = searchParams.get("razorpay_signature");

  const thankYouBase = `${baseUrl}/fee-pay/thank-you`;

  if (!paymentId || !linkId || !linkStatus || !signature) {
    return NextResponse.redirect(`${thankYouBase}?status=error&msg=missing_params`);
  }

  if (linkStatus !== "paid") {
    return NextResponse.redirect(`${thankYouBase}?status=cancelled`);
  }

  // Verify signature
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (secret && !secret.includes("PLACEHOLDER")) {
    const payload = `${linkId}|${referenceId}|${linkStatus}|${paymentId}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    if (expected !== signature) {
      console.error("[FEE_PAY_VERIFY] Signature mismatch for payment:", paymentId);
      return NextResponse.redirect(`${thankYouBase}?status=error&msg=signature_mismatch`);
    }
  }

  // Update DB
  if (referenceId) {
    try {
      await prisma.feePaymentLink.updateMany({
        where: { token: referenceId },
        data: {
          status: "PAID",
          razorpayPaymentId: paymentId,
          paidAt: new Date(),
        },
      });
    } catch (err: any) {
      console.error("[FEE_PAY_VERIFY] DB update failed:", err.message);
    }
  }

  return NextResponse.redirect(`${thankYouBase}?status=success&token=${referenceId}`);
}
