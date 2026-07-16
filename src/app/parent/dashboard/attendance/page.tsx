import React from "react";
import ParentAttendanceHub from "@/components/parent/ParentAttendanceHub";
import { getWardedAttendanceAction } from "@/lib/actions/guardian-attendance-actions";
import { getGuardianSiblingsAction } from "@/lib/actions/guardian-auth-actions";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ studentId?: string }>;
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeStudentId = params.studentId || "";

  const siblingsRes = await getGuardianSiblingsAction();
  if (!siblingsRes.success || !siblingsRes.siblings) {
    redirect("/parent/login");
  }

  const attendanceRes = await getWardedAttendanceAction();
  const logs = attendanceRes.success ? attendanceRes.logs || [] : [];

  return (
    <ParentAttendanceHub
      initialLogs={logs as any}
      siblings={siblingsRes.siblings}
      activeStudentId={activeStudentId}
    />
  );
}
