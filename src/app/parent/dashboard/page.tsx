import React from "react";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { getGuardianSiblingsAction } from "@/lib/actions/guardian-auth-actions";
import { redirect } from "next/navigation";
import { DashboardContentClient } from "./dashboard-content-client";

interface PageProps {
  searchParams: Promise<{ studentId?: string }>;
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

  return (
    <DashboardContentClient
      siblings={siblings}
      activeStudentId={activeStudentId}
    />
  );
}
