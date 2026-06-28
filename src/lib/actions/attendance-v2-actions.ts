"use server";

import { AttendanceServiceV21 } from "@/lib/services/v2-1-attendance-service";
import { FaceService } from "@/lib/services/face-service";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth, format } from "date-fns";


/**
 * ATTENDANCE V2.1 SERVER ACTIONS
 * -------------------------------
 * Optimized for LIGHTNING FAST performance.
 */

export async function getMonthlyAttendanceMatrixAction(month: number, year: number) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED_ACCESS");

    const startDate = new Date(year, month, 1);
    const endDate = endOfMonth(startDate);

    // 🚀 SINGLE-QUERY MATRIX STRATEGY
    // We fetch EVERYTHING for the branch in one go.
    const attendanceRecords = await prisma.staffAttendance.findMany({
      where: {
        branchId: identity.branchId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        staffId: true,
        date: true,
        status: true,
        isOverridden: true,
        lateMinutes: true
      }
    });

    // Transform into optimized Matrix: Record<staffId, Record<day, record>>
    const matrix: Record<string, Record<number, any>> = {};
    
    attendanceRecords.forEach(rec => {
      if (!matrix[rec.staffId]) matrix[rec.staffId] = {};
      const day = new Date(rec.date).getDate();
      matrix[rec.staffId][day] = rec;
    });

    return { success: true, data: matrix };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitFaceAttendanceAction(imageBase64: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED_ACCESS");

    const result = await FaceService.verifyStaffFace(imageBase64);
    if (!result.success || !result.staffId) throw new Error("Face Verification Failed: Low Confidence");

    const markResult = await AttendanceServiceV21.markAttendance(result.staffId, new Date(), "FACE");
    
    revalidatePath("/dashboard");
    return { success: true, data: markResult };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitManualAttendanceAction(staffId: string, status?: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED_ACCESS");

    const result = await AttendanceServiceV21.markAttendance(staffId, new Date(), "MANUAL", status);
    
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function overrideAttendanceStatusAction(attendanceId: string, staffId: string, date: Date, status: string, reason: string = "Manual Override") {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED_ACCESS");

    let targetId = attendanceId;
    
    // Safety check for unsaved records
    if (attendanceId.includes("TEMP")) {
       const existing = await prisma.staffAttendance.findFirst({
         where: { staffId, date }
       });
       if (existing) targetId = existing.id;
       else {
         // Create if missing
         const created = await prisma.staffAttendance.create({
            data: { staffId, date, status: "Present", branchId: identity.branchId, schoolId: identity.schoolId }
         });
         targetId = created.id;
       }
    }

    const result = await AttendanceServiceV21.overrideStatus(targetId, status, reason, identity.staffId || "ADMIN");
    
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAttendanceCommandStatsAction(branchId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED_ACCESS");

    const bizId = branchId === "GLOBAL" ? identity.branchId : branchId;
    const stats = await AttendanceServiceV21.getCommandStats(bizId);
    return { success: true, data: stats };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
/**
 * ⚡ LEAN PULSE ACTION: Fetches only minimal fields for the Command Center cards
 * Drastically reduces payload for 64+ staff members
 */
export async function getStaffPulseAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const staff = await prisma.staff.findMany({
      where: { 
        schoolId: identity.schoolId,
        ...(identity.branchId && identity.branchId !== 'GLOBAL' && { branchId: identity.branchId })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        staffCode: true,
        attendance: {
          where: { date: today },
          take: 1,
          select: {
            status: true,
            checkIn: true
          }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    return { success: true, data: staff };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * POLICY MANAGEMENT ACTIONS
 * -------------------------
 */

export async function getAttendancePoliciesAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED");

    let policies = await prisma.attendancePolicy.findMany({
      where: { branchId: identity.branchId },
      orderBy: { name: 'asc' }
    });

    // 🛡️ SOVEREIGN AUTO-GENESIS: If no policies exist, create the Branch Default
    if (policies.length === 0) {
      const defaultPolicy = await prisma.attendancePolicy.create({
        data: {
          branchId: identity.branchId,
          schoolId: identity.schoolId,
          name: "Default",
          startMinutes: 510, // 08:30 AM
          endMinutes: 990,   // 04:30 PM
          gracePeriod: 15,
          halfDayMinutes: 240,
          weeklyOffs: [0]
        }
      });
      policies = [defaultPolicy];
    }

    return { success: true, data: policies };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function upsertAttendancePolicyAction(data: any) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED");

    const { id, ...policyData } = data;

    if (id) {
        const result = await prisma.attendancePolicy.update({
            where: { id },
            data: policyData
        });
        revalidatePath("/dashboard");
        return { success: true, data: result };
    } else {
        const result = await prisma.attendancePolicy.create({
            data: {
                ...policyData,
                branchId: identity.branchId,
                schoolId: identity.schoolId
            }
        });
        revalidatePath("/dashboard");
        return { success: true, data: result };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAttendancePolicyAction(id: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    // Safety: Ensure it's not the 'Default' policy if there's only one
    const policy = await prisma.attendancePolicy.findUnique({ where: { id } });
    if (policy?.name === "Default") throw new Error("Cannot delete the system default policy.");

    await prisma.attendancePolicy.delete({ where: { id } });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * STAFF ASSIGNMENT ACTIONS
 */
export async function getStaffForAssignmentAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED");

    const staff = await prisma.staff.findMany({
      where: { 
        branchId: identity.branchId,
        status: "Active"
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        staffCode: true,
        attendancePolicyId: true,
        attendancePolicy: {
            select: {
                id: true,
                name: true
            }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    return { success: true, data: staff };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignStaffShiftAction(staffId: string, policyId: string | null) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED");

    const result = await prisma.staff.update({
        where: { id: staffId },
        data: { attendancePolicyId: policyId }
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAttendanceExceptionsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED");

    const exceptions = await prisma.attendanceException.findMany({
      where: { 
        staff: { branchId: identity.branchId }
      },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            staffCode: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 50
    });

    return { success: true, data: exceptions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
export async function submitFingerprintAttendanceAction(pidBlock: string, machineCode?: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    // 🔍 SOVEREIGN IDENTITY LOOKUP
    // We look for a staff member whose biometricId matches the Machine Code or a metadata tag in the PID
    // For now, we use machineCode as the primary identifier if provided.
    
    let identifier = machineCode;
    
    if (!identifier) {
        // Fallback: Try to extract MC from PID XML using regex (Server-side)
        const mcMatch = pidBlock.match(/mc="([^"]+)"/);
        identifier = mcMatch ? mcMatch[1] : null;
    }

    if (!identifier) throw new Error("Could not extract unique biometric identifier from device.");

    const staff = await prisma.staff.findFirst({
      where: { 
        schoolId: identity.schoolId,
        biometricId: identifier 
      }
    });

    if (!staff) {
        // 🛡️ SECURITY AUDIT: Log the attempt with the identifier for later registration
        console.warn(`[Biometric] Unregistered scan attempt: ${identifier}`);
        throw new Error("Biometric ID not found in staff registry. Please register this finger.");
    }

    const markResult = await AttendanceServiceV21.markAttendance(staff.id, new Date(), "BIOMETRIC");
    
    revalidatePath("/dashboard");
    return { success: true, data: markResult };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * GEOFENCING CONFIGURATION ACTIONS
 * --------------------------------
 */

export async function getBranchGeofenceSettingsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED");

    const branch = await prisma.branch.findUnique({
      where: { id: identity.branchId },
      select: { metadata: true }
    });

    if (!branch) throw new Error("Branch not found.");

    const meta = (branch.metadata || {}) as any;

    return {
      success: true,
      data: {
        latitude: meta.latitude || "",
        longitude: meta.longitude || "",
        geofenceRadius: meta.geofenceRadius !== undefined ? parseInt(meta.geofenceRadius, 10) : 200,
        isGeofenceEnabled: meta.isGeofenceEnabled !== undefined ? !!meta.isGeofenceEnabled : false
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBranchGeofenceSettingsAction(data: {
  latitude: string;
  longitude: string;
  geofenceRadius: number;
  isGeofenceEnabled: boolean;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED");

    const branch = await prisma.branch.findUnique({
      where: { id: identity.branchId }
    });

    if (!branch) throw new Error("Branch not found.");

    const existingMetadata = (branch.metadata || {}) as any;
    const updatedMetadata = {
      ...existingMetadata,
      latitude: data.latitude,
      longitude: data.longitude,
      geofenceRadius: data.geofenceRadius,
      isGeofenceEnabled: data.isGeofenceEnabled
    };

    const result = await prisma.branch.update({
      where: { id: identity.branchId },
      data: { metadata: updatedMetadata }
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBiometricDevicesAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED_ACCESS");

    const devices = await prisma.biometricDevice.findMany({
      where: {
        schoolId: identity.schoolId,
        branchId: identity.branchId
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, data: devices };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registerBiometricDeviceAction(data: {
  deviceCode: string;
  deviceName: string;
  location?: string;
  model?: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED_ACCESS");

    if (!data.deviceCode || !data.deviceName) {
      throw new Error("Device Code and Device Name are required.");
    }

    // Check if deviceCode is already registered globally
    const existing = await prisma.biometricDevice.findUnique({
      where: { deviceCode: data.deviceCode }
    });

    if (existing) {
      throw new Error(`Device code/serial ${data.deviceCode} is already registered.`);
    }

    const device = await prisma.biometricDevice.create({
      data: {
        deviceCode: data.deviceCode,
        deviceName: data.deviceName,
        location: data.location || null,
        model: data.model || "BioMax ADMS",
        schoolId: identity.schoolId,
        branchId: identity.branchId,
        isActive: true
      }
    });

    revalidatePath("/dashboard");
    return { success: true, data: device };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleBiometricDeviceAction(deviceId: string, isActive: boolean) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED_ACCESS");

    const device = await prisma.biometricDevice.findUnique({
      where: { id: deviceId }
    });

    if (!device || device.schoolId !== identity.schoolId) {
      throw new Error("Device not found or access denied.");
    }

    if (identity.role !== "OWNER" && identity.role !== "DEVELOPER" && device.branchId !== identity.branchId) {
      throw new Error("Access denied: You can only manage devices in your branch.");
    }

    const updated = await prisma.biometricDevice.update({
      where: { id: deviceId },
      data: { isActive }
    });

    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBiometricDeviceAction(deviceId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED_ACCESS");

    const device = await prisma.biometricDevice.findUnique({
      where: { id: deviceId }
    });

    if (!device || device.schoolId !== identity.schoolId) {
      throw new Error("Device not found or access denied.");
    }

    if (identity.role !== "OWNER" && identity.role !== "DEVELOPER" && device.branchId !== identity.branchId) {
      throw new Error("Access denied: You can only delete devices in your branch.");
    }

    await prisma.biometricDevice.delete({
      where: { id: deviceId }
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getRecentBiometricPunchesAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED_ACCESS");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const punches = await prisma.staffAttendance.findMany({
      where: {
        schoolId: identity.schoolId,
        branchId: identity.branchId,
        date: { gte: today },
        remarks: { contains: "via device" }
      },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            staffCode: true
          }
        }
      },
      orderBy: { checkIn: "desc" },
      take: 25
    });

    const formatted = punches.flatMap(p => {
      const logs = [];
      if (p.checkIn) {
        logs.push({
          id: `${p.id}-in`,
          name: `${p.staff.firstName} ${p.staff.lastName}`,
          code: p.staff.staffCode,
          time: format(new Date(p.checkIn), "hh:mm a"),
          rawTime: p.checkIn,
          type: "IN",
          status: p.status,
          remarks: p.remarks || ""
        });
      }
      if (p.checkOut) {
        logs.push({
          id: `${p.id}-out`,
          name: `${p.staff.firstName} ${p.staff.lastName}`,
          code: p.staff.staffCode,
          time: format(new Date(p.checkOut), "hh:mm a"),
          rawTime: p.checkOut,
          type: "OUT",
          status: "Completed",
          remarks: p.remarks || ""
        });
      }
      return logs;
    });

    formatted.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime());

    return { success: true, data: formatted.slice(0, 20) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
