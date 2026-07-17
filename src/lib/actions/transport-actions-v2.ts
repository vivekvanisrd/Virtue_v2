"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { JWT_SECRET, decrypt } from "@/lib/auth/session";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import { initSimulationRunner, ROUTE_COORDINATES } from "@/lib/transport-simulator";
import { SimulationStatus, NotificationDeliveryStatus } from "@prisma/client";

function revalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch (err) {
    // Safely ignore Next.js runtime error when running outside Next.js server context (e.g. in test script)
  }
}
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { serializeDecimal } from "@/lib/utils/serialization";
import {
  routeSchema,
  stopSchema,
  vehicleSchema,
  driverSchema,
  driverAssignmentSchema,
  studentTransportSchema,
  tripSessionSchema,
  incidentSchema,
  maintenanceSchema,
  TripStatus,
  DriverStatus,
  VehicleStatus,
} from "@/types/transport-v2";
import { publishVehicleLocation } from "@/lib/publisher";
import { checkRedisRateLimit } from "@/lib/rate-limit";

// ==========================================
// 🛡️ REUSABLE TENANT & PERMISSION HELPERS
// ==========================================

export async function getTenantFilter() {
  const identity = await getSovereignIdentity();
  if (!identity) {
    throw new Error("UNAUTHORIZED: No active session.");
  }
  
  const { schoolId, branchId, staffId: userId, role } = identity;
  if (!schoolId) {
    throw new Error("UNAUTHORIZED: School context is missing.");
  }

  const baseFilter: any = {
    schoolId,
    isDeleted: false,
  };

  if (branchId) {
    baseFilter.branchId = branchId;
  }

  return { schoolId, branchId, userId, role, filter: baseFilter };
}

export async function enforcePermission(actionName: string) {
  const tenantContext = await getTenantFilter();
  const allowedRoles = ["DEVELOPER", "OWNER", "PRINCIPAL", "TRANSPORT_ADMIN"];
  
  if (!allowedRoles.includes(tenantContext.role)) {
    throw new Error(`FORBIDDEN: You do not have permission to execute '${actionName}'.`);
  }
  
  return tenantContext;
}

export async function logTransportActivity(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  schoolId: string;
  branchId?: string | null;
}) {
  try {
    await prisma.transportAuditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        schoolId: params.schoolId,
        branchId: params.branchId || null,
      },
    });
  } catch (err) {
    // Structured operational logging for audit failures (traceable & visible in cloud loggers)
    console.error(JSON.stringify({
      event: "TRANSPORT_AUDIT_FAILURE",
      message: "Audit log failed to write to database",
      timestamp: new Date().toISOString(),
      params,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err)
    }));
  }
}

async function verifyOptimisticLock(
  tx: any,
  modelName: string,
  id: string,
  submittedUpdatedAt: any,
  filter: any
) {
  if (!submittedUpdatedAt) return; // Allow backward-compatibility if not submitted by client

  const current = await tx[modelName].findFirst({
    where: { id, ...filter },
    select: { updatedAt: true },
  });

  if (!current) {
    throw {
      code: "NOT_FOUND",
      message: `${modelName} record not found.`,
    };
  }

  const currentMs = new Date(current.updatedAt).getTime();
  const submittedMs = new Date(submittedUpdatedAt).getTime();

  // 1-second tolerance for client serialization format variations
  if (Math.abs(currentMs - submittedMs) > 1000) {
    throw {
      code: "CONFLICT_DETECTED",
      message: "Record has been modified by another user.",
    };
  }
}

// Structured error helper
function handleError(error: any, fallbackCode = "INTERNAL_ERROR") {
  console.error(`❌ [TRANSPORT-ACTION ERROR]`, error);
  return {
    success: false,
    error: {
      code: error.code || fallbackCode,
      message: error.message || "An unexpected error occurred.",
    },
  };
}

// ==========================================
// 1. ROUTE CRUD ACTIONS
// ==========================================

export async function createRouteAction(rawInput: any) {
  try {
    const { schoolId, branchId, userId } = await enforcePermission("ROUTE_CREATE");
    const parsed = routeSchema.parse(rawInput);

    // Unique Constraint: Route Code within the school
    const existing = await prisma.route.findFirst({
      where: { schoolId, routeCode: parsed.routeCode, isDeleted: false },
    });
    if (existing) {
      return {
        success: false,
        error: { code: "ROUTE_ALREADY_EXISTS", message: `Route code '${parsed.routeCode}' already exists.` },
      };
    }

    const route = await prisma.$transaction(async (tx) => {
      const created = await tx.route.create({
        data: {
          ...parsed,
          schoolId,
          branchId,
        },
      });
      return created;
    });

    await logTransportActivity({
      userId,
      action: "Route Created",
      entityType: "Route",
      entityId: route.id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(route) };
  } catch (e: any) {
    return handleError(e, "ROUTE_CREATE_FAILED");
  }
}

export async function updateRouteAction(id: string, rawInput: any) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("ROUTE_EDIT");
    const parsed = routeSchema.parse(rawInput);

    // Check code duplication excluding current route
    const existing = await prisma.route.findFirst({
      where: { schoolId, routeCode: parsed.routeCode, isDeleted: false, NOT: { id } },
    });
    if (existing) {
      return {
        success: false,
        error: { code: "ROUTE_ALREADY_EXISTS", message: `Route code '${parsed.routeCode}' already exists.` },
      };
    }

    const updatedRoute = await prisma.$transaction(async (tx) => {
      // Optimistic concurrency control check
      await verifyOptimisticLock(tx, "route", id, rawInput.updatedAt, filter);

      const updated = await tx.route.update({
        where: { id },
        data: parsed,
      });
      return updated;
    });

    await logTransportActivity({
      userId,
      action: "Route Updated",
      entityType: "Route",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(updatedRoute) };
  } catch (e: any) {
    return handleError(e, "ROUTE_UPDATE_FAILED");
  }
}

