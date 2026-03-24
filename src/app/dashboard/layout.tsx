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
  
  if (context.role === "DEVELOPER") {
    redirect("/developer/dashboard");
  }

  // Fetch current academic year
  const activeYear = await prisma.academicYear.findFirst({
    where: { 
      schoolId: session.schoolId, // Assuming session has schoolId
      isCurrent: true 
    },
    select: { name: true }
  });

  return (
    <DashboardShell 
      userEmail={session.email} 
      userRole={context.role} // Keeping original context.role as session.role might not be available or correct here
      userName={session.name}
      academicYear={activeYear?.name || "Session 2025-26"}
    >
      {children}
    </DashboardShell>
  );
}
