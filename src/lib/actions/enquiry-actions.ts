"use server";

import prisma from "@/lib/prisma";
import { getTenantContext } from "../utils/tenant-context";
import { revalidatePath } from "next/cache";
import { sanitizeEmail, sanitizePhone } from "../utils/validations";

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
                schoolId: data.schoolId || "VR-SCH01", // Fallback to main school for public form
                studentFirstName: data.studentFirstName,
                studentLastName: data.studentLastName,
                parentName: data.parentName,
                parentPhone: phone,
                parentEmail: email,
                requestedClass: data.requestedClass,
                academicYear: data.academicYear,
                previousSchool: data.previousSchool,
                notes: data.notes,
                referredBy: data.referredBy,
                referrerPhone: refPhone,
                status: "Pending"
            }
        });
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Submit Enquiry Error:", error);
        return { success: false, error: error.message || "Failed to submit enquiry" };
    }
}

export async function getEnquiriesAction(statusFilter?: "Pending" | "Converted" | "Rejected") {
    try {
        const context = await getTenantContext();
        const where: any = { schoolId: context.schoolId };
        
        if (statusFilter) {
            where.status = statusFilter;
        }

        const enquiries = await prisma.enquiry.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        
        return { success: true, data: enquiries };
    } catch (error: any) {
        console.error("Get Enquiries Error:", error);
        return { success: false, error: "Failed to load enquiries" };
    }
}

export async function updateEnquiryStatusAction(id: string, newStatus: "Pending" | "Converted" | "Rejected") {
    try {
        const context = await getTenantContext();

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
