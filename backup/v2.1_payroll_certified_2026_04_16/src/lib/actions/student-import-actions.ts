"use server";

import prisma from "@/lib/prisma";
import { studentAdmissionSchema } from "@/types/student";
import { logActivity } from "@/lib/utils/audit-logger";
import { getSovereignIdentity } from "../auth/backbone";

export type ImportResult = {
  success: boolean;
  insertedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; name: string; reason: string }>;
};

/**
 * High-Fidelity Student Importer with Deep Validation and Name Resolution
 */
export async function importStudentsAction(records: any[], targetSchoolId: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    insertedCount: 0,
    skippedCount: 0,
    errors: []
  };

  const identity = await getSovereignIdentity();
  if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
  
  // 🛡️ LOCK: Cross-Tenant Validation
  if (identity.schoolId !== targetSchoolId && !identity.isGlobalDev) {
    throw new Error("SECURITY_VIOLATION: Attempted to import students into an unauthorized institution.");
  }
  
  const schoolId = targetSchoolId;

  if (!records || records.length === 0) {
    return { ...result, success: false, errors: [{ row: 0, name: "File", reason: "CSV is empty." }] };
  }

  // 1. Pre-fetch Reference Data for Name-to-ID Resolution
  const [classes, sections, branches, academicYears] = await Promise.all([
    prisma.class.findMany({ select: { id: true, name: true } }),
    prisma.section.findMany({ select: { id: true, name: true, classId: true } }),
    prisma.branch.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    prisma.academicYear.findMany({ where: { schoolId }, select: { id: true, name: true } })
  ]);

  // 2. Process each row
  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    const rowNum = i + 2;
    const studentName = `${raw.firstName || "?"} ${raw.lastName || "?"}`;

    try {
      // Find IDs by Name
      const branch = branches.find((b: any) => b.name.toLowerCase() === raw.branchName?.toLowerCase());
      const academicYear = academicYears.find((y: any) => y.name.toLowerCase() === raw.academicYearName?.toLowerCase());
      const cls = classes.find((c: any) => c.name.toLowerCase() === raw.className?.toLowerCase());
      const section = sections.find((s: any) => s.name.toLowerCase() === raw.sectionName?.toLowerCase() && s.classId === cls?.id);

      if (!branch) throw new Error(`Branch '${raw.branchName}' not found in system.`);
      if (!academicYear) throw new Error(`Academic Year '${raw.academicYearName}' not found.`);
      if (!cls) throw new Error(`Class '${raw.className}' not found.`);

      // Prepare data for Zod validation
      const admissionData = {
        ...raw,
        branchId: branch.id,
        academicYearId: academicYear.id,
        classId: cls.id,
        sectionId: section?.id,
        admissionDate: raw.admissionDate || new Date().toISOString().split('T')[0],
        admissionNumber: raw.admissionNumber?.toString(),
        studentCode: raw.studentCode?.toString(),
        // Defaulting numeric fields if missing
        tuitionFee: parseFloat(raw.tuitionFee) || 0,
        admissionFee: parseFloat(raw.admissionFee) || 0,
        transportFee: parseFloat(raw.transportFee) || 0,
        aadhaarVerified: false,
        minorityStatus: false,
        bplStatus: false,
        transportRequired: !!raw.transportFee && parseFloat(raw.transportFee) > 0,
      };

      // 3. Deep Validation (Zod)
      const validated = studentAdmissionSchema.parse(admissionData);

      // Check for Existing Admission Number in DB
      if (validated.admissionNumber) {
        const existing = await prisma.student.findFirst({
          where: { schoolId, admissionNumber: validated.admissionNumber }
        });
        if (existing) throw new Error(`Admission Number '${validated.admissionNumber}' already exists.`);
      }

      // 4. Transactional Import
      await prisma.$transaction(async (tx: any) => {
        const student = await tx.student.create({
          data: {
            schoolId,
            admissionNumber: validated.admissionNumber,
            studentCode: validated.studentCode,
            firstName: validated.firstName,
            middleName: validated.middleName,
            lastName: validated.lastName,
            dob: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
            gender: validated.gender,
            bloodGroup: validated.bloodGroup,
            category: validated.category,
            aadhaarNumber: validated.aadhaarNumber,
            motherTongue: validated.motherTongue,
            placeOfBirth: validated.placeOfBirth,
            birthCertNo: validated.birthCertNo,
            usnSrnNumber: validated.usnSrnNumber,
            phone: validated.phone,
            email: validated.email,
            status: "Active"
          }
        });

        await tx.academicRecord.create({
          data: {
            studentId: student.id,
            schoolId,
            branchId: validated.branchId,
            academicYear: validated.academicYearId,
            classId: validated.classId,
            sectionId: validated.sectionId,
            rollNumber: validated.rollNumber,
            admissionDate: new Date(validated.admissionDate),
          }
        });

        await tx.financialRecord.create({
          data: {
            studentId: student.id,
            schoolId,
            tuitionFee: validated.tuitionFee,
            admissionFee: validated.admissionFee,
            transportFee: validated.transportFee,
            netTuition: validated.tuitionFee, // Initial net
          }
        });

        if (validated.currentAddress || validated.permanentAddress) {
          await tx.address.create({
            data: {
              studentId: student.id,
              currentAddress: validated.currentAddress,
              permanentAddress: validated.permanentAddress,
              city: validated.city,
              state: validated.state,
              pincode: validated.pinCode
            }
          });
        }
      });

      result.insertedCount++;

    } catch (err: any) {
      result.skippedCount++;
      const reason = err.issues 
        ? err.issues.map((iss: any) => `${iss.path.join('.')}: ${iss.message}`).join("; ")
        : err.message;
      result.errors.push({ row: rowNum, name: studentName, reason });
    }
  }

  if (result.insertedCount > 0) {
    await logActivity({
      schoolId,
      userId: "MIGRATION_BOT",
      entityType: "STUDENT",
      entityId: "BULK",
      action: "IMPORT",
      details: `Bulk migrated ${result.insertedCount} students via Professional Template.`
    });
  }

  return result;
}
