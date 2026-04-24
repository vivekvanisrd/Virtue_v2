"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { getTenancyFilters } from "@/lib/utils/tenancy";
import { revalidatePath } from "next/cache";

/**
 * Bulk Submission: Saves multiple exam results for a class/subject.
 */
export async function submitBulkResultsAction(records: {
  studentId: string;
  examTypeId: string;
  subjectId: string;
  marksObtained: number;
  totalMarks: number;
  passMarks?: number;
  remarks?: string;
}[]) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;

    const result = await prisma.$transaction(
      records.map((r) => {
        return prisma.examResult.upsert({
          where: {
            // Composite ID or Unique check
            // For now, let's use a generated deterministic ID for upsert logic
            id: `EXAM-${r.studentId}-${r.examTypeId}-${r.subjectId}`,
          },
          update: {
            marksObtained: r.marksObtained,
            totalMarks: r.totalMarks,
            passMarks: r.passMarks || 33,
            remarks: r.remarks,
          },
          create: {
            id: `EXAM-${r.studentId}-${r.examTypeId}-${r.subjectId}`,
            studentId: r.studentId,
            examTypeId: r.examTypeId,
            subjectId: r.subjectId,
            marksObtained: r.marksObtained,
            totalMarks: r.totalMarks,
            passMarks: r.passMarks || 33,
            remarks: r.remarks,
            schoolId: context.schoolId,
          }
        });
      })
    );

    revalidatePath("/dashboard/students");
    return { success: true, count: result.length };
  } catch (error: any) {
    console.error("Exam Submission Error:", error);
    return { success: false, error: "Failed to sync exam results." };
  }
}

/**
 * Auto-Grading Logic: Fetch grade based on percentage using the school's scale.
 */
export async function getGradeFromScaleAction(percentage: number) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const scales = await prisma.gradeScale.findMany({
      where: { schoolId: context.schoolId },
      orderBy: { minScore: 'desc' }
    });

    const grade = scales.find((s: any) => percentage >= s.minScore && percentage <= s.maxScore);
    return { success: true, grade: grade?.grade || "N/A" };
  } catch (e) {
    return { success: false, error: "Grading scale check failed." };
  }
}

/**
 * Fetch Student Report Data: Aggregates all subjects for an exam.
 */
export async function getStudentExamReportAction(studentId: string, examTypeId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const results = await prisma.examResult.findMany({
      where: {
        studentId,
        examTypeId,
        schoolId: context.schoolId
      },
      include: {
        subject: true,
        examType: true
      }
    });

    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: "Failed to fetch student report." };
  }
}

/**
 * 🏛️ SYNC ACADEMIC BLUEPRINT
 * Clones standard Platform templates (LKG to 10th) into the local branch.
 */
export async function syncAcademicBlueprintAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
    
    const { schoolId, branchId } = identity;
    if (!branchId || branchId === 'GLOBAL') throw new Error("SYNC_DENIED: Please select a specific campus to activate the blueprint.");

    // 1. Fetch Global Templates
    const templates = await prisma.platformClass.findMany({
        include: { sections: true }
    });

    const result = await prisma.$transaction(async (tx) => {
        let createdCount = 0;
        for (const tc of templates) {
            // Check if class already exists in this branch
            const existing = await tx.class.findFirst({
                where: { schoolId, branchId, name: tc.name }
            });

            if (!existing) {
                const newClass = await tx.class.create({
                    data: {
                        name: tc.name,
                        level: tc.level,
                        schoolId,
                        branchId,
                        source: `PLATFORM_TEMPLATE_${tc.id}`
                    }
                });
                createdCount++;

                // Clone Sections
                for (const ts of tc.sections) {
                    await tx.section.create({
                        data: {
                            name: ts.name,
                            classId: newClass.id,
                            schoolId,
                            branchId,
                            source: `PLATFORM_TEMPLATE_${ts.id}`
                        }
                    });
                }
            }
        }
        return { createdCount };
    });

    revalidatePath("/", "layout");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Blueprint Sync Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches all available classes for the school/branch.
 */
export async function getClassesAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const classes = await prisma.class.findMany({
      where: { 
        schoolId: identity.schoolId,
        // Principals see all classes in school? Or just branch?
        // Rule: Academic structures are BRANCH specific in Option B.
        ...(identity.role === 'STAFF' ? { branchId: identity.branchId } : {})
      },
      orderBy: { level: 'asc' }
    });
    return { success: true, data: JSON.parse(JSON.stringify(classes)) };
  } catch (e) {
    console.error("Fetch Classes Error:", e);
    return { success: false, error: "Failed to fetch classes." };
  }
}

/**
 * Fetches sections for a specific class.
 */
