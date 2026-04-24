import FeeCollectionForm from "@/components/finance/FeeCollectionForm";
import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { checkCapability } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Hub | Enterprise Ledger",
  description: "Official Institutional Payment Collection Terminal",
};

export default async function PaymentHubPage() {
  const identity = await getSovereignIdentity();
  if (!identity) redirect("/login");
  
  // 🛡️ CBAC ENFORCEMENT
  try {
    await checkCapability('RECORD_PAYMENT');
  } catch (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-destructive/10 border border-destructive rounded-xl max-w-md">
          <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You do not have the 'RECORD_PAYMENT' capability required to use this terminal.
          </p>
          <p className="text-sm italic">
            Please contact your institutional administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Fetch initial lookups (Branches, Academic Years)
  const [branches, academicYears] = await Promise.all([
    prisma.branch.findMany({ where: { schoolId: identity.schoolId } }),
    prisma.academicYear.findMany({ where: { schoolId: identity.schoolId }, orderBy: { startDate: 'desc' } })
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Payment Hub</h1>
          <p className="text-muted-foreground italic text-xs font-medium">Dedicated terminal for secure fee collection and receipt generation.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <FeeCollectionForm 
            branches={branches}
            academicYears={academicYears}
        />
      </div>
    </div>
  );
}
