import { NextRequest, NextResponse } from "next/server";
import { prismaBypass } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const staffCode = body?.staffCode?.trim();

    if (!staffCode) {
      return NextResponse.json({ success: false, error: "Staff Code is required" }, { status: 400 });
    }

    // 1. Find staff by staffCode
    const staff = await prismaBypass.staff.findFirst({
      where: { staffCode }
    });

    if (!staff) {
      return NextResponse.json({ success: false, error: "Invalid Staff Code. Please check and try again." }, { status: 404 });
    }

    if (staff.status?.toUpperCase() !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Account is inactive. Contact HR." }, { status: 403 });
    }

    // 2. Get branch name separately
    let branchName = "Main Campus";
    try {
      const branch = await prismaBypass.branch.findUnique({
        where: { id: staff.branchId },
        select: { name: true }
      });
      branchName = branch?.name || "Main Campus";
    } catch {}

    // 3. Get department separately
    let department = "Staff";
    try {
      const prof = await prismaBypass.staffProfessional.findUnique({
        where: { staffId: staff.id },
        select: { department: true, designation: true }
      });
      department = prof?.designation || prof?.department || "Staff";
    } catch {}

    // 4. Fetch attendance stats (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let presentCount = 0;
    let lateCount = 0;
    try {
      const records = await prismaBypass.staffAttendance.findMany({
        where: { staffId: staff.id, date: { gte: startOfMonth } }
      });
      presentCount = records.filter((r: any) => r.status?.toUpperCase() === "PRESENT").length;
      lateCount = records.filter((r: any) => {
        const checkIn = r.checkIn ? new Date(r.checkIn) : null;
        return checkIn && (checkIn.getHours() * 60 + checkIn.getMinutes()) > 555;
      }).length;
    } catch {}

    return NextResponse.json({
      success: true,
      user: {
        id: staff.id,
        staffCode: staff.staffCode,
        firstName: staff.firstName,
        lastName: staff.lastName,
        branchName,
        department
      },
      stats: {
        presentThisMonth: presentCount,
        latesThisMonth: lateCount,
        attendancePercent: Math.round((presentCount / (now.getDate() || 1)) * 100)
      }
    });

  } catch (error: any) {
    console.error("[MOBILE_LOGIN_ERROR]", error?.message, error?.stack);
    return NextResponse.json({ success: false, error: "Server error: " + (error?.message || "unknown") }, { status: 500 });
  }
}
