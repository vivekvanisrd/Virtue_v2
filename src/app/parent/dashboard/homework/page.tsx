import React from "react";
import ParentHomeworkHub from "@/components/parent/ParentHomeworkHub";
import { getWardedHomeworkAction } from "@/lib/actions/guardian-homework-actions";
import { getGuardianSiblingsAction } from "@/lib/actions/guardian-auth-actions";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ studentId?: string }>;
}

export default async function HomeworkPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeStudentId = params.studentId || "";

  const siblingsRes = await getGuardianSiblingsAction();
  if (!siblingsRes.success || !siblingsRes.siblings) {
    redirect("/parent/login");
  }

  const homeworkRes = await getWardedHomeworkAction();
  const homeworkList = homeworkRes.success ? homeworkRes.homework || [] : [];

  return (
    <ParentHomeworkHub
      initialHomework={homeworkList as any}
      siblings={siblingsRes.siblings}
      activeStudentId={activeStudentId}
    />
  );
}
