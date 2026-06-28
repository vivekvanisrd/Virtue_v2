import { NextRequest, NextResponse } from "next/server";
import { prismaBypass } from "@/lib/prisma";
import { decrypt } from "@/lib/auth/session";
import { cookies } from "next/headers";
import redis from "@/lib/redis";
import crypto from "crypto";

function getSigningSecret(schoolId: string): string {
  const base = process.env.JWT_SECRET;
  if (!base) throw new Error("FATAL: JWT_SECRET not configured.");
  return crypto.createHmac("sha256", base).update(`QR_SIGNING:${schoolId}`).digest("hex");
}

function verifyQRSignature(schoolId: string, timestamp: string, signature: string): boolean {
  const secret = getSigningSecret(schoolId);
  const payload = `${schoolId}:${timestamp}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .substring(0, 16)
    .toUpperCase();
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature.toUpperCase()));
}

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get("v-session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: "Session expired. Please log in again." }, { status: 401 });
    }

    const session = await decrypt(sessionCookie);
    if (!session || !session.staffId) {
      return NextResponse.json({ success: false, error: "Invalid session. Please log in again." }, { status: 401 });
    }

    const body = await req.json();
    const { token, staffId, latitude, longitude } = body;

    if (!token || !staffId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // A2: GPS is mandatory — staff must allow location on their phone
    if (latitude == null || longitude == null) {
      return NextResponse.json({ success: false, error: "Location access is required to mark attendance. Please enable GPS and try again." }, { status: 400 });
    }

    // Verify requesting staffId matches the session staffId
    if (staffId !== session.staffId) {
      return NextResponse.json({ success: false, error: "Session verification mismatch." }, { status: 401 });
    }

    // Role check: only authorised roles can use QR attendance
    const allowedRoles = ["TEACHER", "STAFF", "PRINCIPAL", "OWNER", "ADMIN", "CLERK"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ success: false, error: "Your role is not permitted to use QR attendance." }, { status: 403 });
    }

    // QR Replay Protection: reject tokens already used within 60 seconds
    const replayKey = `qr_used:${token}`;
    if (redis) {
      const alreadyUsed = await redis.get(replayKey);
      if (alreadyUsed) {
        return NextResponse.json({ success: false, error: "QR Code already used. Please scan a fresh QR." }, { status: 403 });
      }
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

    // 1b. Cryptographic Signature Check (CRITICAL — was missing before)
    if (!verifyQRSignature(schoolId, timestampStr, signature)) {
      return NextResponse.json({ success: false, error: "QR Token signature invalid. Possible forgery." }, { status: 403 });
    }

    // 2. Validate Staff Exists (Check by ID)
    const staff = await prismaBypass.staff.findUnique({
      where: { id: session.staffId },
      include: {
        branch: true
      }
    });

    if (!staff || staff.schoolId !== schoolId) {
      return NextResponse.json({ success: false, error: "Staff not found in this institution." }, { status: 404 });
    }

    if (staff.status?.toUpperCase() !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Staff account is inactive." }, { status: 403 });
    }

    // 3. Enforce single-device lock: verify session token matches DB
    if (session.mobileSessionToken && staff.mobileSessionToken !== session.mobileSessionToken) {
      return NextResponse.json({ success: false, error: "Device lock error. Logged in from another device." }, { status: 401 });
    }

    // 4. GPS Geofence Verification (to block video call scanning from home)
    let schoolLat = null;
    let schoolLon = null;
    let allowedRadius = 200; // default 200 meters
    let isGeofenceEnabled = false;

    if (staff.branch?.metadata) {
      try {
        const meta = staff.branch.metadata as any;
        if (meta.latitude && meta.longitude) {
          schoolLat = parseFloat(meta.latitude);
          schoolLon = parseFloat(meta.longitude);
        }
        if (meta.geofenceRadius !== undefined) {
          allowedRadius = parseInt(meta.geofenceRadius, 10);
        }
        if (meta.isGeofenceEnabled !== undefined) {
          isGeofenceEnabled = !!meta.isGeofenceEnabled;
        }
      } catch {}
    }

    if (isGeofenceEnabled && schoolLat !== null && schoolLon !== null) {
      if (latitude === null || longitude === null) {
        return NextResponse.json({ success: false, error: "GPS location is required to register attendance." }, { status: 400 });
      }

      const R = 6371e3; // Earth radius in meters
      const phi1 = (schoolLat * Math.PI) / 180;
      const phi2 = (latitude * Math.PI) / 180;
      const deltaPhi = ((latitude - schoolLat) * Math.PI) / 180;
      const deltaLambda = ((longitude - schoolLon) * Math.PI) / 180;

      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance > allowedRadius) {
        return NextResponse.json({
          success: false,
          error: `Location verification failed. You are ${Math.round(distance)}m away from campus (max allowed: ${allowedRadius}m).`
        }, { status: 403 });
      }
    }

    // 3. Mark Attendance (Using today's date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate a stable 32-bit signed integer hash of staff.id (UUID string) for advisory lock
    const hash = staff.id.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0) | 0, 0);

    // A3: Read late threshold from AttendancePolicy (falls back to 555 = 9:15 AM if not configured)
    const policy = await prismaBypass.attendancePolicy.findFirst({
      where: { schoolId, branchId: staff.branchId ?? undefined }
    });
    const startMinutes = policy?.startMinutes ?? 540; // 9:00 AM default
    const gracePeriod = policy?.gracePeriod ?? 15;    // 15 min grace
    const lateThreshold = policy?.lateThresholdMinutes ?? (startMinutes + gracePeriod);

    const transactionResult = await prismaBypass.$transaction(async (tx) => {
      // Obtain transaction-level advisory lock based on the staff ID hash to serialize concurrent scans for this staff member
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${hash})`);

      // Check if an entry already exists for today inside the locked transaction
      const existingRecord = await tx.staffAttendance.findFirst({
        where: {
          staffId: staff.id,
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      if (existingRecord) {
        if (!existingRecord.checkOut) {
          // Check if the check-in was extremely recent (e.g., within 2 minutes) to prevent accidental double-scans / concurrency issues
          const checkInTime = new Date(existingRecord.checkIn!).getTime();
          const nowTime = Date.now();
          const diffMinutes = (nowTime - checkInTime) / 60000;
          if (diffMinutes < 2) {
            return {
              success: false,
              error: "Double-scan detected. Please wait at least 2 minutes between punching IN and OUT.",
              status: "Present"
            };
          }

          // Punched in already, performing Punch Out
          await tx.staffAttendance.update({
            where: { id: existingRecord.id },
            data: {
              checkOut: new Date(),
              remarks: (existingRecord.remarks || "") + ` | Mobile Scan OUT (Lat: ${latitude || "Unknown"}, Lon: ${longitude || "Unknown"})`
            }
          });
          return {
            success: true,
            message: `Punched out successfully! Goodbye, ${staff.firstName}.`,
            status: "Punched Out"
          };
        } else {
          // Already completed both punch-in and punch-out today
          return {
            success: true,
            message: `Attendance already completed today for ${staff.firstName}.`,
            status: "Completed"
          };
        }
      }

      // Create new Punch In record
      const checkInTime = new Date();
      const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
      const isLate = checkInMinutes > lateThreshold;
      const punchStatus = isLate ? "Late" : "Present";

      await tx.staffAttendance.create({
        data: {
          staffId: staff.id,
          date: today,
          status: punchStatus,
          schoolId: schoolId,
          branchId: staff.branchId,
          checkIn: checkInTime,
          remarks: `Mobile Scan IN (Lat: ${latitude}, Lon: ${longitude})${isLate ? ` | LATE by ${checkInMinutes - lateThreshold} min` : ""}`
        }
      });

      const lateMsg = isLate ? ` You are ${checkInMinutes - lateThreshold} minute(s) late.` : "";
      return {
        success: true,
        message: `Punched in successfully! Welcome, ${staff.firstName}.${lateMsg}`,
        status: punchStatus
      };
    });

    // Mark QR token as used (60s TTL) to prevent replay
    if (redis) await redis.setex(replayKey, 60, "1");

    return NextResponse.json(transactionResult);

  } catch (error: any) {
    console.error("[SCAN_ATTENDANCE_ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
