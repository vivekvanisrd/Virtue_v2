import React from "react";
import ParentAcademicsHub from "@/components/parent/ParentAcademicsHub";
import { getWardedAcademicsAction } from "@/lib/actions/guardian-academics-actions";
import { getGuardianSiblingsAction } from "@/lib/actions/guardian-auth-actions";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ studentId?: string }>;
}

export default async function AcademicsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeStudentId = params.studentId || "";

  const siblingsRes = await getGuardianSiblingsAction();
  if (!siblingsRes.success || !siblingsRes.siblings) {
    redirect("/parent/login");
  }

  const academicsRes = await getWardedAcademicsAction();
  const results = academicsRes.success ? academicsRes.results || [] : [];

  return (
    <ParentAcademicsHub
      initialResults={results as any}
      siblings={siblingsRes.siblings}
      activeStudentId={activeStudentId}
    />
  );
}
