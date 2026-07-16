import React from "react";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { getGuardianSiblingsAction } from "@/lib/actions/guardian-auth-actions";
import { redirect } from "next/navigation";
import { ParentFeedbackHub } from "@/components/parent/ParentFeedbackHub";

interface PageProps {
  searchParams: Promise<{ studentId?: string }>;
}

export default async function ParentFeedbackPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeStudentId = params.studentId || "";

  const identity = await getGuardianIdentity();
  if (!identity) {
    redirect("/parent/login");
  }

  const siblingsRes = await getGuardianSiblingsAction();
  if (!siblingsRes.success || !siblingsRes.siblings) {
    redirect("/parent/login");
  }

  return (
    <ParentFeedbackHub
      siblings={siblingsRes.siblings}
      activeStudentId={activeStudentId}
    />
  );
}
