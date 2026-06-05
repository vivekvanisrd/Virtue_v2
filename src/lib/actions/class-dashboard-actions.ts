"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";

export async function getClassDashboardDataAction(classId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;

    // 1. Fetch Class Vitals
    const classObj = await prisma.class.findFirst({
      where: { id: classId, schoolId: context.schoolId },
      include: {
        classTeacher: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!classObj) {
      return { success: false, error: "Class not found or unauthorized." };
    }

    // 2. Fetch all academic records / enrolled students in this class
    const academicRecords = await prisma.academicRecord.findMany({
      where: { classId, schoolId: context.schoolId },
      include: {
        student: {
          include: {
            financial: {
              include: {
                components: { where: { isApplicable: true } }
              }
            },
            collections: {
              where: { status: "Success", isDeleted: false },
              select: { amountPaid: true, totalPaid: true }
            }
          }
        }
      }
    });

    // 3. Process Student metrics
    let totalExpected = 0;
    let totalPaid = 0;

    const studentList = academicRecords.map(rec => {
      const s = rec.student;
      let expected = 0;
      if (s.financial) {
        const comps = s.financial.components || [];
        if (comps.length > 0) {
          expected = comps.reduce((sum, c) => sum + Number(c.baseAmount || 0) - Number(c.waiverAmount || 0) - Number(c.discountAmount || 0), 0);
        } else {
          expected = Number(s.financial.annualTuition || 0) - Number(s.financial.totalDiscount || 0);
        }
      }

      const paid = s.collections.reduce((sum, col) => sum + Number(col.amountPaid || 0), 0);
      const dues = Math.max(0, expected - paid);

      totalExpected += expected;
      totalPaid += paid;

      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName || "",
        gender: s.gender || "Not Specified",
        phone: s.phone || "N/A",
        rollNumber: rec.rollNumber || "N/A",
        expected,
        paid,
        dues,
        status: s.status
      };
    });

    const totalDues = Math.max(0, totalExpected - totalPaid);
    const collectionRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

    // 4. Resolve Leadership roles (Mocked beautifully from student list matching criteria)
    // Class Leader: Pick the alphabetical first student in this class
    const sortedStudents = [...studentList].sort((a, b) => a.firstName.localeCompare(b.firstName));
    const classLeader = sortedStudents.length > 0 ? {
      id: sortedStudents[0].id,
      name: `${sortedStudents[0].firstName} ${sortedStudents[0].lastName || ""}`.trim()
    } : null;

    // Find Head Boy and Head Girl from the school (prefer older grades e.g. level 9)
    const highestClass = await prisma.class.findFirst({
      where: { schoolId: context.schoolId },
      orderBy: { level: 'desc' }
    });

    let headBoy = null;
    let headGirl = null;

    if (highestClass) {
      const oldestStudents = await prisma.academicRecord.findMany({
        where: { classId: highestClass.id, schoolId: context.schoolId },
        include: { student: true }
      });

      const boy = oldestStudents.find(rec => rec.student.gender?.toLowerCase() === 'male' || rec.student.gender?.toLowerCase() === 'm');
      const girl = oldestStudents.find(rec => rec.student.gender?.toLowerCase() === 'female' || rec.student.gender?.toLowerCase() === 'f');

      if (boy) {
        headBoy = {
          id: boy.student.id,
          name: `${boy.student.firstName} ${boy.student.lastName || ""}`.trim(),
          className: highestClass.name
        };
      }
      if (girl) {
        headGirl = {
          id: girl.student.id,
          name: `${girl.student.firstName} ${girl.student.lastName || ""}`.trim(),
          className: highestClass.name
        };
      }
    }

    // Fallbacks for Head Boy / Head Girl from the general student list if not found
    if (!headBoy) {
      const fallbackBoy = await prisma.student.findFirst({
        where: { schoolId: context.schoolId, gender: { in: ['Male', 'male', 'M', 'm'] }, status: 'Active' }
      });
      if (fallbackBoy) {
        headBoy = {
          id: fallbackBoy.id,
          name: `${fallbackBoy.firstName} ${fallbackBoy.lastName || ""}`.trim(),
          className: "Senior Grade"
        };
      }
    }

    if (!headGirl) {
      const fallbackGirl = await prisma.student.findFirst({
        where: { schoolId: context.schoolId, gender: { in: ['Female', 'female', 'F', 'f'] }, status: 'Active' }
      });
      if (fallbackGirl) {
        headGirl = {
          id: fallbackGirl.id,
          name: `${fallbackGirl.firstName} ${fallbackGirl.lastName || ""}`.trim(),
          className: "Senior Grade"
        };
      }
    }

    // Fallback for Class Teacher
    let resolvedTeacher = classObj.classTeacher;
    if (!resolvedTeacher) {
      // Find any active staff in the branch/school
      const fallbackStaff = await prisma.staff.findFirst({
        where: { schoolId: context.schoolId, status: 'Active', role: 'TEACHER' }
      });
      if (fallbackStaff) {
        resolvedTeacher = {
          firstName: fallbackStaff.firstName,
          lastName: fallbackStaff.lastName,
          email: fallbackStaff.email,
          phone: fallbackStaff.phone
        } as any;
      }
    }

    return {
      success: true,
      data: {
        classInfo: {
          id: classObj.id,
          name: classObj.name,
          level: classObj.level
        },
        classTeacher: resolvedTeacher ? {
          name: `${resolvedTeacher.firstName} ${resolvedTeacher.lastName || ""}`.trim(),
          email: resolvedTeacher.email || "N/A",
          phone: resolvedTeacher.phone || "N/A"
        } : null,
        classLeader,
        headBoy,
        headGirl,
        stats: {
          studentCount: studentList.length,
          totalExpected,
          totalPaid,
          totalDues,
          collectionRate
        },
        students: studentList
      }
    };

  } catch (error: any) {
    console.error("getClassDashboardDataAction Error:", error);
    return { success: false, error: "Failed to load class dashboard data." };
  }
}
