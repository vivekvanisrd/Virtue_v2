import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { PaymentSettlementService } from "@/lib/services/payment-settlement-service";

/**
 * GET /api/payments/verify
 *
 * Called when Razorpay redirects the parent back after payment.
 * This endpoint verifies the payment cryptographically and triggers
 * the Unified Settlement Engine — completely session-free.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const paymentId = searchParams.get("razorpay_payment_id");
  const linkId = searchParams.get("razorpay_payment_link_id");
  const referenceId = searchParams.get("razorpay_payment_link_reference_id") || "";
  const linkStatus = searchParams.get("razorpay_payment_link_status");
  const signature = searchParams.get("razorpay_signature");

  console.log(`[PAYMENT_VERIFY] 🔔 Incoming Callback: Link=${linkId}, Status=${linkStatus}, Payment=${paymentId}`);

  // --- 1. Basic Sanity Check ---
  if (!paymentId || !linkId || !linkStatus || !signature) {
    return NextResponse.json({ error: "Missing Razorpay callback parameters." }, { status: 400 });
  }

  // --- 2. Reject non-paid statuses immediately ---
  if (linkStatus !== "paid") {
    console.warn(`[PAYMENT_VERIFY] ⚠️ Link ${linkId} returned status: ${linkStatus}. Not recording.`);
    return NextResponse.json({ status: linkStatus, recorded: false });
  }

  // --- 3. Cryptographic Signature Verification ---
  // Format: razorpay_payment_link_id|razorpay_payment_link_reference_id|razorpay_payment_link_status|razorpay_payment_id
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error("[PAYMENT_VERIFY] ❌ RAZORPAY_KEY_SECRET missing.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const payload = `${linkId}|${referenceId}|${linkStatus}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error(`[PAYMENT_VERIFY] ❌ Signature mismatch for payment ${paymentId}. Expected: ${expectedSignature.slice(0, 8)}... Received: ${signature.slice(0, 8)}...`);
    return NextResponse.json({ error: "Invalid signature. The payment confirmation could not be verified." }, { status: 403 });
  }

  // --- 4. Invoke Unified Settlement Engine ---
  try {
    const result = await PaymentSettlementService.settleRazorpayTransaction({
      paymentId,
      linkId,
      source: "CALLBACK"
    });

    if (result.success) {
      return NextResponse.json({ 
        recorded: true, 
        status: result.alreadyRecorded ? "already_recorded" : "recorded",
        receiptNumber: result.receiptNumber 
      });
    } else {
      return NextResponse.json({ 
        recorded: false, 
        message: result.message || "Payment verification failed during settlement." 
      }, { status: 422 });
    }

  } catch (err: any) {
    console.error(`[PAYMENT_VERIFY] 🚨 Critical Engine Failure: ${err.message}`);
    return NextResponse.json({ 
      error: "Database error recording payment.", 
      details: err.message 
    }, { status: 500 });
  }
}
