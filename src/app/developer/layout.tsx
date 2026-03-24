export const dynamic = "force-dynamic";

import { getTenantContext } from "@/lib/utils/tenant-context";
import { redirect } from "next/navigation";

export default async function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const context = await getTenantContext();
    
    // STRICT SECURITY: Only DEVELOPER role can enter this subtree
    if (context.role !== "DEVELOPER") {
      console.error(`Unauthorized access attempt to Developer Hub by ${context.role}`);
      redirect("/dashboard");
    }

    return <>{children}</>;
  } catch (error) {
    // If not logged in or no profile, redirect to login
    redirect("/login");
  }
}
