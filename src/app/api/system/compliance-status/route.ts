import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * COMPLIANCE STATUS API
 * 
 * Returns the compliance status for a given student — which mandatory
 * fields are complete and which are missing. Used by the parent dashboard
 * to render compliance alert widgets.
 * 
 * GET /api/system/compliance-status?studentId=xxx
 */

export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        aadhaarNumber: true,
        createdAt: true,
        status: true,
        family: { select: { fatherPhone: true, motherAadhaar: true, fatherEmail: true, motherEmail: true } },
        academic: { select: { apaarId: true } },
      }
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const enrollmentAgeDays = Math.floor(
      (Date.now() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isGracePeriod = enrollmentAgeDays <= 30;
    const daysRemaining = Math.max(0, 30 - enrollmentAgeDays);

    const missingFields: { key: string; label: string }[] = [];
    if (!student.aadhaarNumber) missingFields.push({ key: "aadhaarNumber", label: "Student Aadhaar Number" });
    if (!student.academic?.apaarId) missingFields.push({ key: "apaarId", label: "APAAR / PEN Registry ID" });
    if (!student.family?.fatherPhone) missingFields.push({ key: "fatherPhone", label: "Father/Guardian Contact Number" });
    if (!student.family?.motherAadhaar) missingFields.push({ key: "motherAadhaar", label: "Mother's Aadhaar Number" });

    const isCompliant = missingFields.length === 0;

    return NextResponse.json({
      success: true,
      data: {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName || ""}`.trim(),
        isCompliant,
        isGracePeriod,
        enrollmentAgeDays,
        daysRemaining,
        missingFields,
        totalRequired: 4,
        totalComplete: 4 - missingFields.length,
      }
    });
  } catch (error: any) {
    console.error("[COMPLIANCE_STATUS] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
