import React from "react";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { getGuardianSiblingsAction } from "@/lib/actions/guardian-auth-actions";
import { getParentStudentFeeStatus } from "@/lib/actions/finance-actions";
import { redirect } from "next/navigation";
import { DashboardContentClient } from "./dashboard-content-client";
import prisma from "@/lib/prisma";

interface PageProps {
  searchParams: Promise<{ studentId?: string }>;
}

async function getComplianceStatus(studentId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        aadhaarNumber: true,
        createdAt: true,
        family: { select: { fatherPhone: true, motherAadhaar: true } },
        academic: { select: { apaarId: true } },
      }
    });
    if (!student) return null;

    const enrollmentAgeDays = Math.floor(
      (Date.now() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const missingFields: string[] = [];
    if (!student.aadhaarNumber) missingFields.push("Student Aadhaar Number");
    if (!student.academic?.apaarId) missingFields.push("APAAR / PEN Registry ID");
    if (!student.family?.fatherPhone) missingFields.push("Father/Guardian Contact Number");
    if (!student.family?.motherAadhaar) missingFields.push("Mother's Aadhaar Number");

    return {
      isCompliant: missingFields.length === 0,
      isGracePeriod: enrollmentAgeDays <= 30,
      daysRemaining: Math.max(0, 30 - enrollmentAgeDays),
      enrollmentAgeDays,
      missingFields,
    };
  } catch {
    return null;
  }
}

export default async function ParentDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const identity = await getGuardianIdentity();
  if (!identity) {
    redirect("/parent/login");
  }

  const siblingsRes = await getGuardianSiblingsAction();
  const siblings = siblingsRes.success ? siblingsRes.siblings || [] : [];
  const activeStudentId = params.studentId || (siblings.length > 0 ? siblings[0].studentId : "");

  // Fetch compliance status for the active student
  const compliance = activeStudentId ? await getComplianceStatus(activeStudentId) : null;

  // Fetch real-time fee summary for the dashboard widget
  const feeRes = activeStudentId ? await getParentStudentFeeStatus(activeStudentId) : null;
  const feeStatus = feeRes?.success ? feeRes.data : null;

  return (
    <DashboardContentClient
      siblings={siblings}
      activeStudentId={activeStudentId}
      compliance={compliance}
      feeStatus={feeStatus}
    />
  );
}
