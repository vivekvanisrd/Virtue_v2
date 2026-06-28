"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { NotificationService } from "@/lib/services/notification-service";
import { revalidatePath } from "next/cache";

/**
 * Fetch list of communication logs with tenancy checks.
 */
export async function getCommunicationLogsAction(filters?: { type?: string; recipient?: string; status?: string }) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId } = identity;

    const logs = await prisma.communicationLog.findMany({
      where: {
        schoolId,
        ...(identity.branchId ? { branchId: identity.branchId } : {}),
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
 * Send custom email via SMTP (Hostinger) and log it in the database.
 */
export async function sendCustomEmailAction(data: { recipient: string; subject: string; body: string }) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId } = identity;

    if (!data.recipient || !data.recipient.includes("@")) {
      throw new Error("INVALID_EMAIL: Please provide a valid recipient email address.");
    }
    if (!data.subject || !data.body) {
      throw new Error("MISSING_FIELDS: Subject and Body are required.");
    }

    const success = await NotificationService.sendCustomEmail(
      data.recipient.trim(),
      data.subject,
      data.body,
      { schoolId, branchId: branchId || undefined }
    );

    return { success };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
