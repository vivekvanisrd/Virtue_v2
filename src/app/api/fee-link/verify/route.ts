import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase/client";
import { razorpay } from "@/lib/razorpay";

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const thankYou = `${baseUrl}/fee-pay/thank-you`;

  const paymentId   = sp.get("razorpay_payment_id");
  const linkId      = sp.get("razorpay_payment_link_id");
  const referenceId = sp.get("razorpay_payment_link_reference_id") || "";
  const linkStatus  = sp.get("razorpay_payment_link_status");
  const signature   = sp.get("razorpay_signature");

  if (!paymentId || !linkId || !linkStatus || !signature)
    return NextResponse.redirect(`${thankYou}?status=error&msg=missing_params`);

  if (linkStatus !== "paid")
    return NextResponse.redirect(`${thankYou}?status=cancelled`);

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (secret && !secret.includes("PLACEHOLDER")) {
    const expected = crypto.createHmac("sha256", secret)
      .update(`${linkId}|${referenceId}|${linkStatus}|${paymentId}`)
      .digest("hex");
    if (expected !== signature)
      return NextResponse.redirect(`${thankYou}?status=error&msg=invalid_signature`);
  }

  let method = "unknown";
  let details = "";
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    method = payment.method || "unknown";
    if (method === "upi") {
      const vpa = payment.vpa || "";
      let app = "UPI";
      if (vpa.includes("@okaxis") || vpa.includes("@okhdfcbank") || vpa.includes("@okicici") || vpa.includes("@oksbi")) {
        app = "Google Pay";
      } else if (vpa.includes("@ybl") || vpa.includes("@ibl") || vpa.includes("@axl")) {
        app = "PhonePe";
      } else if (vpa.includes("@paytm")) {
        app = "Paytm";
      }
      details = `${app} (${vpa})`;
    } else if (method === "card") {
      const card = payment.card || {};
      const brand = card.network || "Card";
      const last4 = card.last4 || "";
      details = `${brand} ending in ${last4}`;
    } else if (method === "netbanking") {
      details = payment.bank || "Netbanking";
    } else if (method === "wallet") {
      details = `${payment.wallet || "Wallet"} Wallet`;
    } else {
      details = method;
    }
  } catch (err) {
    console.warn("Failed to fetch payment details from Razorpay in callback:", err);
  }

  if (referenceId) {
    await supabase.from("fee_payment_links").update({
      status: "PAID",
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
      payment_method: method,
      payment_details: details,
    }).eq("token", referenceId);
  }

  return NextResponse.redirect(`${thankYou}?status=success&token=${referenceId}`);
}
