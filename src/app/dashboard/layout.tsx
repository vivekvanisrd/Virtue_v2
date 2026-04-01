export const dynamic = "force-dynamic";

import DashboardShell from "@/components/layout/dashboard-shell";
import { getTenantContext } from "@/lib/utils/tenant-context";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/actions/auth-native";
import prisma from "@/lib/prisma";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [context, session] = await Promise.all([
    getTenantContext(),
    verifySession()
  ]);

  if (!session) {
    redirect("/login");
  }
  
  // Fetch current academic year
  const activeYear = await prisma.academicYear.findFirst({
    where: { 
      schoolId: session.schoolId, // Assuming session has schoolId
      isCurrent: true 
    },
    select: { name: true }
  });

  // 🏢 BRANCH AUDIT: Fetch available branches only for administrative roles
  const branches = (context.role === "OWNER" || context.role === "DEVELOPER")
    ? await prisma.branch.findMany({ where: { schoolId: context.schoolId }, select: { id: true, name: true, code: true } })
    : [];

  return (
    <DashboardShell 
      userEmail={session.email} 
      userRole={context.role} 
      userName={session.name}
      schoolId={session.schoolId}
      academicYear={activeYear?.name || "Session 2025-26"}
      branches={JSON.parse(JSON.stringify(branches))}
      activeBranchId={context.branchId}
    >
      {children}
    </DashboardShell>
  );
}
