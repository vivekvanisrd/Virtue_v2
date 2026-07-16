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
                    { recipient: { contains: identity.email || "NO_EMAIL" } },
                    { recipient: { contains: identity.phone || "NO_PHONE" } },
                    ...(identity.email ? [{ sender: { contains: identity.email } }] : []),
                    ...(identity.phone ? [{ sender: { contains: identity.phone } }] : [])
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

export async function sendParentReplyAction(data: {
    originalNoticeId: string;
    body: string;
    recipient: string;
    subject: string;
}) {
    try {
        const identity = await getGuardianIdentity();
        if (!identity) {
            return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
        }

        const originalNotice = await prismaBypass.communicationLog.findUnique({
            where: { id: data.originalNoticeId },
            select: { branchId: true }
        });

        const replyLog = await prismaBypass.communicationLog.create({
            data: {
                schoolId: identity.schoolId,
                branchId: originalNotice?.branchId || null,
                sender: `${identity.name} (${identity.email || identity.phone})`,
                recipient: data.recipient,
                subject: data.subject.startsWith("Re: ") ? data.subject : `Re: ${data.subject}`,
                body: data.body,
                type: "CUSTOM",
                status: "SUCCESS",
                parentId: data.originalNoticeId,
                isRead: false
            }
        });

        return { success: true, logId: replyLog.id };
    } catch (error: any) {
        console.error("Send Parent Reply Error:", error);
        return { success: false, error: error.message || "Failed to submit reply." };
    }
}

export async function sendParentChatAction(data: {
    body: string;
    recipient?: string;
    parentId?: string | null;
}) {
    try {
        const identity = await getGuardianIdentity();
        if (!identity) {
            return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
        }

        const replyLog = await prismaBypass.communicationLog.create({
            data: {
                schoolId: identity.schoolId,
                branchId: null,
                sender: `${identity.name} (${identity.email || identity.phone})`,
                recipient: data.recipient || "School Administration (office@virtueschool.in)",
                subject: "Direct Support Chat",
                body: data.body,
                type: "CHAT",
                status: "SUCCESS",
                parentId: data.parentId || null,
                isRead: false
            }
        });

        return { success: true, logId: replyLog.id };
    } catch (error: any) {
        console.error("Send Parent Chat Error:", error);
        return { success: false, error: error.message || "Failed to submit message." };
    }
}

export async function getGuardianStudentTeachersAction() {
    try {
        const identity = await getGuardianIdentity();
        if (!identity) {
            return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
        }

        // 1. Fetch all warded students for this guardian
        const wardedStudents = await prismaBypass.studentGuardian.findMany({
            where: { guardianId: identity.guardianId, activeStatus: "ACTIVE" },
            select: { studentId: true }
        });
        const studentIds = wardedStudents.map(ws => ws.studentId);

        if (studentIds.length === 0) {
            return { success: true, data: [] };
        }

        // 2. Fetch academic year details for classIds and sectionIds
        const academicHistories = await prismaBypass.studentAcademicYear.findMany({
            where: { studentId: { in: studentIds } },
            select: { classId: true, sectionId: true }
        });
        const classIds = Array.from(new Set(academicHistories.map(ah => ah.classId).filter(Boolean)));
        const sectionIds = Array.from(new Set(academicHistories.map(ah => ah.sectionId).filter(Boolean)));

        if (classIds.length === 0) {
            return { success: true, data: [] };
        }

        // 3. Query all active teachers assigned to these classes or sections
        const teachers = await prismaBypass.staff.findMany({
            where: {
                schoolId: identity.schoolId,
                status: "ACTIVE",
                OR: [
                    { assignedClassId: { in: classIds } },
                    { sectionTeacher: { id: { in: sectionIds } } }
                ]
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                assignedClass: {
                    select: {
                        name: true
                    }
                }
            }
        });

        return { success: true, data: JSON.parse(JSON.stringify(teachers)) };
    } catch (error: any) {
        console.error("Get Guardian Student Teachers Error:", error);
        return { success: false, error: error.message || "Failed to fetch teachers." };
    }
}
