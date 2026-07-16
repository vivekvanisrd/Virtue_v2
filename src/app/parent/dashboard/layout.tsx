import React from "react";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { getGuardianSiblingsAction } from "@/lib/actions/guardian-auth-actions";
import { redirect } from "next/navigation";
import { LogOut, GraduationCap, ShieldAlert } from "lucide-react";
import { logoutGuardianAction } from "@/lib/actions/guardian-auth-actions";
import { getUnreadParentNotificationsCountAction } from "@/lib/actions/guardian-notification-actions";
import { PushNotificationRegistry } from "@/components/parent/PushNotificationRegistry";
import { ParentSidebarNav } from "@/components/parent/ParentSidebarNav";

export default async function ParentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getGuardianIdentity();
  if (!identity) {
    redirect("/parent/login");
  }

  const siblingsRes = await getGuardianSiblingsAction();
  const siblings = siblingsRes.success ? siblingsRes.siblings || [] : [];

  const unreadRes = await getUnreadParentNotificationsCountAction();
  const unreadCount = unreadRes.success ? unreadRes.count || 0 : 0;

  const handleLogout = async () => {
    "use server";
    await logoutGuardianAction();
    redirect("/parent/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PushNotificationRegistry />
      {/* Top Navbar */}
      <header className="bg-card border-b border-border/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-primary animate-pulse" />
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-black">Virtue Sovereign</span>
            <h1 className="text-base font-black tracking-tight leading-none mt-0.5">Parent Portal</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-black tracking-wide bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-xl">
            {identity.name}
          </span>
          <form action={handleLogout}>
            <button
              type="submit"
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 rounded-xl transition-all flex items-center gap-2 font-bold text-xs"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Framework Frame */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-card/40 border-r border-border/40 p-6 flex flex-col gap-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block">Roster Navigation</label>
            <ParentSidebarNav unreadCount={unreadCount} />
          </div>

          {siblings.length === 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2.5 text-amber-500">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-xs font-black">No Linked Wards</p>
                <p className="text-[10px] opacity-80 mt-0.5">Please contact administration to link siblings to your profile.</p>
              </div>
            </div>
          )}
        </aside>

        {/* Dynamic Pages Container */}
        <main className="flex-1 bg-background/50 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
