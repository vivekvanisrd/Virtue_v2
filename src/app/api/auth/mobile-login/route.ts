import { NextRequest, NextResponse } from "next/server";
import { prismaBypass } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encrypt } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { cleanPhone } from "@/lib/utils/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const staffCode = body?.staffCode?.trim();
    const password = body?.password?.trim();

    if (!staffCode || !password) {
      return NextResponse.json({ success: false, error: "Staff Code and Password are required" }, { status: 400 });
    }

    const cleanPhoneInput = cleanPhone(staffCode) || staffCode;

    // 1. Find staff by staffCode, username, phone, or email
    const staff = await prismaBypass.staff.findFirst({
      where: {
        OR: [
          { staffCode: { equals: staffCode, mode: "insensitive" } },
          { username: { equals: staffCode, mode: "insensitive" } },
          { email: { equals: staffCode, mode: "insensitive" } },
          { phone: staffCode },
          { phone: cleanPhoneInput }
        ]
      }
    });

    if (!staff) {
      return NextResponse.json({ success: false, error: "Invalid credentials. Please check and try again." }, { status: 404 });
    }

    if (staff.status?.toUpperCase() !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Account is inactive. Contact HR." }, { status: 403 });
    }

    // 2. Enforce mobile one-time password security ONLY for temporary password users
    if (staff.onboardingStatus === "PASSWORD_CHANGE_REQUIRED" && staff.mobilePasswordUsed) {
      return NextResponse.json({ 
        success: false, 
        error: "This temporary password has already been used once. Please request a new password from your administrator." 
      }, { status: 403 });
    }

    // 3. Verify Password
    if (!staff.passwordHash) {
      return NextResponse.json({ success: false, error: "Credentials not initialized. Contact HR." }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, staff.passwordHash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid credentials. Please check and try again." }, { status: 401 });
    }

    // 4. Generate random mobileSessionToken
    const newSessionToken = crypto.randomUUID();

    // 5. Update Staff to mark password used and set mobileSessionToken
    await prismaBypass.staff.update({
      where: { id: staff.id },
      data: {
        mobileSessionToken: newSessionToken,
        mobilePasswordUsed: true
      }
    });

    // 6. Encrypt token and set v-session cookie
    const token = await encrypt({
      staffId: staff.id,
      email: staff.email,
      name: `${staff.firstName} ${staff.lastName || ""}`.trim(),
      role: staff.role,
      schoolId: staff.schoolId,
      branchId: staff.branchId,
      mobileSessionToken: newSessionToken
    });

    (await cookies()).set("v-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 // 1 year
    });

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

    // Check today's check-in status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let todayRecord = null;
    try {
      todayRecord = await prismaBypass.staffAttendance.findFirst({
        where: {
          staffId: staff.id,
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      });
    } catch {}

    const todayStatus = todayRecord ? todayRecord.status : null;
    const todayCheckIn = todayRecord && todayRecord.checkIn 
        ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : null;
    const todayCheckOut = todayRecord && todayRecord.checkOut
        ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

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
        attendancePercent: Math.round((presentCount / (now.getDate() || 1)) * 100),
        todayStatus,
        todayCheckIn,
        todayCheckOut
      }
    });

  } catch (error: any) {
    console.error("[MOBILE_LOGIN_ERROR]", error?.message, error?.stack);
    return NextResponse.json({ success: false, error: "Server error: " + (error?.message || "unknown") }, { status: 500 });
  }
}
