import { NextRequest, NextResponse } from "next/server";
import { prismaBypass } from "@/lib/prisma";
import crypto from "crypto";

/**
 * A18: Hardware-agnostic biometric attendance endpoint.
 *
 * Your fingerprint reader SDK posts here with:
 *   deviceCode  — registered device identifier (BiometricDevice.deviceCode)
 *   templateId  — the staff member's fingerprint template ID stored at enrollment
 *   action      — "IN" | "OUT"
 *   deviceKey   — HMAC-SHA256(deviceCode + templateId + action, BIOMETRIC_SECRET)
 *
 * The endpoint verifies the device key, looks up the staff member, and records
 * attendance exactly like the QR scan route — so all the same LWP/late logic
 * applies without duplication.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceCode, templateId, action, deviceKey } = body;

    if (!deviceCode || !templateId || !action || !deviceKey) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    if (!["IN", "OUT"].includes(action)) {
      return NextResponse.json({ success: false, error: "action must be IN or OUT." }, { status: 400 });
    }

    // 1. Verify device is registered and active
    const device = await prismaBypass.biometricDevice.findUnique({
      where: { deviceCode }
    });

    if (!device || !device.isActive) {
      return NextResponse.json({ success: false, error: "Device not registered or inactive." }, { status: 403 });
    }

    // 2. Verify device HMAC — prevents spoofed requests
    const secret = process.env.BIOMETRIC_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error("FATAL: BIOMETRIC_SECRET not configured.");

    const expectedKey = crypto
      .createHmac("sha256", secret)
      .update(`${deviceCode}:${templateId}:${action}`)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(expectedKey), Buffer.from(deviceKey))) {
      return NextResponse.json({ success: false, error: "Device key verification failed." }, { status: 403 });
    }

    // 3. Look up staff by biometric template ID
    const staff = await prismaBypass.staff.findFirst({
      where: {
        schoolId: device.schoolId,
        biometricId: templateId
      },
      include: { attendancePolicy: true }
    });

    if (!staff) {
      return NextResponse.json({ success: false, error: "No staff member enrolled for this template." }, { status: 404 });
    }

    if (staff.status?.toUpperCase() !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Staff account is inactive." }, { status: 403 });
    }

    // 4. Update device last ping
    await prismaBypass.biometricDevice.update({
      where: { deviceCode },
      data: { lastPingAt: new Date() }
    });

    // 5. Read late threshold from AttendancePolicy
    const policy = staff.attendancePolicy;
    const startMinutes = policy?.startMinutes ?? 540;
    const gracePeriod = policy?.gracePeriod ?? 15;
    const lateThreshold = policy?.lateThresholdMinutes ?? (startMinutes + gracePeriod);

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 6. Record attendance (same logic as QR scan)
    const existing = await prismaBypass.staffAttendance.findFirst({
      where: { staffId: staff.id, date: { gte: today, lt: tomorrow } }
    });

    if (action === "IN") {
      if (existing) {
        return NextResponse.json({ success: true, message: `Already punched in today, ${staff.firstName}.`, status: existing.status });
      }

      const checkInMinutes = now.getHours() * 60 + now.getMinutes();
      const isLate = checkInMinutes > lateThreshold;
      const status = isLate ? "Late" : "Present";

      await prismaBypass.staffAttendance.create({
        data: {
          staffId: staff.id,
          date: today,
          status,
          schoolId: device.schoolId,
          branchId: device.branchId,
          checkIn: now,
          remarks: `Biometric IN via device ${deviceCode}${isLate ? ` | LATE by ${checkInMinutes - lateThreshold} min` : ""}`
        }
      });

      const lateMsg = isLate ? ` Late by ${checkInMinutes - lateThreshold} minute(s).` : "";
      return NextResponse.json({ success: true, message: `Welcome, ${staff.firstName}.${lateMsg}`, status });
    }

    // action === "OUT"
    if (!existing) {
      return NextResponse.json({ success: false, error: "No punch-in found for today. Cannot punch out." }, { status: 400 });
    }

    if (existing.checkOut) {
      return NextResponse.json({ success: true, message: `Already punched out today, ${staff.firstName}.`, status: "Completed" });
    }

    await prismaBypass.staffAttendance.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        remarks: (existing.remarks || "") + ` | Biometric OUT via device ${deviceCode}`
      }
    });

    return NextResponse.json({ success: true, message: `Goodbye, ${staff.firstName}. Punched out.`, status: "Punched Out" });

  } catch (error: any) {
    console.error("[BIOMETRIC_ATTENDANCE_ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
