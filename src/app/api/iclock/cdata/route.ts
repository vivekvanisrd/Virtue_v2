import { NextRequest, NextResponse } from "next/server";
import { prismaBypass } from "@/lib/prisma";
import { AttendanceServiceV21 } from "@/lib/services/v2-1-attendance-service";

export const dynamic = "force-dynamic";

/**
 * ZKTeco/BioMax ADMS Biometric Push Protocol - CData Endpoint
 * Path: /api/iclock/cdata
 * 
 * The device pushes raw data logs (attendance punches) here via HTTP POST.
 * It also checks handshake configuration via GET.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sn = searchParams.get("SN");
    console.log(`[iClock CData GET] Device handshake check for SN: ${sn}`);

    // Return OK to signal server readiness
    return new NextResponse("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  } catch (error: any) {
    console.error("[iClock CData GET Error]", error);
    return new NextResponse("FAIL", {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sn = searchParams.get("SN");
    const table = searchParams.get("table") || "ATTLOG";

    if (!sn) {
      return new NextResponse("FAIL: Missing SN", {
        status: 400,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // 1. Verify device registration
    const device = await prismaBypass.biometricDevice.findUnique({
      where: { deviceCode: sn }
    });

    if (!device) {
      console.warn(`[iClock CData] Rejecting punch from unregistered device: ${sn}`);
      return new NextResponse("FAIL: Unregistered Device", {
        status: 403,
        headers: { "Content-Type": "text/plain" }
      });
    }

    if (!device.isActive) {
      console.warn(`[iClock CData] Rejecting punch from inactive device: ${sn}`);
      return new NextResponse("FAIL: Device Inactive", {
        status: 403,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Update device activity ping
    await prismaBypass.biometricDevice.update({
      where: { id: device.id },
      data: { lastPingAt: new Date() }
    });

    // 2. Read raw push body text
    const rawBody = await req.text();
    if (!rawBody) {
      console.log(`[iClock CData] Empty payload received for table ${table} from ${sn}`);
      return new NextResponse("OK", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    }

    console.log(`[iClock CData] Pushed data for table ${table} from device ${sn}:`, rawBody.substring(0, 500));

    // 3. Process Attendance Logs (ATTLOG)
    if (table.toUpperCase() === "ATTLOG") {
      const lines = rawBody.split(/\r?\n/);
      let successCount = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parts = trimmed.split("\t");
        if (parts.length < 2) continue;

        const pin = parts[0]; // Biometric ID / User ID
        const timeStr = parts[1]; // Timestamp: YYYY-MM-DD HH:mm:ss
        const statusStr = parts[2] || "0"; // Punch status code (e.g. 0=IN, 1=OUT)

        // Parse Time
        const punchTime = new Date(timeStr.replace(/-/g, "/")); // cross-env safe date parsing
        if (isNaN(punchTime.getTime())) {
          console.warn(`[iClock CData] Invalid timestamp: ${timeStr} for PIN: ${pin}`);
          continue;
        }

        // 4. Look up Staff
        const staff = await prismaBypass.staff.findFirst({
          where: {
            schoolId: device.schoolId,
            biometricId: pin
          },
          include: { attendancePolicy: true }
        });

        if (!staff) {
          console.warn(`[iClock CData] No staff found with biometricId: ${pin} for school: ${device.schoolId}`);
          continue;
        }

        if (staff.status?.toUpperCase() !== "ACTIVE") {
          console.warn(`[iClock CData] Staff account is inactive for biometricId: ${pin}`);
          continue;
        }

        // Determine punch date boundaries
        const todayDate = new Date(punchTime);
        todayDate.setHours(0, 0, 0, 0);
        const tomorrowDate = new Date(todayDate);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);

        // Fetch existing attendance for this staff member on that day
        const existing = await prismaBypass.staffAttendance.findFirst({
          where: {
            staffId: staff.id,
            date: { gte: todayDate, lt: tomorrowDate }
          }
        });

        // Determine Action (IN vs OUT)
        let action: "IN" | "OUT" = "IN";
        if (statusStr === "0" || statusStr.toUpperCase() === "IN") {
          action = "IN";
        } else if (statusStr === "1" || statusStr.toUpperCase() === "OUT") {
          action = "OUT";
        } else {
          // Fallback based on chronological sequence
          action = existing ? "OUT" : "IN";
        }

        // Prevent double pings/re-transmission loops (within 60 seconds)
        if (existing) {
          const checkInDiff = Math.abs(punchTime.getTime() - (existing.checkIn?.getTime() || 0)) / 1000;
          const checkOutDiff = Math.abs(punchTime.getTime() - (existing.checkOut?.getTime() || 0)) / 1000;
          
          if (checkInDiff < 60 || checkOutDiff < 60) {
            console.log(`[iClock CData] Skipping potential duplicate punch for staff: ${staff.firstName} (PIN: ${pin}) at ${timeStr}`);
            successCount++;
            continue;
          }
        }

        // 5. Apply Punch Changes
        if (action === "IN") {
          if (existing && existing.checkIn) {
            // Already checked in, skip or update to earlier check-in if valid
            if (punchTime < existing.checkIn) {
              const checkInMinutes = punchTime.getHours() * 60 + punchTime.getMinutes();
              const policy = staff.attendancePolicy;
              const startMinutes = policy?.startMinutes ?? 540;
              const gracePeriod = policy?.gracePeriod ?? 15;
              const lateThreshold = policy?.lateThresholdMinutes ?? (startMinutes + gracePeriod);
              const isLate = checkInMinutes > lateThreshold;
              const status = isLate ? "Late" : "Present";

              await prismaBypass.staffAttendance.update({
                where: { id: existing.id },
                data: {
                  checkIn: punchTime,
                  status,
                  remarks: (existing.remarks || "") + ` | Biometric IN updated via device ${sn}`
                }
              });
            }
          } else {
            // Create brand new punch in
            const checkInMinutes = punchTime.getHours() * 60 + punchTime.getMinutes();
            const policy = staff.attendancePolicy;
            const startMinutes = policy?.startMinutes ?? 540;
            const gracePeriod = policy?.gracePeriod ?? 15;
            const lateThreshold = policy?.lateThresholdMinutes ?? (startMinutes + gracePeriod);
            const isLate = checkInMinutes > lateThreshold;
            const status = isLate ? "Late" : "Present";

            await prismaBypass.staffAttendance.create({
              data: {
                staffId: staff.id,
                date: todayDate,
                status,
                schoolId: device.schoolId,
                branchId: device.branchId,
                checkIn: punchTime,
                remarks: `Biometric IN via device ${sn}${isLate ? ` | LATE by ${checkInMinutes - lateThreshold} min` : ""}`
              }
            });
          }
        } else {
          // action === "OUT"
          if (existing) {
            // Update existing check-out
            await prismaBypass.staffAttendance.update({
              where: { id: existing.id },
              data: {
                checkOut: punchTime,
                remarks: (existing.remarks || "") + ` | Biometric OUT via device ${sn}`
              }
            });
          } else {
            // Punched out without a punch-in, create a direct completed record
            await prismaBypass.staffAttendance.create({
              data: {
                staffId: staff.id,
                date: todayDate,
                status: "Present",
                schoolId: device.schoolId,
                branchId: device.branchId,
                checkIn: punchTime,
                checkOut: punchTime,
                remarks: `Biometric OUT (no IN punch recorded) via device ${sn}`
              }
            });
          }
        }

        successCount++;
      }

      console.log(`[iClock CData] Processed ${successCount} attendance logs from device ${sn}`);
    }

    // Always respond with OK to prevent device retrying endlessly
    return new NextResponse("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  } catch (error: any) {
    console.error("[iClock CData POST Error]", error);
    // Even on error, it is best to respond with OK to avoid infinite retry loops on hardware devices
    // unless it is a database failure where we want it to retry later.
    return new NextResponse("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }
}
