import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SuperAdminDashboard } from "@/components/super-admin/SuperAdminDashboard";

const SUPER_ADMIN_EMAILS = ["vivekvanisrd@gmail.com"];

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !SUPER_ADMIN_EMAILS.includes(user.email || "")) {
    redirect("/login");
  }

  return <SuperAdminDashboard />;
}
