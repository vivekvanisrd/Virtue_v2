"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { revalidatePath } from "next/cache";
import { sanitizeEmail, sanitizePhone } from "../utils/validations";
import { CounterService } from "@/lib/services/counter-service";


export async function submitEnquiryAction(data: {
    schoolId: string;
    studentFirstName: string;
    studentLastName?: string;
    parentName: string;
    parentPhone: string;
    parentEmail?: string;
    requestedClass: string;
    academicYear: string;
    previousSchool?: string;
    notes?: string;
    referredBy?: string;
    referrerPhone?: string;
}) {
    try {
        const phone = sanitizePhone(data.parentPhone);
        if (!phone) {
            return { success: false, error: "Invalid primary phone number format." };
        }

        let email = null;
        if (data.parentEmail && data.parentEmail.trim() !== '') {
            email = sanitizeEmail(data.parentEmail);
            if (!email) {
                return { success: false, error: "Invalid email address format." };
            }
        }

        let refPhone = null;
        if (data.referrerPhone && data.referrerPhone.trim() !== '') {
            refPhone = sanitizePhone(data.referrerPhone);
            if (!refPhone) {
                return { success: false, error: "Invalid referrer phone number format." };
            }
        }

        const result = await prisma.enquiry.create({
            data: {
                schoolId: data.schoolId, 
                // Compatibility mapping
                studentFirstName: data.studentFirstName,
                studentLastName: data.studentLastName,
                studentName: `${data.studentFirstName} ${data.studentLastName || ""}`.trim(),
                parentName: data.parentName,
                parentPhone: phone,
                phone: phone,
                parentEmail: email,
                email: email,
                requestedClass: data.requestedClass,
                academicYear: data.academicYear,
                previousSchool: data.previousSchool,
                notes: data.notes,
                referredBy: data.referredBy,
                referrerPhone: refPhone,
                status: "Pending",
                scholarshipAmount: 0 
            }
        });
        return { 
            success: true, 
            data: {
              ...result,
              scholarshipAmount: Number(result.scholarshipAmount || 0),
              tuitionDiscount: Number(result.tuitionDiscount || 0),
              admissionWaiver: Number(result.admissionWaiver || 0)
            } 
        };
    } catch (error: any) {
        console.error("Submit Enquiry Error:", error);
        return { success: false, error: error.message || "Failed to submit enquiry" };
    }
}

/**
 * recordManualEnquiryPaymentAction
 * 
 * Replicates formal Fee Collection logic for Enquiry leads.
 * Records Cash Payment, generates Receipt, and creates Journal Entries.
 */
export async function recordManualEnquiryPaymentAction(enquiryId: string, amount: number) {
    try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;

        // 1. Fetch Context Info
        const enquiry = await prisma.enquiry.findUnique({
            where: { id: enquiryId },
            include: { school: { select: { code: true, name: true } } }
        });

        if (!enquiry || enquiry.schoolId !== context.schoolId) {
            return { success: false, error: "Enquiry context mismatch or record not found." };
        }

        // 2. Atomic Transaction: Collection + Accounting
        const result = await prisma.$transaction(async (tx: any) => {
            // A. Generate Receipt Number
            const receiptNumber = await CounterService.generateReceiptNumber({
                schoolId: context.schoolId,
                schoolCode: enquiry.school.code,
                branchId: enquiry.branchId || "MAIN",
                branchCode: enquiry.branchId?.split("-").pop() || "MAIN",
                year: new Date().getFullYear().toString(),
            }, tx);

            // B. Create Collection Record
            const collection = await tx.collection.create({
                data: {
                    receiptNumber,
                    studentId: enquiryId, // Stored as reference for conversion gate
                    schoolId: context.schoolId,
                    branchId: enquiry.branchId || "MAIN",
                    financialYearId: (await tx.financialYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } }))?.id || "FY2026",
                    amountPaid: amount,
                    totalPaid: amount,
                    paymentMode: "Cash",
                    collectedBy: "ADMIN_DESK_MANUAL",
                    status: "Success",
                    allocatedTo: {
                        isManualEnquiry: true,
                        term: "TERM_1_2026", // Strict mapping for 2026-27 ERP
                        notes: "Partial/Full Admission Payment recorded at School Office"
                    }
                }
            });

            // C. ERP Accounting: Create Journal Entry (Debit Cash 1110, Credit AR 1200)
            const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1110" } });
            const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });

            if (cashAcc && arAcc) {
                await tx.journalEntry.create({
                    data: {
                        schoolId: context.schoolId,
                        financialYearId: collection.financialYearId,
                        entryType: "RECEIPT",
                        totalDebit: amount,
                        totalCredit: amount,
                        description: `Admission Fee (Cash) — Lead: ${enquiry.studentFirstName} ${enquiry.studentLastName} — Receipt: ${receiptNumber}`,
                        lines: {
                            create: [
                                { accountId: cashAcc.id, debit: amount, credit: 0 },
                                { accountId: arAcc.id, debit: 0, credit: amount },
                            ]
                        }
                    }
                });

                // Update Balances
                await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: amount } } });
                await tx.chartOfAccount.update({ where: { id: arAcc.id }, data: { currentBalance: { decrement: amount } } });
            }

            return { receiptNumber, collectionId: collection.id };
        });

        revalidatePath("/dashboard/students/enquiries");
        return { success: true, data: result };

    } catch (error: any) {
        console.error("Manual Enquiry Payment Error:", error);
        return { success: false, error: "Failed to record manual payment: " + error.message };
    }
}

