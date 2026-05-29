import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret) {
      const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
      if (expected !== signature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const json = JSON.parse(body);
    const event = json.event;

    if (event === "payment_link.paid") {
      const paymentLink = json.payload.payment_link.entity;
      const token = paymentLink.reference_id;
      const paymentId = json.payload.payment.entity.id;

      if (token) {
        await supabase.from("fee_payment_links").update({
          status: "PAID",
          razorpay_payment_id: paymentId,
          paid_at: new Date().toISOString(),
        }).eq("token", token);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[WEBHOOK] Error:", err.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
