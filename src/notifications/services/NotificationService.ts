import { prismaBypass } from "@/lib/prisma";
import { EcpChannelType, EcpDeliveryStatus } from "@prisma/client";
import { ChannelProvider } from "../providers/ChannelProvider";
import { PushProvider } from "../providers/PushProvider";
import { EmailProvider } from "../providers/EmailProvider";
import { SMSProvider } from "../providers/SMSProvider";
import { WhatsAppProvider } from "../providers/WhatsAppProvider";
import { MessagePayload } from "../types";

class EcpNotificationService {
  private providers: Map<EcpChannelType, ChannelProvider> = new Map();

  constructor() {
    this.registerProvider(new PushProvider());
    this.registerProvider(new EmailProvider());
    this.registerProvider(new SMSProvider());
    this.registerProvider(new WhatsAppProvider());
  }

  registerProvider(provider: ChannelProvider) {
    this.providers.set(provider.getChannelType(), provider);
  }

  async dispatchMessage(params: {
    recipientId: string;
    recipientType: any;
    businessId: string;
    channel: EcpChannelType;
    destination: string;
    subject?: string;
    body: string;
    payload?: any;
  }) {
    const { recipientId, recipientType, businessId, channel, destination, subject, body, payload } = params;
    const db = prismaBypass as any;

    try {
      // 1. Check user notifications preferences
      const preference = await db.userCommunicationPreference.findUnique({
        where: {
          businessId_userId_userType_category_channel: {
            businessId,
            userId: recipientId,
            userType: recipientType,
            category: "GENERAL",
            channel
          }
        }
      });

      if (preference && !preference.isEnabled) {
        console.log(`[ECP] Message delivery to ${recipientId} via ${channel} skipped due to opt-out preference.`);
        return { success: false, reason: "OPT_OUT" };
      }
    } catch (err) {
      console.warn("Preferences table check bypassed (syncing schema pending migration):", err);
    }

    try {
      // 2. Log outbound message intent
      const message = await db.outboundMessage.create({
        data: {
          businessId,
          subject,
          body,
          payload: payload || {},
          idempotencyKey: `msg_${recipientId}_${channel}_${Date.now()}_${Math.random().toString(36).substring(4)}`
        }
      });

      // 3. Log polymorphic recipient mapping
      const recipient = await db.outboundMessageRecipient.create({
        data: {
          messageId: message.id,
          recipientId,
          recipientType,
          email: channel === EcpChannelType.EMAIL ? destination : null,
          phone: channel !== EcpChannelType.EMAIL ? destination : null
        }
      });

      // 4. Log delivery attempt structure
      const delivery = await db.outboundMessageDelivery.create({
        data: {
          recipientId: recipient.id,
          channel,
          provider: this.providers.get(channel)?.getProviderName() || "UNKNOWN",
          destination,
          deliveryStatus: EcpDeliveryStatus.QUEUED
        }
      });

      // 5. Dispatch via Channel Provider
      const provider = this.providers.get(channel);
      if (!provider) {
        await db.outboundMessageDelivery.update({
          where: { id: delivery.id },
          data: {
            deliveryStatus: EcpDeliveryStatus.FAILED,
            failureReason: `No provider adapter registered for channel: ${channel}`
          }
        });
        return { success: false, error: "PROVIDER_MISSING" };
      }

      await db.outboundMessageDelivery.update({
        where: { id: delivery.id },
        data: { deliveryStatus: EcpDeliveryStatus.PENDING }
      });

      const res = await provider.send({
        recipientId,
        destination,
        subject,
        body,
        metadata: payload
      });

      await db.outboundMessageDelivery.update({
        where: { id: delivery.id },
        data: {
          deliveryStatus: res.success ? EcpDeliveryStatus.SENT : EcpDeliveryStatus.FAILED,
          providerResponse: res.providerResponse || {},
          failureReason: res.errorMessage || null,
          sentAt: res.success ? new Date() : null
        }
      });

      return { success: res.success, deliveryId: delivery.id };
    } catch (err: any) {
      console.error("ECP Dispatch Exception:", err);
      return { success: false, error: err.message };
    }
  }
}

export const NotificationService = new EcpNotificationService();
