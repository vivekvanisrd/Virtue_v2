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

      // 1. Parse and validate logs, extracting unique local dates
      const parsedPunches = [];
      const uniqueDates = new Set<string>();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parts = trimmed.split("\t");
        if (parts.length < 2) continue;

        const pin = parts[0].trim();
        const timeStr = parts[1].trim();
        const statusStr = parts[2] || "0";

        // Parse Time: Expected format "YYYY-MM-DD HH:mm:ss"
        const match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
        if (!match) {
          console.warn(`[iClock CData] Skipping line due to malformed timestamp format: ${timeStr}`);
          continue;
        }

        const [_, yyyy, mm, dd, hh, min, ss] = match;
        // Parse time strictly in Asia/Kolkata timezone (India GMT+5:30)
        const punchTime = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+05:30`);
        if (isNaN(punchTime.getTime())) {
          console.warn(`[iClock CData] Invalid timestamp: ${timeStr} for PIN: ${pin}`);
          continue;
        }

        const dateStr = `${yyyy}-${mm}-${dd}`;
        uniqueDates.add(dateStr);

        parsedPunches.push({
          pin,
          timeStr,
          punchTime,
          dateStr,
          statusStr,
          punchDate: new Date(`${dateStr}T00:00:00+05:30`)
        });
      }

      // Pre-fetch all active staff for this school to avoid N+1 queries
      const allStaff = await prismaBypass.staff.findMany({
        where: { schoolId: device.schoolId },
        include: { attendancePolicy: true }
      });
      const staffMap = new Map();
      for (const s of allStaff) {
        if (s.biometricId) {
          staffMap.set(s.biometricId.trim(), s);
        }
      }

      // Pre-fetch all attendance records matching the exact dates in the parsed batch
      const dateArray = Array.from(uniqueDates).map(d => new Date(`${d}T00:00:00+05:30`));
      const allTodayAttendance = await prismaBypass.staffAttendance.findMany({
        where: {
          schoolId: device.schoolId,
          date: { in: dateArray }
        }
      });
      const attendanceMap = new Map();
      for (const att of allTodayAttendance) {
        const dateKey = att.date.toISOString().split("T")[0];
        attendanceMap.set(`${dateKey}_${att.staffId}`, att);
      }

      // Track unmapped punches to write them in a single batch at the end
      const unmappedPunchesToLog: any[] = [];

      for (const punch of parsedPunches) {
        const { pin, timeStr, punchTime, dateStr, statusStr, punchDate } = punch;
        const staff = staffMap.get(pin);

        if (!staff) {
          console.warn(`[iClock CData] No staff found with biometricId: ${pin} for school: ${device.schoolId}`);
          unmappedPunchesToLog.push({
            id: `unmapped-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            biometricId: pin,
            deviceCode: sn,
            timestamp: punchTime.toISOString(),
            schoolId: device.schoolId,
            branchId: device.branchId
          });
          continue;
        }

        if (staff.status?.toUpperCase() !== "ACTIVE") {
          console.warn(`[iClock CData] Staff account is inactive for biometricId: ${pin}`);
          continue;
        }

        // Fetch existing attendance from pre-fetched map
        const key = `${dateStr}_${staff.id}`;
        const existing = attendanceMap.get(key);

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

        // Apply Punch Changes
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

              const updated = await prismaBypass.staffAttendance.update({
                where: { id: existing.id },
                data: {
                  checkIn: punchTime,
                  status,
                  remarks: (existing.remarks || "") + ` | Biometric IN updated via device ${sn}`
                }
              });
              attendanceMap.set(key, updated);
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

            const created = await prismaBypass.staffAttendance.create({
              data: {
                staffId: staff.id,
                date: punchDate,
                status,
                schoolId: device.schoolId,
                branchId: device.branchId,
                checkIn: punchTime,
                remarks: `Biometric IN via device ${sn}${isLate ? ` | LATE by ${checkInMinutes - lateThreshold} min` : ""}`
              }
            });
            attendanceMap.set(key, created);
          }
        } else {
          // action === "OUT"
          if (existing) {
            // Update existing check-out
            const updated = await prismaBypass.staffAttendance.update({
              where: { id: existing.id },
              data: {
                checkOut: punchTime,
                remarks: (existing.remarks || "") + ` | Biometric OUT via device ${sn}`
              }
            });
            attendanceMap.set(key, updated);
          } else {
            // Punched out without a punch-in, create a direct completed record
            const created = await prismaBypass.staffAttendance.create({
              data: {
                staffId: staff.id,
                date: punchDate,
                status: "Present",
                schoolId: device.schoolId,
                branchId: device.branchId,
                checkIn: punchTime,
                checkOut: punchTime,
                remarks: `Biometric OUT (no IN punch recorded) via device ${sn}`
              }
            });
            attendanceMap.set(key, created);
          }
        }

        successCount++;
      }

      // Batch write unmapped punches at the end to prevent race condition file locks
      if (unmappedPunchesToLog.length > 0) {
        try {
          const fs = require('fs');
          const path = require('path');
          const dir = path.join(process.cwd(), 'scratch');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const filePath = path.join(dir, 'unmapped-punches.json');
          let punchesList = [];
          if (fs.existsSync(filePath)) {
            try {
              punchesList = JSON.parse(fs.readFileSync(filePath, 'utf8') || "[]");
            } catch (e) {
              punchesList = [];
            }
          }
          punchesList.push(...unmappedPunchesToLog);
          if (punchesList.length > 100) punchesList = punchesList.slice(punchesList.length - 100);
          
          const tempPath = filePath + '.tmp';
          fs.writeFileSync(tempPath, JSON.stringify(punchesList, null, 2), 'utf8');
          fs.renameSync(tempPath, filePath);
          console.log(`📝 [CData] Batch logged ${unmappedPunchesToLog.length} unmapped punches.`);
        } catch (err) {
          console.error('Failed to batch log unmapped punches:', err);
        }
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
