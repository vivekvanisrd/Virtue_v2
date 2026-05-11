import { NextRequest, NextResponse } from "next/server";
import { prismaBypass } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, staffId, latitude, longitude } = body;

    if (!token || !staffId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Token format: SOV2_[SchoolID]_[Timestamp]_[Signature]
    const parts = token.split("_");
    if (parts.length !== 4 || parts[0] !== "SOV2") {
      return NextResponse.json({ success: false, error: "Invalid QR Token format" }, { status: 400 });
    }

    const [prefix, schoolId, timestampStr, signature] = parts;
    const qrTimestamp = parseInt(timestampStr, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // 1. Time Check: Reject if token is older than 30 seconds
    const diffSeconds = currentTimestamp - qrTimestamp;
    if (diffSeconds > 30 || diffSeconds < -5) {
      return NextResponse.json({ success: false, error: "QR Code Expired. Please scan again." }, { status: 403 });
    }

    // 2. Validate Staff Exists
    const staff = await prismaBypass.staff.findFirst({
      where: { id: staffId }
    });

    if (!staff || staff.schoolId !== schoolId) {
      return NextResponse.json({ success: false, error: "Staff not found in this institution." }, { status: 404 });
    }

    if (staff.status !== "Active") {
      return NextResponse.json({ success: false, error: "Staff account is inactive." }, { status: 403 });
    }

    // 3. Mark Attendance (Using today's date)
    // We check if an entry already exists for today.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingRecord = await prismaBypass.staffAttendance.findFirst({
      where: {
        staffId: staffId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (existingRecord) {
      // It's a Punch Out or Duplicate
      // For now, we'll just update it or ignore if they already punched in.
      // In a full implementation, calculate total hours.
      return NextResponse.json({ 
        success: true, 
        message: `Attendance already marked today for ${staff.firstName}.`,
        status: "Already Present"
      });
    }

    // Create new Punch In record
    await prismaBypass.staffAttendance.create({
      data: {
        staffId: staffId,
        date: today,
        status: "Present",
        schoolId: schoolId,
        branchId: staff.branchId,
        checkIn: new Date(),
        remarks: `Mobile Scan IN (Lat: ${latitude || "Unknown"}, Lon: ${longitude || "Unknown"})`
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Punched in successfully! Welcome, ${staff.firstName}.`,
      status: "Present"
    });

  } catch (error: any) {
    console.error("[SCAN_ATTENDANCE_ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
