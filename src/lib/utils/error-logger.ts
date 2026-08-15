import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";

export type ErrorSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ErrorSource = "CLIENT" | "SERVER";
export type ErrorStatus = "UNRESOLVED" | "INVESTIGATING" | "RESOLVED" | "IGNORED";

export interface LogErrorParams {
  schoolId?: string | null;
  branchId?: string | null;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  source?: ErrorSource;
  errorName?: string;
  message: string;
  stack?: string | null;
  digest?: string | null;
  route?: string | null;
  component?: string | null;
  metadata?: Record<string, any> | null;
  severity?: ErrorSeverity;
}

/**
 * Sanitizes object payload to remove sensitive data like passwords, secret keys, or credit card info.
 */
function sanitizeMetadata(data: any): any {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(sanitizeMetadata);

  const sanitized: Record<string, any> = {};
  const SENSITIVE_KEYS = ["password", "secret", "token", "pin", "cvv", "key", "authorization", "auth"];

  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Sends email alert to administrative contact when a High or Critical error is recorded.
 */
async function sendAdminErrorEmail(errorRecord: any) {
  try {
    const host = process.env.SMTP_HOST || "smtp.hostinger.com";
    const port = Number(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER || "office@virtueschool.in";
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("⚠️ [ERROR_LOGGER] SMTP credentials not fully set. Skipping mail dispatch.");
      return false;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const adminEmail = process.env.ADMIN_ALERT_EMAIL || user;
    const severityBadge = errorRecord.severity === "CRITICAL" ? "🔴 CRITICAL" : "🟠 HIGH";
    const timestamp = new Date(errorRecord.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; borderRadius: 8px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: ${errorRecord.severity === "CRITICAL" ? "#991b1b" : "#c2410c"}; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">🚨 VIRTUE ERP SYSTEM ERROR ALERT</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px;">${severityBadge} ERROR REPORTED IN SYSTEM</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b; width: 30%;">Error ID:</td><td style="padding: 8px; font-family: monospace;">${errorRecord.id}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Source:</td><td style="padding: 8px;"><strong style="color: #0f172a;">${errorRecord.source}</strong></td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Route / Page:</td><td style="padding: 8px;">${errorRecord.route || "N/A"}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Component:</td><td style="padding: 8px;">${errorRecord.component || "N/A"}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">User:</td><td style="padding: 8px;">${errorRecord.userName || errorRecord.userId || "Anonymous"} (${errorRecord.userRole || "UNKNOWN"})</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">School / Branch:</td><td style="padding: 8px;">${errorRecord.schoolId || "N/A"} / ${errorRecord.branchId || "N/A"}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Time (IST):</td><td style="padding: 8px;">${timestamp}</td></tr>
          </table>

          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #ef4444; padding: 14px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Error Message</p>
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #991b1b; font-family: monospace;">${errorRecord.message}</p>
          </div>

          ${
            errorRecord.stack
              ? `
          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Stack Trace Snippet</p>
            <pre style="background-color: #0f172a; color: #38bdf8; padding: 14px; font-size: 12px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; font-family: monospace;">${errorRecord.stack.substring(0, 1000)}</pre>
          </div>
          `
              : ""
          }

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">This alert was automatically generated by Virtue ERP System Diagnostics.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "Virtue System Sentinels"}" <${user}>`,
      to: adminEmail,
      subject: `🚨 [${severityBadge}] System Error: ${errorRecord.message.substring(0, 60)}...`,
      html: htmlContent,
    });

    console.log(`✉️ [ERROR_LOGGER] Admin alert email successfully sent to ${adminEmail} for Error ID ${errorRecord.id}`);
    return true;
  } catch (mailErr) {
    console.error("❌ [ERROR_LOGGER] Failed to send admin error email:", mailErr);
    return false;
  }
}

/**
 * Commits a structured system crash or error report to the PostgreSQL database (`SystemErrorLog`).
 * Triggers an immediate SMTP email notification for HIGH / CRITICAL severity issues.
 */
export async function logSystemError(params: LogErrorParams) {
  try {
    const sanitizedMeta = sanitizeMetadata(params.metadata);
    const severity = params.severity || "HIGH";
    const source = params.source || "SERVER";

    const record = await prisma.systemErrorLog.create({
      data: {
        schoolId: params.schoolId || null,
        branchId: params.branchId || null,
        userId: params.userId || null,
        userName: params.userName || null,
        userRole: params.userRole || null,
        source,
        errorName: params.errorName || "Error",
        message: params.message,
        stack: params.stack || null,
        digest: params.digest || null,
        route: params.route || null,
        component: params.component || null,
        metadata: sanitizedMeta ? (sanitizedMeta as any) : undefined,
        severity,
        status: "UNRESOLVED",
        emailSent: false,
      },
    });

    console.error(`🚨 [SYSTEM_ERROR_LOGGED] ID: ${record.id} | Severity: ${severity} | Source: ${source} | Message: ${params.message}`);

    // If severity is HIGH or CRITICAL, send email notification asynchronously
    if (severity === "HIGH" || severity === "CRITICAL") {
      sendAdminErrorEmail(record).then((sent) => {
        if (sent) {
          prisma.systemErrorLog
            .update({
              where: { id: record.id },
              data: { emailSent: true },
            })
            .catch((e) => console.error("Failed to mark emailSent on SystemErrorLog:", e));
        }
      });
    }

    return record;
  } catch (loggingErr) {
    // Law: Logging failure must NEVER crash the parent operation
    console.error("💥 [FATAL_LOGGER_FAILURE] Could not record system error to database:", loggingErr);
    return null;
  }
}
