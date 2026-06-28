"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { revalidatePath } from "next/cache";

/**
 * getTransportHubAction
 * 
 * Fetches all Active Routes and their associated Stops for the current School/Branch.
 */
export async function getTransportHubAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const routes = await prisma.transportRoute.findMany({
      where: { 
          schoolId: context.schoolId, 
          ...(context.branchId && context.branchId !== 'GLOBAL' && { branchId: context.branchId }),
          isActive: true 
      },
      include: { stops: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' }
    });
    
    return { success: true, data: routes };
  } catch (error: any) {
    return { success: false, error: "Failed to fetch transport data: " + error.message };
  }
}

/**
 * upsertTransportRouteAction
 */
export async function upsertTransportRouteAction(data: {
  id?: string;
  name: string;
  vehicleNo: string;
  driverName?: string;
  capacity?: number;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const route = await prisma.transportRoute.upsert({
      where: { id: data.id || 'new-route' },
      update: {
        name: data.name,
        vehicleNo: data.vehicleNo,
        driverName: data.driverName,
        capacity: data.capacity
      },
      create: {
        schoolId: context.schoolId,
        branchId: context.branchId,
        name: data.name,
        vehicleNo: data.vehicleNo,
        driverName: data.driverName,
        capacity: data.capacity
      }
    });
    
    revalidatePath("/admin/transport");
    return { success: true, data: route };
  } catch (error: any) {
    return { success: false, error: "Failed to save route: " + error.message };
  }
}

/**
 * upsertTransportStopAction
 */
export async function upsertTransportStopAction(data: {
  id?: string;
  routeId: string;
  name: string;
  fare: number;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    
    const stop = await prisma.transportStop.upsert({
      where: { id: data.id || 'new-stop' },
      update: {
        name: data.name,
        fare: data.fare
      },
      create: {
        routeId: data.routeId,
        name: data.name,
        fare: data.fare
      }
    });
    
    revalidatePath("/admin/transport");
    return { success: true, data: stop };
  } catch (error: any) {
    return { success: false, error: "Failed to save stop: " + error.message };
  }
}

/**
 * getStudentTransportAction
 */
export async function getStudentTransportAction(studentId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    
    const assignment = await prisma.transportAssignment.findUnique({
      where: { studentId },
      include: { route: true, stop: true }
    });
    return { success: true, data: assignment };
  } catch (error: any) {
    return { success: false, error: "Failed to fetch student transport: " + error.message };
  }
}

/**
 * @deprecated
 * recordTransportCollectionAction
 * 
 * DEPRECATED: Transport collections are now fully unified under the POS and accounting ledger 
 * system. Settle transport dues through the `recordFeeCollection` route.
 */
export async function recordTransportCollectionAction(enquiryId: string, amount: number, remarks?: string) {
  throw new Error("DEPRECATED_FLOW: Direct transport collection is decommissioned. Settle transport dues via the unified recordFeeCollection ledger action.");
}
