"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { v4 as uuidv4 } from "uuid";

export interface StudentImportRow {
  studentCode: string;
  firstName: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  className: string; // Class code or class name e.g. "Class 1"
  sectionName?: string; // Section name e.g. "A"
  guardianFirstName: string;
  guardianLastName?: string;
  guardianPhone: string;
  guardianEmail?: string;
  relationType?: string; // "FATHER", "MOTHER", "GUARDIAN"
  address?: string;
}

export async function importStudentsAction(rows: StudentImportRow[], targetSchoolId?: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Staff credentials required." };
    }

    const schoolId = targetSchoolId || identity.schoolId;
    const branchId = identity.branchId;

    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true }
    });
    if (!activeAY) {
      return { success: false, error: "No active academic year found. Please configure academic year before importing." };
    }

    let successCount = 0;
    const errors: string[] = [];

    // Run row-by-row mapping transactionally to be highly robust and report issues
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 2; // offset header row

      try {
        if (!row.firstName || !row.studentCode || !row.className || !row.guardianFirstName || !row.guardianPhone) {
          errors.push(`Row ${rowNum}: Missing required columns (First Name, Admission Code, Class, Guardian Name, Guardian Phone).`);
          continue;
        }

        // 1. Resolve Class
        let targetClass = await prisma.class.findFirst({
          where: { schoolId, name: { equals: row.className.trim(), mode: "insensitive" } }
        });
        if (!targetClass) {
          // Try code match
          targetClass = await prisma.class.findFirst({
            where: { schoolId, code: { equals: row.className.trim(), mode: "insensitive" } }
          });
        }
        if (!targetClass) {
          errors.push(`Row ${rowNum}: Class "${row.className}" does not exist in branch configurations.`);
          continue;
        }

        // 2. Resolve Section
        let targetSection = null;
        if (row.sectionName) {
          targetSection = await prisma.section.findFirst({
            where: {
              classId: targetClass.id,
              name: { equals: row.sectionName.trim(), mode: "insensitive" }
            }
          });
          if (!targetSection) {
            // Fallback or create section if missing
            targetSection = await prisma.section.create({
              data: {
                classId: targetClass.id,
                name: row.sectionName.trim().toUpperCase(),
                capacity: 40,
                schoolId,
                branchId
              }
            });
          }
        }

        // 3. Check for student duplication
        const existingStudent = await prisma.student.findFirst({
          where: { studentCode: row.studentCode.trim() }
        });
        if (existingStudent) {
          errors.push(`Row ${rowNum}: Student admission code "${row.studentCode}" is already registered.`);
          continue;
        }

        // 4. Perform DB inserts
        await prisma.$transaction(async (tx: any) => {
          // A. Create Student Profile
          const student = await tx.student.create({
            data: {
              studentCode: row.studentCode.trim(),
              bookId: row.studentCode.trim(),
              firstName: row.firstName.trim(),
              lastName: row.lastName?.trim() || null,
              dob: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
              gender: row.gender?.trim() || "MALE",
              status: "Active",
              schoolId,
              branchId
            }
          });

          // B. Create placement record (AcademicRecord & StudentAcademicYear)
          await tx.academicRecord.create({
            data: {
              studentId: student.id,
              classId: targetClass.id,
              sectionId: targetSection?.id || null,
              academicYear: activeAY.name,
              schoolId,
              branchId
            }
          });

          await tx.studentAcademicYear.create({
            data: {
              id: uuidv4(),
              studentId: student.id,
              classId: targetClass.id,
              sectionId: targetSection?.id || null,
              academicYearId: activeAY.id,
              promotionStatus: "PENDING",
              renewalStatus: "PENDING",
              admissionNumber: row.studentCode.trim(),
              studentCode: row.studentCode.trim(),
              schoolId,
              branchId
            }
          });

          // C. Resolve or Create Guardian
          const normPhone = row.guardianPhone.trim().replace(/\s+/g, "");
          const normEmail = row.guardianEmail?.trim().toLowerCase() || null;

          let guardian = await tx.guardian.findFirst({
            where: {
              OR: [
                { phone: normPhone },
                normEmail ? { email: normEmail } : undefined
              ].filter(Boolean) as any
            }
          });

          if (!guardian) {
            guardian = await tx.guardian.create({
              data: {
                firstName: row.guardianFirstName.trim(),
                lastName: row.guardianLastName?.trim() || null,
                phone: normPhone,
                email: normEmail,
                schoolId
              }
            });
          }

          // D. Create StudentGuardian linkage
          await tx.studentGuardian.create({
            data: {
              studentId: student.id,
              guardianId: guardian.id,
              relationType: row.relationType?.trim().toUpperCase() || "GUARDIAN",
              isPrimaryGuardian: true,
              feeResponsibility: true,
              communicationPreference: "SMS",
              activeStatus: "ACTIVE",
              schoolId,
              branchId
            }
          });

          // E. Create Address record if available
          if (row.address) {
            await tx.address.create({
              data: {
                studentId: student.id,
                currentAddress: row.address.trim()
              }
            });
          }
        });

        successCount++;
      } catch (err: any) {
        console.error(`Error importing row ${rowNum}:`, err);
        errors.push(`Row ${rowNum}: Transaction failed (${err.message}).`);
      }
    }

    return {
      success: true,
      successCount,
      failureCount: errors.length,
      errors
    };
  } catch (error: any) {
    console.error("Bulk Import Error:", error);
    return { success: false, error: "System failed to process import file." };
  }
}
