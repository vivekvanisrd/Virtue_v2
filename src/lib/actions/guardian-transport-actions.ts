"use server";

import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { getGuardianSiblingsAction } from "./guardian-auth-actions";
import { prismaBypass } from "@/lib/prisma";

export async function getWardedTransportAction() {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) {
      return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
    }

    const siblingsRes = await getGuardianSiblingsAction();
    if (!siblingsRes.success || !siblingsRes.siblings || siblingsRes.siblings.length === 0) {
      return { success: true, assignments: [], liveGPS: [] };
    }

    const studentIds = siblingsRes.siblings.map((s: any) => s.studentId);
    const db = prismaBypass as any;

    const assignments = await db.studentTransport.findMany({
      where: {
        studentId: { in: studentIds }
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        route: {
          include: {
            stops: true,
            vehicles: true
          }
        },
        pickupStop: true,
        dropStop: true
      }
    });

    // Also fetch live telemetry cache for vehicles on active routes
    const vehicleIds = assignments.flatMap((a: any) => a.route.vehicles.map((v: any) => v.id));
    const liveGPS = await db.vehicleGPSLive.findMany({
      where: {
        vehicleId: { in: vehicleIds }
      }
    });

    return { success: true, assignments, liveGPS };
  } catch (error: any) {
    console.error("Fetch Transport Error:", error);
    return { success: false, error: error.message };
  }
}
