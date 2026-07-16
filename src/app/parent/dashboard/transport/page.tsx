import React from "react";
import ParentTransportHub from "@/components/parent/ParentTransportHub";
import { getWardedTransportAction } from "@/lib/actions/guardian-transport-actions";
import { getGuardianSiblingsAction } from "@/lib/actions/guardian-auth-actions";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ studentId?: string }>;
}

export default async function TransportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeStudentId = params.studentId || "";

  const siblingsRes = await getGuardianSiblingsAction();
  if (!siblingsRes.success || !siblingsRes.siblings) {
    redirect("/parent/login");
  }

  const transportRes = await getWardedTransportAction();
  const assignments = transportRes.success ? transportRes.assignments || [] : [];
  const gps = transportRes.success ? transportRes.liveGPS || [] : [];

  return (
    <ParentTransportHub
      initialAssignments={assignments}
      liveGPS={gps}
      activeStudentId={activeStudentId}
      siblings={siblingsRes.siblings}
    />
  );
}
