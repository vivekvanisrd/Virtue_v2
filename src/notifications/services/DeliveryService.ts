import { EcpChannelType, EcpDeliveryStatus, EcpUserType } from "@prisma/client";
import { NotificationService } from "./NotificationService";

class EcpDeliveryService {
  /**
   * Implements ECP Delivery Rules Engine (Fallback routing loop)
   * Example: PUSH -> If fails/offline -> WHATSAPP -> SMS -> EMAIL
   */
  async dispatchWithFallback(params: {
    recipientId: string;
    recipientType: EcpUserType;
    businessId: string;
    destinations: Partial<Record<EcpChannelType, string>>;
    subject?: string;
    body: string;
    payload?: any;
    fallbackChain?: EcpChannelType[];
  }) {
    const chain = params.fallbackChain || [
      EcpChannelType.PUSH,
      EcpChannelType.WHATSAPP,
      EcpChannelType.SMS,
      EcpChannelType.EMAIL
    ];

    console.log(`[ECP] Starting fallback routing loop for recipient: ${params.recipientId}`);

    for (const channel of chain) {
      const destination = params.destinations[channel];
      if (!destination) {
        console.log(`[ECP] Channel ${channel} skipped (no target destination address provided).`);
        continue;
      }

      console.log(`[ECP] Attempting delivery via channel: ${channel}`);
      const res = await NotificationService.dispatchMessage({
        recipientId: params.recipientId,
        recipientType: params.recipientType,
        businessId: params.businessId,
        channel,
        destination,
        subject: params.subject,
        body: params.body,
        payload: params.payload
      });

      if (res.success) {
        console.log(`[ECP] Delivery successful on channel: ${channel}. Halting fallback loop.`);
        return { success: true, channel, deliveryId: res.deliveryId };
      }

      console.warn(`[ECP] Delivery failed on channel: ${channel}. Routing to next fallback.`);
    }

    return { success: false, error: "ALL_CHANNELS_FAILED" };
  }
}

export const DeliveryService = new EcpDeliveryService();
