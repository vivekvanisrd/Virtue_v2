import { NextRequest, NextResponse } from "next/server";
import { prismaBypass } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { staffCode, password } = await req.json();

    if (!staffCode) {
      return NextResponse.json({ success: false, error: "Staff Code is required" }, { status: 400 });
    }

    // 1. Verify Staff
    const staff = await prismaBypass.staff.findUnique({
      where: { staffCode },
      include: {
        professional: true,
        branch: { select: { name: true } }
      }
    });

    if (!staff) {
      return NextResponse.json({ success: false, error: "Invalid Staff Code" }, { status: 404 });
    }

    if (staff.status?.toUpperCase() !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Account is inactive. Please contact HR." }, { status: 403 });
    }

    // 2. Fetch Attendance Stats for Dashboard (Current Month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const attendanceRecords = await prismaBypass.staffAttendance.findMany({
      where: {
        staffId: staff.id,
        date: { gte: startOfMonth }
      }
    });

    const lateCount = attendanceRecords.filter(r => {
        const checkIn = r.checkIn ? new Date(r.checkIn) : null;
        return checkIn && (checkIn.getHours() * 60 + checkIn.getMinutes()) > 555; // 9:15 AM
    }).length;

    const presentCount = attendanceRecords.filter(r => r.status === "Present").length;

    // 3. Return Profile & Stats
    return NextResponse.json({
      success: true,
      user: {
        id: staff.id,
        staffCode: staff.staffCode,
        firstName: staff.firstName,
        lastName: staff.lastName,
        branchName: staff.branch?.name || "Main Campus",
        department: staff.professional?.department || "Unassigned"
      },
      stats: {
        presentThisMonth: presentCount,
        latesThisMonth: lateCount,
        attendancePercent: Math.round((presentCount / (now.getDate() || 1)) * 100)
      }
    });

  } catch (error: any) {
    console.error("[MOBILE_LOGIN_ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
