import { SovereignEventHub } from "../event-hub";
import { StudentAdmittedPayloadV1 } from "../event-registry";
import { alignStudentToClassTemplate } from "../../actions/fee-actions";
import { logPlatformActivity } from "../../utils/audit-logger";
import prisma from "../../prisma";

/**
 * 🎓 ADMISSION HANDLERS (v1.0)
 * 
 * Logic that reacts to the 'STUDENT.ADMITTED.v1' event.
 * Implements Law 9 (Modularity) & Strategic Advice (Flow).
 */

export function initAdmissionHandlers() {
    console.log("🎓 [EVENT_HUB] Initializing Admission Handlers...");

    /**
     * HANDLER: Automated Fee Assignment (Strategic Bridge)
     * Requirement: Admission → Fee Structure assignment.
     */
    SovereignEventHub.registerHandler('STUDENT.ADMITTED.v1', async (payload: StudentAdmittedPayloadV1, { schoolId, eventId }) => {
        console.log(`💰 [HANDLER] Bridging Student ${payload.studentId} to Finance Ledger...`);

        if (!payload.classId) {
            console.log("⚠️ [HANDLER] No classId provided. Skipping automatic fee assignment.");
            return;
        }

        // 1. Fetch Class-to-Template mapping
        // Logic: Find the FeeStructure that belongs to this class and academic year.
        const structure = await prisma.feeStructure.findFirst({
            where: {
                schoolId: schoolId,
                classId: payload.classId,
                academicYearId: payload.academicYearId
            },
            select: { id: true }
        });

        if (!structure) {
            console.warn(`🛑 [HANDLER] No Fee Structure found for School: ${schoolId}, Class: ${payload.classId}, Year: ${payload.academicYearId}`);
            return;
        }

        // 2. Align Student to Template (Strategic Advice: Finish Fee + Admission first)
        const result = await alignStudentToClassTemplate(payload.studentId, structure.id);
        
        if (!result.success) {
            throw new Error(`FINANCIAL_BRIDGE_FAILURE: ${result.error}`);
        }

        console.log(`✅ [HANDLER] Student ${payload.studentId} successfully bridged to Fee Structure ${structure.id}.`);
    });

    /**
     * HANDLER: Forensic Audit Trail (Law 6)
     */
    SovereignEventHub.registerHandler('STUDENT.ADMITTED.v1', async (payload, { schoolId, eventId }) => {
        await logPlatformActivity({
            schoolId,
            userId: "SYSTEM_HUB",
            entityType: 'STUDENT',
            entityId: payload.studentId,
            action: 'ADMISSION_FINALIZED',
            details: `Event ${eventId} successfully initialized institutional state.`,
            payload: { ...payload }
        });
    });
}
