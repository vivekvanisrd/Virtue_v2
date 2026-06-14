"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { getTenancyFilters } from "@/lib/utils/tenancy";
import { revalidatePath } from "next/cache";
import { serializeDecimal } from "@/lib/utils/serialization";

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

/**
 * Fetch Academic Sessions
 */
export async function getAcademicYearsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const data = await prisma.academicYear.findMany({
      where: { schoolId: identity.schoolId },
      include: { financialYear: { select: { id: true, name: true } } },
      orderBy: { startDate: "desc" }
    });

    return { success: true, data: serializeDecimal(data) };
  } catch (error: any) {
    console.error("Fetch Academic Years Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create Academic Year
 */
export async function createAcademicYearAction(data: {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  financialYearId?: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    return await prisma.$transaction(async (tx) => {
      if (data.isCurrent) {
        await tx.academicYear.updateMany({
          where: { schoolId: identity.schoolId, isCurrent: true },
          data: { isCurrent: false }
        });
      }

      const newYear = await tx.academicYear.create({
        data: {
          schoolId: identity.schoolId,
          name: data.name,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          isCurrent: data.isCurrent,
          financialYearId: data.financialYearId || null
        }
      });

      revalidatePath("/dashboard/setup");
      return { success: true, id: newYear.id };
    });
  } catch (error: any) {
    console.error("Create Academic Year Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle Academic Year Lock
 */
export async function toggleAcademicYearLockAction(ayId: string, isLocked: boolean) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    await prisma.academicYear.update({
      where: { id: ayId, schoolId: identity.schoolId },
      data: { isLocked }
    });

    revalidatePath("/dashboard/setup");
    return { success: true };
  } catch (error: any) {
    console.error("Toggle Lock Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch Students for Promotion with Consent
 */
export async function getStudentsForPromotionAction(
  sourceAcademicYearId: string,
  classId: string,
  sectionId?: string
) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const records = await prisma.academicRecord.findMany({
      where: {
        schoolId: identity.schoolId,
        branchId: identity.branchId as string,
        academicYear: sourceAcademicYearId,
        classId,
        ...(sectionId ? { sectionId } : {})
      },
      include: {
        student: {
          include: {
            consents: {
              where: { academicYearId: sourceAcademicYearId },
              orderBy: { createdAt: "desc" }
            }
          }
        }
      }
    });

    const students = records.map(r => {
      const consentStatus = r.student.consents[0]?.consentStatus || "Pending";
      return {
        id: r.student.id,
        firstName: r.student.firstName,
        lastName: r.student.lastName || "",
        studentCode: r.student.studentCode || "",
        admissionNumber: r.student.admissionNumber || "",
        sectionId: r.sectionId,
        consentStatus
      };
    });

    return { success: true, data: students };
  } catch (error: any) {
    console.error("Get Students for Promotion Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize a Promotion Batch Record
 */
export async function createPromotionBatchAction(data: {
  sourceYearId: string;
  targetYearId: string;
  sourceClassId: string;
  targetClassId: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
    const branchId = identity.branchId as string;

    const batch = await prisma.promotionBatch.create({
      data: {
        schoolId: identity.schoolId,
        branchId,
        executedById: identity.staffId || "",
        sourceYearId: data.sourceYearId,
        targetYearId: data.targetYearId,
        sourceClassId: data.sourceClassId,
        targetClassId: data.targetClassId,
        status: "COMPLETED"
      }
    });

    return { success: true, batchId: batch.id };
  } catch (error: any) {
    console.error("Create Promotion Batch Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Promote Student Chunk (Max 50 Students)
 */
export async function promoteStudentChunkAction(data: {
  studentIds: string[];
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  targetClassId: string;
  targetSectionId?: string;
  batchId: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
    const branchId = identity.branchId as string;

    const result = await prisma.$transaction(async (tx) => {
      const recordsCreated = [];

      // Resolve target Fee Structure
      const feeStructure = await tx.feeStructure.findFirst({
        where: {
          schoolId: identity.schoolId,
          branchId,
          classId: data.targetClassId,
          academicYearId: data.targetAcademicYearId
        },
        include: {
          components: {
            include: { masterComponent: true }
          }
        }
      });

      const receivableAccount = await tx.chartOfAccount.findFirst({
        where: { accountCode: "1200", schoolId: identity.schoolId }
      });

      const ay = await tx.academicYear.findUnique({
        where: { id: data.targetAcademicYearId }
      });

      const activeFY = ay?.financialYearId ? await tx.financialYear.findUnique({
        where: { id: ay.financialYearId }
      }) : null;

      for (const studentId of data.studentIds) {
        // 1. Idempotency Check
        const existingHistory = await tx.academicHistory.findUnique({
          where: { studentId_academicYearId: { studentId, academicYearId: data.targetAcademicYearId } }
        });
        if (existingHistory) continue;

        // 2. Fetch student details
        const student = await tx.student.findUnique({
          where: { id: studentId },
          include: { academic: true }
        });
        if (!student) continue;

        const oldSectionId = student.academic?.sectionId || null;

        // 3. Create AcademicHistory
        await tx.academicHistory.create({
          data: {
            id: `AH-${studentId}-${data.targetAcademicYearId}`,
            studentId,
            academicYearId: data.targetAcademicYearId,
            classId: data.targetClassId,
            sectionId: data.targetSectionId || null,
            promotionStatus: "PROMOTED",
            promotedFrom: data.sourceAcademicYearId,
            schoolId: identity.schoolId,
            branchId,
            admissionNumber: student.admissionNumber,
            studentCode: student.studentCode,
            promotionBatchId: data.batchId
          }
        });

        // 4. Update AcademicRecord
        await tx.academicRecord.update({
          where: { studentId },
          data: {
            classId: data.targetClassId,
            sectionId: data.targetSectionId || null,
            academicYear: data.targetAcademicYearId
          }
        });

        let journalEntryId = null;

        // 5. Billing and double-entry mapping
        if (feeStructure) {
          const fin = await tx.financialRecord.upsert({
            where: { studentId },
            update: {
              annualTuition: Number(feeStructure.totalAmount),
              feeStructureId: feeStructure.id,
              netTuition: Number(feeStructure.totalAmount)
            },
            create: {
              studentId,
              schoolId: identity.schoolId,
              branchId,
              annualTuition: Number(feeStructure.totalAmount),
              feeStructureId: feeStructure.id,
              netTuition: Number(feeStructure.totalAmount)
            }
          });

          await tx.studentFeeComponent.deleteMany({
            where: { studentFinancialId: fin.id, schoolId: identity.schoolId }
          });

          await tx.studentFeeComponent.createMany({
            data: feeStructure.components.map(tc => ({
              schoolId: identity.schoolId,
              studentFinancialId: fin.id,
              componentId: tc.componentId,
              baseAmount: tc.amount,
              waiverAmount: 0,
              discountAmount: 0,
              isApplicable: true
            }))
          });

          const ledgerEntries = feeStructure.components.map(tc => ({
            studentId,
            schoolId: identity.schoolId,
            branchId,
            academicYearId: data.targetAcademicYearId,
            type: "CHARGE",
            amount: tc.amount,
            reason: `${tc.masterComponent.name} (${feeStructure.name})`,
            createdBy: identity.staffId || "SYSTEM",
            feeStructureId: feeStructure.id
          }));
          await tx.ledgerEntry.createMany({ data: ledgerEntries });

          if (receivableAccount && activeFY) {
            const incomeMapping = [];
            for (const comp of feeStructure.components) {
              const amount = Number(comp.amount);
              if (amount <= 0) continue;

              const mComp = comp.masterComponent;
              let targetCode = mComp.accountCode;
              if (!targetCode) {
                const name = mComp.name.toLowerCase();
                if (name.includes("tuition")) targetCode = "4100";
                else if (name.includes("admission")) targetCode = "4200";
                else if (name.includes("transport") || name.includes("bus")) targetCode = "4300";
                else if (name.includes("caution") || name.includes("deposit")) targetCode = "2100";
                else targetCode = "4100";
              }

              const acc = await tx.chartOfAccount.findFirst({
                where: { accountCode: targetCode, schoolId: identity.schoolId }
              });

              const finalAccount = acc || await tx.chartOfAccount.findFirst({
                where: { accountCode: "4100", schoolId: identity.schoolId }
              });

              if (finalAccount) {
                incomeMapping.push({
                  accountId: finalAccount.id,
                  debit: 0,
                  credit: amount,
                  description: `Accrued: ${mComp.name}`
                });
              }
            }

            const jEntry = await tx.journalEntry.create({
              data: {
                schoolId: identity.schoolId,
                branchId,
                financialYearId: activeFY.id,
                entryType: "PROMOTION_ACCRUAL",
                totalDebit: feeStructure.totalAmount,
                totalCredit: feeStructure.totalAmount,
                description: `Promotion Accrual for student: ${student.studentCode || studentId}`,
                lines: {
                  create: [
                    { accountId: receivableAccount.id, debit: feeStructure.totalAmount, credit: 0, description: "Promotion Fees Receivable" },
                    ...incomeMapping
                  ]
                }
              }
            });
            journalEntryId = jEntry.id;
          }
        }

        await tx.promotionRecord.create({
          data: {
            batchId: data.batchId,
            studentId,
            oldSectionId,
            newSectionId: data.targetSectionId || null,
            journalEntryId
          }
        });

        recordsCreated.push(studentId);
      }

      return recordsCreated;
    }, { timeout: 60000 });

    revalidatePath("/dashboard/students");
    return { success: true, count: result.length };
  } catch (error: any) {
    console.error("Promote Student Chunk Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Rollback Promotion Batch
 */
export async function rollbackPromotionBatchAction(batchId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.promotionBatch.findUnique({
        where: { id: batchId },
        include: { records: true }
      });
      if (!batch || batch.status === "ROLLED_BACK") {
        throw new Error("Batch not found or already rolled back.");
      }

      if (batch.schoolId !== identity.schoolId) {
        throw new Error("UNAUTHORIZED: School mismatch.");
      }

      for (const rec of batch.records) {
        await tx.academicRecord.update({
          where: { studentId: rec.studentId },
          data: {
            classId: batch.sourceClassId,
            sectionId: rec.oldSectionId,
            academicYear: batch.sourceYearId
          }
        });

        await tx.academicHistory.deleteMany({
          where: { studentId: rec.studentId, academicYearId: batch.targetYearId }
        });

        await tx.ledgerEntry.deleteMany({
          where: { studentId: rec.studentId, academicYearId: batch.targetYearId }
        });

        const finRecord = await tx.financialRecord.findUnique({
          where: { studentId: rec.studentId }
        });
        if (finRecord) {
          await tx.studentFeeComponent.deleteMany({
            where: { studentFinancialId: finRecord.id }
          });
          
          const oldFeeStructure = await tx.feeStructure.findFirst({
            where: {
              schoolId: identity.schoolId,
              branchId: batch.branchId,
              classId: batch.sourceClassId,
              academicYearId: batch.sourceYearId
            },
            include: {
              components: true
            }
          });

          if (oldFeeStructure) {
            await tx.financialRecord.update({
              where: { studentId: rec.studentId },
              data: {
                annualTuition: Number(oldFeeStructure.totalAmount),
                feeStructureId: oldFeeStructure.id,
                netTuition: Number(oldFeeStructure.totalAmount)
              }
            });

            await tx.studentFeeComponent.createMany({
              data: oldFeeStructure.components.map(comp => ({
                schoolId: identity.schoolId,
                studentFinancialId: finRecord.id,
                componentId: comp.componentId,
                baseAmount: comp.amount,
                waiverAmount: 0,
                discountAmount: 0,
                isApplicable: true
              }))
            });
          } else {
            await tx.financialRecord.update({
              where: { studentId: rec.studentId },
              data: {
                annualTuition: null,
                feeStructureId: null,
                netTuition: null
              }
            });
          }
        }

        if (rec.journalEntryId) {
          await tx.journalLine.deleteMany({ where: { journalEntryId: rec.journalEntryId } });
          await tx.journalEntry.delete({ where: { id: rec.journalEntryId } });
        }
      }

      await tx.promotionBatch.update({
        where: { id: batchId },
        data: { status: "ROLLED_BACK" }
      });

      return { success: true };
    });

    revalidatePath("/dashboard/students");
    return result;
  } catch (error: any) {
    console.error("Rollback Promotion Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch Promotion Batch History
 */
export async function getPromotionBatchesAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const data = await prisma.promotionBatch.findMany({
      where: { schoolId: identity.schoolId, branchId: identity.branchId as string },
      include: {
        executedBy: { select: { firstName: true, lastName: true } },
        academicYear: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const classes = await prisma.class.findMany({
      where: { schoolId: identity.schoolId }
    });
    const years = await prisma.academicYear.findMany({
      where: { schoolId: identity.schoolId }
    });

    const enriched = data.map((b: any) => {
      const srcYear = years.find(y => y.id === b.sourceYearId)?.name || "Unknown";
      const tgtYear = years.find(y => y.id === b.targetYearId)?.name || "Unknown";
      const srcClass = classes.find(c => c.id === b.sourceClassId)?.name || "Unknown";
      const tgtClass = classes.find(c => c.id === b.targetClassId)?.name || "Unknown";
      
      return {
        ...b,
        sourceYearName: srcYear,
        targetYearName: tgtYear,
        sourceClassName: srcClass,
        targetClassName: tgtClass
      };
    });

    return { success: true, data: serializeDecimal(enriched) };
  } catch (error: any) {
    console.error("Fetch Promotion Batches Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch Financial Years
 */
export async function getFinancialYearsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    const data = await prisma.financialYear.findMany({
      where: { schoolId: identity.schoolId },
      orderBy: { startDate: "desc" }
    });

    return { success: true, data: serializeDecimal(data) };
  } catch (error: any) {
    console.error("Fetch Financial Years Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Set Current Academic Year
 */
export async function setCurrentAcademicYearAction(ayId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

    return await prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: { schoolId: identity.schoolId, isCurrent: true },
        data: { isCurrent: false }
      });

      await tx.academicYear.update({
        where: { id: ayId, schoolId: identity.schoolId },
        data: { isCurrent: true }
      });

      revalidatePath("/dashboard/setup");
      return { success: true };
    });
  } catch (error: any) {
    console.error("Set Current Academic Year Error:", error);
    return { success: false, error: error.message };
  }
}

