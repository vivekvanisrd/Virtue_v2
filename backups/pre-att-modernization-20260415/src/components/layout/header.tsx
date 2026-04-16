import { 
  Search, 
  Bell, 
  Command, 
  User, 
  ChevronDown,
  Calendar,
  Menu,
  Sparkles,
  LogOut
} from "lucide-react";
import { ThemeCustomizer } from "./theme-customizer";
import { BranchSwitcher } from "./BranchSwitcher";

interface HeaderProps {
  onMenuClick: () => void;
  userEmail?: string;
  userRole?: string;
  userName?: string;
  schoolName?: string;
  academicYear?: string;
  branches?: any[];
  activeBranchId?: string;
  activeBranchName?: string;
}

export function Header({ 
  onMenuClick, 
  userEmail, 
  userRole, 
  userName, 
  schoolName,
  academicYear,
  branches,
  activeBranchId,
  activeBranchName
}: HeaderProps) {
  return (
    <header className="h-16 lg:h-16 bg-header-bg backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 px-4 lg:px-6 flex items-center justify-between transition-colors duration-500">
      {/* Mobile Menu & Logo */}
      <div className="flex items-center gap-4 lg:hidden">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-xl bg-muted text-foreground opacity-60 border border-border"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 max-w-[150px]">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm shrink-0 font-black text-primary italic text-xs">
                {schoolName?.charAt(0) || "P"}
            </div>
            <span className="font-black text-slate-900 text-xs italic tracking-tighter truncate">
                {schoolName || "PaVa-EDUX"}
            </span>
        </div>
      </div>

      {/* Left: Campus Selector (Administrative Personnel) */}
      <div className="hidden lg:flex items-center gap-4">
        {branches && branches.length > 0 && (userRole === "OWNER" || userRole === "DEVELOPER") && (
          <BranchSwitcher branches={branches as any} activeBranchId={activeBranchId} />
        )}
        
        <div className="h-6 w-px bg-slate-200/60 mx-2" />

        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl shadow-sm">
             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_var(--primary)]" />
             <p className="text-[10px] font-black text-header-foreground opacity-60 uppercase tracking-widest leading-none">
                Active Session: <span className="text-header-foreground">{academicYear || "2026-27"}</span>
             </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-sm">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all" />
             <p className="text-[10px] font-black text-indigo-200 opacity-80 uppercase tracking-widest leading-none">
                Campus: <span className="text-white">{activeBranchName || "Global HQ"}</span>
             </p>
        </div>
      </div>

      {/* Center: Search (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-1 max-w-lg mx-8 relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400 group-focus-within:text-primary transition-colors">
          <Search className="w-4 h-4" />
        </div>
        <input 
          type="text" 
          placeholder="Search Institutional Registry..."
          className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 focus:bg-white/10 transition-all outline-none text-white placeholder:text-white/30"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm pointer-events-none">
            <Command className="w-3 h-3 text-slate-400" />
            <span className="text-[9px] font-black text-slate-400">K</span>
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="hidden sm:flex items-center gap-1 mr-2 px-3 py-1.5 bg-slate-900 rounded-xl shadow-lg shadow-slate-200 border border-slate-800 hover:scale-105 transition-transform cursor-pointer">
           <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
           <p className="text-[9px] font-black text-white uppercase tracking-widest">System Online</p>
        </div>

        <button className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-primary hover:border-primary/20 transition-all relative group">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border-2 border-white" />
        </button>

        <ThemeCustomizer />
        
        <div className="h-6 w-px bg-slate-200 mx-2" />

        <div className="relative group/profile">
            <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1.5 rounded-2xl transition-all border border-transparent hover:border-white/10 group">
             <div className="text-right hidden sm:block">
                <h4 className="text-xs font-black text-header-foreground tracking-tight group-hover:text-primary transition-colors">{userName || userEmail || "Institutional User"}</h4>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                   <p className="text-[8px] font-black text-header-foreground opacity-40 uppercase tracking-widest italic leading-none">{userRole || "Admin"}</p>
                   <div className="w-1 h-1 rounded-full bg-emerald-400" />
                   <p className="text-[8px] font-black text-primary uppercase tracking-widest italic leading-none">Verified Auth</p>
                </div>
             </div>
             
             <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-hover:border-primary/20 overflow-hidden">
                <div className="w-full h-full bg-slate-50 flex items-center justify-center font-black text-slate-400 text-xs italic group-hover:bg-primary/5 group-hover:text-primary transition-all uppercase">
                    {(userName || userEmail || "V")?.charAt(0)}
                </div>
             </div>
          </div>

          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-slate-100 opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all duration-300 z-50 p-2 transform origin-top translate-y-2 group-hover/profile:translate-y-0">
             <button 
                onClick={async () => {
                   const { signOutAction } = await import("@/lib/actions/auth-native");
                   await signOutAction();
                   window.location.href = "/login";
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-colors uppercase tracking-widest italic"
             >
                <LogOut className="w-4 h-4" /> Sign Out from System
             </button>
          </div>
        </div>
      </div>
    </header>
  );
}