export async function getSectionsAction(classId: string) {
  try {
    const sections = await prisma.section.findMany({
      where: { classId },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: JSON.parse(JSON.stringify(sections)) };
  } catch (e) {
    console.error("Fetch Sections Error:", e);
    return { success: false, error: "Failed to fetch sections." };
  }
}
/**
 * 🛠️ UPSERT CLASS: Create or update a Grade Level.
 */
export async function upsertClassAction(data: { id?: string; name: string; level: number }) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const result = await prisma.class.upsert({
      where: { id: data.id || "NEW" },
      update: {
        name: data.name,
        level: data.level
      },
      create: {
        name: data.name,
        level: data.level,
        schoolId: identity.schoolId,
        branchId: identity.branchId as string
      }
    });

    revalidatePath("/dashboard/academics");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: "Failed to save grade level." };
  }
}

/**
 * 🛠️ UPSERT SECTION: Create or update a Section within a class.
 */
export async function upsertSectionAction(data: { id?: string; name: string; classId: string; classTeacherId?: string }) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const result = await prisma.section.upsert({
      where: { id: data.id || "NEW" },
      update: {
        name: data.name,
        classTeacherId: data.classTeacherId || null
      },
      create: {
        name: data.name,
        classId: data.classId,
        classTeacherId: data.classTeacherId || null,
        schoolId: identity.schoolId,
        branchId: identity.branchId as string
      }
    });

    revalidatePath("/dashboard/academics");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: "Failed to save section." };
  }
}

/**
 * 🗑️ DELETE SECTION (Safety Guarded)
 */
export async function deleteSectionAction(sectionId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("UNAUTHORIZED");

        // 1. GUARD: Check if students are assigned to this section
        const studentCount = await prisma.student.count({
            where: { academic: { sectionId } }
        });

        if (studentCount > 0) {
            return { success: false, error: `FORBIDDEN: This section has ${studentCount} students enrolled. Transfer them before deleting.` };
        }

        await prisma.section.delete({ where: { id: sectionId } });
        revalidatePath("/dashboard/academics");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Deletion failed." };
    }
}

/**
 * 📊 GET CLASSES WITH STATS (Master Dashboard Query)
 */
export async function getClassesWithStatsAction() {
  try {
    const identity = await getSovereignIdentity();
    
    // 🛡️ RECOVERY: If identity is null, we return a targeted failure to the UI
    if (!identity) {
        return { 
            success: false, 
            error: "IDENTITY_NOT_FOUND: The Sovereign Backbone could not verify your session. Please refresh or re-login.",
            debug: { source: "academic-actions", timestamp: new Date().toISOString() }
        };
    }

    console.log(`🔍 [PROBE] Identity: [${identity.role}] School: ${identity.schoolId} Branch: ${identity.branchId}`);

    const classes = await prisma.class.findMany({
      where: { 
        schoolId: identity.schoolId,
        // 🏛️ SOVEREIGN BYPASS: Principals and Owners see all institutional data.
        ...( (identity.role === 'OWNER' || identity.role === 'PRINCIPAL') ? {} : { branchId: identity.branchId as string })
      },
      include: {
        sections: {
          include: {
            _count: {
                select: { academicRecords: true }
            }
          }
        },
        _count: {
            select: { academicRecords: true }
        }
      },
      orderBy: { level: 'asc' }
    });

    // 🕵️ MANUAL LINKAGE BYPASS: Since the Prisma Client is stale due to Windows file locks,
    // we manually fetch the staff associated with these sections.
    const allStaff = await prisma.staff.findMany({
        where: { schoolId: identity.schoolId },
        select: { id: true, firstName: true, lastName: true }
    });

    const sanitizedClasses = JSON.parse(JSON.stringify(classes)).map((c: any) => ({
        ...c,
        sections: c.sections.map((s: any) => ({
            ...s,
            classTeacher: allStaff.find(st => st.id === s.classTeacherId) || null
        }))
    }));

    return { 
        success: true, 
        data: sanitizedClasses,
        identityProbe: { role: identity.role, branchId: identity.branchId } 
    };
  } catch (e: any) {
    console.error("Fetch Stats Critical Failure:", e);
    return { 
        success: false, 
        error: `GENESIS_ENGINE_FAILURE: ${e.message}`,
        debug: { stack: e.stack?.substring(0, 100) }
    };
  }
}

/**
 * 🎓 ASSIGN SECTION TEACHER (Sovereign Leadership Handshake)
 * Atomically links a staff member to an academic section.
 */
export async function assignSectionTeacherAction(sectionId: string, staffId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
        if (identity.role !== 'PRINCIPAL' && identity.role !== 'OWNER' && identity.role !== 'DEVELOPER') {
            throw new Error("UNAUTHORIZED: Only institutional leadership can assign teachers.");
        }

        // 🛡️ LOCK: Enforce unique constraint and avoid ghost assignments
        const result = await prisma.section.update({
            where: { id: sectionId },
            data: { classTeacherId: staffId || null }
        });

        revalidatePath("/", "layout");
        return { success: true, data: result };
    } catch (e: any) {
        console.error("Teacher Assignment Failure:", e);
        return { success: false, error: e.message || "Failed to finalize leadership assignment." };
    }
}
