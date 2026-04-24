export const dynamic = "force-dynamic";

import { getSovereignIdentity } from "@/lib/auth/backbone";
import { redirect } from "next/navigation";

export default async function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getSovereignIdentity();
  
  if (!identity) {
    redirect("/login");
  }

  // STRICT SECURITY: Only DEVELOPER role can enter this subtree
  if (identity.role !== "DEVELOPER") {
    console.error(`Unauthorized access attempt to Developer Hub by ${identity.role}`);
    redirect("/dashboard");
  }

  return <>{children}</>;
}
