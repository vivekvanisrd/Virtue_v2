import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/auth/session";
import InventorySidebar from "./InventorySidebar";

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("v-session")?.value;

  if (!session) {
    redirect(`/login?redirect=/inventory`);
  }

  const user = await decrypt(session);
  if (!user) {
    redirect(`/login?redirect=/inventory`);
  }

  // Define generic user payload for the sidebar UI
  const sidebarUser = {
    name: user.name || "Default User",
    role: user.role || "Store Manager",
    email: user.email || "",
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-row relative text-slate-800">
      {/* Sidebar Navigation */}
      <InventorySidebar user={sidebarUser} />

      {/* Main Viewport Content Page */}
      <main className="flex-1 min-w-0 min-h-screen relative flex flex-col overflow-y-auto">
        {/* Top Header Placeholder to style view actions */}
        <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-20 flex items-center justify-end px-8 select-none shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Live Connection
            </span>
          </div>
        </header>

        {/* Dynamic page children */}
        <div className="p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
