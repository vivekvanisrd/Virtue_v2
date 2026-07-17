import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const OWNER_PASSWORD = "owner@virtue2025";

export async function GET(req: NextRequest) {
  try {
    const pwd = new URL(req.url).searchParams.get("password");
    if (pwd !== OWNER_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const schoolId = req.headers.get("x-v2-school-id");
    const branchId = req.headers.get("x-v2-branch-id");
    const role = req.headers.get("x-v2-role");

    const whereClause: any = {};
    if (schoolId) {
      whereClause.school_id = schoolId;
    }
    if (branchId && role !== "PLATFORM_ADMIN" && role !== "DEVELOPER" && role !== "OWNER") {
      whereClause.branch_id = branchId;
    }

    const records = await prisma.fee_payment_links.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" }
    });

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
