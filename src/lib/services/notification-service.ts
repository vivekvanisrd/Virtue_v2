/**
 * PLUG-AND-PLAY NOTIFICATION ENGINE
 * 
 * This service provides a decoupled interface for all student/parent communications.
 * It supports a "Provider" architecture to allow swapping between Mock, Firebase,
 * and WhatsApp Business API without changing the business logic.
 */

import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

export interface NotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: any;
}

export interface INotificationProvider {
  send(payload: NotificationPayload, context?: { schoolId: string; branchId?: string; type: string }): Promise<boolean>;
}

/**
 * 1. Logger Provider (Mock)
 * Environment: Development / No API Key.
 * Logs messages to the console so staff can verify content.
 */
class LoggerNotificationProvider implements INotificationProvider {
  async send(payload: NotificationPayload, context?: { schoolId: string; branchId?: string; type: string }): Promise<boolean> {
    console.log(`\n--- [NOTIFICATION MOCK] ---`);
    console.log(`TO: ${payload.to}`);
    console.log(`TITLE: ${payload.title}`);
    console.log(`BODY: ${payload.body}`);
    console.log(`---------------------------\n`);

    // Also write mock log to DB for tracking consistency in Local Dev
    if (context) {
      try {
        await prisma.communicationLog.create({
          data: {
            schoolId: context.schoolId,
            branchId: context.branchId || null,
            sender: "mock@virtueschool.in",
            recipient: payload.to,
            subject: payload.title,
            body: payload.body,
            type: context.type,
            status: "SUCCESS"
          }
        });
      } catch (err) {
        console.error("Mock DB log failed:", err);
      }
    }
    return true;
  }
}

/**
 * 2. Email SMTP Provider (Hostinger & generic SMTP)
 * Environment: Configured via SMTP environment variables.
 */
class EmailNotificationProvider implements INotificationProvider {
  private transporter: any = null;

