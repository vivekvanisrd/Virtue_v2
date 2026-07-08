"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { v4 as uuidv4 } from "uuid";

export async function pushPaymentLinkAction(data: {
  studentId: string;
  amount: number;
  description: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Staff credentials required." };
    }

    // 1. Resolve student and linked guardians
    const student = await prismaBypass.student.findUnique({
      where: { id: data.studentId },
      include: {
        academic: true,
        guardians: {
          include: { guardian: true }
        }
      }
    });

    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    // Find primary guardian link
    const primaryLink = student.guardians.find(g => g.isPrimaryGuardian) || student.guardians[0];
    if (!primaryLink || !primaryLink.guardian) {
      return { success: false, error: "No linked guardian found for student to push payment link." };
    }

    const guardian = primaryLink.guardian;
    const parentName = `${guardian.firstName} ${guardian.lastName || ""}`.trim();
    const studentName = `${student.firstName} ${student.lastName || ""}`.trim();

    // 2. Generate a secure payment token and base url
    const token = uuidv4();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const paymentLink = `${baseUrl}/fee-pay/${token}`;

    // Resolve current active Academic Year and Financial Year
    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId: identity.schoolId, isCurrent: true }
    });
    const currentFY = await prisma.financialYear.findFirst({
      where: { schoolId: identity.schoolId }
    });

    if (!activeAY || !currentFY) {
      return { success: false, error: "No active academic/financial year configurations found." };
    }

    // 3. Create a Fee Invoice
    await prisma.feeInvoice.create({
      data: {
        id: token, // Map token directly to id to resolve /fee-pay/[token]
        invoiceNumber: `INV-PUSH-${Date.now().toString().slice(-6)}`,
        studentId: student.id,
        academicYearId: activeAY.id,
        financialYearId: currentFY.id,
        totalAmount: data.amount,
        paidAmount: 0,
        balance: data.amount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days due
        status: "UNPAID",
        isLocked: false,
        generatedAt: new Date(),
        schoolId: identity.schoolId,
        branchId: student.branchId || identity.branchId
      }
    });

    // 4. Create a targeted notification notice to that specific student/parent
    await prisma.notice.create({
      data: {
        schoolId: identity.schoolId,
        branchId: student.branchId || identity.branchId,
        title: `📄 Fee Payment Requested: ${data.description}`,
        content: `A payment request of ₹${data.amount} has been issued for your ward ${studentName}. Click here to pay: ${paymentLink}`,
        audienceType: "PARENTS",
        targetClassId: student.academic?.classId || null,
        targetSectionId: student.academic?.sectionId || null,
        publishFrom: new Date(),
        publishTill: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days visibility
        priority: "HIGH",
        requiresAcknowledgement: true,
        createdBy: identity.staffId
      }
    });

    // 5. Output mock SMS / notification push logs to system logs
    console.log("\n📱 ======================================================================");
    console.log(`[PAYMENT_PUSH_SMS] To: ${guardian.phone} (${parentName})`);
    console.log(`Message: Dear Parent, a fee payment of ₹${data.amount} for "${data.description}" is requested for your ward ${studentName}.`);
    console.log(`Secure Payment URL: ${paymentLink}`);
    console.log("======================================================================\n");

    return {
      success: true,
      paymentLink,
      message: `Fee payment link pushed successfully to ${parentName} (${guardian.phone}).`
    };
  } catch (error: any) {
    console.error("Push Payment Link Error:", error);
    return { success: false, error: "Failed to push payment link to parent." };
  }
}
