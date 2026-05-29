import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function normalizePhone(p: string) {
  return p.replace(/[\s\-+().]/g, "").replace(/^91/, "").slice(-10);
}

export async function GET(req: NextRequest) {
  try {
    const query = new URL(req.url).searchParams.get("query") || new URL(req.url).searchParams.get("phone");
    if (!query) return NextResponse.json({ error: "Search query required" }, { status: 400 });

    const { data, error } = await supabase
      .from("fee_payment_links")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const searchVal = query.trim().toLowerCase();
    const cleanSearchVal = searchVal.replace(/^pava-bk-/i, ""); // strip common bookstore prefix

    const results = (data || []).filter((r: any) => {
      // 1. Match by phone number (last 10 digits)
      const queryNorm = normalizePhone(searchVal);
      const phoneMatch = queryNorm.length >= 6 && normalizePhone(r.phone) === queryNorm;

      // 2. Match by receipt ID / token (starts with or includes token hash)
      const tokenMatch = cleanSearchVal.length >= 4 && (
        r.token.toLowerCase().startsWith(cleanSearchVal) ||
        r.token.toLowerCase().includes(cleanSearchVal)
      );

      // 3. Match by Razorpay Payment reference ID
      const paymentMatch = searchVal.length >= 4 && r.razorpay_payment_id?.toLowerCase().includes(searchVal);

      return phoneMatch || tokenMatch || paymentMatch;
    });

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
