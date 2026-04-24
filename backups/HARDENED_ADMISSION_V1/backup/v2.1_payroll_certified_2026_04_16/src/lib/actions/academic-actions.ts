"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
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
