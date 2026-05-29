import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token, rating, note } = await req.json();
    if (!token || !rating) return NextResponse.json({ error: "Token and rating required" }, { status: 400 });
    if (!["GREAT", "OKAY", "POOR"].includes(rating)) return NextResponse.json({ error: "Invalid rating" }, { status: 400 });

    const { data: record } = await supabase
      .from("fee_payment_links")
      .select("status, feedback_rating, razorpay_payment_id")
      .eq("token", token)
      .single();

    if (!record) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    if (record.status !== "PAID") return NextResponse.json({ error: "Feedback only allowed after payment" }, { status: 400 });

    if (!record.feedback_rating) {
      await supabase.from("fee_payment_links").update({ feedback_rating: rating, feedback_note: note?.trim() || null }).eq("token", token);
    }

    // Look up the collection's receipt numbers associated with this payment ID
    let receiptNumber = token;
    if (record.razorpay_payment_id) {
      const collections = await prisma.collection.findMany({
        where: { paymentReference: record.razorpay_payment_id }
      });
      if (collections.length > 0) {
        receiptNumber = collections.map(c => c.receiptNumber).join(",");
      }
    }

    return NextResponse.json({ success: true, receiptNumber });
  } catch (err: any) {
    console.error("[FEEDBACK_ROUTE_ERROR]", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

