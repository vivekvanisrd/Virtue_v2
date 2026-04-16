import { z } from "zod";

/**
 * 🏛️ SOVEREIGN EVENT REGISTRY (v1.0)
 * 
 * Enforces strict governance and standardization across the platform.
 * Laws 1, 2, 8, & 12 Compliance.
 */

export const SovereignEventSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string(),
    version: z.number().int().default(1),
    schoolId: z.string(),
    entityId: z.string(),
    payload: z.record(z.string(), z.any()),
    triggeredBy: z.string(),
});

export type SovereignEventInput = z.infer<typeof SovereignEventSchema>;

/**
 * 🎓 ADMISSION EVENTS
 */
export const StudentAdmittedPayloadV1 = z.object({
    studentId: z.string(),
    classId: z.string().optional(),
    branchId: z.string(),
    academicYearId: z.string(),
    isProvisional: z.boolean(),
});

export type StudentAdmittedPayloadV1 = z.infer<typeof StudentAdmittedPayloadV1>;

/**
 * 💰 FINANCIAL EVENTS
 */
export const FeeAssignedPayloadV1 = z.object({
    studentId: z.string(),
    structureId: z.string(),
    totalAmount: z.number(),
});

export type FeeAssignedPayloadV1 = z.infer<typeof FeeAssignedPayloadV1>;

/**
 * 📋 EVENT TYPE MAP
 */
export const EVENT_DEFINITIONS = {
    'STUDENT.ADMITTED.v1': StudentAdmittedPayloadV1,
    'FEE.ASSIGNED.v1': FeeAssignedPayloadV1,
} as const;

export type EventName = keyof typeof EVENT_DEFINITIONS;
