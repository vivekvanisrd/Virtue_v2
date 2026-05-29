import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// DEMO ONLY — simulates a successful payment without real Razorpay keys
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const { data } = await supabase.from("fee_payment_links").select("razorpay_link_id, status").eq("token", token).single();
    if (!data) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    if (!data.razorpay_link_id?.startsWith("MOCK_")) return NextResponse.json({ error: "Mock pay only works in demo mode" }, { status: 400 });

    await supabase.from("fee_payment_links").update({
      status: "PAID",
      razorpay_payment_id: `MOCK_PAY_${Date.now()}`,
      paid_at: new Date().toISOString(),
    }).eq("token", token);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
