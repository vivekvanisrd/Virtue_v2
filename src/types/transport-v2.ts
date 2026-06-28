import { z } from "zod";

// ==========================================
// TypeScript Enums
// ==========================================

export enum TripStatus {
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum DriverStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum IncidentSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum NotificationType {
  APPROACHING_STOP = "APPROACHING_STOP",
  BOARDED = "BOARDED",
  DROPPED = "DROPPED",
  DELAYED = "DELAYED",
  INCIDENT = "INCIDENT",
}

export enum VehicleStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
}

// ==========================================
// Zod Validation Schemas
// ==========================================

export const routeSchema = z.object({
  routeName: z.string().min(2, "Route name must be at least 2 characters"),
  routeCode: z.string().min(2, "Route code must be at least 2 characters"),
});

export const stopSchema = z.object({
  routeId: z.string().uuid("Invalid route ID"),
  stopName: z.string().min(2, "Stop name must be at least 2 characters"),
  pickupTime: z.string().optional().nullable(),
  dropTime: z.string().optional().nullable(),
  monthlyFee: z.number().positive("Monthly fee must be positive"),
});

export const vehicleSchema = z.object({
  registrationNo: z.string().min(5, "Registration number must be at least 5 characters"),
  model: z.string().optional().nullable(),
  capacity: z.number().int().positive("Capacity must be a positive integer"),
  routeId: z.string().uuid("Invalid route ID"),
  onboardingStatus: z.nativeEnum(VehicleStatus).default(VehicleStatus.ACTIVE),
  documents: z.record(z.string(), z.string()).optional().nullable(),
});

export const driverSchema = z.object({
  name: z.string().min(2, "Driver name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  licenseNo: z.string().min(5, "License number must be at least 5 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  status: z.nativeEnum(DriverStatus).default(DriverStatus.ACTIVE),
  documents: z.record(z.string(), z.string()).optional().nullable(),
});

export const driverAssignmentSchema = z.object({
  driverId: z.string().uuid("Invalid driver ID"),
  vehicleId: z.string().uuid("Invalid vehicle ID"),
  routeId: z.string().uuid("Invalid route ID"),
  status: z.string().default("Active"),
});

export const studentTransportSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  routeId: z.string().uuid("Invalid route ID"),
  pickupStopId: z.string().uuid("Invalid pickup stop ID"),
  dropStopId: z.string().uuid("Invalid drop stop ID"),
  monthlyFee: z.number().positive("Monthly fee must be positive"),
  status: z.string().default("Active"),
});

export const tripSessionSchema = z.object({
  routeId: z.string().uuid("Invalid route ID"),
  vehicleId: z.string().uuid("Invalid vehicle ID"),
  driverId: z.string().uuid("Invalid driver ID"),
  tripType: z.enum(["PICKUP", "DROP"]),
  status: z.nativeEnum(TripStatus).default(TripStatus.SCHEDULED),
});

export const incidentSchema = z.object({
  vehicleId: z.string().uuid("Invalid vehicle ID"),
  driverId: z.string().uuid("Invalid driver ID").optional().nullable(),
  tripSessionId: z.string().uuid("Invalid trip session ID").optional().nullable(),
  severity: z.nativeEnum(IncidentSeverity),
  description: z.string().min(5, "Description must be at least 5 characters"),
  status: z.string().default("PENDING"),
});

export const maintenanceSchema = z.object({
  vehicleId: z.string().uuid("Invalid vehicle ID"),
  maintenanceType: z.enum(["SERVICE", "REPAIR", "INSPECTION"]),
  cost: z.number().positive("Cost must be positive"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  performedAt: z.string().or(z.date()),
  nextDueDate: z.string().or(z.date()).optional().nullable(),
  status: z.string().default("COMPLETED"),
});
