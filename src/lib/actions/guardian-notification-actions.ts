"use server";

import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { prismaBypass } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getParentNotificationsAction() {
    try {
        const identity = await getGuardianIdentity();
        if (!identity) {
            return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
        }

        const logs = await prismaBypass.communicationLog.findMany({
            where: {
                OR: [
                    { parentId: identity.guardianId },
                    { recipient: identity.email || "NO_EMAIL" },
                    { recipient: identity.phone || "NO_PHONE" }
                ]
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // Map DateTime objects into ISO Strings for safe transmission
        const serializedLogs = logs.map(log => ({
            ...log,
            createdAt: log.createdAt.toISOString(),
            readAt: log.readAt ? log.readAt.toISOString() : null
        }));

        return { success: true, data: serializedLogs };
    } catch (error: any) {
        console.error("Get Parent Notifications Error:", error);
        return { success: false, error: error.message || "Failed to load notifications." };
    }
}

export async function markParentNotificationAsReadAction(notificationId: string) {
    try {
        const identity = await getGuardianIdentity();
        if (!identity) {
            return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
        }

        // Validate ownership: check if the notification matches this parent
        const log = await prismaBypass.communicationLog.findFirst({
            where: {
                id: notificationId,
                OR: [
                    { parentId: identity.guardianId },
                    { recipient: identity.email || "NO_EMAIL" },
                    { recipient: identity.phone || "NO_PHONE" }
                ]
            }
        });

        if (!log) {
            return { success: false, error: "ACCESS_DENIED: Message not warded to this parent." };
        }

        if (!log.isRead) {
            await prismaBypass.communicationLog.update({
                where: { id: notificationId },
                data: {
                    isRead: true,
                    readAt: new Date()
                }
            });
            revalidatePath("/parent/dashboard");
        }

        return { success: true };
    } catch (error: any) {
        console.error("Mark Notification Read Error:", error);
        return { success: false, error: error.message || "Failed to update notification." };
    }
}

export async function getUnreadParentNotificationsCountAction() {
    try {
        const identity = await getGuardianIdentity();
        if (!identity) {
            return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
        }

        const count = await prismaBypass.communicationLog.count({
            where: {
                isRead: false,
                OR: [
                    { parentId: identity.guardianId },
                    { recipient: identity.email || "NO_EMAIL" },
                    { recipient: identity.phone || "NO_PHONE" }
                ]
            }
        });

        return { success: true, count };
    } catch (error: any) {
        console.error("Get Unread Notifications Count Error:", error);
        return { success: false, count: 0 };
    }
}