export async function getEnquiriesAction(statusFilter?: string) {
    try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        const where: any = { schoolId: context.schoolId };
        
        if (statusFilter) {
            where.status = statusFilter;
        }

        const enquiriesRaw = await prisma.enquiry.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        // Resolve financial status for each lead
        const enquiries = await Promise.all(enquiriesRaw.map(async (enq: any) => {
            const collections = await prisma.collection.findMany({
                where: { studentId: enq.id, status: "Success" },
                select: { totalPaid: true }
            });
            const totalPaid = collections.reduce((acc: number, curr: any) => acc + Number(curr.totalPaid), 0);
            
            // Resolve fee for milestone check
            const feeStructure = await prisma.feeStructure.findFirst({
                where: { schoolId: context.schoolId, class: { name: enq.requestedClass } }
            });
            
            const gross = Number(feeStructure?.totalAmount || 0);
            const net = Math.max(0, gross - Number(enq.scholarshipAmount));
            const milestone = net * 0.5;
            
            return {
                ...enq,
                scholarshipAmount: Number(enq.scholarshipAmount),
                tuitionDiscount: Number(enq.tuitionDiscount),
                admissionWaiver: Number(enq.admissionWaiver),
                totalPaid,
                milestoneMet: totalPaid >= (milestone - 1) && milestone > 0,
                isPartial: totalPaid > 0 && totalPaid < (milestone - 1)
            };
        }));
        
        // Fetch branding info for the context
        const branding = await prisma.branch.findUnique({
            where: { id: context.branchId },
            include: { school: { select: { name: true } } }
        });

        return { 
            success: true, 
            data: enquiries,
            branding: {
                schoolName: branding?.school.name || "Unknown School",
                branchName: branding?.name || "Global View"
            }
        };

    } catch (error: any) {
        console.error("Get Enquiries Error:", error);
        return { success: false, error: "Failed to load enquiries" };
    }
}

export async function updateEnquiryStatusAction(id: string, newStatus: "Pending" | "Converted" | "Rejected") {
    try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;

        // Security check
        const enquiry = await prisma.enquiry.findUnique({ where: { id } });
        if (!enquiry || enquiry.schoolId !== context.schoolId) {
            return { success: false, error: "Unauthorized or not found" };
        }

        const result = await prisma.enquiry.update({
            where: { id },
            data: { status: newStatus }
        });

        revalidatePath("/dashboard/students/enquiries");
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Update Enquiry Error:", error);
        return { success: false, error: "Failed to update enquiry status" };
    }
}

