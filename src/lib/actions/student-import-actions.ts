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
  tuitionFee?: string;
  admissionFee?: string;
  concession?: string;
  transportStop?: string;
  transportFee?: string;
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
        } else {
          // Auto-allocate first available section
          const classSections = await prisma.section.findMany({
            where: { classId: targetClass.id, schoolId },
            include: {
              _count: {
                select: { academicRecords: true }
              }
            }
          });
          if (classSections.length > 0) {
            targetSection = classSections.find(
              s => (s._count.academicRecords ?? 0) < (s.capacity ?? 30)
            ) ?? classSections[0];
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

          // E. Create FamilyDetail record
          await tx.familyDetail.create({
            data: {
              studentId: student.id,
              fatherName: row.relationType?.toUpperCase() === "FATHER" || !row.relationType ? `${row.guardianFirstName} ${row.guardianLastName || ""}`.trim() : null,
              fatherPhone: row.relationType?.toUpperCase() === "FATHER" || !row.relationType ? normPhone : null,
              fatherEmail: row.relationType?.toUpperCase() === "FATHER" || !row.relationType ? normEmail : null,
              motherName: row.relationType?.toUpperCase() === "MOTHER" ? `${row.guardianFirstName} ${row.guardianLastName || ""}`.trim() : null,
              motherPhone: row.relationType?.toUpperCase() === "MOTHER" ? normPhone : null,
              motherEmail: row.relationType?.toUpperCase() === "MOTHER" ? normEmail : null,
              emergencyName: `${row.guardianFirstName} ${row.guardianLastName || ""}`.trim(),
              emergencyPhone: normPhone,
              emergencyRelation: "FATHER"
            }
          });

          // F. Create Address record
          await tx.address.create({
            data: {
              studentId: student.id,
              currentAddress: row.address?.trim() || "VIVES Campus Student Address",
              permanentAddress: row.address?.trim() || "VIVES Campus Student Address",
              city: "Hyderabad",
              state: "Telangana",
              country: "India",
              pincode: "500001"
            }
          });

          // G. Parse optional fee variables
          const tFee = Number(row.tuitionFee || 0);
          const aFee = Number(row.admissionFee || 0);
          const cFee = Number(row.concession || 0);
          const transFee = Number(row.transportFee || 0);
          const totalFee = tFee + aFee + transFee - cFee;

          // H. Create FinancialRecord & StudentFeeComponent (if billing details are provided)
          const financial = await tx.financialRecord.create({
            data: {
              studentId: student.id,
              schoolId,
              paymentType: "Term-wise",
              tuitionFee: tFee,
              admissionFee: aFee,
              cautionDeposit: 0,
              transportFee: transFee,
              annualTuition: totalFee,
              term1Amount: totalFee * 0.50,
              term2Amount: totalFee * 0.25,
              term3Amount: totalFee * 0.25,
              totalDiscount: cFee
            }
          });

          // Link fee components
          const tuitionMaster = await tx.feeComponentMaster.findFirst({ where: { schoolId, name: "Tuition Fee" } });
          const admissionMaster = await tx.feeComponentMaster.findFirst({ where: { schoolId, name: "Admission Fee" } });
          const transportMaster = await tx.feeComponentMaster.findFirst({ where: { schoolId, name: "Transport Fee" } });

          if (tFee > 0 && tuitionMaster) {
            await tx.studentFeeComponent.create({
              data: {
                studentFinancialId: financial.id,
                componentId: tuitionMaster.id,
                schoolId,
                branchId,
                baseAmount: tFee,
                discountAmount: cFee,
                waiverAmount: 0,
                isApplicable: true
              }
            });
          }

          if (aFee > 0 && admissionMaster) {
            await tx.studentFeeComponent.create({
              data: {
                studentFinancialId: financial.id,
                componentId: admissionMaster.id,
                schoolId,
                branchId,
                baseAmount: aFee,
                discountAmount: 0,
                waiverAmount: 0,
                isApplicable: true
              }
            });
          }

          if (transFee > 0 && transportMaster) {
            await tx.studentFeeComponent.create({
              data: {
                studentFinancialId: financial.id,
                componentId: transportMaster.id,
                schoolId,
                branchId,
                baseAmount: transFee,
                discountAmount: 0,
                waiverAmount: 0,
                isApplicable: true
              }
            });
          }

          // I. Link StudentTransport (if transport stop details are provided)
          if (transFee > 0 && row.transportStop && row.transportStop !== "SELF") {
            const stopCode = row.transportStop.includes("-") ? row.transportStop.split("-")[0].trim() : row.transportStop.trim();

            let route = await tx.route.findFirst({ where: { routeCode: stopCode, schoolId } });
            if (!route) {
              route = await tx.route.create({
                data: {
                  routeName: `Route ${stopCode}`,
                  routeCode: stopCode,
                  schoolId,
                  branchId
                }
              });
            }

            let stop = await tx.vehicleStop.findFirst({ where: { stopName: `${stopCode} Stop`, routeId: route.id } });
            if (!stop) {
              stop = await tx.vehicleStop.create({
                data: {
                  stopName: `${stopCode} Stop`,
                  routeId: route.id,
                  pickupTime: "08:00 AM",
                  dropTime: "04:30 PM",
                  monthlyFee: transFee / 10,
                  schoolId,
                  branchId
                }
              });
            }

            await tx.studentTransport.create({
              data: {
                studentId: student.id,
                routeId: route.id,
                pickupStopId: stop.id,
                dropStopId: stop.id,
                monthlyFee: transFee / 10,
                schoolId,
                branchId,
                status: "Active"
              }
            });
          }

          // J. Generate FeeInvoice & Items dynamically
          if (totalFee > 0) {
            const invoiceNum = `INV-2627-${row.studentCode.trim()}`;
            const activeFY = await tx.financialYear.findFirst({ where: { schoolId, isCurrent: true } });
            if (activeFY) {
              const invoice = await tx.feeInvoice.create({
                data: {
                  invoiceNumber: invoiceNum,
                  studentId: student.id,
                  academicYearId: activeAY.id,
                  financialYearId: activeFY.id,
                  totalAmount: totalFee,
                  paidAmount: 0,
                  balance: totalFee,
                  dueDate: new Date("2026-06-30"),
                  status: "PENDING",
                  schoolId,
                  branchId
                }
              });

              if (tFee > 0) {
                await tx.feeInvoiceItem.create({
                  data: {
                    invoiceId: invoice.id,
                    componentName: "Tuition Fee",
                    componentType: "TUTION",
                    amount: tFee,
                    balance: tFee
                  }
                });
              }

              if (aFee > 0) {
                await tx.feeInvoiceItem.create({
                  data: {
                    invoiceId: invoice.id,
                    componentName: "Admission Fee",
                    componentType: "ADMISSION",
                    amount: aFee,
                    balance: aFee
                  }
                });
              }

              if (transFee > 0 && row.transportStop) {
                await tx.feeInvoiceItem.create({
                  data: {
                    invoiceId: invoice.id,
                    componentName: `Transport Fee (${row.transportStop})`,
                    componentType: "TRANSPORT",
                    amount: transFee,
                    balance: transFee
                  }
                });
              }

              if (cFee > 0) {
                await tx.feeInvoiceItem.create({
                  data: {
                    invoiceId: invoice.id,
                    componentName: "Fee Concession",
                    componentType: "CONCESSION",
                    amount: -cFee,
                    balance: -cFee
                  }
                });
              }

              // K. Generate Income Accrual Journal Entry
              const coaAR = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1200" } });
              const coaIncome = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4100" } })
                            || await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "3001" } });
              const coaOneTime = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4200" } })
                            || await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "3002" } });
              const coaTransIncome = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4300" } });

              if (coaAR && coaIncome) {
                const creditLines: any[] = [];
                if (tFee > 0) creditLines.push({ accountId: coaIncome.id, debit: 0, credit: tFee });
                if (aFee > 0 && coaOneTime) creditLines.push({ accountId: coaOneTime.id, debit: 0, credit: aFee });
                if (transFee > 0 && coaTransIncome) creditLines.push({ accountId: coaTransIncome.id, debit: 0, credit: transFee });
                if (cFee > 0) {
                  creditLines.push({ accountId: coaIncome.id, debit: cFee, credit: 0 });
                }

                const totalDebitVal = totalFee + (cFee > 0 ? cFee : 0);
                const totalCreditVal = (tFee > 0 ? tFee : 0) + (aFee > 0 ? aFee : 0) + (transFee > 0 ? transFee : 0);

                if (totalDebitVal > 0 && totalCreditVal > 0) {
                  await tx.journalEntry.create({
                    data: {
                      schoolId,
                      financialYearId: activeFY.id,
                      entryType: "ADMISSION_ACCRUAL",
                      totalDebit: totalDebitVal,
                      totalCredit: totalCreditVal,
                      description: `Initial Fee Accrual for Bulk Student: ${row.studentCode} (${row.firstName})`,
                      lines: {
                        create: [
                          { accountId: coaAR.id, debit: totalFee, credit: 0 },
                          ...creditLines
                        ]
                      }
                    }
                  });

                  await tx.chartOfAccount.update({
                    where: { id: coaAR.id },
                    data: { currentBalance: { increment: totalFee } }
                  });
                }
              }
            }
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
