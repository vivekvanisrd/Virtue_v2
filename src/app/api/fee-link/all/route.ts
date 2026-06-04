import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

const OWNER_PASSWORD = "owner@virtue2025";

export async function GET(req: NextRequest) {
  try {
    const pwd = new URL(req.url).searchParams.get("password");
    if (pwd !== OWNER_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const schoolId = req.headers.get("x-v2-school-id");
    const branchId = req.headers.get("x-v2-branch-id");
    const role = req.headers.get("x-v2-role");

    let queryBuilder = supabase.from("fee_payment_links").select("*");

    if (schoolId) {
      queryBuilder = queryBuilder.eq("school_id", schoolId);
    }
    if (branchId && role !== "PLATFORM_ADMIN" && role !== "DEVELOPER" && role !== "OWNER") {
      queryBuilder = queryBuilder.eq("branch_id", branchId);
    }

    const { data, error } = await queryBuilder.order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const records = data || [];
    const paid = records.filter((r: any) => r.status === "PAID");
    const summary = {
      total: records.length,
      paid: paid.length,
      pending: records.filter((r: any) => r.status === "PENDING").length,
      totalAmount: records.reduce((s: number, r: any) => s + Number(r.amount), 0),
      collected: paid.reduce((s: number, r: any) => s + Number(r.amount), 0),
    };

    return NextResponse.json({ records, summary });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
