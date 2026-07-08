"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";

// 1. Fetch consent details via public token
export async function getConsentByTokenAction(token: string) {
    try {
        const consent = await prisma.studentConsent.findUnique({
            where: { token },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        family: { select: { fatherName: true, fatherPhone: true } },
                        address: { select: { currentAddress: true } },
                        academic: { select: { classId: true } },
                    }
                },
                academicYear: {
                    select: { name: true }
                }
            }
        });

        if (!consent) {
            return { success: false, error: "Invalid or expired consent link." };
        }

        return { success: true, data: consent };
    } catch (error: any) {
        console.error("Get Consent Error:", error);
        return { success: false, error: "Failed to load consent details." };
    }
}

// 2. Parent Submits Consent
export async function submitConsentAction(token: string, data: { updatedPhone?: string, updatedAddress?: string, consentStatus: "Confirmed" | "Declined" }) {
    try {
        const consent = await prisma.studentConsent.findUnique({ where: { token } });
        if (!consent) throw new Error("Invalid token");

        if (consent.consentStatus !== "Pending") {
            return { success: false, error: "Consent has already been submitted." };
        }

        // Transaction to update consent AND conditionally promote student
        const result = await prisma.$transaction(async (tx: any) => {
            // Update consent record
            const updatedConsent = await tx.studentConsent.update({
                where: { token },
                data: {
                    consentStatus: data.consentStatus,
                    updatedPhone: data.updatedPhone,
                    updatedAddress: data.updatedAddress,
                    submittedAt: new Date(),
                }
            });

            // If confirmed, update student main record relations
            if (data.consentStatus === "Confirmed") {
                if (data.updatedPhone) {
                    await tx.familyDetail.updateMany({
                        where: { studentId: consent.studentId },
                        data: { fatherPhone: data.updatedPhone }
                    });
                }
                if (data.updatedAddress) {
                    await tx.address.updateMany({
                        where: { studentId: consent.studentId },
                        data: { currentAddress: data.updatedAddress }
                    });
                }

                // Note: The actual "Promotion" (AcademicHistory) might need manual class mapping 
                // (e.g., passing from Class 1 to Class 2). This could be done here or in a bulk 
                // admin action later. For now, we secure their consent.
            }

            return updatedConsent;
        });

        return { success: true, data: result };
    } catch (error: any) {
        console.error("Submit Consent Error:", error);
        return { success: false, error: "Failed to submit consent." };
    }
}

// 3. Admin generates consent links for a specific class/year
export async function generateConsentLinksAction(classId: string, targetingAcademicYearId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
        const context = identity;

        // 1. Resolve Class UUID from Name if necessary
        let resolvedClassId = classId;
        const matchedClass = await prisma.class.findFirst({
            where: {
                schoolId: context.schoolId,
                name: { equals: classId, mode: 'insensitive' }
            }
        });
        if (matchedClass) {
            resolvedClassId = matchedClass.id;
        }

        // 2. Resolve Target Academic Year UUID for StudentConsent linking
        let resolvedTargetAYId = targetingAcademicYearId;
        const targetAY = await prisma.academicYear.findFirst({
            where: {
                schoolId: context.schoolId,
                name: { contains: "2026-27" }
            }
        }) || await prisma.academicYear.findFirst({
            where: {
                schoolId: context.schoolId,
                isCurrent: false
            }
        });
        if (targetAY) {
            resolvedTargetAYId = targetAY.id;
        }

        // 3. Resolve Current Academic Year to find students currently in this class
        const currentAY = await prisma.academicYear.findFirst({
            where: {
                schoolId: context.schoolId,
                isCurrent: true
            }
        });

        // 4. Retrieve students currently enrolled in the source class
        const students = await prisma.student.findMany({
            where: {
                schoolId: context.schoolId,
                academic: {
                    classId: resolvedClassId,
                    OR: currentAY ? [
                        { academicYear: currentAY.id },
                        { academicYear: `AY-${currentAY.name}-${context.schoolId}` },
                        { academicYear: currentAY.name }
                    ] : []
                }
            }
        });

        let createdCount = 0;

        for (const student of students) {
            // Check if consent already exists for this target year
            const existing = await prisma.studentConsent.findUnique({
                where: {
                    studentId_academicYearId: {
                        studentId: student.id,
                        academicYearId: resolvedTargetAYId
                    }
                }
            });

            if (!existing) {
                await prisma.studentConsent.create({
                    data: {
                        studentId: student.id,
                        academicYearId: resolvedTargetAYId
                    }
                });
                createdCount++;
            }
        }

        return { success: true, message: `Generated ${createdCount} new consent links for ${classId}` };
    } catch (error: any) {
        console.error("Generate Consents Error:", error);
        return { success: false, error: "Failed to generate consent links." };
    }
}

export async function getConsentLinksAction(classId: string, targetingAcademicYearId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
        const context = identity;

        // Resolve Class UUID from Name if necessary
        let resolvedClassId = classId;
        const matchedClass = await prisma.class.findFirst({
            where: {
                schoolId: context.schoolId,
                name: { equals: classId, mode: 'insensitive' }
            }
        });
        if (matchedClass) {
            resolvedClassId = matchedClass.id;
        }

        // Resolve Target Academic Year UUID
        let resolvedTargetAYId = targetingAcademicYearId;
        const targetAY = await prisma.academicYear.findFirst({
            where: {
                schoolId: context.schoolId,
                name: { contains: "2026-27" }
            }
        }) || await prisma.academicYear.findFirst({
            where: {
                schoolId: context.schoolId,
                isCurrent: false
            }
        });
        if (targetAY) {
            resolvedTargetAYId = targetAY.id;
        }

        const consents = await prisma.studentConsent.findMany({
            where: {
                academicYearId: resolvedTargetAYId,
                student: {
                    schoolId: context.schoolId,
                    academic: { classId: resolvedClassId }
                }
            },
            include: {
                student: true
            }
        });

        const formattedConsents = consents.map(c => ({
            id: c.id,
            studentName: `${c.student.firstName} ${c.student.lastName}`,
            token: c.token,
            status: c.consentStatus
        }));

        return { success: true, consents: formattedConsents };
    } catch (error: any) {
        console.error("Get Consents Error:", error);
        return { success: false, error: "Failed to load consent links." };
    }
}
