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
    const { schoolId, branchId, email, staffId } = identity;

    const logs = await prisma.communicationLog.findMany({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        OR: [
          { authorEmail: email || "unknown-sender" },
          ...(staffId ? [{ authorId: staffId }] : []),
          {
            authorEmail: null,
            authorId: null,
            sender: { contains: email || "unknown-sender" }
          }
        ],
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
  targetGroup: string;
  recipient: string; // Used if MANUAL
  subject: string; 
  body: string; 
  isInternalOnly: boolean; 
  parentId?: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, email: senderEmail, name: senderName, staffId } = identity;

    if (!data.subject || !data.body) {
      throw new Error("MISSING_FIELDS: Subject and Message Body are required.");
    }

    // Resolve targets
    const recipients: { email: string; staffId?: string; name?: string | null }[] = [];

    if (data.targetGroup === "MANUAL" || data.targetGroup === "STUDENT" || data.targetGroup === "STAFF") {
      const targetEmails = data.recipient.split(",").map(e => e.trim()).filter(e => e.includes("@"));
      if (targetEmails.length === 0) {
        throw new Error("INVALID_EMAIL: Please provide at least one valid recipient email address.");
      }
      for (const targetEmail of targetEmails) {
        const matchedStaff = await prisma.staff.findFirst({
          where: { schoolId, email: targetEmail },
          select: { id: true, firstName: true, lastName: true }
        });
        const staffName = matchedStaff ? `${matchedStaff.firstName} ${matchedStaff.lastName || ""}`.trim() : null;
        recipients.push({ email: targetEmail, staffId: matchedStaff?.id, name: staffName });
      }
    } else if (data.targetGroup.startsWith("CLASS_TEACHER_")) {
      const targetClassId = data.targetGroup.replace("CLASS_TEACHER_", "");
      const staff = await prisma.staff.findMany({
        where: { 
          schoolId, 
          status: "ACTIVE",
          assignedClassId: targetClassId,
          ...(branchId ? { branchId } : {})
        },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
      staff.forEach(s => {
        if (s.email && s.email.includes("@")) {
          recipients.push({ 
            email: s.email.trim(), 
            staffId: s.id, 
            name: `${s.firstName} ${s.lastName || ""}`.trim() 
          });
        }
      });
    } else if (data.targetGroup === "TEACHERS") {
      const staff = await prisma.staff.findMany({
        where: { 
          schoolId, 
          status: "ACTIVE",
          role: { in: ["TEACHER", "Teacher"] },
          ...(branchId ? { branchId } : {})
        },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
      staff.forEach(s => {
        if (s.email && s.email.includes("@")) {
          recipients.push({ 
            email: s.email.trim(), 
            staffId: s.id, 
            name: `${s.firstName} ${s.lastName || ""}`.trim() 
          });
        }
      });
    } else if (data.targetGroup === "DRIVERS") {
      const staff = await prisma.staff.findMany({
        where: { 
          schoolId, 
          status: "ACTIVE",
          role: { in: ["DRIVER", "Driver"] },
          ...(branchId ? { branchId } : {})
        },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
      staff.forEach(s => {
        if (s.email && s.email.includes("@")) {
          recipients.push({ 
            email: s.email.trim(), 
            staffId: s.id, 
            name: `${s.firstName} ${s.lastName || ""}`.trim() 
          });
        }
      });
    } else if (data.targetGroup === "ADMINS") {
      const staff = await prisma.staff.findMany({
        where: { 
          schoolId, 
          status: "ACTIVE",
          role: { in: ["ADMIN", "Admin", "PRINCIPAL", "Principal", "OWNER", "Owner", "DEVELOPER", "Developer", "VICE_PRINCIPAL"] },
          ...(branchId ? { branchId } : {})
        },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
      staff.forEach(s => {
        if (s.email && s.email.includes("@")) {
          recipients.push({ 
            email: s.email.trim(), 
            staffId: s.id, 
            name: `${s.firstName} ${s.lastName || ""}`.trim() 
          });
        }
      });
    } else {
      // 1. Fetch Staff if targeted
      if (data.targetGroup === "ALL_STAFF" || data.targetGroup === "ALL") {
        const staff = await prisma.staff.findMany({
          where: { 
            schoolId, 
            status: "ACTIVE",
            ...(branchId ? { branchId } : {})
          },
          select: { id: true, email: true, firstName: true, lastName: true }
        });
        staff.forEach(s => {
          if (s.email && s.email.includes("@")) {
            recipients.push({ 
              email: s.email.trim(), 
              staffId: s.id, 
              name: `${s.firstName} ${s.lastName || ""}`.trim() 
            });
          }
        });
      }

      // 2. Fetch Parents if targeted
      if (data.targetGroup === "ALL_PARENTS" || data.targetGroup === "ALL") {
        // Fetch student emails
        const students = await prisma.student.findMany({
          where: { 
            schoolId, 
            status: "CONFIRMED",
            ...(branchId ? { branchId } : {})
          },
          select: { email: true, firstName: true, lastName: true }
        });
        students.forEach(s => {
          if (s.email && s.email.includes("@")) {
            recipients.push({ 
              email: s.email.trim(), 
              name: `${s.firstName} ${s.lastName || ""}`.trim() 
            });
          }
        });

        // Fetch parent details
        const families = await prisma.familyDetail.findMany({
          where: { 
            schoolId,
            ...(branchId ? { branchId } : {})
          },
          select: { fatherEmail: true, motherEmail: true, fatherName: true, motherName: true }
        });
        families.forEach(f => {
          if (f.fatherEmail && f.fatherEmail.includes("@")) {
            recipients.push({ email: f.fatherEmail.trim(), name: f.fatherName?.trim() });
          }
          if (f.motherEmail && f.motherEmail.includes("@")) {
            recipients.push({ email: f.motherEmail.trim(), name: f.motherName?.trim() });
          }
        });
      }
    }

    // De-duplicate recipients by email address
    const uniqueRecipientsMap = new Map<string, { email: string; staffId?: string; name?: string | null }>();
    recipients.forEach(r => {
      uniqueRecipientsMap.set(r.email.toLowerCase(), r);
    });
    const uniqueRecipients = Array.from(uniqueRecipientsMap.values());

    if (uniqueRecipients.length === 0) {
      throw new Error("NO_RECIPIENTS: No active contact email addresses were found for the selected target group.");
    }

    // Resolve sender description
    const senderDisplay = senderName ? `${senderName} (${senderEmail})` : (senderEmail || "internal@virtueschool.in");

    // Dispatch messages
    let successCount = 0;

    if (data.isInternalOnly) {
      // Internal communication is fast (DB writes) - execute sequentially
      for (const r of uniqueRecipients) {
        try {
          await prisma.communicationLog.create({
            data: {
              schoolId,
              branchId: branchId || null,
              sender: senderDisplay,
              authorEmail: senderEmail || null,
              authorId: staffId || null,
              recipient: r.name ? `${r.name} (${r.email})` : r.email,
              recipientId: r.staffId || null,
              subject: data.subject,
              body: data.body,
              type: "CUSTOM",
              status: "SUCCESS",
              parentId: data.parentId || null
            }
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to create internal notice log for ${r.email}:`, err);
        }
      }
    } else {
      // External SMTP is slow (requires network handshakes). Execute in parallel batches of 5.
      const batches = [];
      for (let i = 0; i < uniqueRecipients.length; i += 5) {
        batches.push(uniqueRecipients.slice(i, i + 5));
      }
      for (const batch of batches) {
        await Promise.all(batch.map(async (r) => {
          try {
            const success = await NotificationService.sendCustomEmail(
              r.email,
              data.subject,
              data.body,
              { schoolId, branchId: branchId || undefined, parentId: data.parentId, sender: senderDisplay, authorEmail: senderEmail }
            );
            if (success) successCount++;
          } catch (err) {
            console.error(`Failed to send SMTP email to ${r.email}:`, err);
          }
        }));
      }
    }

    return { success: true, sentCount: successCount, totalTargeted: uniqueRecipients.length };
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
        status: "CONFIRMED"
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
                authorEmail: senderEmail || null,
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
              { schoolId, branchId: student.branchId || undefined, authorEmail: senderEmail }
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
    const { schoolId, branchId, email, staffId } = identity;

    // Fetch the most recent internal notice sent to this user in the last 20 seconds, excluding self-sent
    const notice = await prisma.communicationLog.findFirst({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        OR: [
          { recipient: email },
          ...(staffId ? [{ recipientId: staffId }] : [])
        ],
        AND: [
          {
            OR: [
              { authorEmail: { not: email } },
              { authorEmail: null, sender: { not: { contains: email } } }
            ]
          },
          ...(staffId ? [{ authorId: { not: staffId } }] : [])
        ],
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
    const { schoolId, branchId, email, staffId } = identity;

    const logs = await prisma.communicationLog.findMany({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        OR: [
          { recipient: email },
          ...(staffId ? [{ recipientId: staffId }] : [])
        ]
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
    const { schoolId, branchId, email, staffId } = identity;

    // Fetch log and assert recipient matches under strict tenancy boundaries
    const log = await prisma.communicationLog.findFirst({
      where: { 
        id: logId,
        schoolId,
        ...(branchId ? { branchId } : {})
      }
    });

    if (!log) {
      throw new Error("NOTICE_NOT_FOUND");
    }

    const isRecipient = log.recipient === email || (staffId && log.recipientId === staffId);
    if (!isRecipient) {
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

/**
 * Fetch all classes in the school for mailbox grouping
 */
export async function getClassListAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, role } = identity;

    // Enforce role permission gate: Only management staff can query classes list
    const isManager = ["OWNER", "DEVELOPER", "PRINCIPAL", "ADMIN"].includes(role);
    if (!isManager) {
      throw new Error("UNAUTHORIZED_ACCESS: Only staff members with management roles can retrieve class details.");
    }

    const classes = await prisma.class.findMany({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {})
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        level: "asc"
      }
    });

    return { success: true, data: JSON.parse(JSON.stringify(classes)) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

