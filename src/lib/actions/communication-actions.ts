"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { NotificationService } from "@/lib/services/notification-service";
import { revalidatePath } from "next/cache";

/**
 * Fetch list of communication logs with tenancy checks (Sent Outbox logs).
 */
export async function getCommunicationLogsAction(filters?: { type?: string; recipient?: string; status?: string }) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, email } = identity;

    const logs = await prisma.communicationLog.findMany({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        sender: { contains: email || "unknown-sender" },
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.recipient ? { recipient: { contains: filters.recipient, mode: 'insensitive' } } : {}),
        ...(filters?.status ? { status: filters.status } : {})
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });

    return { success: true, data: JSON.parse(JSON.stringify(logs)) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send custom messages or emails with targeted groupings and internal-only toggling.
 */
export async function sendCustomEmailAction(data: { 
  targetGroup: "MANUAL" | "ALL_PARENTS" | "ALL_STAFF" | "ALL" | "STUDENT" | "STAFF";
  recipient: string; // Used if MANUAL
  subject: string; 
  body: string; 
  isInternalOnly: boolean; 
  parentId?: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, email: senderEmail, name: senderName } = identity;

    if (!data.subject || !data.body) {
      throw new Error("MISSING_FIELDS: Subject and Message Body are required.");
    }

    // Resolve targets
    const recipientEmails: string[] = [];

    if (data.targetGroup === "MANUAL" || data.targetGroup === "STUDENT" || data.targetGroup === "STAFF") {
      if (!data.recipient || !data.recipient.includes("@")) {
        throw new Error("INVALID_EMAIL: Please provide a valid recipient email address.");
      }
      recipientEmails.push(data.recipient.trim());
    } else {
      // 1. Fetch Staff if targeted
      if (data.targetGroup === "ALL_STAFF" || data.targetGroup === "ALL") {
        const staff = await prisma.staff.findMany({
          where: { schoolId, status: "Active" },
          select: { email: true }
        });
        staff.forEach(s => {
          if (s.email && s.email.includes("@")) recipientEmails.push(s.email.trim());
        });
      }

      // 2. Fetch Parents if targeted
      if (data.targetGroup === "ALL_PARENTS" || data.targetGroup === "ALL") {
        // Fetch student emails
        const students = await prisma.student.findMany({
          where: { schoolId, status: "Active" },
          select: { email: true }
        });
        students.forEach(s => {
          if (s.email && s.email.includes("@")) recipientEmails.push(s.email.trim());
        });

        // Fetch parent details
        const families = await prisma.familyDetail.findMany({
          where: { schoolId },
          select: { fatherEmail: true, motherEmail: true }
        });
        families.forEach(f => {
          if (f.fatherEmail && f.fatherEmail.includes("@")) recipientEmails.push(f.fatherEmail.trim());
          if (f.motherEmail && f.motherEmail.includes("@")) recipientEmails.push(f.motherEmail.trim());
        });
      }
    }

    // De-duplicate emails
    const uniqueEmails = Array.from(new Set(recipientEmails));

    if (uniqueEmails.length === 0) {
      throw new Error("NO_RECIPIENTS: No active contact email addresses were found for the selected target group.");
    }

    // Resolve sender description
    const senderDisplay = senderName ? `${senderName} (${senderEmail})` : (senderEmail || "internal@virtueschool.in");

    // Dispatch messages
    let successCount = 0;

    for (const email of uniqueEmails) {
      try {
        if (data.isInternalOnly) {
          // Internal communication: bypass SMTP completely and write directly to internal inbox logs
          await prisma.communicationLog.create({
            data: {
              schoolId,
              branchId: branchId || null,
              sender: senderDisplay,
              recipient: email,
              subject: data.subject,
              body: data.body,
              type: "CUSTOM",
              status: "SUCCESS",
              parentId: data.parentId || null
            }
          });
          successCount++;
        } else {
          // External communication: dispatch real email via Hostinger SMTP
          const success = await NotificationService.sendCustomEmail(
            email,
            data.subject,
            data.body,
            { schoolId, branchId: branchId || undefined, parentId: data.parentId, sender: senderDisplay }
          );
          if (success) successCount++;
        }
      } catch (err) {
        console.error(`Failed to send custom notification to ${email}:`, err);
      }
    }

    return { success: true, sentCount: successCount, totalTargeted: uniqueEmails.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Run automated dues calculation and dispatch reminders to all parents.
 */
export async function sendBulkRemindersAction(isInternalOnly: boolean) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, email: senderEmail, name: senderName } = identity;

    // Fetch all active students with financial records and collections
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        status: "Active"
      },
      include: {
        financial: true,
        family: true,
        collections: { where: { status: "Success" } }
      }
    });

    let sentCount = 0;
    const senderDisplay = senderName ? `${senderName} (${senderEmail})` : (senderEmail || "internal@virtueschool.in");

    for (const student of students) {
      if (!student.financial) continue;

      const annualNet = Number(student.financial.netTuition || student.financial.annualTuition || 0);
      const totalPaid = student.collections.reduce((sum, c) => sum + Number(c.amountPaid), 0);
      const outstanding = annualNet - totalPaid;

      // Trigger reminder if outstanding balance exceeds minimum threshold of ₹100
      if (outstanding > 100) {
        const recipientEmail = student.email || student.family?.fatherEmail || student.family?.motherEmail || "";
        if (recipientEmail && recipientEmail.includes("@")) {
          const title = "Fee Payment Overdue Reminder";
          const body = `Dear Parent,\n\nThis is a friendly reminder that there is an outstanding balance of ₹${outstanding.toLocaleString()} for the tuition fee of your child, ${student.firstName} ${student.lastName || ""}.\n\nKindly settle the dues at your earliest convenience.\n\nThank you,\nVirtue School Accounts Office`;

          if (isInternalOnly) {
            // Write internal inbox notice directly
            await prisma.communicationLog.create({
              data: {
                schoolId,
                branchId: student.branchId || null,
                sender: senderDisplay,
                recipient: recipientEmail,
                subject: title,
                body,
                type: "REMINDER",
                status: "SUCCESS"
              }
            });
            sentCount++;
          } else {
            // Send SMTP email via Hostinger
            const success = await NotificationService.sendOverdueReminder(
              recipientEmail.trim(),
              "Academic Year Tuition",
              outstanding,
              { schoolId, branchId: student.branchId || undefined }
            );
            if (success) sentCount++;
          }
        }
      }
    }

    return { success: true, sentCount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Check for recent internal notices targeted at the logged-in user.
 */
export async function checkNewInternalNoticesAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) return { success: false };
    const { schoolId, branchId, email } = identity;

    // Fetch the most recent internal notice sent to this user in the last 20 seconds, excluding self-sent
    const notice = await prisma.communicationLog.findFirst({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        recipient: email,
        sender: { not: { contains: email } },
        createdAt: { gte: new Date(Date.now() - 20 * 1000) }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, data: notice ? JSON.parse(JSON.stringify(notice)) : null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch received internal notices for the logged-in user's inbox.
 */
export async function getInboxLogsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, email } = identity;

    const logs = await prisma.communicationLog.findMany({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        recipient: email
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });

    return { success: true, data: JSON.parse(JSON.stringify(logs)) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Mark a received internal notice as read with timestamp.
 */
export async function markNoticeAsReadAction(logId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { email } = identity;

    // Fetch log and assert recipient matches
    const log = await prisma.communicationLog.findUnique({
      where: { id: logId }
    });

    if (!log) {
      throw new Error("NOTICE_NOT_FOUND");
    }

    if (log.recipient !== email) {
      throw new Error("UNAUTHORIZED_ACCESS: Recipient identity does not match this user.");
    }

    const updated = await prisma.communicationLog.update({
      where: { id: logId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    revalidatePath("/dashboard/communication");
    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

