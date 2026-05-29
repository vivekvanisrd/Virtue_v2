import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function normalizePhone(p: string) {
  return p.replace(/[\s\-+().]/g, "").replace(/^91/, "").slice(-10);
}

export async function GET(req: NextRequest) {
  try {
    const phone = new URL(req.url).searchParams.get("phone");
    if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

    const norm = normalizePhone(phone);
    const { data, error } = await supabase
      .from("fee_payment_links")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const results = (data || []).filter((r: any) => normalizePhone(r.phone) === norm);

    if (results.length === 0) return NextResponse.json({ found: false });

    return NextResponse.json({
      found: true,
      records: results.map((r: any) => ({
        token: r.token,
        studentName: r.student_name,
        parentName: r.parent_name,
        amount: r.amount,
        status: r.status,
        pendingItems: r.pending_items,
        description: r.description,
        createdAt: r.created_at,
        paidAt: r.paid_at,
        feedbackRating: r.feedback_rating,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