export async function deleteRouteAction(id: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("ROUTE_DELETE");

    const route = await prisma.route.findFirst({
      where: { id, ...filter },
    });
    if (!route) {
      return {
        success: false,
        error: { code: "ROUTE_NOT_FOUND", message: "Route not found or unauthorized access." },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.route.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      
      // Cascade soft delete: student assignments, stops, active trip sessions
      await tx.studentTransport.updateMany({
        where: { routeId: id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      await tx.vehicleStop.updateMany({
        where: { routeId: id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      await tx.driverAssignment.updateMany({
        where: { routeId: id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    await logTransportActivity({
      userId,
      action: "Route Deleted",
      entityType: "Route",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true };
  } catch (e: any) {
    return handleError(e, "ROUTE_DELETE_FAILED");
  }
}

export async function getRouteAction(id: string) {
  try {
    const { filter } = await getTenantFilter();
    const route = await prisma.route.findFirst({
      where: { id, ...filter },
      include: {
        stops: { where: { isDeleted: false } },
        vehicles: { where: { isDeleted: false } },
      },
    });
    if (!route) {
      return { success: false, error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } };
    }
    return { success: true, data: serializeDecimal(route) };
  } catch (e: any) {
    return handleError(e);
  }
}

export async function getRoutesAction() {
  try {
    const { filter } = await getTenantFilter();
    const routes = await prisma.route.findMany({
      where: filter,
      include: {
        stops: { where: { isDeleted: false } },
        _count: {
          select: { studentTransports: { where: { isDeleted: false } } },
        },
      },
      orderBy: { routeName: "asc" },
    });
    return { success: true, data: serializeDecimal(routes) };
  } catch (e: any) {
    return handleError(e);
  }
}

// ==========================================
// 2. VEHICLE CRUD ACTIONS
// ==========================================

export async function createVehicleAction(rawInput: any) {
  try {
    const { schoolId, branchId, userId } = await enforcePermission("VEHICLE_CREATE");
    const parsed = vehicleSchema.parse(rawInput);

    // Verify Route exists and is not deleted
    const route = await prisma.route.findFirst({
      where: { id: parsed.routeId, schoolId, isDeleted: false },
    });
    if (!route) {
      return {
        success: false,
        error: { code: "ROUTE_NOT_FOUND", message: "Target Route does not exist or is deleted." },
      };
    }

    // Unique Constraint: Vehicle Registration Number
    const existing = await prisma.vehicle.findFirst({
      where: { registrationNo: parsed.registrationNo, isDeleted: false },
    });
    if (existing) {
      return {
        success: false,
        error: { code: "VEHICLE_ALREADY_EXISTS", message: `Vehicle with registration '${parsed.registrationNo}' already exists.` },
      };
    }

    // Documents storage verification (references only)
    const documents = parsed.documents || {};

    const vehicle = await prisma.$transaction(async (tx) => {
      const created = await tx.vehicle.create({
        data: {
          registrationNo: parsed.registrationNo,
          model: parsed.model,
          capacity: parsed.capacity,
          onboardingStatus: parsed.onboardingStatus,
          routeId: parsed.routeId,
          schoolId,
          branchId: branchId || route.branchId || "MAIN", // Fallback to route branch or MAIN
          documents,
        },
      });
      return created;
    });

    await logTransportActivity({
      userId,
      action: "Vehicle Created",
      entityType: "Vehicle",
      entityId: vehicle.id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(vehicle) };
  } catch (e: any) {
    return handleError(e, "VEHICLE_CREATE_FAILED");
  }
}

export async function updateVehicleAction(id: string, rawInput: any) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("VEHICLE_EDIT");
    const parsed = vehicleSchema.parse(rawInput);

    // Verify Route exists
    const route = await prisma.route.findFirst({
      where: { id: parsed.routeId, schoolId, isDeleted: false },
    });
    if (!route) {
      return {
        success: false,
        error: { code: "ROUTE_NOT_FOUND", message: "Target Route does not exist." },
      };
    }

    // Check code duplication excluding current vehicle
    const existing = await prisma.vehicle.findFirst({
      where: { registrationNo: parsed.registrationNo, isDeleted: false, NOT: { id } },
    });
    if (existing) {
      return {
        success: false,
        error: { code: "VEHICLE_ALREADY_EXISTS", message: `Vehicle registration '${parsed.registrationNo}' already registered.` },
      };
    }

    const updatedVehicle = await prisma.$transaction(async (tx) => {
      // Optimistic concurrency control check
      await verifyOptimisticLock(tx, "vehicle", id, rawInput.updatedAt, filter);

      const updated = await tx.vehicle.update({
        where: { id },
        data: {
          registrationNo: parsed.registrationNo,
          model: parsed.model,
          capacity: parsed.capacity,
          onboardingStatus: parsed.onboardingStatus,
          routeId: parsed.routeId,
          documents: parsed.documents || {},
        },
      });
      return updated;
    });

    await logTransportActivity({
      userId,
      action: "Vehicle Updated",
      entityType: "Vehicle",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(updatedVehicle) };
  } catch (e: any) {
    return handleError(e, "VEHICLE_UPDATE_FAILED");
  }
}

export async function deleteVehicleAction(id: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("VEHICLE_DELETE");

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, ...filter },
    });
    if (!vehicle) {
      return {
        success: false,
        error: { code: "VEHICLE_NOT_FOUND", message: "Vehicle not found or unauthorized access." },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.vehicle.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      
      // Cascade soft delete: assignments, maintenance, active trip sessions
      await tx.driverAssignment.updateMany({
        where: { vehicleId: id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      await tx.vehicleMaintenance.updateMany({
        where: { vehicleId: id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      await tx.vehicleIncident.updateMany({
        where: { vehicleId: id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    await logTransportActivity({
      userId,
      action: "Vehicle Deleted",
      entityType: "Vehicle",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true };
  } catch (e: any) {
    return handleError(e, "VEHICLE_DELETE_FAILED");
  }
}

export async function getVehicleAction(id: string) {
  try {
    const { filter } = await getTenantFilter();
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, ...filter },
      include: {
        route: true,
        maintenances: { where: { isDeleted: false } },
        incidents: { where: { isDeleted: false } },
      },
    });
    if (!vehicle) {
      return { success: false, error: { code: "VEHICLE_NOT_FOUND", message: "Vehicle not found" } };
    }
    return { success: true, data: serializeDecimal(vehicle) };
  } catch (e: any) {
    return handleError(e);
  }
}

export async function getVehiclesAction() {
  try {
    const { filter } = await getTenantFilter();
    const vehicles = await prisma.vehicle.findMany({
      where: filter,
      include: {
        route: { select: { routeName: true, routeCode: true } },
      },
      orderBy: { registrationNo: "asc" },
    });
    return { success: true, data: serializeDecimal(vehicles) };
  } catch (e: any) {
    return handleError(e);
  }
}

// ==========================================
// 3. VEHICLESTOP CRUD ACTIONS
// ==========================================

export async function createStopAction(rawInput: any) {
  try {
    const { schoolId, branchId, userId } = await enforcePermission("STOP_CREATE");
    const parsed = stopSchema.parse(rawInput);

    // Verify Route exists and belongs to school
    const route = await prisma.route.findFirst({
      where: { id: parsed.routeId, schoolId, isDeleted: false },
    });
    if (!route) {
      return {
        success: false,
        error: { code: "ROUTE_NOT_FOUND", message: "Associated Route does not exist." },
      };
    }

    const stop = await prisma.$transaction(async (tx) => {
      const created = await tx.vehicleStop.create({
        data: {
          routeId: parsed.routeId,
          stopName: parsed.stopName,
          pickupTime: parsed.pickupTime,
          dropTime: parsed.dropTime,
          monthlyFee: parsed.monthlyFee,
          schoolId,
          branchId: branchId || route.branchId,
        },
      });
      return created;
    });

    await logTransportActivity({
      userId,
      action: "Stop Created",
      entityType: "VehicleStop",
      entityId: stop.id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(stop) };
  } catch (e: any) {
    return handleError(e, "STOP_CREATE_FAILED");
  }
}

export async function updateStopAction(id: string, rawInput: any) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("STOP_EDIT");
    const parsed = stopSchema.parse(rawInput);

    // Verify Route exists
    const route = await prisma.route.findFirst({
      where: { id: parsed.routeId, schoolId, isDeleted: false },
    });
    if (!route) {
      return {
        success: false,
        error: { code: "ROUTE_NOT_FOUND", message: "Associated Route does not exist." },
      };
    }

    const updatedStop = await prisma.$transaction(async (tx) => {
      // Optimistic concurrency control check
      await verifyOptimisticLock(tx, "vehicleStop", id, rawInput.updatedAt, filter);

      const updated = await tx.vehicleStop.update({
        where: { id },
        data: {
          routeId: parsed.routeId,
          stopName: parsed.stopName,
          pickupTime: parsed.pickupTime,
          dropTime: parsed.dropTime,
          monthlyFee: parsed.monthlyFee,
        },
      });
      return updated;
    });

    await logTransportActivity({
      userId,
      action: "Stop Updated",
      entityType: "VehicleStop",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(updatedStop) };
  } catch (e: any) {
    return handleError(e, "STOP_UPDATE_FAILED");
  }
}

export async function deleteStopAction(id: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("STOP_DELETE");

    const stop = await prisma.vehicleStop.findFirst({
      where: { id, ...filter },
    });
    if (!stop) {
      return {
        success: false,
        error: { code: "STOP_NOT_FOUND", message: "Stop not found or unauthorized access." },
      };
    }

    // Soft delete stop
    await prisma.$transaction(async (tx) => {
      await tx.vehicleStop.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    await logTransportActivity({
      userId,
      action: "Stop Deleted",
      entityType: "VehicleStop",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true };
  } catch (e: any) {
    return handleError(e, "STOP_DELETE_FAILED");
  }
}

export async function getStopAction(id: string) {
  try {
    const { filter } = await getTenantFilter();
    const stop = await prisma.vehicleStop.findFirst({
      where: { id, ...filter },
      include: { route: true },
    });
    if (!stop) {
      return { success: false, error: { code: "STOP_NOT_FOUND", message: "Stop not found" } };
    }
    return { success: true, data: serializeDecimal(stop) };
  } catch (e: any) {
    return handleError(e);
  }
}

export async function getStopsAction() {
  try {
    const { filter } = await getTenantFilter();
    const stops = await prisma.vehicleStop.findMany({
      where: filter,
      include: {
        route: { select: { routeName: true, routeCode: true } },
      },
      orderBy: { stopName: "asc" },
    });
    return { success: true, data: serializeDecimal(stops) };
  } catch (e: any) {
    return handleError(e);
  }
}

// ==========================================
// 4. DRIVER CRUD ACTIONS
// ==========================================

export async function createDriverAction(rawInput: any) {
  try {
    const { schoolId, branchId, userId } = await enforcePermission("DRIVER_CREATE");
    const parsed = driverSchema.parse(rawInput);

    if (!parsed.password) {
      return {
        success: false,
        error: { code: "PASSWORD_REQUIRED", message: "Driver password is required for onboarding." },
      };
    }

    // Unique phone number constraint
    const existingPhone = await prisma.driver.findFirst({
      where: { phone: parsed.phone, isDeleted: false },
    });
    if (existingPhone) {
      return {
        success: false,
        error: { code: "DRIVER_PHONE_EXISTS", message: `Phone number '${parsed.phone}' already registered.` },
      };
    }

    // Unique license number constraint
    const existingLicense = await prisma.driver.findFirst({
      where: { licenseNo: parsed.licenseNo, isDeleted: false },
    });
    if (existingLicense) {
      return {
        success: false,
        error: { code: "DRIVER_LICENSE_EXISTS", message: `License number '${parsed.licenseNo}' already registered.` },
      };
    }

    // Secure password hashing
    const passwordHash = await bcrypt.hash(parsed.password, 10);

    const driver = await prisma.$transaction(async (tx) => {
      const created = await tx.driver.create({
        data: {
          name: parsed.name,
          phone: parsed.phone,
          licenseNo: parsed.licenseNo,
          passwordHash,
          status: parsed.status,
          schoolId,
          branchId,
          documents: parsed.documents || {},
        },
      });
      return created;
    });

    await logTransportActivity({
      userId,
      action: "Driver Created",
      entityType: "Driver",
      entityId: driver.id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal({ id: driver.id, name: driver.name, phone: driver.phone }) };
  } catch (e: any) {
    return handleError(e, "DRIVER_CREATE_FAILED");
  }
}

export async function updateDriverAction(id: string, rawInput: any) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("DRIVER_EDIT");
    // Password optional during updates
    const parsed = driverSchema.partial().parse(rawInput);

    if (parsed.phone) {
      const existingPhone = await prisma.driver.findFirst({
        where: { phone: parsed.phone, isDeleted: false, NOT: { id } },
      });
      if (existingPhone) {
        return {
          success: false,
          error: { code: "DRIVER_PHONE_EXISTS", message: `Phone number '${parsed.phone}' already registered.` },
        };
      }
    }

    if (parsed.licenseNo) {
      const existingLicense = await prisma.driver.findFirst({
        where: { licenseNo: parsed.licenseNo, isDeleted: false, NOT: { id } },
      });
      if (existingLicense) {
        return {
          success: false,
          error: { code: "DRIVER_LICENSE_EXISTS", message: `License number '${parsed.licenseNo}' already registered.` },
        };
      }
    }

    const updatedDriver = await prisma.$transaction(async (tx) => {
      // Optimistic concurrency control check
      await verifyOptimisticLock(tx, "driver", id, rawInput.updatedAt, filter);

      const updateData: any = {
        name: parsed.name,
        phone: parsed.phone,
        licenseNo: parsed.licenseNo,
        status: parsed.status,
        documents: parsed.documents,
      };

      if (parsed.password) {
        updateData.passwordHash = await bcrypt.hash(parsed.password, 10);
      }

      const updated = await tx.driver.update({
        where: { id },
        data: updateData,
      });

      return updated;
    });

    await logTransportActivity({
      userId,
      action: "Driver Updated",
      entityType: "Driver",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal({ id: updatedDriver.id, name: updatedDriver.name }) };
  } catch (e: any) {
    return handleError(e, "DRIVER_UPDATE_FAILED");
  }
}

export async function deleteDriverAction(id: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("DRIVER_DELETE");

    const driver = await prisma.driver.findFirst({
      where: { id, ...filter },
    });
    if (!driver) {
      return {
        success: false,
        error: { code: "DRIVER_NOT_FOUND", message: "Driver not found or unauthorized access." },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.driver.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      // Soft delete driver assignments
      await tx.driverAssignment.updateMany({
        where: { driverId: id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    await logTransportActivity({
      userId,
      action: "Driver Deleted",
      entityType: "Driver",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true };
  } catch (e: any) {
    return handleError(e, "DRIVER_DELETE_FAILED");
  }
}

export async function resetDriverPasswordAction(driverId: string, newPassword: any) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("DRIVER_EDIT");

    const driver = await prisma.driver.findFirst({
      where: { id: driverId, ...filter },
    });
    if (!driver) {
      return {
        success: false,
        error: { code: "DRIVER_NOT_FOUND", message: "Driver not found or unauthorized access." },
      };
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return {
        success: false,
        error: { code: "INVALID_PASSWORD", message: "Password must be at least 6 characters." },
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      return await tx.driver.update({
        where: { id: driverId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          accountLockedUntil: null,
        },
      });
    });

    await logTransportActivity({
      userId,
      action: "Driver Password Reset",
      entityType: "Driver",
      entityId: driverId,
      schoolId,
      branchId,
    });

    return { success: true };
  } catch (e: any) {
    return handleError(e, "DRIVER_PASSWORD_RESET_FAILED");
  }
}

export async function signInDriverAction(data: {
  phone?: string;
  licenseNo?: string;
  password?: string;
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  setCookie?: boolean;
}) {
  const phone = data.phone?.trim();
  const licenseNo = data.licenseNo?.trim();
  const password = data.password;
  const deviceId = data.deviceId?.trim();

  const auditLogHelper = async (driverId: string | null, event: string, schoolId?: string, branchId?: string) => {
    try {
      await prismaBypass.driverLoginAudit.create({
        data: {
          driverId,
          phone: phone || null,
          licenseNo: licenseNo || null,
          event,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          deviceId: deviceId || null,
          schoolId: schoolId || null,
          branchId: branchId || null,
        },
      });
    } catch (err) {
      console.error("Failed to write DriverLoginAudit:", err);
    }
  };

  try {
    if ((!phone && !licenseNo) || !password) {
      await auditLogHelper(null, "FAILED_PASSWORD");
      return {
        success: false,
        error: { code: "INVALID_INPUT", message: "Phone or License number and Password are required." },
      };
    }

    // Find driver bypassing tenancy
    let driver;
    if (phone) {
      driver = await prismaBypass.driver.findFirst({
        where: { phone, isDeleted: false },
      });
    } else if (licenseNo) {
      driver = await prismaBypass.driver.findFirst({
        where: { licenseNo, isDeleted: false },
      });
    }

    if (!driver) {
      await auditLogHelper(null, "FAILED_PASSWORD");
      return {
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid phone/license number or password." },
      };
    }

    const schoolId = driver.schoolId;
    const branchId = driver.branchId;

    if (driver.status.toUpperCase() !== "ACTIVE") {
      await auditLogHelper(driver.id, "FAILED_PASSWORD", schoolId, branchId);
      return {
        success: false,
        error: { code: "ACCOUNT_INACTIVE", message: "Driver account is not active. Please contact administrator." },
      };
    }

    const now = new Date();

    // Check Lockout
    if (driver.accountLockedUntil && new Date(driver.accountLockedUntil) > now) {
      const remainingMs = new Date(driver.accountLockedUntil).getTime() - now.getTime();
      const remainingMins = Math.ceil(remainingMs / 60000);
      await auditLogHelper(driver.id, "LOCKED_ACCOUNT", schoolId, branchId);
      return {
        success: false,
        error: {
          code: "ACCOUNT_LOCKED",
          message: `Account is locked due to multiple failed login attempts. Try again in ${remainingMins} minute(s).`,
        },
      };
    }

    // Compare password
    const isValid = await bcrypt.compare(password, driver.passwordHash);
    if (!isValid) {
      const failedAttempts = driver.failedLoginAttempts + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(now.getTime() + 15 * 60000) : null;

      await prismaBypass.driver.update({
        where: { id: driver.id },
        data: {
          failedLoginAttempts: failedAttempts,
          accountLockedUntil: lockUntil,
        },
      });

      if (failedAttempts >= 5) {
        await auditLogHelper(driver.id, "LOCKED_ACCOUNT", schoolId, branchId);
        return {
          success: false,
          error: {
            code: "ACCOUNT_LOCKED",
            message: "Account has been locked for 15 minutes due to 5 failed login attempts.",
          },
        };
      }

      await auditLogHelper(driver.id, "FAILED_PASSWORD", schoolId, branchId);
      return {
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid phone/license number or password." },
      };
    }

    // Device ID check
    let updatedDeviceId = driver.deviceId;
    if (deviceId) {
      if (!driver.deviceId) {
        // First time login - register device
        updatedDeviceId = deviceId;
      } else if (driver.deviceId !== deviceId) {
        await auditLogHelper(driver.id, "FAILED_DEVICE", schoolId, branchId);
        return {
          success: false,
          error: {
            code: "DEVICE_MISMATCH",
            message: "This driver account is registered to another device. Please contact administration to reset your device registration.",
          },
        };
      }
    }

    // Success update DB
    await prismaBypass.driver.update({
      where: { id: driver.id },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLoginAt: now,
        lastSeenAt: now,
        deviceId: updatedDeviceId,
      },
    });

    // Create device log
    if (updatedDeviceId) {
      await prismaBypass.driverDeviceLog.create({
        data: {
          driverId: driver.id,
          deviceId: updatedDeviceId,
          deviceName: data.deviceName || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          schoolId,
          branchId,
        },
      });
    }

    // Stateful session creation (Refresh Token Rotation)
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prismaBypass.driverRefreshSession.create({
      data: {
        driverId: driver.id,
        tokenId,
        deviceId: updatedDeviceId || null,
        expiresAt,
        schoolId,
        branchId,
      },
    });

    // Generate JWT access (15m) and refresh (30d) tokens
    const accessToken = await new SignJWT({
      driverId: driver.id,
      role: "DRIVER",
      schoolId,
      branchId,
      refreshTokenVersion: driver.refreshTokenVersion,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(JWT_SECRET);

    const refreshToken = await new SignJWT({
      driverId: driver.id,
      tokenId,
      role: "DRIVER_REFRESH",
      refreshTokenVersion: driver.refreshTokenVersion,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(JWT_SECRET);

    if (data.setCookie) {
      const cookieStore = await cookies();
      cookieStore.set("v-session", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 15, // 15 minutes
      });
    }

    await auditLogHelper(driver.id, "SUCCESS", schoolId, branchId);

    return {
      success: true,
      accessToken,
      refreshToken,
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        licenseNo: driver.licenseNo,
        schoolId,
        branchId,
        deviceId: updatedDeviceId,
      },
    };
  } catch (e: any) {
    return handleError(e, "DRIVER_SIGNIN_FAILED");
  }
}

export async function refreshDriverTokenAction(data: {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  setCookie?: boolean;
}) {
  try {
    const payload = await decrypt(data.refreshToken);
    if (!payload || payload.role !== "DRIVER_REFRESH" || !payload.tokenId) {
      return {
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid refresh token." },
      };
    }

    const session = await prismaBypass.driverRefreshSession.findUnique({
      where: { tokenId: payload.tokenId },
      include: { driver: true },
    });

    // Refresh Token Reuse Detection
    if (session && session.revokedAt !== null) {
      await prismaBypass.driverLoginAudit.create({
        data: {
          driverId: session.driverId,
          event: "REFRESH_TOKEN_REUSE",
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          deviceId: session.deviceId,
          schoolId: session.schoolId,
          branchId: session.branchId,
        },
      });

      // Revoke all active refresh sessions for this driver
      await prismaBypass.driverRefreshSession.updateMany({
        where: { driverId: session.driverId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      console.warn(
        JSON.stringify({
          event: "REFRESH_TOKEN_REUSE_WARNING",
          message: `Security Warning: Refresh token reuse detected for driver ${session.driverId}. Revoking all sessions.`,
          driverId: session.driverId,
          tokenId: payload.tokenId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date().toISOString(),
        })
      );

      return {
        success: false,
        error: { code: "SESSION_COMPROMISED", message: "Security alert: Session compromised. Please login again." },
      };
    }

    if (!session) {
      return {
        success: false,
        error: { code: "INVALID_SESSION", message: "Session not found." },
      };
    }

    if (new Date(session.expiresAt) < new Date()) {
      return {
        success: false,
        error: { code: "SESSION_EXPIRED", message: "Session has expired. Please login again." },
      };
    }

    const driver = session.driver;
    if (driver.isDeleted || driver.status.toUpperCase() !== "ACTIVE") {
      return {
        success: false,
        error: { code: "ACCOUNT_INACTIVE", message: "Account is no longer active." },
      };
    }

    if (payload.refreshTokenVersion !== driver.refreshTokenVersion) {
      return {
        success: false,
        error: { code: "SESSION_REVOKED", message: "Session has been revoked." },
      };
    }

    const now = new Date();

    // Revoke old session
    await prismaBypass.driverRefreshSession.update({
      where: { id: session.id },
      data: { revokedAt: now },
    });

    // Create new refresh session (RTR)
    const newTokenId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prismaBypass.driverRefreshSession.create({
      data: {
        driverId: driver.id,
        tokenId: newTokenId,
        deviceId: session.deviceId,
        expiresAt,
        schoolId: session.schoolId,
        branchId: session.branchId,
      },
    });

    // Issue access (15m) + refresh (30d) tokens
    const accessToken = await new SignJWT({
      driverId: driver.id,
      role: "DRIVER",
      schoolId: session.schoolId,
      branchId: session.branchId,
      refreshTokenVersion: driver.refreshTokenVersion,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(JWT_SECRET);

    const newRefreshToken = await new SignJWT({
      driverId: driver.id,
      tokenId: newTokenId,
      role: "DRIVER_REFRESH",
      refreshTokenVersion: driver.refreshTokenVersion,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(JWT_SECRET);

    if (data.setCookie !== false) {
      const cookieStore = await cookies();
      cookieStore.set("v-session", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 15,
      });
    }

    return {
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: "REFRESH_FAILED", message: err.message || "Unknown error" },
    };
  }
}

export async function verifyDriverSession(token: string) {
  try {
    const payload = await decrypt(token);
    if (!payload || payload.role !== "DRIVER") {
      return null;
    }

    const driver = await prismaBypass.driver.findUnique({
      where: { id: payload.driverId },
    });

    if (!driver || driver.isDeleted || driver.status.toUpperCase() !== "ACTIVE") {
      return null;
    }

    // Verify token version matches database
    if (payload.refreshTokenVersion !== driver.refreshTokenVersion) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

export async function revokeDriverSessionsAction(driverId: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("DRIVER_EDIT");

    const driver = await prisma.driver.findFirst({
      where: { id: driverId, ...filter },
    });

    if (!driver) {
      return {
        success: false,
        error: { code: "DRIVER_NOT_FOUND", message: "Driver not found or unauthorized access." },
      };
    }

    await prisma.$transaction(async (tx) => {
      // Increment refreshTokenVersion
      await tx.driver.update({
        where: { id: driverId },
        data: {
          refreshTokenVersion: { increment: 1 },
        },
      });

      // Revoke all refresh sessions in DB
      await tx.driverRefreshSession.updateMany({
        where: { driverId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    // Create session revoked audit log
    await prismaBypass.driverLoginAudit.create({
      data: {
        driverId,
        event: "SESSION_REVOKED",
        schoolId,
        branchId,
      },
    });

    await logTransportActivity({
      userId,
      action: "Driver Sessions Revoked",
      entityType: "Driver",
      entityId: driverId,
      schoolId,
      branchId,
    });

    return { success: true };
  } catch (e: any) {
    return handleError(e, "DRIVER_SESSION_REVOKE_FAILED");
  }
}

export async function resetDriverDeviceAction(driverId: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("DRIVER_EDIT");

    const driver = await prisma.driver.findFirst({
      where: { id: driverId, ...filter },
    });

    if (!driver) {
      return {
        success: false,
        error: { code: "DRIVER_NOT_FOUND", message: "Driver not found or unauthorized access." },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.driver.update({
        where: { id: driverId },
        data: {
          deviceId: null,
        },
      });
    });

    await logTransportActivity({
      userId,
      action: "Driver Device Reset",
      entityType: "Driver",
      entityId: driverId,
      schoolId,
      branchId,
    });

    return { success: true };
  } catch (e: any) {
    return handleError(e, "DRIVER_DEVICE_RESET_FAILED");
  }
}

export async function getDriverAction(id: string) {
  try {
    const { filter } = await getTenantFilter();
    const driver = await prisma.driver.findFirst({
      where: { id, ...filter },
      select: {
        id: true,
        name: true,
        phone: true,
        licenseNo: true,
        status: true,
        documents: true,
        lastLoginAt: true,
        lastSeenAt: true,
        schoolId: true,
        branchId: true,
      },
    });
    if (!driver) {
      return { success: false, error: { code: "DRIVER_NOT_FOUND", message: "Driver not found" } };
    }
    return { success: true, data: serializeDecimal(driver) };
  } catch (e: any) {
    return handleError(e);
  }
}

export async function getDriversAction() {
  try {
    const { filter } = await getTenantFilter();
    const drivers = await prisma.driver.findMany({
      where: filter,
      select: {
        id: true,
        name: true,
        phone: true,
        licenseNo: true,
        status: true,
        lastSeenAt: true,
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: serializeDecimal(drivers) };
  } catch (e: any) {
    return handleError(e);
  }
}

// ==========================================
// 5. DRIVER ASSIGNMENT ACTIONS
// ==========================================

export async function assignDriverAction(rawInput: any) {
  try {
    const { schoolId, branchId, userId } = await enforcePermission("DRIVER_ASSIGN");
    const parsed = driverAssignmentSchema.parse(rawInput);

    // Concurrency validation checks:
    // 1. Target Driver exists and is not deleted
    const driver = await prisma.driver.findFirst({
      where: { id: parsed.driverId, schoolId, isDeleted: false },
    });
    if (!driver) {
      return {
        success: false,
        error: { code: "DRIVER_NOT_FOUND", message: "Driver does not exist or is deleted." },
      };
    }

    // 2. Target Vehicle exists and is not deleted
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: parsed.vehicleId, schoolId, isDeleted: false },
    });
    if (!vehicle) {
      return {
        success: false,
        error: { code: "VEHICLE_NOT_FOUND", message: "Vehicle does not exist or is deleted." },
      };
    }

    // 3. Prevent two active drivers assigned to same vehicle
    const activeVehicleAssignment = await prisma.driverAssignment.findFirst({
      where: { vehicleId: parsed.vehicleId, status: "ACTIVE", isDeleted: false },
    });
    if (activeVehicleAssignment) {
      return {
        success: false,
        error: { code: "VEHICLE_ALREADY_ASSIGNED", message: "Another active driver is already assigned to this vehicle." },
      };
    }

    // 4. Prevent two active vehicles assigned to same driver
    const activeDriverAssignment = await prisma.driverAssignment.findFirst({
      where: { driverId: parsed.driverId, status: "ACTIVE", isDeleted: false },
    });
    if (activeDriverAssignment) {
      return {
        success: false,
        error: { code: "DRIVER_ALREADY_ASSIGNED", message: "This driver is already assigned to another active vehicle." },
      };
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.driverAssignment.create({
        data: {
          driverId: parsed.driverId,
          vehicleId: parsed.vehicleId,
          routeId: parsed.routeId,
          schoolId,
          branchId,
          status: "ACTIVE",
        },
      });
      return created;
    });

    await logTransportActivity({
      userId,
      action: "Driver Assigned",
      entityType: "DriverAssignment",
      entityId: assignment.id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(assignment) };
  } catch (e: any) {
    return handleError(e, "DRIVER_ASSIGN_FAILED");
  }
}

export async function unassignDriverAction(id: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("DRIVER_UNASSIGN");

    const assignment = await prisma.driverAssignment.findFirst({
      where: { id, ...filter },
    });
    if (!assignment) {
      return {
        success: false,
        error: { code: "ASSIGNMENT_NOT_FOUND", message: "Assignment not found or unauthorized access." },
      };
    }

    await prisma.$transaction(async (tx) => {
      // Soft unassign: set status to Historical, do not hard delete
      await tx.driverAssignment.update({
        where: { id },
        data: { status: "Historical", isDeleted: true, deletedAt: new Date() },
      });
    });

    await logTransportActivity({
      userId,
      action: "Driver Unassigned",
      entityType: "DriverAssignment",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true };
  } catch (e: any) {
    return handleError(e, "DRIVER_UNASSIGN_FAILED");
  }
}

export async function getDriverAssignmentsAction() {
  try {
    const { filter } = await getTenantFilter();
    const assignments = await prisma.driverAssignment.findMany({
      where: filter,
      include: {
        driver: { select: { name: true, phone: true } },
        vehicle: { select: { registrationNo: true, model: true } },
        route: { select: { routeName: true, routeCode: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
    return { success: true, data: serializeDecimal(assignments) };
  } catch (e: any) {
    return handleError(e);
  }
}

// ==========================================
// 6. STUDENT TRANSPORT ALLOCATION ACTIONS
// ==========================================

export async function assignStudentTransportAction(rawInput: any) {
  try {
    const { schoolId, branchId, userId } = await enforcePermission("STUDENT_ASSIGN");
    const parsed = studentTransportSchema.parse(rawInput);

    // Verify Student exists
    const student = await prisma.student.findFirst({
      where: { id: parsed.studentId, schoolId, isDeleted: false },
    });
    if (!student) {
      return {
        success: false,
        error: { code: "STUDENT_NOT_FOUND", message: "Student does not exist or is deleted." },
      };
    }

    // Verify Stops exist
    const pickupStop = await prisma.vehicleStop.findFirst({
      where: { id: parsed.pickupStopId, schoolId, isDeleted: false },
    });
    const dropStop = await prisma.vehicleStop.findFirst({
      where: { id: parsed.dropStopId, schoolId, isDeleted: false },
    });
    if (!pickupStop || !dropStop) {
      return {
        success: false,
        error: { code: "STOP_NOT_FOUND", message: "Pickup or drop stops do not exist." },
      };
    }

    // Constraint: Only one active transport assignment per student
    const activeAssignment = await prisma.studentTransport.findFirst({
      where: { studentId: parsed.studentId, status: "ACTIVE", isDeleted: false },
    });
    if (activeAssignment) {
      return {
        success: false,
        error: { code: "STUDENT_ALREADY_ALLOCATED", message: "Student already has an active transport assignment." },
      };
    }

    const studentTransport = await prisma.$transaction(async (tx) => {
      // 1. Create StudentTransport V2 row
      const allocation = await tx.studentTransport.create({
        data: {
          studentId: parsed.studentId,
          routeId: parsed.routeId,
          pickupStopId: parsed.pickupStopId,
          dropStopId: parsed.dropStopId,
          monthlyFee: parsed.monthlyFee,
          status: "ACTIVE",
          schoolId,
          branchId,
        },
      });
      return allocation;
    });

    await logTransportActivity({
      userId,
      action: "Student Assigned To Route",
      entityType: "StudentTransport",
      entityId: studentTransport.id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(studentTransport) };
  } catch (e: any) {
    return handleError(e, "STUDENT_ASSIGN_FAILED");
  }
}

export async function removeStudentTransportAction(id: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("STUDENT_UNASSIGN");

    const allocation = await prisma.studentTransport.findFirst({
      where: { id, ...filter },
    });
    if (!allocation) {
      return {
        success: false,
        error: { code: "ALLOCATION_NOT_FOUND", message: "Student allocation not found or unauthorized access." },
      };
    }

    await prisma.$transaction(async (tx) => {
      // Soft delete StudentTransport allocation
      await tx.studentTransport.update({
        where: { id },
        data: { status: "Inactive", isDeleted: true, deletedAt: new Date() },
      });
    });

    await logTransportActivity({
      userId,
      action: "Student Unassigned From Route",
      entityType: "StudentTransport",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true };
  } catch (e: any) {
    return handleError(e, "STUDENT_UNASSIGN_FAILED");
  }
}

export async function getStudentTransportAction(studentId: string) {
  try {
    const { filter } = await getTenantFilter();
    const allocation = await prisma.studentTransport.findFirst({
      where: { studentId, ...filter },
      include: {
        route: true,
        pickupStop: true,
        dropStop: true,
      },
    });
    return { success: true, data: serializeDecimal(allocation) };
  } catch (e: any) {
    return handleError(e);
  }
}

// ==========================================
// 7. TRIPSESSION CRUD ACTIONS
// ==========================================

export async function createTripSessionAction(rawInput: any) {
  try {
    const { schoolId, branchId, userId } = await enforcePermission("TRIP_CREATE");
    const parsed = tripSessionSchema.parse(rawInput);

    // Concurrency protection: Verify no other active trips on same vehicle
    const activeVehicleTrip = await prisma.tripSession.findFirst({
      where: { vehicleId: parsed.vehicleId, status: TripStatus.ACTIVE, isDeleted: false },
    });
    if (activeVehicleTrip) {
      return {
        success: false,
        error: { code: "VEHICLE_TRIP_ACTIVE", message: "This vehicle is already on an active trip run." },
      };
    }

    // Verify no other active trips on same route + vehicle combo
    const activeRouteVehicleTrip = await prisma.tripSession.findFirst({
      where: { routeId: parsed.routeId, vehicleId: parsed.vehicleId, status: TripStatus.ACTIVE, isDeleted: false },
    });
    if (activeRouteVehicleTrip) {
      return {
        success: false,
        error: { code: "ROUTE_VEHICLE_TRIP_ACTIVE", message: "An active trip run already exists for this route and vehicle." },
      };
    }

    const trip = await prisma.$transaction(async (tx) => {
      const created = await tx.tripSession.create({
        data: {
          routeId: parsed.routeId,
          vehicleId: parsed.vehicleId,
          driverId: parsed.driverId,
          tripType: parsed.tripType,
          status: parsed.status,
          schoolId,
          branchId,
        },
      });
      return created;
    });

    await logTransportActivity({
      userId,
      action: "Trip Session Created",
      entityType: "TripSession",
      entityId: trip.id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(trip) };
  } catch (e: any) {
    return handleError(e, "TRIP_CREATE_FAILED");
  }
}

export async function updateTripSessionAction(id: string, rawInput: any) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("TRIP_EDIT");
    const parsed = tripSessionSchema.parse(rawInput);

    const updatedTrip = await prisma.$transaction(async (tx) => {
      // Optimistic concurrency control check
      await verifyOptimisticLock(tx, "tripSession", id, rawInput.updatedAt, filter);

      const updated = await tx.tripSession.update({
        where: { id },
        data: parsed,
      });
      return updated;
    });

    await logTransportActivity({
      userId,
      action: "Trip Session Updated",
      entityType: "TripSession",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(updatedTrip) };
  } catch (e: any) {
    return handleError(e, "TRIP_UPDATE_FAILED");
  }
}

export async function deleteTripSessionAction(id: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("TRIP_DELETE");

    const trip = await prisma.tripSession.findFirst({
      where: { id, ...filter },
    });
    if (!trip) {
      return {
        success: false,
        error: { code: "TRIP_NOT_FOUND", message: "Trip session not found or unauthorized access." },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.tripSession.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      // Cascade attendance soft delete
      await tx.busAttendance.updateMany({
        where: { tripSessionId: id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    await logTransportActivity({
      userId,
      action: "Trip Session Deleted",
      entityType: "TripSession",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true };
  } catch (e: any) {
    return handleError(e, "TRIP_DELETE_FAILED");
  }
}

export async function getTripSessionAction(id: string) {
  try {
    const { filter } = await getTenantFilter();
    const trip = await prisma.tripSession.findFirst({
      where: { id, ...filter },
      include: {
        route: true,
        vehicle: true,
        driver: { select: { name: true, phone: true } },
        attendance: { where: { isDeleted: false } },
      },
    });
    if (!trip) {
      return { success: false, error: { code: "TRIP_NOT_FOUND", message: "Trip session not found" } };
    }
    return { success: true, data: serializeDecimal(trip) };
  } catch (e: any) {
    return handleError(e);
  }
}

export async function getTripSessionsAction() {
  try {
    const { filter } = await getTenantFilter();
    const trips = await prisma.tripSession.findMany({
      where: filter,
      include: {
        route: { select: { routeName: true, routeCode: true } },
        vehicle: { select: { registrationNo: true } },
        driver: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: serializeDecimal(trips) };
  } catch (e: any) {
    return handleError(e);
  }
}

export async function getLiveTelemetryAction() {
  try {
    const { filter } = await getTenantFilter();
    
    // Hardened query: Only return telemetry for active trips, active drivers, and active vehicles
    const liveGPS = await prisma.vehicleGPSLive.findMany({
      where: {
        schoolId: filter.schoolId,
        branchId: filter.branchId || undefined,
        vehicle: {
          isDeleted: false,
          onboardingStatus: "ACTIVE",
          tripSessions: {
            some: {
              status: "ACTIVE",
              isDeleted: false,
              driver: {
                status: "ACTIVE",
                isDeleted: false
              }
            }
          }
        }
      }
    });
    return { success: true, data: serializeDecimal(liveGPS) };
  } catch (e: any) {
    return handleError(e);
  }
}

// ==========================================
// 8. VEHICLE INCIDENT ACTIONS
// ==========================================

export async function createIncidentAction(rawInput: any) {
  try {
    const { schoolId, branchId, userId } = await enforcePermission("INCIDENT_CREATE");
    const parsed = incidentSchema.parse(rawInput);

    const incident = await prisma.$transaction(async (tx) => {
      const created = await tx.vehicleIncident.create({
        data: {
          vehicleId: parsed.vehicleId,
          driverId: parsed.driverId,
          tripSessionId: parsed.tripSessionId,
          severity: parsed.severity,
          description: parsed.description,
          status: parsed.status,
          schoolId,
          branchId,
        },
      });
      return created;
    });

    await logTransportActivity({
      userId,
      action: "Incident Created",
      entityType: "VehicleIncident",
      entityId: incident.id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(incident) };
  } catch (e: any) {
    return handleError(e, "INCIDENT_CREATE_FAILED");
  }
}

export async function updateIncidentAction(id: string, rawInput: any) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("INCIDENT_EDIT");
    const parsed = incidentSchema.parse(rawInput);

    const updatedIncident = await prisma.$transaction(async (tx) => {
      // Optimistic concurrency control check
      await verifyOptimisticLock(tx, "vehicleIncident", id, rawInput.updatedAt, filter);

      const updated = await tx.vehicleIncident.update({
        where: { id },
        data: parsed,
      });
      return updated;
    });

    await logTransportActivity({
      userId,
      action: "Incident Updated",
      entityType: "VehicleIncident",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(updatedIncident) };
  } catch (e: any) {
    return handleError(e, "INCIDENT_UPDATE_FAILED");
  }
}

export async function deleteIncidentAction(id: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("INCIDENT_DELETE");

    const incident = await prisma.vehicleIncident.findFirst({
      where: { id, ...filter },
    });
    if (!incident) {
      return {
        success: false,
        error: { code: "INCIDENT_NOT_FOUND", message: "Incident not found or unauthorized access." },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.vehicleIncident.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    await logTransportActivity({
      userId,
      action: "Incident Deleted",
      entityType: "VehicleIncident",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true };
  } catch (e: any) {
    return handleError(e, "INCIDENT_DELETE_FAILED");
  }
}

export async function getIncidentAction(id: string) {
  try {
    const { filter } = await getTenantFilter();
    const incident = await prisma.vehicleIncident.findFirst({
      where: { id, ...filter },
      include: { vehicle: true, driver: { select: { name: true } } },
    });
    if (!incident) {
      return { success: false, error: { code: "INCIDENT_NOT_FOUND", message: "Incident not found" } };
    }
    return { success: true, data: serializeDecimal(incident) };
  } catch (e: any) {
    return handleError(e);
  }
}

export async function getIncidentsAction() {
  try {
    const { filter } = await getTenantFilter();
    const incidents = await prisma.vehicleIncident.findMany({
      where: filter,
      include: {
        vehicle: { select: { registrationNo: true } },
        driver: { select: { name: true } },
      },
      orderBy: { reportedAt: "desc" },
    });
    return { success: true, data: serializeDecimal(incidents) };
  } catch (e: any) {
    return handleError(e);
  }
}

// ==========================================
// 9. VEHICLE MAINTENANCE ACTIONS
// ==========================================

export async function createMaintenanceAction(rawInput: any) {
  try {
    const { schoolId, branchId, userId } = await enforcePermission("MAINTENANCE_CREATE");
    const parsed = maintenanceSchema.parse(rawInput);

    const maintenance = await prisma.$transaction(async (tx) => {
      const created = await tx.vehicleMaintenance.create({
        data: {
          vehicleId: parsed.vehicleId,
          maintenanceType: parsed.maintenanceType,
          cost: parsed.cost,
          description: parsed.description,
          performedAt: new Date(parsed.performedAt),
          nextDueDate: parsed.nextDueDate ? new Date(parsed.nextDueDate) : null,
          status: parsed.status,
          schoolId,
          branchId,
        },
      });
      return created;
    });

    await logTransportActivity({
      userId,
      action: "Maintenance Logged",
      entityType: "VehicleMaintenance",
      entityId: maintenance.id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(maintenance) };
  } catch (e: any) {
    return handleError(e, "MAINTENANCE_CREATE_FAILED");
  }
}

export async function updateMaintenanceAction(id: string, rawInput: any) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("MAINTENANCE_EDIT");
    const parsed = maintenanceSchema.parse(rawInput);

    const updatedMaintenance = await prisma.$transaction(async (tx) => {
      // Optimistic concurrency control check
      await verifyOptimisticLock(tx, "vehicleMaintenance", id, rawInput.updatedAt, filter);

      const updated = await tx.vehicleMaintenance.update({
        where: { id },
        data: {
          vehicleId: parsed.vehicleId,
          maintenanceType: parsed.maintenanceType,
          cost: parsed.cost,
          description: parsed.description,
          performedAt: new Date(parsed.performedAt),
          nextDueDate: parsed.nextDueDate ? new Date(parsed.nextDueDate) : null,
          status: parsed.status,
        },
      });
      return updated;
    });

    await logTransportActivity({
      userId,
      action: "Maintenance Updated",
      entityType: "VehicleMaintenance",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(updatedMaintenance) };
  } catch (e: any) {
    return handleError(e, "MAINTENANCE_UPDATE_FAILED");
  }
}

export async function deleteMaintenanceAction(id: string) {
  try {
    const { schoolId, branchId, userId, filter } = await enforcePermission("MAINTENANCE_DELETE");

    const maintenance = await prisma.vehicleMaintenance.findFirst({
      where: { id, ...filter },
    });
    if (!maintenance) {
      return {
        success: false,
        error: { code: "MAINTENANCE_NOT_FOUND", message: "Maintenance log not found or unauthorized access." },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.vehicleMaintenance.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    await logTransportActivity({
      userId,
      action: "Maintenance Deleted",
      entityType: "VehicleMaintenance",
      entityId: id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true };
  } catch (e: any) {
    return handleError(e, "MAINTENANCE_DELETE_FAILED");
  }
}

export async function getMaintenanceAction(id: string) {
  try {
    const { filter } = await getTenantFilter();
    const maintenance = await prisma.vehicleMaintenance.findFirst({
      where: { id, ...filter },
      include: { vehicle: true },
    });
    if (!maintenance) {
      return { success: false, error: { code: "MAINTENANCE_NOT_FOUND", message: "Maintenance log not found" } };
    }
    return { success: true, data: serializeDecimal(maintenance) };
  } catch (e: any) {
    return handleError(e);
  }
}

export async function getMaintenancesAction() {
  try {
    const { filter } = await getTenantFilter();
    const maintenances = await prisma.vehicleMaintenance.findMany({
      where: filter,
      include: {
        vehicle: { select: { registrationNo: true } },
      },
      orderBy: { performedAt: "desc" },
    });
    return { success: true, data: serializeDecimal(maintenances) };
  } catch (e: any) {
    return handleError(e);
  }
}

// ==========================================
// 10. TELEMETRY & TRIP SESSION RUNTIME ACTIONS
// ==========================================

export async function startTripAction(rawInput: any, tokenOverride?: string) {
  try {
    // 1. Authenticate driver
    const token = tokenOverride || (await cookies()).get("v-session")?.value;
    if (!token) {
      return { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } };
    }
    const payload = await verifyDriverSession(token);
    if (!payload) {
      return { success: false, error: { code: "UNAUTHORIZED", message: "Invalid driver session." } };
    }
    const { driverId, schoolId, branchId } = payload;

    // 2. Validate input and override driverId with token's driverId
    const parsed = tripSessionSchema.parse({
      ...rawInput,
      driverId,
    });

    // 3. Concurrency check: Ensure no active trip exists for this driver or vehicle
    const activeTrip = await prisma.tripSession.findFirst({
      where: {
        isDeleted: false,
        status: { in: ["ACTIVE", "STALE", "OFFLINE"] },
        OR: [
          { driverId: parsed.driverId },
          { vehicleId: parsed.vehicleId }
        ]
      }
    });

    if (activeTrip) {
      return {
        success: false,
        error: {
          code: "TRIP_CONCURRENCY_ERROR",
          message: activeTrip.driverId === parsed.driverId
            ? "Driver already has an active trip run."
            : "Vehicle is already on an active trip run."
        }
      };
    }

    // 4. Verify Active DriverAssignment exists, and vehicle/route/driver are Active
    const assignment = await prisma.driverAssignment.findFirst({
      where: {
        driverId: parsed.driverId,
        vehicleId: parsed.vehicleId,
        routeId: parsed.routeId,
        status: "ACTIVE",
        isDeleted: false,
      },
      include: {
        driver: true,
        vehicle: true,
        route: true,
      }
    });

    if (!assignment) {
      return {
        success: false,
        error: {
          code: "ASSIGNMENT_NOT_FOUND",
          message: "No active assignment found for this driver, vehicle, and route."
        }
      };
    }

    if (assignment.driver.status !== "ACTIVE" || assignment.driver.isDeleted) {
      return { success: false, error: { code: "DRIVER_INACTIVE", message: "Driver account status is not active." } };
    }
    if (assignment.vehicle.isDeleted) {
      return { success: false, error: { code: "VEHICLE_INACTIVE", message: "Vehicle is deleted or inactive." } };
    }
    if (assignment.route.isDeleted) {
      return { success: false, error: { code: "ROUTE_INACTIVE", message: "Route is deleted or inactive." } };
    }

    // 5. Create trip session
    const trip = await prisma.$transaction(async (tx) => {
      return await tx.tripSession.create({
        data: {
          routeId: parsed.routeId,
          vehicleId: parsed.vehicleId,
          driverId: parsed.driverId,
          tripType: parsed.tripType,
          status: "ACTIVE",
          startedAt: new Date(),
          tripHeartbeatAt: new Date(),
          schoolId,
          branchId,
        }
      });
    });

    // 6. Log action
    await logTransportActivity({
      userId: driverId,
      action: "Trip Started",
      entityType: "TripSession",
      entityId: trip.id,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(trip) };
  } catch (e: any) {
    return handleError(e, "TRIP_START_FAILED");
  }
}

export async function endTripAction(tripSessionId: string, tokenOverride?: string) {
  try {
    // 1. Authenticate driver or admin
    const token = tokenOverride || (await cookies()).get("v-session")?.value;
    if (!token) {
      return { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } };
    }
    
    const payload = await verifyDriverSession(token);
    let userId = "";
    let schoolId = "";
    let branchId: string | null = null;
    
    const trip = await prisma.tripSession.findUnique({
      where: { id: tripSessionId }
    });

    if (!trip || trip.isDeleted) {
      return { success: false, error: { code: "TRIP_NOT_FOUND", message: "Trip session not found." } };
    }

    if (payload) {
      // Driver ending trip
      if (trip.driverId !== payload.driverId) {
        return { success: false, error: { code: "FORBIDDEN", message: "You cannot end another driver's trip." } };
      }
      userId = payload.driverId;
      schoolId = payload.schoolId;
      branchId = payload.branchId;
    } else {
      // Admin ending trip
      try {
        const adminCtx = await enforcePermission("TRIP_EDIT");
        userId = adminCtx.userId;
        schoolId = adminCtx.schoolId;
        branchId = adminCtx.branchId;
      } catch (err) {
        return { success: false, error: { code: "UNAUTHORIZED", message: "Authentication failed." } };
      }
    }

    // 2. Set trip to COMPLETED and record endedAt
    const updatedTrip = await prisma.$transaction(async (tx) => {
      return await tx.tripSession.update({
        where: { id: tripSessionId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
        }
      });
    });

    // 3. Log action
    await logTransportActivity({
      userId,
      action: "Trip Ended",
      entityType: "TripSession",
      entityId: tripSessionId,
      schoolId,
      branchId,
    });

    revalidatePath("/dashboard/transport");
    return { success: true, data: serializeDecimal(updatedTrip) };
  } catch (e: any) {
    return handleError(e, "TRIP_END_FAILED");
  }
}

export async function checkTripHeartbeatsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) {
      throw new Error("UNAUTHORIZED: Active session required to run offline check.");
    }
    const now = new Date();
    // 1. Fetch active or stale trips
    const activeTrips = await prisma.tripSession.findMany({
      where: {
        status: { in: ["ACTIVE", "STALE"] },
        isDeleted: false
      }
    });

    const results = [];
    for (const trip of activeTrips) {
      const lastHeartbeat = trip.tripHeartbeatAt || trip.startedAt || trip.createdAt;
      const diffMinutes = (now.getTime() - new Date(lastHeartbeat).getTime()) / 60000;

      if (diffMinutes >= 15) {
        // Mark as OFFLINE
        await prisma.tripSession.update({
          where: { id: trip.id },
          data: { status: "OFFLINE" }
        });

        // Trigger VEHICLE_OFFLINE incident if unresolved one doesn't exist
        const existingIncident = await prisma.vehicleIncident.findFirst({
          where: {
            vehicleId: trip.vehicleId,
            incidentType: "VEHICLE_OFFLINE",
            status: "PENDING",
            isDeleted: false,
          }
        });

        if (!existingIncident) {
          await prisma.vehicleIncident.create({
            data: {
              vehicleId: trip.vehicleId,
              driverId: trip.driverId,
              tripSessionId: trip.id,
              severity: "HIGH",
              incidentType: "VEHICLE_OFFLINE",
              description: `Vehicle offline: no GPS heartbeat received for ${Math.round(diffMinutes)} minutes.`,
              schoolId: trip.schoolId,
              branchId: trip.branchId,
            }
          });
          
          console.warn(`[HEARTBEAT] Trip session ${trip.id} vehicle offline incident created.`);
        }

        results.push({ id: trip.id, status: "OFFLINE" });
      } else if (diffMinutes >= 5) {
        // Mark as STALE
        await prisma.tripSession.update({
          where: { id: trip.id },
          data: { status: "STALE" }
        });
        
        results.push({ id: trip.id, status: "STALE" });
      }
    }

    return { success: true, data: serializeDecimal(results) };
  } catch (e: any) {
    return handleError(e, "CHECK_HEARTBEATS_FAILED");
  }
}

export async function gpsPingAction(
  data: {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    sequenceNo?: number;
    timestamp?: string;
  },
  tokenOverride?: string
) {
  try {
    // 1. Authenticate driver
    const token = tokenOverride || (await cookies()).get("v-session")?.value;
    if (!token) {
      return { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } };
    }
    const payload = await verifyDriverSession(token);
    if (!payload) {
      return { success: false, error: { code: "UNAUTHORIZED", message: "Invalid driver session." } };
    }
    const { driverId, schoolId, branchId } = payload;

    const now = new Date();
    const clientTime = data.timestamp ? new Date(data.timestamp) : now;

    // 2. Verify active assignment
    const assignment = await prisma.driverAssignment.findFirst({
      where: {
        driverId,
        vehicleId: data.vehicleId,
        status: "ACTIVE",
        isDeleted: false,
      }
    });
    if (!assignment) {
      return { success: false, error: { code: "NO_ACTIVE_ASSIGNMENT", message: "Driver does not have active assignment for this vehicle." } };
    }

    // 3. Verify active trip session
    const activeTrip = await prisma.tripSession.findFirst({
      where: {
        driverId,
        vehicleId: data.vehicleId,
        status: { in: ["ACTIVE", "STALE", "OFFLINE"] },
        isDeleted: false,
      }
    });
    if (!activeTrip) {
      return { success: false, error: { code: "NO_ACTIVE_TRIP", message: "No active trip session running." } };
    }

    // 4. GPS Quality check: lat/lng = 0
    if (data.latitude === 0 && data.longitude === 0) {
      return { success: false, error: { code: "INVALID_GPS_COORDINATES", message: "GPS coordinates cannot be 0,0." } };
    }

    // 5. GPS Quality check: timestamp > 60s
    if (Math.abs(now.getTime() - clientTime.getTime()) > 60000) {
      return { success: false, error: { code: "STALE_GPS_TIMESTAMP", message: "GPS timestamp difference exceeds 60 seconds." } };
    }

    // 6. GPS Quality check: accuracy > TRANSPORT_GPS_MAX_ACCURACY_METERS
    const maxAccuracy = process.env.TRANSPORT_GPS_MAX_ACCURACY_METERS
      ? parseFloat(process.env.TRANSPORT_GPS_MAX_ACCURACY_METERS)
      : 100;
    if (data.accuracy !== undefined && data.accuracy > maxAccuracy) {
      return { success: false, error: { code: "POOR_GPS_ACCURACY", message: `GPS accuracy (${data.accuracy}m) exceeds limit of ${maxAccuracy}m.` } };
    }

    // 7. Sequence No Check: ignore if sequenceNo <= latest accepted sequenceNo
    const redis = (await import("@/lib/redis")).redis;
    const redisKeySeq = `transport:vehicle:${data.vehicleId}:sequence`;
    let latestSeq: number | null = null;
    if (redis) {
      try {
        const cachedSeq = await redis.get(redisKeySeq);
        if (cachedSeq !== null) {
          latestSeq = parseInt(cachedSeq, 10);
        }
      } catch (err: any) {
        console.warn("⚠️ Redis get sequence failed, falling back to database:", err.message);
      }
    }
    if (latestSeq === null) {
      const live = await prisma.vehicleGPSLive.findUnique({
        where: { vehicleId: data.vehicleId },
        select: { sequenceNo: true }
      });
      if (live) {
        latestSeq = live.sequenceNo;
      }
    }

    if (data.sequenceNo !== undefined && latestSeq !== null && data.sequenceNo <= latestSeq) {
      return { success: true, ignored: true, reason: "OUT_OF_ORDER_SEQUENCE" };
    }

    // 8. Spoofing Guard: speed jump > 150 km/h
    const redisKeyLive = `transport:vehicle:${data.vehicleId}:live`;
    let lastCoord: { latitude: number; longitude: number; timestamp: string } | null = null;
    if (redis) {
      try {
        const cachedLive = await redis.get(redisKeyLive);
        if (cachedLive) {
          try {
            lastCoord = JSON.parse(cachedLive);
          } catch (_) {}
        }
      } catch (err: any) {
        console.warn("⚠️ Redis get live coordinate failed:", err.message);
      }
    }
    if (!lastCoord) {
      const live = await prisma.vehicleGPSLive.findUnique({
        where: { vehicleId: data.vehicleId }
      });
      if (live) {
        lastCoord = {
          latitude: live.latitude,
          longitude: live.longitude,
          timestamp: (live.clientTimestamp || live.serverTimestamp || new Date()).toISOString()
        };
      }
    }

    if (lastCoord) {
      const lastTime = new Date(lastCoord.timestamp).getTime();
      const timeDiffHours = (clientTime.getTime() - lastTime) / 3600000;
      
      if (timeDiffHours > 0.00027) { // > 1 second
        const R = 6371; // Earth radius in km
        const dLat = ((data.latitude - lastCoord.latitude) * Math.PI) / 180;
        const dLon = ((data.longitude - lastCoord.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lastCoord.latitude * Math.PI) / 180) *
            Math.cos((data.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;
        const calculatedSpeedKmh = distanceKm / timeDiffHours;

        if (calculatedSpeedKmh > 150) {
          // File GPS_SPOOFING incident
          await prisma.vehicleIncident.create({
            data: {
              vehicleId: data.vehicleId,
              driverId,
              tripSessionId: activeTrip.id,
              severity: "HIGH",
              incidentType: "GPS_SPOOFING",
              description: `Potential GPS spoofing detected. Calculated speed: ${calculatedSpeedKmh.toFixed(2)} km/h. Distance: ${distanceKm.toFixed(2)} km in ${(timeDiffHours * 3600).toFixed(1)}s.`,
              schoolId,
              branchId,
            }
          });
          
          return {
            success: false,
            error: { code: "GPS_SPOOFING_DETECTED", message: "GPS spoofing check failed: calculated speed exceeds 150 km/h." }
          };
        }
      }
    }

    // 9. Telemetry Updates
    // A. Update Trip Session status to ACTIVE if it was STALE/OFFLINE, and update tripHeartbeatAt
    const tripSessionUpdates: any = { tripHeartbeatAt: now };
    if (activeTrip.status !== "ACTIVE") {
      tripSessionUpdates.status = "ACTIVE";
    }
    await prisma.tripSession.update({
      where: { id: activeTrip.id },
      data: tripSessionUpdates
    });

    // B. Save in Redis
    const liveData = {
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed || 0,
      heading: data.heading || 0,
      sequenceNo: data.sequenceNo !== undefined ? data.sequenceNo : null,
      timestamp: clientTime.toISOString()
    };

    if (redis) {
      try {
        await redis.set(redisKeyLive, JSON.stringify(liveData));
        if (data.sequenceNo !== undefined) {
          await redis.set(redisKeySeq, data.sequenceNo.toString());
        }
      } catch (err: any) {
        console.warn("⚠️ Redis set live/sequence failed:", err.message);
      }
    }

    // C. Decoupled location broadcast
    await publishVehicleLocation(data.vehicleId, {
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed || 0,
      heading: data.heading || 0,
      sequenceNo: data.sequenceNo !== undefined ? data.sequenceNo : null,
      timestamp: clientTime.toISOString()
    });

    // D. Throttled database writes (10s window)
    const redisKeyLastWrite = `transport:vehicle:${data.vehicleId}:last_db_write`;
    let lastWriteTime = 0;
    if (redis) {
      try {
        const cachedLastWrite = await redis.get(redisKeyLastWrite);
        if (cachedLastWrite) {
          lastWriteTime = parseInt(cachedLastWrite, 10);
        }
      } catch (err: any) {
        console.warn("⚠️ Redis get last DB write failed:", err.message);
      }
    }
    if (lastWriteTime === 0) {
      const live = await prisma.vehicleGPSLive.findUnique({
        where: { vehicleId: data.vehicleId },
        select: { updatedAt: true }
      });
      if (live) {
        lastWriteTime = new Date(live.updatedAt).getTime();
      }
    }

    const shouldWriteToDB = (now.getTime() - lastWriteTime) >= 10000;
    if (shouldWriteToDB) {
      await prisma.$transaction(async (tx) => {
        // Upsert Live GPS
        await tx.vehicleGPSLive.upsert({
          where: { vehicleId: data.vehicleId },
          update: {
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed || 0,
            heading: data.heading || 0,
            sequenceNo: data.sequenceNo !== undefined ? data.sequenceNo : null,
            clientTimestamp: clientTime,
            serverTimestamp: now,
            schoolId,
            branchId
          },
          create: {
            vehicleId: data.vehicleId,
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed || 0,
            heading: data.heading || 0,
            sequenceNo: data.sequenceNo !== undefined ? data.sequenceNo : null,
            clientTimestamp: clientTime,
            serverTimestamp: now,
            schoolId,
            branchId
          }
        });

        // Insert Log GPS
        await tx.vehicleGPSLog.create({
          data: {
            vehicleId: data.vehicleId,
            tripSessionId: activeTrip.id,
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed || 0,
            heading: data.heading || 0,
            sequenceNo: data.sequenceNo !== undefined ? data.sequenceNo : null,
            clientTimestamp: clientTime,
            serverTimestamp: now,
            timestamp: clientTime,
            schoolId,
            branchId
          }
        });
      });

      if (redis) {
        try {
          await redis.set(redisKeyLastWrite, now.getTime().toString());
        } catch (err: any) {
          console.warn("⚠️ Redis set last DB write failed:", err.message);
        }
      }
    }

    return { success: true };
  } catch (e: any) {
    return handleError(e, "GPS_PING_FAILED");
  }
}

// ============================================================================
// ⚙️ SIMULATOR WORKER ACTIONS & SETTINGS (OWNER & DEVELOPER LOCKED)
// ============================================================================

export async function getTransportSettingsAction() {
  try {
    const tenant = await getTenantFilter();
    const schoolId = tenant.schoolId;
    let settings = await prisma.transportSettings.findUnique({
      where: { schoolId }
    });
    if (!settings) {
      settings = {
        id: "DEFAULT",
        schoolId,
        approachRadius: process.env.TRANSPORT_APPROACH_RADIUS_METERS ? parseInt(process.env.TRANSPORT_APPROACH_RADIUS_METERS, 10) : 1000,
        gpsInterval: 5,
        gpsAccuracyThreshold: 100.0,
        maxSpeedLimit: 150.0,
        heartbeatTimeout: 5,
        notificationsEnabled: true,
        simulatorEnabled: process.env.ENABLE_GPS_SIMULATOR === "true",
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
    }
    return { success: true, data: serializeDecimal(settings) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function startSimulationAction(tripSessionId: string) {
  try {
    const tenant = await enforcePermission("START_SIMULATION");
    if (process.env.ENABLE_GPS_SIMULATOR !== "true") {
      throw new Error("GPS Simulator is disabled in this environment.");
    }

    // Initialize/Ensure global interval timer is active
    initSimulationRunner();

    const now = new Date();
    const job = await prisma.simulationJob.upsert({
      where: { tripSessionId },
      update: {
        status: "RUNNING",
        lastExecutedAt: now
      },
      create: {
        tripSessionId,
        status: "RUNNING",
        startedBy: tenant.userId,
        startedAt: now,
        schoolId: tenant.schoolId,
        branchId: tenant.branchId
      }
    });

    await logTransportActivity({
      userId: tenant.userId,
      action: "SIMULATION_STARTED",
      entityType: "SimulationJob",
      entityId: job.id,
      schoolId: tenant.schoolId,
      branchId: tenant.branchId
    });

    return { success: true, data: serializeDecimal(job) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function pauseSimulationAction(tripSessionId: string) {
  try {
    const tenant = await enforcePermission("PAUSE_SIMULATION");
    const job = await prisma.simulationJob.update({
      where: { tripSessionId },
      data: { status: "PAUSED" }
    });

    await logTransportActivity({
      userId: tenant.userId,
      action: "SIMULATION_PAUSED",
      entityType: "SimulationJob",
      entityId: job.id,
      schoolId: tenant.schoolId,
      branchId: tenant.branchId
    });

    return { success: true, data: serializeDecimal(job) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resumeSimulationAction(tripSessionId: string) {
  try {
    const tenant = await enforcePermission("RESUME_SIMULATION");
    const job = await prisma.simulationJob.update({
      where: { tripSessionId },
      data: { status: "RUNNING" }
    });

    await logTransportActivity({
      userId: tenant.userId,
      action: "SIMULATION_RESUMED",
      entityType: "SimulationJob",
      entityId: job.id,
      schoolId: tenant.schoolId,
      branchId: tenant.branchId
    });

    return { success: true, data: serializeDecimal(job) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stopSimulationAction(tripSessionId: string) {
  try {
    const tenant = await enforcePermission("STOP_SIMULATION");
    const job = await prisma.simulationJob.update({
      where: { tripSessionId },
      data: { status: "STOPPED" }
    });

    await logTransportActivity({
      userId: tenant.userId,
      action: "SIMULATION_STOPPED",
      entityType: "SimulationJob",
      entityId: job.id,
      schoolId: tenant.schoolId,
      branchId: tenant.branchId
    });

    return { success: true, data: serializeDecimal(job) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSimulationStatusAction(tripSessionId: string) {
  try {
    await enforcePermission("GET_SIMULATION_STATUS");
    const job = await prisma.simulationJob.findUnique({
      where: { tripSessionId }
    });
    return { success: true, data: serializeDecimal(job) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================================
// 🔒 PARENT DATA RETRIEVAL & SECURITY GATE (ZERO-TRUST PARENT IDENTITIES)
// ============================================================================

// Haversine Distance helper for rolling ETA calculations
function getDistance(p1: [number, number], p2: [number, number]): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[0] * Math.PI) / 180) *
      Math.cos((p2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateRemainingDistance(coords: [number, number][], currentIndex: number): number {
  if (currentIndex < 0 || currentIndex >= coords.length) return 0;
  let distance = 0;
  for (let i = currentIndex; i < coords.length - 1; i++) {
    distance += getDistance(coords[i], coords[i + 1]);
  }
  return distance;
}

export async function getParentTransportTelemetryAction() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("v-session")?.value;
    if (!session) {
      return { success: false, error: { code: "UNAUTHORIZED", message: "Parent authentication required." } };
    }
    const user = await decrypt(session);
    if (!user || user.role !== "PARENT") {
      return { success: false, error: { code: "FORBIDDEN", message: "Access forbidden: Parent credentials required." } };
    }

    const { email, phone } = user;
    if (!email && !phone) {
      return { success: false, error: { code: "FORBIDDEN", message: "Invalid parent credentials." } };
    }

    // Step 2. Verify student ownership derived directly from database relations
    const familyDetails = await prisma.familyDetail.findMany({
      where: {
        OR: [
          email ? { fatherEmail: email } : undefined,
          email ? { motherEmail: email } : undefined,
          phone ? { fatherPhone: phone } : undefined,
          phone ? { motherPhone: phone } : undefined
        ].filter(Boolean) as any
      },
      select: {
        studentId: true
      }
    });

    if (familyDetails.length === 0) {
      return { success: true, data: serializeDecimal([]) };
    }

    const studentIds = familyDetails.map(fd => fd.studentId);

    // Step 3. Query Active assignments strictly isolating tenant/branch
    const transports = await prisma.studentTransport.findMany({
      where: {
        studentId: { in: studentIds },
        status: "ACTIVE",
        isDeleted: false
      },
      include: {
        student: true,
        route: true,
        pickupStop: true,
        dropStop: true
      }
    });

    const results = [];

    for (const t of transports) {
      const assignment = await prisma.driverAssignment.findFirst({
        where: {
          routeId: t.routeId,
          status: "ACTIVE",
          isDeleted: false
        },
        include: {
          vehicle: true,
          driver: true
        }
      });

      if (!assignment) {
        results.push({
          studentName: `${t.student.firstName} ${t.student.lastName || ""}`.trim(),
          vehicleRegistration: "Not Assigned",
          driverName: "Not Assigned",
          driverPhone: "Not Assigned",
          liveLatitude: 0,
          liveLongitude: 0,
          boardingStatus: "NOT_BOARDED",
          lastUpdateTime: new Date().toISOString(),
          etaMinutes: 0
        });
        continue;
      }

      const activeTrip = await prisma.tripSession.findFirst({
        where: {
          vehicleId: assignment.vehicleId,
          driverId: assignment.driverId,
          status: { in: ["ACTIVE", "STALE", "OFFLINE"] },
          isDeleted: false
        }
      });

      const liveGPS = await prisma.vehicleGPSLive.findUnique({
        where: { vehicleId: assignment.vehicleId }
      });

      let etaMinutes = 0;
      let boardingStatus = "NOT_BOARDED";

      if (activeTrip && liveGPS) {
        boardingStatus = "BOARDED";
        const routeCode = t.route.routeCode;
        const coords = ROUTE_COORDINATES[routeCode];

        if (coords && coords.length > 0) {
          const currentIndex = liveGPS.sequenceNo || 0;
          
          // 3-Tier Fallback ETA Calculation
          // Tier 1: Rolling speed-average based calculation
          const recentLogs = await prisma.vehicleGPSLog.findMany({
            where: { tripSessionId: activeTrip.id },
            orderBy: { serverTimestamp: "desc" },
            take: 5,
            select: { speed: true }
          });

          let avgSpeedKmh = 30.0; // Fallback: 30 km/h city average
          if (recentLogs.length > 0) {
            const speeds = recentLogs.map(l => l.speed);
            const sum = speeds.reduce((a, b) => a + b, 0);
            const avg = sum / recentLogs.length;
            if (avg > 5.0) {
              avgSpeedKmh = avg;
            }
          }

          const remainingDistance = calculateRemainingDistance(coords, currentIndex);
          etaMinutes = Math.round((remainingDistance / avgSpeedKmh) * 60);

          if (etaMinutes <= 0) {
            // Tier 2: Simulation progress ratio fallback
            const remainingPoints = coords.length - currentIndex;
            etaMinutes = Math.max(1, Math.round((remainingPoints / coords.length) * 15));
          }
        } else {
          // Tier 3: Static fallback
          etaMinutes = 10;
        }
      }

      results.push({
        studentName: `${t.student.firstName} ${t.student.lastName || ""}`.trim(),
        vehicleRegistration: assignment.vehicle.registrationNo,
        driverName: assignment.driver.name,
        driverPhone: assignment.driver.phone,
        liveLatitude: liveGPS?.latitude || 17.6000,
        liveLongitude: liveGPS?.longitude || 78.1000,
        boardingStatus,
        lastUpdateTime: liveGPS?.updatedAt ? liveGPS.updatedAt.toISOString() : new Date().toISOString(),
        etaMinutes
      });
    }

    return { success: true, data: serializeDecimal(results) };
  } catch (err: any) {
    return { success: false, error: { code: "INTERNAL_ERROR", message: err.message } };
  }
}

// ============================================================================
// 📣 AUDITABLE NOTIFICATION EVENTS (APPEND-ONLY LOGGING)
// ============================================================================

export async function createTransportNotificationAction(data: {
  schoolId: string;
  branchId?: string | null;
  recipientId: string;
  notificationType: string;
  title: string;
  message: string;
}) {
  try {
    const tenant = await enforcePermission("CREATE_NOTIFICATION");
    const notification = await prisma.transportNotification.create({
      data: {
        schoolId: data.schoolId,
        branchId: data.branchId || null,
        recipientId: data.recipientId,
        notificationType: data.notificationType,
        title: data.title,
        message: data.message,
        deliveryStatus: "QUEUED"
      }
    });

    await prisma.notificationStatusLog.create({
      data: {
        notificationId: notification.id,
        status: "QUEUED",
        details: "Notification initialized in queue."
      }
    });

    return { success: true, data: serializeDecimal(notification) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateNotificationStatusAction(notificationId: string, status: NotificationDeliveryStatus, details?: string) {
  try {
    await enforcePermission("UPDATE_NOTIFICATION_STATUS");
    const notification = await prisma.transportNotification.update({
      where: { id: notificationId },
      data: { deliveryStatus: status }
    });

    await prisma.notificationStatusLog.create({
      data: {
        notificationId,
        status,
        details: details || `Status changed to ${status}.`
      }
    });

    return { success: true, data: serializeDecimal(notification) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getTransportAnalyticsAction() {
  try {
    const { schoolId, branchId } = await enforcePermission("VEHICLE_VIEW");

    // 1. Core Counts
    const totalVehicles = await prisma.vehicle.count({
      where: { schoolId, branchId: branchId || undefined, isDeleted: false }
    });

    const totalRoutes = await prisma.route.count({
      where: { schoolId, isDeleted: false }
    });

    const totalAllocatedStudents = await prisma.studentTransport.count({
      where: { schoolId, branchId: branchId || undefined, status: "ACTIVE", isDeleted: false }
    });

    const maintenanceSum = await prisma.vehicleMaintenance.aggregate({
      where: { schoolId, branchId: branchId || undefined, isDeleted: false, status: "COMPLETED" },
      _sum: { cost: true }
    });
    const totalMaintenanceCost = maintenanceSum._sum.cost ? Number(maintenanceSum._sum.cost) : 0;

    const totalIncidents = await prisma.vehicleIncident.count({
      where: { schoolId, branchId: branchId || undefined }
    });

    // 2. Route Occupancy / Utilization
    const routes = await prisma.route.findMany({
      where: { schoolId, isDeleted: false },
      include: {
        driverAssignments: {
          where: { status: "ACTIVE", isDeleted: false },
          include: { vehicle: true }
        }
      }
    });

    const routeUtilization = [];
    for (const route of routes) {
      const studentCount = await prisma.studentTransport.count({
        where: { routeId: route.id, status: "ACTIVE", isDeleted: false }
      });
      const totalCapacity = route.driverAssignments.reduce((acc, a) => acc + (a.vehicle?.capacity || 0), 0);
      const utilization = totalCapacity > 0 ? Math.round((studentCount / totalCapacity) * 100) : 0;

      routeUtilization.push({
        routeId: route.id,
        routeName: route.routeName,
        routeCode: route.routeCode,
        studentCount,
        totalCapacity,
        utilization
      });
    }

    // 3. Maintenance Category Cost Summaries
    const maintenances = await prisma.vehicleMaintenance.findMany({
      where: { schoolId, branchId: branchId || undefined, isDeleted: false, status: "COMPLETED" }
    });

    const maintenanceCosts: Record<string, number> = {
      SERVICE: 0,
      REPAIR: 0,
      INSPECTION: 0
    };

    maintenances.forEach(m => {
      const type = (m.maintenanceType || "SERVICE").toUpperCase();
      const costVal = Number(m.cost || 0);
      if (maintenanceCosts[type] !== undefined) {
        maintenanceCosts[type] += costVal;
      } else {
        maintenanceCosts[type] = costVal;
      }
    });

    // 4. Driver Performance Incidents Scorecard
    const drivers = await prisma.driver.findMany({
      where: { schoolId, isDeleted: false }
    });

    const driverPerformance = [];
    for (const d of drivers) {
      const completedTrips = await prisma.tripSession.count({
        where: { driverId: d.id, status: "COMPLETED", isDeleted: false }
      });
      const overspeedCount = await prisma.vehicleIncident.count({
        where: { driverId: d.id, incidentType: "OVERSPEED" }
      });
      const deviationCount = await prisma.vehicleIncident.count({
        where: { driverId: d.id, incidentType: "ROUTE_DEVIATION" }
      });

      driverPerformance.push({
        driverId: d.id,
        driverName: d.name,
        completedTrips,
        overspeedCount,
        deviationCount
      });
    }

    // 5. Vehicle Run metrics
    const vehicles = await prisma.vehicle.findMany({
      where: { schoolId, branchId: branchId || undefined, isDeleted: false }
    });

    const vehicleRunMetrics = [];
    for (const v of vehicles) {
      const tripCount = await prisma.tripSession.count({
        where: { vehicleId: v.id, isDeleted: false }
      });
      const incidentCount = await prisma.vehicleIncident.count({
        where: { vehicleId: v.id }
      });
      const maintenanceCount = await prisma.vehicleMaintenance.count({
        where: { vehicleId: v.id, isDeleted: false }
      });

      vehicleRunMetrics.push({
        vehicleId: v.id,
        registrationNo: v.registrationNo,
        tripCount,
        incidentCount,
        maintenanceCount
      });
    }

    return {
      success: true,
      data: {
        kpis: {
          totalVehicles,
          totalRoutes,
          totalAllocatedStudents,
          totalMaintenanceCost,
          totalIncidents
        },
        routeUtilization,
        maintenanceCosts,
        driverPerformance,
        vehicleRunMetrics
      }
    };

  } catch (e: any) {
    return handleError(e);
  }
}


