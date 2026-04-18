"use server";
import crypto from "crypto";

import prisma from "@/lib/prisma";
import { studentAdmissionSchema } from "@/types/student";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { serializeDecimal } from "../utils/serialization";
import { getTenancyFilters } from "../utils/tenancy";
import { CounterService } from "../services/counter-service";
import { SovereignEventHub } from "../events/event-hub";
import { initAdmissionHandlers } from "../events/handlers/admission-handlers";

// Law 9 Compliance: Initialize handlers at module load-time (or centralized boot)
initAdmissionHandlers();

/**
 * Cleans form data by converting empty strings to null.
 * Ensures strict data integrity for optional fields.
 */
function formDataCleaner(data: any) {
  const cleaned: any = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value === "" || value === undefined) {
      cleaned[key] = null;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = formDataCleaner(value);
    } else {
      cleaned[key] = value;
    }
  });
  return cleaned;
}

/**
 * Processes a new student admission.
 * Handles transactional inserts across 10+ tables with strict tenancy isolation.
 */
export async function submitAdmissionAction(formData: any, isProvisional: boolean = false) {
  try {
    // 1. Get Tenant Context (Guards against cross-school access)
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    // 2. Clean and Validate the data
    const cleanedData = formDataCleaner(formData);
    const validatedData = studentAdmissionSchema.parse(cleanedData);
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
    
    // Fetch Current Academic Year if not provided
    let currentAYId = validatedData.academicYearId;
    let currentAYName = "";
    
    if (currentAYId) {
      const ay = await prisma.academicYear.findUnique({ where: { id: currentAYId }, select: { name: true } });
      currentAYName = ay?.name || "2026-27";
    } else {
      const activeYear = await prisma.academicYear.findFirst({
        where: { schoolId: context.schoolId, isCurrent: true },
        select: { id: true, name: true }
      });
      currentAYId = activeYear?.id || "2026-27";
      currentAYName = activeYear?.name || "2026-27";
    }
    
    // Fetch School and Branch Codes for ID generation
    const [school, branch] = await Promise.all([
      prisma.school.findUnique({ where: { id: context.schoolId }, select: { code: true } }),
      prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } })
    ]);

    if (!school || !branch) {
      throw new Error("Failed to retrieve school or branch codes for ID generation.");
    }

    let admissionNumber = null;
    let studentCode = null;

    if (!isProvisional) {
      admissionNumber = await CounterService.generateAdmissionNumber({
        schoolId: context.schoolId,
        schoolCode: school.code,
        branchId: branchId,
        branchCode: branch.code,
        year: currentAYName,
      });

      studentCode = await CounterService.generateStudentCode({
        schoolId: context.schoolId,
        schoolCode: school.code,
        branchId: branchId,
        branchCode: branch.code,
        year: currentAYName
      });
    }

    const registrationId = isProvisional
      ? await CounterService.generateProvisionalId({ 
          schoolId: context.schoolId, 
          schoolCode: school.code,
          branchId: branchId,
          branchCode: branch.code 
        })
      : await CounterService.generateRegistrationId({ 
          schoolId: context.schoolId, 
          schoolCode: school.code,
          branchId: branchId,
          branchCode: branch.code 
        });

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
      const student = await tx.student.create({
        data: {
          registrationId,
          admissionNumber,
          studentCode,
          schoolId: context.schoolId,
          branchId: branchId,
          status: isProvisional ? "Provisional" : "Active",
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
              academicYear: currentAYId, // Scalar string in this model
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
              academicYear: { connect: { id: currentAYId } },
              class: { connect: { id: validatedData.classId } },
              section: validatedData.sectionId ? { connect: { id: validatedData.sectionId } } : undefined,
              rollNumber: validatedData.rollNumber,
              promotionStatus: "New Admission",
              admissionDate: validatedData.admissionDate ? new Date(validatedData.admissionDate) : new Date(),
              admissionNumber,
              studentCode,
              branch: { connect: { id: branchId } }
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
              fatherAadhaar: validatedData.fatherAadhaar,
              motherName: validatedData.motherName,
              motherPhone: validatedData.motherPhone,
              motherAltPhone: validatedData.motherAlternatePhone,
              motherEmail: validatedData.motherEmail,
              motherOccupation: validatedData.motherOccupation,
              motherQualification: validatedData.motherQualification,
              motherAadhaar: validatedData.motherAadhaar,
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

      // 6. NEW: Accrual Accounting Injection (Income Recognition)
      const coaAR = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });
      const coaTuition = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4100" } }) 
        || await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "3001" } });
      const coaAdmission = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4200" } })
        || await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "3002" } });

      if (coaAR && coaTuition) {
        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            financialYearId: currentAYId,
            entryType: "ADMISSION_ACCRUAL",
            totalDebit: annualFee,
            totalCredit: annualFee,
            description: `Initial Fee Accrual for Student: ${admissionNumber} (${validatedData.firstName})`,
            lines: {
              create: [
                { accountId: coaAR.id, debit: annualFee, credit: 0 },
                { accountId: coaTuition.id, debit: 0, credit: validatedData.tuitionFee || 0 },
                ...(coaAdmission && validatedData.admissionFee ? [{ accountId: coaAdmission.id, debit: 0, credit: validatedData.admissionFee }] : []),
              ]
            }
          }
        });

        // Update balance on Receivable account
        await tx.chartOfAccount.update({ 
          where: { id: coaAR.id }, 
          data: { currentBalance: { increment: annualFee } } 
        });
      }

      return student;
    }, {
      timeout: 30000 // 30 seconds
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
 * SOVEREIGN ARCHITECT VERSION (v7.0)
 * Processes a new student admission with Ledger-First Atomic Integrity.
 */
export async function submitStandardizedAdmissionAction(formData: any, isProvisional: boolean = false) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    const cleanedData = formDataCleaner(formData);
    const validatedData = studentAdmissionSchema.parse(cleanedData);
    const branchId = validatedData.branchId || context.branchId;

    // 1. FETCH AUTHORITATIVE FEE STRUCTURE (Architect Audit)
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: validatedData.feeScheduleId as string, schoolId: context.schoolId },
      include: { components: { include: { masterComponent: true } } }
    });

    if (!feeStructure) throw new Error("CRITICAL_CONFIG_ERROR: No valid fee structure associated with this admission.");

    const year = new Date().getFullYear().toString();
    const [school, branch, activeAY] = await Promise.all([
      prisma.school.findUnique({ where: { id: context.schoolId }, select: { code: true } }),
      prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } }),
      prisma.academicYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } })
    ]);

    if (!activeAY) throw new Error("No active academic year found for enrollment.");

    const admissionNumber = !isProvisional ? await CounterService.generateAdmissionNumber({
      schoolId: context.schoolId, schoolCode: school!.code, branchId, branchCode: branch!.code, year: activeAY.name
    }) : null;

    const studentCode = !isProvisional ? await CounterService.generateStudentCode({
      schoolId: context.schoolId, schoolCode: school!.code, branchId, branchCode: branch!.code, year: activeAY.name
    }) : null;

    const registrationId = isProvisional 
      ? await CounterService.generateProvisionalId({ schoolId: context.schoolId, schoolCode: school!.code, branchId, branchCode: branch!.code })
      : await CounterService.generateRegistrationId({ schoolId: context.schoolId, schoolCode: school!.code, branchId, branchCode: branch!.code });

    // 2. ATOMIC TRANSACTION (Sovereign Shield)
    const result = await prisma.$transaction(async (tx: any) => {
      // Create Student Profile
      const student = await tx.student.create({
        data: {
          registrationId, admissionNumber, studentCode, schoolId: context.schoolId, branchId,
          status: isProvisional ? "Provisional" : "Active",
          firstName: validatedData.firstName, lastName: validatedData.lastName,
          middleName: validatedData.middleName,
          dob: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
          gender: validatedData.gender, aadhaarNumber: validatedData.aadhaarNumber,
          
          academic: {
            create: {
              schoolId: context.schoolId, branchId, academicYear: activeAY.id,
              classId: validatedData.classId, sectionId: validatedData.sectionId,
              admissionDate: new Date(),
              penNumber: validatedData.penNumber,
              apaarId: validatedData.apaarId,
              stsId: validatedData.stsId,
              samagraId: validatedData.samagraId,
              biometricId: validatedData.biometricId
            }
          },

          // 3. CREATE FINANCIAL SNAPSHOT (Immutable Agreement)
          financial: {
            create: {
              schoolId: context.schoolId, branchId,
              feeStructureId: feeStructure.id,
              paymentType: validatedData.paymentType || "Term",
              tuitionFee: feeStructure.totalAmount, // Snapshot of current total
              totalDiscount: 0,
            }
          },

          history: {
            create: {
              id: crypto.randomUUID(),
              schoolId: context.schoolId,
              branchId,
              academicYearId: activeAY.id,
              classId: validatedData.classId,
              sectionId: validatedData.sectionId,
              admissionNumber,
              studentCode,
              admissionDate: new Date(),
              promotionStatus: "NEW_ADMISSION",
              isGenesis: true
            }
          },

          family: { 
            create: {
               schoolId: context.schoolId,
               branchId,
               fatherName: validatedData.fatherName,
               fatherPhone: validatedData.fatherPhone,
               fatherAltPhone: validatedData.fatherAlternatePhone,
               fatherEmail: validatedData.fatherEmail,
               fatherOccupation: validatedData.fatherOccupation,
               fatherQualification: validatedData.fatherQualification,
               fatherAadhaar: validatedData.fatherAadhaar,
               motherName: validatedData.motherName,
               motherPhone: validatedData.motherPhone,
               motherAltPhone: validatedData.motherAlternatePhone,
               motherEmail: validatedData.motherEmail,
               motherOccupation: validatedData.motherOccupation,
               motherQualification: validatedData.motherQualification,
               motherAadhaar: validatedData.motherAadhaar,
               whatsappNumber: validatedData.whatsappNumber,
               emergencyName: validatedData.emergencyContactName,
               emergencyPhone: validatedData.emergencyContactPhone,
               emergencyRelation: validatedData.emergencyContactRelation,
            } 
          },
          address: { 
            create: {
               schoolId: context.schoolId,
               branchId,
               currentAddress: validatedData.currentAddress,
               permanentAddress: validatedData.permanentAddress,
               city: validatedData.city,
               state: validatedData.state,
               country: validatedData.country,
               pincode: validatedData.pinCode
            } 
          }
        }
      });

      // 4. CREATE LEDGER ENTRIES (The Single Source of Truth)
      const ledgerCharges = feeStructure.components.map((comp: any) => ({
        studentId: student.id,
        schoolId: context.schoolId,
        branchId: branchId,
        academicYearId: activeAY.id,
        type: "CHARGE",
        amount: comp.amount,
        reason: `${comp.masterComponent.name} (${feeStructure.name})`,
        createdBy: context.staffId || "SYSTEM_ENROLLMENT"
      }));

      await tx.ledgerEntry.createMany({ data: ledgerCharges });

      const [receivableAccount, incomeAccount, activeFY] = await Promise.all([
        tx.chartOfAccount.findFirst({ where: { accountCode: "1200", schoolId: context.schoolId } }),
        tx.chartOfAccount.findFirst({ 
          where: { 
            OR: [{ accountCode: "4100" }, { accountCode: "3001" }], 
            schoolId: context.schoolId 
          } 
        }),
        tx.financialYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } })
      ]);

      if (!receivableAccount || !incomeAccount || !activeFY) {
        throw new Error(`CRITICAL_ACCOUNTING_ERROR: Mandatory financial configuration (Receivables/Income/FinancialYear) is missing for school: ${context.schoolId}`);
      }

      await tx.journalEntry.create({
        data: {
          schoolId: context.schoolId,
          branchId: branchId,
          financialYearId: activeFY.id, // Now using verified FinancialYear ID
          entryType: "ADMISSION_ACCRUAL",
          totalDebit: feeStructure.totalAmount,
          totalCredit: feeStructure.totalAmount,
          description: `Initial Charge Accrual for Student: ${admissionNumber || registrationId}`,
          lines: {
            create: [
              { accountId: receivableAccount.id, debit: feeStructure.totalAmount, credit: 0 },
              { accountId: incomeAccount.id, debit: 0, credit: feeStructure.totalAmount }
            ]
          }
        }
      });

      return student;
    }, { timeout: 30000 });

    revalidatePath("/admin/students");
    return { success: true, data: serializeDecimal(result) };

  } catch (error: any) {
    console.error("Architect Admission Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * confirmStudentAdmission
 * 
 * Promotes a Provisional student to Active status. 
 * Generates the formal Admission Number and Student Code.
 */
export async function confirmStudentAdmission(studentId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    const student = await prisma.student.findUnique({
      where: { id: studentId, schoolId: context.schoolId },
      include: { academic: true }
    });

    if (!student) throw new Error("Student not found.");
    if (student.status !== "Provisional") throw new Error("Admission already confirmed or student not in provisional state.");

    const [school, branch, activeAY] = await Promise.all([
      prisma.school.findUnique({ where: { id: context.schoolId }, select: { code: true } }),
      prisma.branch.findUnique({ where: { id: student.branchId! }, select: { code: true } }),
      prisma.academicYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } })
    ]);

    if (!activeAY) throw new Error("Active academic year not found.");

    // Generate Formal IDs
    const admissionNumber = await CounterService.generateAdmissionNumber({
      schoolId: context.schoolId, schoolCode: school!.code, 
      branchId: student.branchId!, branchCode: branch!.code, year: activeAY.name
    });

    const studentCode = await CounterService.generateStudentCode({
      schoolId: context.schoolId, schoolCode: school!.code, 
      branchId: student.branchId!, branchCode: branch!.code, year: activeAY.name
    });

    const result = await prisma.student.update({
      where: { id: studentId },
      data: {
        status: "Active",
        admissionNumber,
        studentCode,
        academic: {
          updateMany: {
            where: { studentId },
            data: { admissionDate: new Date() }
          }
        }
      }
    });

    revalidatePath("/admin/students");
    return { success: true, data: serializeDecimal(result) };

  } catch (error: any) {
    return { success: false, error: error.message };
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
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tenancy = getTenancyFilters(context);
    
    const students = await prisma.student.findMany({
      where: {
        ...tenancy,
        AND: [
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
        attendance: {
          where: {
            date: today,
            session: "Morning" // Can be made dynamic later
          },
          take: 1
        }
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
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    const tenancy = getTenancyFilters(context);
    
    const student = await prisma.student.findFirst({
      where: { 
        id: studentId,
        ...tenancy
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
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
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
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
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
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
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
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
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
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
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

/**
 * Fetches high-level statistics for the Student Hub Dashboard.
 */
export async function getStudentHubStats() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const tenancy = getTenancyFilters(context);

    // Note: Since 'academic' is a relation, getTenancyFilters handles it for the main model.
    // However, some queries below target 'academic' directly or via relation.
    // getTenancyFilters returns { schoolId, branchId } for Student model.
    
    const [totalStudents, newAdmissions, genderCounts, attendanceTodayRatio] = await Promise.all([
      prisma.student.count({
        where: { 
          schoolId: context.schoolId,
          ...(context.branchId && context.branchId !== 'GLOBAL' ? { branchId: context.branchId } : {}),
          status: "Active"
        }
      }),
      prisma.student.count({
        where: { 
          schoolId: context.schoolId,
          ...(context.branchId && context.branchId !== 'GLOBAL' ? { branchId: context.branchId } : {}),
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.student.groupBy({
        by: ['gender'],
        where: { 
          schoolId: context.schoolId,
          ...(context.branchId && context.branchId !== 'GLOBAL' ? { branchId: context.branchId } : {}),
          status: "Active"
        },
        _count: true
      }),
      prisma.studentAttendance.count({
        where: {
          schoolId: context.schoolId,
          ...(context.branchId !== "GLOBAL" ? { branchId: context.branchId } : {}),
          date: { gte: today },
          status: "Present"
        }
      })
    ]);

    return {
      success: true,
      data: {
        totalStudents,
        newAdmissions,
        attendanceToday: totalStudents > 0 ? ((attendanceTodayRatio / totalStudents) * 100).toFixed(1) + "%" : "0%",
        genderDistribution: genderCounts.map((g: any) => ({
          label: g.gender || "Other",
          count: g._count,
          percentage: totalStudents > 0 ? Math.round((g._count / totalStudents) * 100) : 0
        })),
        enrollmentTrends: [
          { month: "Jan", count: 120 },
          { month: "Feb", count: 145 },
          { month: "Mar", count: 180 }
        ]
      }
    };
  } catch (error) {
    console.error("Student Hub Stats Error:", error);
    return { success: false, error: "Failed to load hub statistics." };
  }
}

/**
 * Public Enquiry Action: Allows parents to submit details without login.
 * Standalone session-free logic to avoid getTenantContext restrictions.
 */
export async function publicSubmitEnquiryAction(formData: any) {
  console.log("🔵 DEBUG: publicSubmitEnquiryAction received raw data:", formData);
  try {
    const { publicEnquirySchema } = await import("@/types/student");
    const cleanedData = formDataCleaner(formData);
    console.log("🔵 DEBUG: data after formDataCleaner:", cleanedData);
    
    // 1. Resolve Branch Identity (PRIORITY: explicitly passed branchId)
    // We use the full unique branch ID to prevent school-to-school leakage
    const branchId = cleanedData.branchId;
    if (!branchId) {
      return { success: false, error: "Missing Branch Identification (ID)." };
    }

    console.log("🔵 DEBUG: Resolving branch context with ID:", branchId);

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        school: { select: { code: true } }
      }
    });

    console.log("🔵 DEBUG: Branch lookup result:", branch);

    if (!branch) {
      console.warn("🔴 DEBUG ERROR: Branch not found for ID:", branchId);
      return { success: false, error: `Invalid branch identification: ${branchId}` };
    }

    // 2. Validate with Lean Public Schema
    const validatedData = publicEnquirySchema.parse(cleanedData);
    console.log("🔵 DEBUG: data after Zod parse:", validatedData);

    const schoolId = branch.schoolId;

    // 3. Resolve Current Academic Year
    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true }
    });

    console.log("🔵 DEBUG: Active Academic Year lookup result:", activeAY);

    if (!activeAY) {
      console.warn("🔴 DEBUG ERROR: No active academic year found for schoolId:", schoolId);
      return { success: false, error: "Enrollment is currently closed for this branch." };
    }

    // 4. Atomic Transaction for Enquiry Record (CRM Staging)
    console.log("🔵 DEBUG: Starting database transaction for Enquiry...");
    const enquiry = await prisma.enquiry.create({
      data: {
        schoolId,
        branchId,
        studentFirstName: validatedData.firstName,
        studentLastName: validatedData.lastName,
        parentName: validatedData.fatherName,
        parentPhone: validatedData.fatherPhone,
        parentEmail: validatedData.fatherEmail || null,
        requestedClass: (await prisma.class.findUnique({ where: { id: validatedData.classId }, select: { name: true } }))?.name || "Unknown",
        academicYear: activeAY.name,
        aadhaarNumber: validatedData.aadhaarNumber || null,
        status: "New", // Enterprise Lifecycle Start
        source: "Public Portal"
      }
    });

    console.log("✅ DEBUG: Enquiry created successfully:", enquiry.id);

    return { 
      success: true, 
      data: { 
        id: enquiry.id,
        name: `${enquiry.studentFirstName} ${enquiry.studentLastName || ""}`.trim()
      } 
    };

  } catch (error: any) {
    console.error("🔴 DEBUG ERROR: Public Enquiry catch block triggered:", error);
    
    // Hardened Zod Error Extraction with Path info
    if (error.name === "ZodError" || error.issues) {
      const issues = error.issues || error.errors || [];
      const messages = issues.map((i: any) => {
        const path = i.path ? i.path.join(".") : "unknown";
        return `[${path}]: ${i.message}`;
      }).join("; ");
      
      console.warn("🔴 DEBUG: Zod Validation Issues:", messages);
      return { success: false, error: `Validation Error: ${messages}` };
    }

    return { success: false, error: error.message || "Failed to submit enquiry. Please verify branch connection." };
  }
}

/**
 * Promotes a Provisional (Temp) student to Active (Official).
 * Generates official IDs and updates status.
 */
export async function promoteStudentAction(studentId: string, tx?: any) {
  const db = tx || prisma;
  
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { academic: true }
    });

    if (!student || student.status !== "Provisional") {
      return { success: false, error: "Student not found or already active." };
    }

    const schoolId = student.schoolId;
    const branchId = student.branchId || "GLOBAL";

    // Fetch Codes
    const [school, branch] = await Promise.all([
      db.school.findUnique({ where: { id: schoolId }, select: { code: true } }),
      db.branch.findUnique({ where: { id: branchId }, select: { code: true } })
    ]);

    const activeAY = await db.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { name: true }
    });

    const yearSuffix = activeAY?.name || new Date().getFullYear().toString();

    // Generate Official IDs
    const admissionNumber = await CounterService.generateAdmissionNumber({
      schoolId,
      schoolCode: school?.code || schoolId,
      branchId,
      branchCode: branch?.code || "MAIN",
      year: yearSuffix
    }, db);

    const studentCode = await CounterService.generateStudentCode({
      schoolId,
      schoolCode: school?.code || schoolId,
      branchId,
      branchCode: branch?.code || "MAIN",
      year: yearSuffix
    }, db);

    // Generate Permanent Registration ID (Upgrade from PROV- to STU-)
    const registrationId = await CounterService.generateRegistrationId({
      schoolId,
      schoolCode: school?.code || schoolId,
      branchId,
      branchCode: branch?.code || "MAIN"
    }, db);

    // Update Student Record (Status move to Active + ID Upgrade)
    await db.student.update({
      where: { id: studentId },
      data: {
        registrationId,
        status: "Active",
      }
    });

    // Update AcademicHistory (Set Official IDs)
    // Find the latest history record (should be the one created during enquiry)
    const latestHistory = await db.academicHistory.findFirst({
        where: { studentId },
        orderBy: { createdAt: 'desc' }
    });

    if (latestHistory) {
        await db.academicHistory.update({
            where: { id: latestHistory.id },
            data: {
                admissionNumber,
                studentCode,
                promotionStatus: "ActiveAdmission" // Updated from In-Progress
            }
        });
    }

    return { 
      success: true, 
      data: { admissionNumber, studentCode } 
    };

  } catch (error: any) {
    console.error("Promotion Error:", error);
    return { success: false, error: error.message };
  }
}
