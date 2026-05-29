import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { razorpay } from "@/lib/razorpay";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentName, parentName, phone, amount, description, pendingItems } = body;

    if (!studentName || !parentName || !phone || !amount) {
      return NextResponse.json({ error: "Student name, parent name, phone and amount are required." }, { status: 400 });
    }

    const token = uuidv4();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const callbackUrl = `${baseUrl}/api/fee-link/verify`;

    let razorpayLinkId: string | null = null;
    let razorpayShortUrl: string | null = null;
    const hasRazorpayKeys = !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
    let isMock = false;

    if (hasRazorpayKeys) {
      try {
        const link = await (razorpay.paymentLink as any).create({
          amount: Math.round(parseFloat(amount) * 100),
          currency: "INR",
          description: description?.trim() || `Fee for ${studentName}`,
          reference_id: token,
          customer: { name: parentName, contact: phone },
          notify: { sms: false, email: false },
          callback_url: callbackUrl,
          callback_method: "get",
        });
        razorpayLinkId = link.id;
        razorpayShortUrl = link.short_url;
      } catch (rzpErr: any) {
        console.error("[CREATE] Razorpay error:", rzpErr.message);
        isMock = true;
      }
    } else {
      isMock = true;
    }

    if (isMock) {
      razorpayLinkId = `MOCK_${token.slice(0, 8).toUpperCase()}`;
      razorpayShortUrl = `${baseUrl}/fee-pay/mock?token=${token}`;
    }

    const { error: dbErr } = await supabase.from("fee_payment_links").insert({
      token,
      student_name: studentName.trim(),
      parent_name: parentName.trim(),
      phone: phone.trim(),
      amount: parseFloat(amount),
      description: description?.trim() || null,
      pending_items: pendingItems?.trim() || null,
      razorpay_link_id: razorpayLinkId,
      razorpay_short_url: razorpayShortUrl,
      status: "PENDING",
    });

    if (dbErr) throw new Error(dbErr.message);

    return NextResponse.json({
      success: true,
      token,
      shareableUrl: `${baseUrl}/fee-pay/${token}`,
      razorpayShortUrl,
      isMock,
    });
  } catch (err: any) {
    console.error("[CREATE] Fatal:", err.message);
    return NextResponse.json({ error: "Failed to create payment link. Please try again." }, { status: 500 });
  }
}
