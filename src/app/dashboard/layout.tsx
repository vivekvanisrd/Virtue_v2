export const dynamic = "force-dynamic";

import DashboardShell from "@/components/layout/dashboard-shell";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { redirect } from "next/navigation";
import prisma, { prismaBypass } from "@/lib/prisma";

import { unstable_cache } from "next/cache";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const identity = await getSovereignIdentity();

  if (!identity) {
    redirect("/login");
  }
  
  // 🏛️ SOVEREIGN IDENTITY: Parallel cached fetch for institutional vitals
  const getCachedVitals = (schoolId: string, roleName: string) => unstable_cache(
    async () => {
      return Promise.all([
        prismaBypass.school.findUnique({
          where: { id: schoolId },
          select: { name: true }
        }),
        prismaBypass.academicYear.findFirst({
          where: { 
            schoolId: schoolId,
            isCurrent: true 
          },
          select: { name: true }
        }),
        prismaBypass.branch.findMany({ 
          where: { schoolId: schoolId }, 
          select: { id: true, name: true, code: true } 
        }),
        prismaBypass.sovereignRole.findFirst({
          where: {
            schoolId: schoolId,
            name: roleName
          },
          select: { capabilities: true }
        })
      ]);
    },
    ['dashboard-layout-vitals', schoolId, roleName],
    { revalidate: 3600, tags: [`vitals-${schoolId}-${roleName}`] }
  )();

  const [school, activeYear, branches, sovereignRole] = await getCachedVitals(
    identity.schoolId,
    identity.role
  );

  // 🏢 BRANCH AUDIT: Fetch current branch name
  const currentBranch = identity.branchId 
    ? branches.find(b => b.id === identity.branchId)
    : null;

  // 🛡️ OPERATIONAL GUARD: A school is considered "Ready" only if it has a non-HQ operational branch
  const isOperationalReady = branches.some((b: any) => !b.id.includes("-HQ"));

  const capabilities = sovereignRole?.capabilities as Record<string, boolean> || {};

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
      capabilities={capabilities}
    >
      {children}
    </DashboardShell>
  );
}
