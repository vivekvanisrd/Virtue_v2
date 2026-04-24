export const dynamic = "force-dynamic";

import DashboardShell from "@/components/layout/dashboard-shell";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const identity = await getSovereignIdentity();

  if (!identity) {
    redirect("/login");
  }
  
  // 🏛️ SOVEREIGN IDENTITY: Fetch official School record as per Tenancy Law
  const school = await prisma.school.findUnique({
    where: { id: identity.schoolId },
    select: { name: true }
  });

  // Fetch current academic year
  const activeYear = await prisma.academicYear.findFirst({
    where: { 
      schoolId: identity.schoolId,
      isCurrent: true 
    },
    select: { name: true }
  });

  // 🏢 BRANCH AUDIT: Fetch current branch name and available branches for switcher
  const currentBranch = identity.branchId 
    ? await prisma.branch.findUnique({
        where: { id: identity.branchId },
        select: { name: true, code: true }
      })
    : null;

  const branches = await prisma.branch.findMany({ 
    where: { schoolId: identity.schoolId }, 
    select: { id: true, name: true, code: true } 
  });

  // 🛡️ OPERATIONAL GUARD: A school is considered "Ready" only if it has a non-HQ operational branch
  const isOperationalReady = branches.some((b: any) => !b.id.includes("-HQ"));

  return (
    <DashboardShell 
      userEmail={identity.email || "N/A"} 
      userRole={identity.role} 
      userName={identity.name || "User"}
      schoolId={identity.schoolId}
      schoolName={school?.name || "PaVa-EDUX Institution"}
      academicYear={activeYear?.name || "Session 2026-27"}
      branches={JSON.parse(JSON.stringify(branches))}
      activeBranchId={identity.branchId}
      activeBranchName={currentBranch?.name || "Global HQ"}
      isOperationalReady={isOperationalReady}
    >
      {children}
    </DashboardShell>
  );
}
