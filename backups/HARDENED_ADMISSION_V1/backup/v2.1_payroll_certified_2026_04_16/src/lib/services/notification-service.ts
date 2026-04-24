/**
 * PLUG-AND-PLAY NOTIFICATION ENGINE
 * 
 * This service provides a decoupled interface for all student/parent communications.
 * It supports a "Provider" architecture to allow swapping between Mock, Firebase,
 * and WhatsApp Business API without changing the business logic.
 */

export interface NotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: any;
}

export interface INotificationProvider {
  send(payload: NotificationPayload): Promise<boolean>;
}

/**
 * 1. Logger Provider (Mock)
 * Environment: Development / No API Key.
 * Logs messages to the console so staff can verify content.
 */
class LoggerNotificationProvider implements INotificationProvider {
  async send(payload: NotificationPayload): Promise<boolean> {
    console.log(`\n--- [NOTIFICATION MOCK] ---`);
    console.log(`TO: ${payload.to}`);
    console.log(`TITLE: ${payload.title}`);
    console.log(`BODY: ${payload.body}`);
    console.log(`---------------------------\n`);
    return true;
  }
}

/**
 * 2. Firebase Cloud Messaging Provider (Free Tier)
 * Environment: Ready for Browser Push Notifications.
 */
class FirebaseNotificationProvider implements INotificationProvider {
  async send(payload: NotificationPayload): Promise<boolean> {
    // TODO: Integrate Firebase Admin SDK
    console.log(`[FCM SERVICE] Sending push to token/topic associated with ${payload.to}`);
    return true;
  }
}

/**
 * 3. WhatsApp Business Provider (Premium)
 * Environment: Production (Pay-as-you-go).
 */
class WhatsAppBusinessProvider implements INotificationProvider {
  async send(payload: NotificationPayload): Promise<boolean> {
    // TODO: Integrate Meta Graph API / Interakt / WATI
    console.log(`[WHATSAPP SERVICE] Sending message to ${payload.to} via WhatsApp Business API`);
    return true;
  }
}

/**
 * Main Notification Service Entry Point
 */
export const NotificationService = {
  async sendReceiptNotification(to: string, receiptNo: string, amount: number) {
    // Simple logic to choose provider (can be moved to environment config)
    const provider = new LoggerNotificationProvider(); 
    
    return await provider.send({
      to,
      title: "Fee Payment Received",
      body: `Thank you! Your payment of ₹${amount.toLocaleString()} has been recorded. Receipt No: ${receiptNo}. This benefit will be applied to your final term.`,
      data: { receiptNo, amount }
    });
  },

  async sendOverdueReminder(to: string, termName: string, amount: number) {
    const provider = new LoggerNotificationProvider();
    return await provider.send({
      to,
      title: "Fee Reminder",
      body: `A reminder for ${termName} dues of ₹${amount.toLocaleString()}. Kindly settle at your earliest convenience.`,
    });
  }
};