export async function convertEnquiryToStudentAction(enquiryId: string) {
    try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;

        // 1. Fetch Enquiry Detail
        const enquiry = await prisma.enquiry.findUnique({
            where: { id: enquiryId },
            include: { 
                school: { select: { code: true } },
                branch: { select: { code: true } }
            }
        });

        if (!enquiry || enquiry.schoolId !== context.schoolId) {
            return { success: false, error: "Enquiry not found or unauthorized" };
        }

        if (enquiry.status === "Converted") {
            return { success: false, error: "This lead has already been converted to a student." };
        }

        // 2. Mandatory Fee Check: Has the 1st Term / Admission Fee been paid?
        // Milestone Logic: Sum of all partials must >= 50% of (Gross - Scholarship)
        const reviewData = await getEnquiryPaymentReviewAction(enquiryId);
        
        if (!reviewData.success || !reviewData.data) {
            return { success: false, error: "Failed to calculate financial milestone for conversion." };
        }

        const { milestoneMet, totalPaid, requiredForMilestone } = reviewData.data;

        if (!milestoneMet) {
            return { 
                success: false, 
                error: `Strict Milestone Failure: Lead has only paid ₹${totalPaid}. The required Term 1 (50%) amount is ₹${requiredForMilestone}. Admission blocked until full payment is received.` 
            };
        }

        // 3. Resolve Academic Year
        const activeAY = await prisma.academicYear.findFirst({
            where: { schoolId: context.schoolId, isCurrent: true },
        });

        if (!activeAY) {
            return { success: false, error: "Admission is closed. No active academic year found." };
        }

        // 3. Generate Official Student ID (Provisional first, can be upgraded to ADM later)
        const registrationId = await CounterService.generateProvisionalId({
            schoolId: context.schoolId,
            schoolCode: enquiry.school.code,
            branchId: enquiry.branchId,
            branchCode: (enquiry as any).branch?.code || "MAIN",
        });

        // 4. Atomic "Promotion" Transaction
        const student = await prisma.$transaction(async (tx: any) => {
            // Find class ID from name (Note: Class is a global model in this system)
            const classRef = await tx.class.findFirst({
                where: { name: enquiry.requestedClass }
            });

            // Create Student Profile
            const newStu = await tx.student.create({
                data: {
                    registrationId,
                    schoolId: context.schoolId,
                    branchId: enquiry.branchId,
                    status: "Provisional", // Still provisional until fee is fully reconciled
                    firstName: enquiry.studentFirstName,
                    lastName: enquiry.studentLastName,
                    phone: enquiry.parentPhone,
                    email: enquiry.parentEmail,
                    family: {
                      create: {
                        fatherName: enquiry.parentName,
                        fatherPhone: enquiry.parentPhone,
                        fatherEmail: enquiry.parentEmail,
                      }
                    },
                    academic: {
                      create: {
                        school: { connect: { id: context.schoolId } },
                        branch: { connect: { id: enquiry.branchId || "MAIN" } },
                        academicYear: activeAY.name,
                        classId: classRef?.id || undefined,
                        admissionDate: new Date(),
                        admissionType: "New",
                        boardingType: "Day Scholar"
                      }
                    },
                    history: {
                        create: {
                            school: { connect: { id: context.schoolId } },
                            branch: { connect: { id: enquiry.branchId || "MAIN" } },
                            academicYear: { connect: { id: activeAY.id } },
                            class: { connect: { id: classRef?.id || "" } },
                            promotionStatus: "New Admission",
                            admissionDate: new Date()
                        }
                    }
                }
            });

            // Update Enquiry Status
            await tx.enquiry.update({
                where: { id: enquiryId },
                data: { status: "Converted" }
            });

            return newStu;
        });

        revalidatePath("/dashboard?tab=students-enquiries");
        revalidatePath("/dashboard?tab=students-all");

        return { success: true, data: student };
    } catch (error: any) {
        console.error("Conversion Error:", error);
        return { success: false, error: "Failed to convert enquiry to student: " + error.message };
    }
}

/**
 * updateEnquiryFinancialsAction
 * 
 * ELITE V3: Precise split between Tuition Discount and Admission Waiver.
 */
export async function updateEnquiryFinancialsAction(data: {
    enquiryId: string;
    tuitionDiscount: number;
    admissionWaiver: number;
    scholarshipReason: string;
    waiverReason: string;
    routeId?: string;
    stopId?: string;
}) {
    try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        await prisma.enquiry.update({
            where: { id: data.enquiryId, schoolId: context.schoolId },
            data: {
                tuitionDiscount: data.tuitionDiscount,
                admissionWaiver: data.admissionWaiver,
                scholarshipAmount: data.tuitionDiscount + data.admissionWaiver,
                scholarshipReason: data.scholarshipReason,
                waiverReason: data.waiverReason,
                requestedRouteId: data.routeId,
                requestedStopId: data.stopId,
                isTransportRequired: !!data.routeId
            }
        });
        revalidatePath("/dashboard/students/enquiries");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Failed to update financials: " + error.message };
    }
}

/**
 * updateEnquiryScholarshipAction (DEPRECATED: Use updateEnquiryFinancialsAction)
 * 
 * Maintained for backward compatibility with older UI components.
 */
export async function updateEnquiryScholarshipAction(enquiryId: string, amount: number, reason: string) {
    try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        await prisma.enquiry.update({
            where: { id: enquiryId, schoolId: context.schoolId },
            data: { 
                tuitionDiscount: amount,
                scholarshipAmount: amount,
                scholarshipReason: reason
            }
        });

        revalidatePath("/dashboard/students/enquiries");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Failed to apply scholarship: " + error.message };
    }
}

/**
 * checkExistingEnquiryAction
 * 
 * Used by the public portal to detect returning parents and redirect them to their pay portal.
 */
export async function checkExistingEnquiryAction(phone: string, schoolId: string) {
    try {
        const sanitized = sanitizePhone(phone);
        if (!sanitized) return { success: false };

        const enquiry = await prisma.enquiry.findFirst({
            where: {
                parentPhone: sanitized,
                schoolId: schoolId,
                status: { not: "Rejected" }
            },
            select: { id: true, studentFirstName: true, status: true }
        });

        if (enquiry) {
            return { 
                success: true, 
                exists: true, 
                enquiryId: enquiry.id, 
                studentName: enquiry.studentFirstName,
                status: enquiry.status
            };
        }

        return { success: true, exists: false };
    } catch (error) {
        return { success: false };
    }
}

