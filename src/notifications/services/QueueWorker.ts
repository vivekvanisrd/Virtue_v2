import { prismaBypass } from "@/lib/prisma";
import { DeliveryService } from "./DeliveryService";
import { EcpUserType } from "@prisma/client";

class EcpQueueWorker {
  /**
   * Evaluates unprocessed Outbox records (Transactional Outbox Pattern)
   * Can be ran on a server cron schedule or message listener.
   */
  async processOutboxBatch() {
    const db = prismaBypass as any;

    try {
      const unprocessed = await db.transactionalOutbox.findMany({
        where: { isProcessed: false },
        take: 50,
        orderBy: { createdAt: "asc" }
      });

      if (unprocessed.length === 0) return;

      console.log(`[ECP Outbox Worker] Processing batch of ${unprocessed.length} event(s)...`);

      for (const event of unprocessed) {
        try {
          const payload = event.payload as any;
          
          // Execute fallback dispatch
          await DeliveryService.dispatchWithFallback({
            recipientId: payload.recipientId,
            recipientType: payload.recipientType as EcpUserType,
            businessId: event.businessId,
            destinations: payload.destinations,
            subject: payload.subject,
            body: payload.body,
            payload: payload.metadata
          });

          // Mark processed
          await db.transactionalOutbox.update({
            where: { id: event.id },
            data: {
              isProcessed: true,
              processedAt: new Date()
            }
          });
        } catch (err: any) {
          console.error(`[ECP Outbox Worker] Failed to process event ${event.id}:`, err);
          await db.transactionalOutbox.update({
            where: { id: event.id },
            data: {
              retryCount: event.retryCount + 1,
              errorMessage: err.message || "Outbox processing error"
            }
          });
        }
      }
    } catch (err) {
      console.error("[ECP Outbox Worker] Batch fetch error:", err);
    }
  }
}

export const QueueWorker = new EcpQueueWorker();
