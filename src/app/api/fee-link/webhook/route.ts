import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase/client";
import { InventoryService } from "@/lib/services/inventory-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[WEBHOOK] CRITICAL: RAZORPAY_WEBHOOK_SECRET is not configured.");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const json = JSON.parse(body);
    const event = json.event;

    if (event === "payment_link.paid") {
      const paymentLink = json.payload.payment_link.entity;
      const token = paymentLink.reference_id;
      const payment = json.payload.payment?.entity;
      const paymentId = payment?.id;

      let method = "unknown";
      let details = "";

      if (payment) {
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
          const card = (payment.card || {}) as any;
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
      }

      if (token && paymentId) {
        await supabase.from("fee_payment_links").update({
          status: "PAID",
          razorpay_payment_id: paymentId,
          paid_at: new Date().toISOString(),
          payment_method: method,
          payment_details: details,
        }).eq("token", token);

        try {
          await InventoryService.reserveInventoryForPayment(token);
        } catch (resErr: any) {
          console.error("[WEBHOOK] Reservation trigger failed:", resErr.message);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[WEBHOOK] Error:", err.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
