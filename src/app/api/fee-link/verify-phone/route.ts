import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function normalizePhone(p: string) {
  return p.replace(/[\s\-+().]/g, "").replace(/^91/, "").slice(-10);
}

export async function POST(req: NextRequest) {
  try {
    const { token, phone } = await req.json();
    if (!token || !phone) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data, error } = await supabase
      .from("fee_payment_links")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) return NextResponse.json({ error: "Invalid or expired payment link." }, { status: 404 });

    if (normalizePhone(data.phone) !== normalizePhone(phone)) {
      return NextResponse.json({ valid: false, error: "Phone number does not match. Please check and try again." });
    }

    return NextResponse.json({
      valid: true,
      studentName: data.student_name,
      parentName: data.parent_name,
      amount: data.amount,
      description: data.description,
      pendingItems: data.pending_items,
      razorpayShortUrl: data.razorpay_short_url,
      status: data.status,
      isMock: data.razorpay_link_id?.startsWith("MOCK_") ?? false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
