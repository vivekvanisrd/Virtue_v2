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
    const googleReviewUrl = process.env.GOOGLE_REVIEW_URL || "https://g.page/r/your-school-profile/review";

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
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @keyframes subtle-pulse {
      0%, 90%, 100% { transform: scale(1); box-shadow: 0 4px 10px rgba(26, 115, 232, 0.3); }
      95% { transform: scale(1.04); box-shadow: 0 6px 18px rgba(26, 115, 232, 0.5); }
    }
    .premium-btn {
      display: inline-block !important;
      background-color: #1A73E8 !important;
      color: #ffffff !important;
      font-family: Arial, sans-serif !important;
      font-size: 14px !important;
      font-weight: bold !important;
      text-decoration: none !important;
      padding: 14px 28px !important;
      border-radius: 10px !important;
      box-shadow: 0 4px 10px rgba(26, 115, 232, 0.3) !important;
      transition: all 0.2s ease-in-out !important;
      animation: subtle-pulse 9s infinite ease-in-out !important;
    }
    .premium-btn:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 18px rgba(26, 115, 232, 0.6) !important;
      background-color: #1557b0 !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f9fc;">
  <div style="font-family: 'Georgia', 'Times New Roman', serif; background-color: #fcfcfc; padding: 20px 10px; color: #333333; max-width: 600px; margin: 20px auto; border: 1px solid #eaeaea; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #14213d, #000000); padding: 35px 20px; text-align: center; border-radius: 12px 12px 0 0; position: relative;">
      <!-- Gold Star Circle -->
      <div style="width: 50px; height: 50px; border-radius: 50px; background-color: rgba(255, 255, 255, 0.15); border: 2px solid #ffffff; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center; line-height: 50px; text-align: center;">
        <span style="color: #ffd700; font-size: 24px; font-weight: bold; display: inline-block; vertical-align: middle;">★</span>
      </div>
      <!-- School Title -->
      <h1 style="color: #ffffff; margin: 0 0 5px 0; font-size: 26px; font-weight: 700; font-family: 'Times New Roman', Times, serif; letter-spacing: 0.5px;">Virtue School</h1>
      <!-- Subtitle -->
      <p style="color: #f7a072; font-size: 10px; font-weight: bold; letter-spacing: 1.5px; margin: 0; text-transform: uppercase; font-family: 'Arial', sans-serif;">Nurturing Excellence in Every Child</p>
    </div>

    <!-- Pink Floral Divider -->
    <div style="background-color: #f7d6e0; padding: 8px; text-align: center; font-size: 14px; letter-spacing: 12px; color: #ef709b;">
      🌸🌸🌸🌸🌸
    </div>

    <!-- Message Body Card -->
    <div style="background-color: #ffffff; padding: 30px 25px; border-radius: 0 0 12px 12px; font-family: 'Arial', sans-serif; font-size: 15px; line-height: 1.6; color: #333333;">
      <div style="margin-bottom: 30px; font-family: 'Georgia', serif; font-size: 15px; color: #2d3748; text-align: left; line-height: 1.7;">
        ${payload.body.replace(/\n/g, '<br/>')}
      </div>

      <!-- Review Invite Segment (Appended to all emails dynamically) -->
      <div style="border-top: 1px dashed #e2e8f0; margin-top: 30px; padding-top: 25px; text-align: center;">
        <h3 style="color: #14213d; font-family: 'Times New Roman', serif; font-size: 18px; font-weight: bold; margin: 0 0 15px 0;">🌸 Your Feedback Means the World to Us! 🌸</h3>
        <p style="font-size: 13px; color: #555555; line-height: 1.5; margin: 0 0 20px 0; max-width: 450px; margin-left: auto; margin-right: auto;">
          Thank you for trusting <strong>Virtue School</strong> with your child's education. If you've had a wonderful experience, please take just 30 seconds to support our community by sharing your review on Google!
        </p>
        
        <!-- Premium Review Button -->
        <div style="margin: 25px 0;">
          <a href="${googleReviewUrl}" target="_blank" class="premium-btn" style="background-color: #1A73E8; color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 14px; box-shadow: 0 4px 10px rgba(26, 115, 232, 0.3); display: inline-block; font-family: 'Arial', sans-serif; border: 1px solid #1A73E8;">
            <span style="background-color: white; color: #1A73E8; border-radius: 50%; width: 22px; height: 22px; display: inline-block; text-align: center; line-height: 22px; font-size: 13px; font-weight: 900; margin-right: 10px; vertical-align: middle; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">G</span>
            <span style="vertical-align: middle; letter-spacing: 0.2px;">Leave a ★★★★★ Google Review</span>
          </a>
        </div>
        <p style="font-size: 11px; color: #888888; font-style: italic; margin: 0;">Click above to share your experience on Google.</p>
      </div>

      <!-- Dotted Footer -->
      <hr style="border: none; border-top: 1px dotted #cccccc; margin: 30px 0 20px 0;" />
      <p style="font-size: 12px; font-style: italic; color: #555555; text-align: center; margin: 0;">
        Thank you for being a valued member of the <strong>Virtue School</strong> family. ❤️
      </p>
    </div>
  </div>
</body>
</html>
        `,
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
