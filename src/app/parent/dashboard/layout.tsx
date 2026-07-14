import React from "react";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { getGuardianSiblingsAction } from "@/lib/actions/guardian-auth-actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, GraduationCap, Home, ShieldAlert, CreditCard, Bell } from "lucide-react";
import { logoutGuardianAction } from "@/lib/actions/guardian-auth-actions";
import { getUnreadParentNotificationsCountAction } from "@/lib/actions/guardian-notification-actions";
import { PushNotificationRegistry } from "@/components/parent/PushNotificationRegistry";

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
          <div className="w-10 h-10 bg-gradient-to-tr from-primary to-accent rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">PaVa-EDUX</h1>
            <p className="text-[10px] opacity-60 font-bold uppercase tracking-wider">Parent Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right">
            <p className="text-xs font-black">Welcome, {identity.name}</p>
            <p className="text-[10px] opacity-60 font-bold">{identity.phone}</p>
          </div>

          <form action={handleLogout}>
            <button
              type="submit"
              className="p-2.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-rose-500 rounded-xl transition-all cursor-pointer"
              title="Log Out"
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
            <nav className="space-y-1.5">
              <Link
                href="/parent/dashboard"
                className="flex items-center gap-3 px-4 py-3 bg-card border border-border/80 rounded-xl font-bold text-sm hover:border-primary/50 transition-all"
              >
                <Home className="w-4 h-4 text-primary" /> Dashboard
              </Link>
              <Link
                href="/parent/dashboard/fees"
                className="flex items-center gap-3 px-4 py-3 bg-card border border-border/80 rounded-xl font-bold text-sm hover:border-primary/50 transition-all"
              >
                <CreditCard className="w-4 h-4 text-primary" /> Fees & Payments
              </Link>
              <Link
                href="/parent/dashboard/notifications"
                className="flex items-center justify-between px-4 py-3 bg-card border border-border/80 rounded-xl font-bold text-sm hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-primary" /> Notifications
                </div>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black tracking-wide animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </nav>
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
