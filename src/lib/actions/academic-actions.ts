"use server";

import prisma from "@/lib/prisma";
import { getTenantContext } from "@/lib/utils/tenant-context";
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
    const context = await getTenantContext();

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
    const context = await getTenantContext();
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
    const context = await getTenantContext();
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
