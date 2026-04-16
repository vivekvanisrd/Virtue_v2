import prisma from "../prisma";
import { EVENT_DEFINITIONS, EventName, SovereignEventSchema } from "./event-registry";
import { logPlatformActivity } from "../utils/audit-logger";

/**
 * 📡 SOVEREIGN EVENT HUB (v2.0 Hardened)
 * 
 * Central dispatcher for the 'EVENT → ACTION → LOG' architecture.
 * Implements Laws 3, 4, 8, 14 & 15.
 */

export type EventHandler = (payload: any, context: { schoolId: string; eventId: string }) => Promise<void>;

const HANDLERS_REGISTRY: Record<string, EventHandler[]> = {};

export class SovereignEventHub {
    /**
     * Registers a unique single-purpose handler for an event type (Law 9)
     */
    static registerHandler(name: EventName, handler: EventHandler) {
        if (!HANDLERS_REGISTRY[name]) {
            HANDLERS_REGISTRY[name] = [];
        }
        HANDLERS_REGISTRY[name].push(handler);
    }

    /**
     * 🛰️ PRIMARY DISPATCHER (Law 1, 2, 3, 4, 8)
     */
    static async trigger(params: {
        name: EventName;
        schoolId: string;
        entityId: string;
        payload: any;
        triggeredBy: string;
    }) {
        const startTime = Date.now();
        console.log(`📡 [EVENT_HUB] Triggering ${params.name} for ${params.entityId}...`);

        // 1. Validate Payload (Law 2)
        const validator = EVENT_DEFINITIONS[params.name];
        if (!validator) {
            throw new Error(`CRITICAL: Event '${params.name}' is not defined in the Sovereign Registry.`);
        }

        const validatedPayload = validator.parse(params.payload);

        // 2. Persistence & Idempotency Check (Law 3, 4, 6)
        // We persist BEFORE execution to ensure we have a dead-letter record if it fails.
        const eventRecord = await (prisma as any).sovereignEvent.create({
            data: {
                schoolId: params.schoolId,
                name: params.name,
                entityId: params.entityId,
                payload: validatedPayload,
                triggeredBy: params.triggeredBy,
                status: 'PENDING'
            }
        });

        const handlers = HANDLERS_REGISTRY[params.name] || [];
        
        // 3. Sequential Execution (Law 5 - Simplified for V1)
        for (const handler of handlers) {
            try {
                await (prisma as any).sovereignEvent.update({
                    where: { id: eventRecord.id },
                    data: { status: 'PROCESSING' }
                });

                await handler(validatedPayload, { schoolId: params.schoolId, eventId: eventRecord.id });

            } catch (error: any) {
                console.error(`❌ [EVENT_HUB] Handler failed for ${params.name}:`, error.message);
                
                await (prisma as any).sovereignEvent.update({
                    where: { id: eventRecord.id },
                    data: { 
                        status: 'FAILED',
                        lastError: error.message,
                        retryCount: eventRecord.retryCount + 1
                    }
                });

                // Rule 4 Compliance: Stop execution on critical handler failure
                throw error; 
            }
        }

        // 4. Finalization & Forensic Logging (Law 6, 10)
        const executionTime = Date.now() - startTime;

        await (prisma as any).sovereignEvent.update({
            where: { id: eventRecord.id },
            data: { 
                status: 'COMPLETED',
                processedAt: new Date()
            }
        });

        await logPlatformActivity({
            schoolId: params.schoolId,
            userId: params.triggeredBy,
            entityType: 'EVENT',
            entityId: eventRecord.id,
            action: `EVENT_PROCESSED:${params.name}`,
            details: `Processed in ${executionTime}ms. Handlers: ${handlers.length}`,
            payload: {
                eventName: params.name,
                executionTimeMs: executionTime,
                status: 'SUCCESS'
            }
        });

        return { success: true, eventId: eventRecord.id };
    }
}
