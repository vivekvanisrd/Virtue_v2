import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { InventoryService } from "@/lib/services/inventory-service";

export async function POST(req: NextRequest) {
  try {
    const { token, utr } = await req.json();
    if (!token || !utr) {
      return NextResponse.json({ error: "Token and UTR are required." }, { status: 400 });
    }

    // Validate 12-digit UTR
    if (!/^\d{12}$/.test(utr)) {
      return NextResponse.json({ error: "Invalid UTR. Must be exactly 12 digits." }, { status: 400 });
    }

    const { data, error: fetchErr } = await supabase
      .from("fee_payment_links")
      .select("status")
      .eq("token", token)
      .single();

    if (fetchErr || !data) {
      return NextResponse.json({ error: "Invalid payment link token." }, { status: 404 });
    }

    if (data.status === "PAID") {
      return NextResponse.json({ error: "This billing link has already been verified and paid." }, { status: 400 });
    }

    // Update link details in Supabase database
    const { error: updateErr } = await supabase
      .from("fee_payment_links")
      .update({
        status: "PENDING_VERIFICATION",
        payment_method: "UPI_QR",
        payment_details: utr,
        razorpay_payment_id: `UTR_${utr}`,
      })
      .eq("token", token);

    if (updateErr) throw new Error(updateErr.message);

    // Trigger inventory reservation for book kits immediately
    try {
      await InventoryService.reserveInventoryForPayment(token);
    } catch (invErr: any) {
      console.warn("[UTR_SUBMIT] Inventory reservation failed:", invErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[SUBMIT_UTR] Fatal:", err.message);
    return NextResponse.json({ error: "Failed to submit UTR details. Please try again." }, { status: 500 });
  }
}
