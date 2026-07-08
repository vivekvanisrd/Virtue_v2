"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";

export async function createHomeworkAction(data: {
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teacherId: string;
  homeworkDate: Date;
  dueDate: Date;
  title: string;
  description: string;
  attachment?: string | null;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Staff credentials required." };
    }

    // Resolve current academic year for the school
    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId: identity.schoolId, isCurrent: true }
    });
    if (!activeAY) {
      return { success: false, error: "No active academic year found for school." };
    }

    const homework = await prisma.homework.create({
      data: {
        schoolId: identity.schoolId,
        branchId: identity.branchId,
        academicYearId: activeAY.id,
        classId: data.classId,
        sectionId: data.sectionId || null,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        homeworkDate: new Date(data.homeworkDate),
        dueDate: new Date(data.dueDate),
        title: data.title.trim(),
        description: data.description.trim(),
        attachment: data.attachment || null,
        status: "PUBLISHED",
        createdBy: identity.staffId,
        updatedBy: identity.staffId
      }
    });

    return { success: true, homeworkId: homework.id, message: "Homework assignment published successfully." };
  } catch (error: any) {
    console.error("Create Homework Error:", error);
    return { success: false, error: "Failed to publish homework assignment." };
  }
}

export async function getStudentHomeworkAction(studentId: string) {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Parent session expired." };
    }

    // 🛡️ SECURITY: Verify sibling linkage (prevent cross-family leaks)
    const linkage = await prismaBypass.studentGuardian.findFirst({
      where: {
        studentId,
        guardianId: identity.guardianId,
        activeStatus: "ACTIVE"
      }
    });
    if (!linkage) {
      return { success: false, error: "ACCESS_DENIED: Student profile is not linked to your parent account." };
    }

    // 1. Resolve student's current class/section placement
    const academicRecord = await prismaBypass.academicRecord.findUnique({
      where: { studentId },
      include: { class: true, section: true }
    });

    if (!academicRecord) {
      return { success: false, error: "No active academic placement record found for this student." };
    }

    // 2. Fetch homework matching class & section targeting criteria
    const homeworkList = await prismaBypass.homework.findMany({
      where: {
        schoolId: identity.schoolId,
        classId: academicRecord.classId,
        OR: [
          { sectionId: null },
          { sectionId: academicRecord.sectionId }
        ],
        status: "PUBLISHED"
      },
      orderBy: { dueDate: "asc" }
    });

    return { success: true, homework: homeworkList };
  } catch (error: any) {
    console.error("Get Student Homework Error:", error);
    return { success: false, error: "Failed to load homework feed." };
  }
}
