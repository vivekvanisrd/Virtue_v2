"use server";

import prisma from "@/lib/prisma";
import { studentAdmissionSchema } from "@/types/student";
import { revalidatePath } from "next/cache";
import { getTenantContext, getTenancyFilters } from "../utils/tenant-context";
import { CounterService } from "../services/counter-service";

/**
 * Processes a new student admission.
 * Handles transactional inserts across 10+ tables with strict tenancy isolation.
 */
export async function submitAdmissionAction(formData: any) {
  try {
    // 1. Get Tenant Context (Guards against cross-school access)
    const context = await getTenantContext();
    
    // 2. Validate the data
    const validatedData = studentAdmissionSchema.parse(formData);
    const branchId = validatedData.branchId || context.branchId;

    // NEW: Aadhaar Uniqueness Check
    if (validatedData.aadhaarNumber) {
      const existing = await prisma.student.findFirst({
        where: {
          schoolId: context.schoolId,
          aadhaarNumber: validatedData.aadhaarNumber
        }
      });
      if (existing) {
        return { 
          success: false, 
          error: `CRITICAL: A student with Aadhaar ${validatedData.aadhaarNumber} is already admitted. Duplicate prevention active.` 
        };
      }
    }

    // 3. Scoped ID Generation (Spec V1 Alignment)
    const year = new Date().getFullYear().toString();
    const currentAY = validatedData.academicYearId || "VR-AY-2026-27";
    
    // Fetch School and Branch Codes for ID generation
    const [school, branch] = await Promise.all([
      prisma.school.findUnique({ where: { id: context.schoolId }, select: { code: true } }),
      prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } })
    ]);

    if (!school || !branch) {
      throw new Error("Failed to retrieve school or branch codes for ID generation.");
    }

    const admissionNumber = await CounterService.generateAdmissionNumber({
      schoolId: context.schoolId,
      schoolCode: school.code,
      branchId: branchId,
      branchCode: branch.code,
      year: year,
    });

    const studentCode = await CounterService.generateStudentCode(
      context.schoolId,
      school.code,
      year
    );

    const historyId = `VR-SAH-${year}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

    // 4. Financial Logic: Sum granular fees
    const annualFee = 
      (validatedData.tuitionFee || 0) + 
      (validatedData.admissionFee || 0) + 
      (validatedData.libraryFee || 0) +
      (validatedData.labFee || 0) +
      (validatedData.sportsFee || 0) +
      (validatedData.developmentFee || 0) +
      (validatedData.examFee || 0) +
      (validatedData.computerFee || 0) +
      (validatedData.miscellaneousFee || 0) +
      (validatedData.cautionDeposit || 0);

    const term1 = annualFee * 0.50;
    const term2 = annualFee * 0.25;
    const term3 = annualFee * 0.25;

    // 5. Transactional Insert (Atomic)
    const result = await prisma.$transaction(async (tx: any) => {
      return await tx.student.create({
        data: {
          studentCode,
          admissionNumber,
          schoolId: context.schoolId,
          firstName: validatedData.firstName,
          middleName: validatedData.middleName || null,
          lastName: validatedData.lastName,
          email: (validatedData as any).email || null,
          phone: validatedData.phone || null,
          dob: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
          gender: validatedData.gender,
          bloodGroup: validatedData.bloodGroup,
          category: validatedData.category,
          aadhaarNumber: validatedData.aadhaarNumber,
          aadhaarVerified: validatedData.aadhaarVerified,
          motherTongue: validatedData.motherTongue,
          placeOfBirth: validatedData.placeOfBirth,
          birthCertNo: validatedData.birthCertNo,
          usnSrnNumber: validatedData.usnSrnNumber,
          minorityStatus: validatedData.minorityStatus,
          bplStatus: validatedData.bplStatus,
          disabilityType: validatedData.disabilityType,
          
          academic: {
            create: {
              school: { connect: { id: context.schoolId } },
              academicYear: currentAY, // Scalar string in this model
              class: validatedData.classId ? { connect: { id: validatedData.classId } } : undefined,
              section: validatedData.sectionId ? { connect: { id: validatedData.sectionId } } : undefined,
              branch: { connect: { id: branchId } },
              admissionDate: validatedData.admissionDate ? new Date(validatedData.admissionDate) : new Date(),
              rollNumber: validatedData.rollNumber,
              biometricId: validatedData.biometricId,
              penNumber: validatedData.penNumber,
              apaarId: validatedData.apaarId,
              samagraId: validatedData.samagraId,
              stsId: validatedData.stsId,
              tcNumber: validatedData.tcNumber,
              admissionType: validatedData.admissionType,
              boardingType: validatedData.boardingType,
              group: validatedData.group,
              subcategory: validatedData.subcategory,
            }
          },

          history: {
            create: {
              id: historyId,
              school: { connect: { id: context.schoolId } },
              academicYear: { connect: { id: currentAY } },
              class: { connect: { id: validatedData.classId } },
              section: validatedData.sectionId ? { connect: { id: validatedData.sectionId } } : undefined,
              rollNumber: validatedData.rollNumber,
              promotionStatus: "New Admission",
              admissionDate: validatedData.admissionDate ? new Date(validatedData.admissionDate) : new Date(),
            }
          },

          family: {
            create: {
              fatherName: validatedData.fatherName,
              fatherPhone: validatedData.fatherPhone,
              fatherAltPhone: validatedData.fatherAlternatePhone,
              fatherEmail: validatedData.fatherEmail,
              fatherOccupation: validatedData.fatherOccupation,
              fatherQualification: validatedData.fatherQualification,
              motherName: validatedData.motherName,
              motherPhone: validatedData.motherPhone,
              motherAltPhone: validatedData.motherAlternatePhone,
              motherEmail: validatedData.motherEmail,
              motherOccupation: validatedData.motherOccupation,
              motherQualification: validatedData.motherQualification,
              whatsappNumber: validatedData.whatsappNumber,
              emergencyName: validatedData.emergencyContactName,
              emergencyPhone: validatedData.emergencyContactPhone,
              emergencyRelation: validatedData.emergencyContactRelation,
            }
          },

          address: {
            create: {
              currentAddress: validatedData.currentAddress,
              permanentAddress: validatedData.permanentAddress,
              city: validatedData.city,
              state: validatedData.state,
              country: validatedData.country,
              pincode: validatedData.pinCode,
            }
          },

          financial: {
            create: {
              school: { connect: { id: context.schoolId } },
              feeStructure: validatedData.feeScheduleId ? { connect: { id: validatedData.feeScheduleId } } : undefined,
              paymentType: validatedData.paymentType,
              tuitionFee: validatedData.tuitionFee,
              admissionFee: validatedData.admissionFee,
              libraryFee: validatedData.libraryFee,
              labFee: validatedData.labFee,
              sportsFee: validatedData.sportsFee,
              developmentFee: validatedData.developmentFee,
              examFee: validatedData.examFee,
              computerFee: validatedData.computerFee,
              miscellaneousFee: validatedData.miscellaneousFee,
              cautionDeposit: validatedData.cautionDeposit,
              transportFee: validatedData.transportFee,
              term1Amount: term1,
              term2Amount: term2,
              term3Amount: term3,
              totalDiscount: 0,
            }
          },

          // Only create transport assignment if required
          ...(validatedData.transportRequired && validatedData.transportRouteId && validatedData.pickupStop && validatedData.dropStop ? {
            transportAssign: {
              create: {
                school: { connect: { id: context.schoolId } },
                route: { connect: { id: validatedData.transportRouteId } },
                pickupStop: { connect: { id: validatedData.pickupStop } },
                dropStop: { connect: { id: validatedData.dropStop } },
                monthlyFee: validatedData.transportMonthlyFee || 0,
                status: "Active"
              }
            }
          } : {}),

          ...(validatedData.medicalConditions || validatedData.allergies ? {
            medical: {
              create: {
                medicalConditions: validatedData.medicalConditions,
                allergies: validatedData.allergies,
                doctorName: validatedData.doctorName,
                doctorPhone: validatedData.doctorPhone
              }
            }
          } : {}),

          ...(validatedData.bankAccountNumber ? {
            bank: {
              create: {
                accountName: validatedData.bankAccountName || `${validatedData.firstName} ${validatedData.lastName}`,
                accountNumber: validatedData.bankAccountNumber,
                ifscCode: validatedData.bankIfscCode || "",
                bankBranch: validatedData.bankBranch || ""
              }
            }
          } : {}),

          ...(validatedData.previousSchool ? {
            previousSchool: {
              create: {
                schoolName: validatedData.previousSchool,
                previousClass: validatedData.previousClass,
                tcNumber: validatedData.previousTcNumber,
                dateOfLeaving: validatedData.dateOfLeaving ? new Date(validatedData.dateOfLeaving) : null,
                reasonForLeaving: validatedData.reasonForLeaving
              }
            }
          } : {}),
        }
      });
    });

    try {
      revalidatePath("/admin/students");
    } catch (e) {
      // Ignore revalidation errors in non-Next environments (e.g., verification scripts)
    }
    return { success: true, data: JSON.parse(JSON.stringify(result)) };

  } catch (error: any) {
    console.error("Admission Submission Error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to process admission. Please try again." 
    };
  }
}

/**
 * Fetches a list of students with strict tenancy isolation.
 */
export async function getStudentListAction(filters?: {
  search?: string;
  classId?: string;
  sectionId?: string;
  branchId?: string;
}) {
  try {
    const context = await getTenantContext();
    
    const students = await prisma.student.findMany({
      where: {
        schoolId: context.schoolId,
        AND: [
          context.branchId ? { academic: { branchId: context.branchId } } : {},
          filters?.search ? {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { admissionNumber: { contains: filters.search, mode: 'insensitive' } },
              { studentCode: { contains: filters.search, mode: 'insensitive' } },
            ]
          } : {},
          filters?.classId ? { academic: { classId: filters.classId } } : {},
          filters?.sectionId ? { academic: { sectionId: filters.sectionId } } : {},
          filters?.branchId ? { academic: { branchId: filters.branchId } } : {},
        ]
      },
      include: {
        academic: {
          include: {
            class: true,
            section: true,
            branch: true
          }
        },
        financial: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { success: true, data: JSON.parse(JSON.stringify(students)) };
  } catch (error: any) {
    console.error("Fetch Student List Error:", error);
    return { success: false, error: "Failed to fetch student list." };
  }
}

/**
 * Fetches the complete 360-degree profile with tenancy guards.
 */
export async function getStudentFullProfile(studentId: string) {
  try {
    const context = await getTenantContext();
    
    const student = await prisma.student.findFirst({
      where: { 
        id: studentId,
        schoolId: context.schoolId,
        ...(context.branchId ? { academic: { branchId: context.branchId } } : {})
      },
      include: {
        academic: { include: { class: true, section: true, branch: true } },
        family: true,
        address: true,
        financial: { include: { discounts: { include: { discountType: true } } } },
        transportAssign: { include: { route: true, pickupStop: true, dropStop: true } },
        medical: true,
        bank: true,
        previousSchool: true,
        documents: true,
        history: { include: { class: true, academicYear: { select: { name: true } } } },
      }
    });

    if (!student) {
      return { success: false, error: "Student not found or unauthorized access." };
    }

    return { success: true, data: JSON.parse(JSON.stringify(student)) };
  } catch (error: any) {
    console.error("Fetch Student Profile Error:", error);
    return { success: false, error: "Failed to fetch student profile." };
  }
}

/**
 * Live search for students by name or Aadhaar (Scoped to School)
 */
export async function searchStudentsAction(query: string) {
  try {
    const context = await getTenantContext();
    if (!query || query.length < 3) return { success: true, data: [] };

    const students = await prisma.student.findMany({
      where: {
        schoolId: context.schoolId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { aadhaarNumber: { contains: query, mode: 'insensitive' } },
        ]
      },
      include: {
        family: true,
        academic: {
          include: { class: true }
        }
      },
      take: 5
    });

    return { success: true, data: JSON.parse(JSON.stringify(students)) };
  } catch (error: any) {
    console.error("Search Students Error:", error);
    return { success: false, error: "Failed to search students." };
  }
}

/**
 * Updates an existing student profile with transactional safety and audit logging.
 */
export async function updateStudentProfile(studentId: string, data: any) {
  try {
    const context = await getTenantContext();
    
    // We update across multiple related tables
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Update Core Student Table
      const student = await tx.student.update({
        where: { id: studentId, schoolId: context.schoolId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          dob: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          bloodGroup: data.bloodGroup,
          category: data.category,
          aadhaarNumber: data.aadhaarNumber,
        }
      });

      // 2. Update Related Tables if data provided
      if (data.family) {
        await tx.familyDetail.update({
          where: { studentId },
          data: data.family
        });
      }

      if (data.address) {
        await tx.address.update({
          where: { studentId },
          data: data.address
        });
      }

      if (data.academic) {
        await tx.academicRecord.update({
          where: { studentId },
          data: data.academic
        });
      }

      return student;
    });

    // 3. Log the activity
    const { logActivity } = await import("../utils/audit-logger");
    await logActivity({
      schoolId: context.schoolId,
      userId: "ADMIN", // Placeholder until Auth passed
      entityType: "STUDENT",
      entityId: studentId,
      action: "UPDATE",
      details: `Updated profile details for ${result.firstName} ${result.lastName}`
    });

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Update Student Error:", error);
    return { success: false, error: "Critical failure during profile update." };
  }
}

/**
 * Attaches a document reference to a student profile.
 */
export async function uploadStudentDocument(studentId: string, doc: { fileName: string, fileType: string, fileUrl: string }) {
  try {
    const context = await getTenantContext();
    const newDoc = await prisma.document.create({
      data: {
        studentId,
        schoolId: context.schoolId,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileUrl: doc.fileUrl,
      }
    });

    const { logActivity } = await import("../utils/audit-logger");
    await logActivity({
      schoolId: context.schoolId,
      userId: "ADMIN",
      entityType: "STUDENT_DOC",
      entityId: studentId,
      action: "CREATE",
      details: `Uploaded document: ${doc.fileName}`
    });

    return { success: true, data: newDoc };
  } catch (error: any) {
    return { success: false, error: "Failed to link document." };
  }
}

/**
 * Marks a student as exited and prepares TC data.
 */
export async function processStudentExit(studentId: string, data: { reason: string, tcNumber: string, exitDate: string }) {
  try {
    const context = await getTenantContext();
    
    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true }
    });
    
    if (!academicYear) {
      return { success: false, error: "No active academic year found." };
    }

    await prisma.$transaction([
      prisma.student.update({
        where: { id: studentId, schoolId: context.schoolId },
        data: { status: "Exited" }
      }),
      prisma.academicRecord.update({
        where: { studentId },
        data: { 
          tcNumber: data.tcNumber,
        }
      }),
      prisma.academicHistory.updateMany({
        where: { studentId, academicYearId: academicYear.id },
        data: {
          exitDate: new Date(data.exitDate),
          tcNumber: data.tcNumber,
          leavingReason: data.reason,
          promotionStatus: "Exited"
        }
      })
    ]);

    const { logActivity } = await import("../utils/audit-logger");
    await logActivity({
      schoolId: context.schoolId,
      userId: "ADMIN",
      entityType: "STUDENT",
      entityId: studentId,
      action: "EXIT",
      details: `Processed withdrawal/TC for student. TC #${data.tcNumber}`
    });

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Failed to process student exit." };
  }
}

/**
 * Fetches data specifically formatted for TC Printing.
 */
export async function getTCPrintData(studentId: string) {
  try {
    const context = await getTenantContext();
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        academic: { include: { class: true, section: true } },
        family: true,
        address: true,
        history: { 
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!student) return { success: false, error: "Student not found." };

    return { 
      success: true, 
      data: {
        fullName: `${student.firstName} ${student.lastName}`,
        fatherName: student.family?.fatherName,
        motherName: student.family?.motherName,
        dob: student.dob,
        admissionDate: student.academic?.admissionDate,
        lastClass: student.academic?.class?.name,
        tcNumber: student.academic?.tcNumber || "TEMP/TC/" + Math.floor(Math.random() * 10000),
        exitDate: new Date(),
        // Additional school info can be fetched here
        schoolName: "Virtue Professional Academy", // Mocked for now
      }
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch TC data." };
  }
}