/**
 * getEnquiryPaymentReviewAction
 * 
 * CORE LOGIC: Resolves dynamic class fees, applies scholarships, and checks milestones.
 */
export async function getEnquiryPaymentReviewAction(enquiryId: string) {
    try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;

        // 1. Fetch Lead Details
        const enquiry = await prisma.enquiry.findUnique({
            where: { id: enquiryId },
            include: { school: { select: { name: true, code: true } } }
        });

        if (!enquiry || enquiry.schoolId !== context.schoolId) {
            return { success: false, error: "Enquiry not found." };
        }

        // 2. Find Official Fee Structure for 2026-27 for this specific class
        const feeStructure = await prisma.feeStructure.findFirst({
            where: {
                schoolId: context.schoolId,
                class: { name: enquiry.requestedClass }
            }
        });

        if (!feeStructure) {
            return { success: false, error: `Critical Error: No Fee Structure found for ${enquiry.requestedClass} in 2026-27.` };
        }

        // 3. Fetch Sum of all Payments (Legder)
        const collections = await prisma.collection.findMany({
            where: { studentId: enquiryId, status: "Success" },
            select: { totalPaid: true }
        });

        const totalPaid = collections.reduce((acc: number, curr: any) => acc + Number(curr.totalPaid), 0);

    // 4. ELITE CALCULATOR: Modular Net & Transport Estimation
    const components = {
        tuition: Number(feeStructure.tuitionAmount),
        admission: Number(feeStructure.admissionAmount),
        library: Number(feeStructure.libraryLabAmount),
        activity: Number(feeStructure.activityAmount)
    };

    const discounts = {
        tuition: Number(enquiry.tuitionDiscount),
        admission: Number(enquiry.admissionWaiver)
    };

    // Logical Rule: Admission Waiver is 100% Term 1. Tuition Discount is 50/25/25 but realizations vary.
    const netAdmission = Math.max(0, components.admission - discounts.admission);
    const netTuition = Math.max(0, components.tuition - discounts.tuition);
    const fixedFees = components.library + components.activity;

    const academicNetAnnual = netAdmission + netTuition + fixedFees;
    
    // Transport Estimation
    let transportEstimate = 0;
    let transportStopName = "Not Selected";
    if (enquiry.isTransportRequired && enquiry.requestedStopId) {
        // Resolve fare from TransportStop model (V3)
        const stop = await prisma.transportStop.findUnique({ where: { id: enquiry.requestedStopId } });
        if (stop) {
            transportEstimate = Number(stop.fare) * 10;
            transportStopName = stop.name;
        }
    }

    const grandTotalNet = academicNetAnnual + transportEstimate;
    
    const term1Required = (netTuition * 0.50) + netAdmission + (fixedFees * 1.0); // Full Admission + Library in Term 1
    const milestoneMet = totalPaid >= (term1Required - 1);

    return {
        success: true,
        data: {
            studentName: enquiry.studentName || `${enquiry.studentFirstName} ${enquiry.studentLastName || ""}`,
            fatherName: enquiry.parentName,
            className: enquiry.requestedClass,
            schoolName: enquiry.school.name,
            
            // Granular Hub Output
            breakdown: {
                tuition: components.tuition,
                admission: components.admission,
                library: fixedFees,
                tuitionDiscount: discounts.tuition,
                admissionWaiver: discounts.admission,
                transportMonthly: transportEstimate / 10,
                transportAnnual: transportEstimate,
                stopName: transportStopName
            },

            academicNetAnnual,
            transportEstimate,
            grandTotalNet,
            totalPaid,
            requiredForMilestone: term1Required,
            milestoneMet,
            balanceRemaining: Math.max(0, term1Required - totalPaid)
        }
    };

    } catch (error: any) {
        console.error("Review Action Error:", error);
        return { success: false, error: "Financial review error: " + error.message };
    }
}
/**
 * getStaffContextAction
 * 
 * Fetches the currently authenticated staff member from the server session.
 * Essential for V3 Financial Audit Trail logging.
 */
export async function getStaffContextAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const staff = await prisma.staff.findFirst({
      where: { schoolId: context.schoolId } // Fallback for dev: picks the first staff in school
    });
    
    if (!staff) {
      return { success: false, error: "No staff profile found for this school context." };
    }

    return { success: true, data: staff };
  } catch (error: any) {
    return { success: false, error: "Identity Failure: " + error.message };
  }
}