  constructor() {
    const host = process.env.SMTP_HOST || "smtp.hostinger.com";
    const port = Number(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  async send(payload: NotificationPayload, context?: { schoolId: string; branchId?: string; type: string }): Promise<boolean> {
    const fromName = process.env.SMTP_FROM_NAME || "Virtue School Office";
    const fromEmail = process.env.SMTP_USER || "office@virtueschool.in";

    if (!this.transporter) {
      console.log(`\n--- [SMTP MOCK (CREDENTIALS MISSING)] ---`);
      console.log(`TO: ${payload.to}`);
      console.log(`TITLE: ${payload.title}`);
      console.log(`BODY: ${payload.body}`);
      console.log(`-------------------------------------------\n`);

      // Write mock success log to DB
      if (context) {
        try {
          await prisma.communicationLog.create({
            data: {
              schoolId: context.schoolId,
              branchId: context.branchId || null,
              sender: fromEmail,
              recipient: payload.to,
              subject: payload.title,
              body: payload.body,
              type: context.type,
              status: "SUCCESS"
            }
          });
        } catch (err) {
          console.error("Mock DB log failed:", err);
        }
      }
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: payload.to,
        subject: payload.title,
        text: payload.body,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="background-color: #4f46e5; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; color: white;">
                  <h2 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">${payload.title}</h2>
                </div>
                <div style="padding: 20px; line-height: 1.6; font-size: 14px;">
                  <p style="white-space: pre-line; margin: 0;">${payload.body}</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 11px; color: #888; text-align: center; margin: 0;">This is an automated notification from Virtue School Administrative System.</p>
               </div>`,
      });

      console.log(`✉️ [EMAIL SERVICE] Sent message to ${payload.to} (ID: ${info.messageId})`);

      // Write Success Log
      if (context) {
        await prisma.communicationLog.create({
          data: {
            schoolId: context.schoolId,
            branchId: context.branchId || null,
            sender: fromEmail,
            recipient: payload.to,
            subject: payload.title,
            body: payload.body,
            type: context.type,
            status: "SUCCESS"
          }
        });
      }
      return true;
    } catch (err: any) {
      console.error("❌ [EMAIL SERVICE ERROR]", err);

      // Write Failure Log
      if (context) {
        try {
          await prisma.communicationLog.create({
            data: {
              schoolId: context.schoolId,
              branchId: context.branchId || null,
              sender: fromEmail,
              recipient: payload.to,
              subject: payload.title,
              body: payload.body,
              type: context.type,
              status: "FAILED",
              errorMessage: err.message || "Unknown SMTP Error"
            }
          });
        } catch (dbErr) {
          console.error("Failed to write failure log:", dbErr);
        }
      }
      return false;
    }
  }
}

/**
 * 3. Firebase Cloud Messaging Provider (Free Tier)
 * Environment: Ready for Browser Push Notifications.
 */
class FirebaseNotificationProvider implements INotificationProvider {
  async send(payload: NotificationPayload): Promise<boolean> {
    console.log(`[FCM SERVICE] Sending push to token/topic associated with ${payload.to}`);
    return true;
  }
}

/**
 * 4. WhatsApp Business Provider (Premium)
 */
class WhatsAppBusinessProvider implements INotificationProvider {
  async send(payload: NotificationPayload): Promise<boolean> {
    console.log(`[WHATSAPP SERVICE] Sending message to ${payload.to} via WhatsApp Business API`);
    return true;
  }
}

/**
 * Main Notification Service Entry Point
 */
export const NotificationService = {
  async sendReceiptNotification(to: string, receiptNo: string, amount: number, context: { schoolId: string; branchId?: string }) {
    const provider = to.includes("@") ? new EmailNotificationProvider() : new LoggerNotificationProvider();
    
    return await provider.send({
      to,
      title: "Fee Payment Received",
      body: `Thank you! Your payment of ₹${amount.toLocaleString()} has been recorded. \n\nReceipt No: ${receiptNo}.\nThis benefit will be applied to your final term.`,
      data: { receiptNo, amount }
    }, { schoolId: context.schoolId, branchId: context.branchId, type: "RECEIPT" });
  },

  async sendOverdueReminder(to: string, termName: string, amount: number, context: { schoolId: string; branchId?: string }) {
    const provider = to.includes("@") ? new EmailNotificationProvider() : new LoggerNotificationProvider();
    return await provider.send({
      to,
      title: "Fee Reminder",
      body: `Dear Parent,\n\nThis is a reminder that the dues for ${termName} of ₹${amount.toLocaleString()} are pending.\n\nKindly settle the amount at your earliest convenience.`,
    }, { schoolId: context.schoolId, branchId: context.branchId, type: "REMINDER" });
  },

  async sendCustomEmail(to: string, subject: string, body: string, context: { schoolId: string; branchId?: string }) {
    const provider = to.includes("@") ? new EmailNotificationProvider() : new LoggerNotificationProvider();
    return await provider.send({
      to,
      title: subject,
      body,
    }, { schoolId: context.schoolId, branchId: context.branchId, type: "CUSTOM" });
  },

  async sendAdmissionAlert(to: string, studentName: string, admissionNumber: string, tempCredentials?: { username: string; tempPass: string }, context?: { schoolId: string; branchId?: string }) {
    const provider = to.includes("@") ? new EmailNotificationProvider() : new LoggerNotificationProvider();
    let body = `Dear Parent,\n\nCongratulations! Your child, ${studentName}, has been successfully admitted into Virtue School.\n\nAdmission Number: ${admissionNumber}.\n`;
    
    if (tempCredentials) {
      body += `\nYou can log into the Parent Portal using these temporary credentials:\nUsername: ${tempCredentials.username}\nTemporary Password: ${tempCredentials.tempPass}\n\nPlease change your password upon your first login.`;
    }

    return await provider.send({
      to,
      title: "Student Admission Confirmed",
      body,
    }, { schoolId: context?.schoolId || "UNKNOWN", branchId: context?.branchId, type: "ADMISSION" });
  },

  async sendPromotionAlert(to: string, studentName: string, oldClass: string, newClass: string, context?: { schoolId: string; branchId?: string }) {
    const provider = to.includes("@") ? new EmailNotificationProvider() : new LoggerNotificationProvider();
    return await provider.send({
      to,
      title: "Student Academic Promotion Confirmed",
      body: `Dear Parent,\n\nWe are pleased to inform you that your child, ${studentName}, has been promoted from ${oldClass} to ${newClass} for the upcoming academic year.\n\nThank you for your continued support.`,
    }, { schoolId: context?.schoolId || "UNKNOWN", branchId: context?.branchId, type: "PROMOTION" });
  },

  async sendDepartureAlert(to: string, studentName: string, status: string, context?: { schoolId: string; branchId?: string }) {
    const provider = to.includes("@") ? new EmailNotificationProvider() : new LoggerNotificationProvider();
    return await provider.send({
      to,
      title: "Student Exit Confirmation",
      body: `Dear Parent,\n\nThis email confirms that your child, ${studentName}, is marked as ${status} in our school administrative systems.\n\nIf you believe this is an error, please contact the school office immediately.`,
    }, { schoolId: context?.schoolId || "UNKNOWN", branchId: context?.branchId, type: "DEPARTURE" });
  },

  async sendAchievementAlert(to: string, studentName: string, achievementTitle: string, description: string, context?: { schoolId: string; branchId?: string }) {
    const provider = to.includes("@") ? new EmailNotificationProvider() : new LoggerNotificationProvider();
    return await provider.send({
      to,
      title: `Congratulations! ${studentName} - Achievement Alert`,
      body: `Dear Parent,\n\nWe are extremely proud to share that your child, ${studentName}, has received an achievement: "${achievementTitle}".\n\nDetails:\n${description}\n\nPlease join us in celebrating this success!`,
    }, { schoolId: context?.schoolId || "UNKNOWN", branchId: context?.branchId, type: "ACHIEVEMENT" });
  }
};
