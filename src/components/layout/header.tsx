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

interface HeaderProps {
  onMenuClick: () => void;
  userEmail?: string;
  userRole?: string;
  userName?: string;
  academicYear?: string;
}

export function Header({ onMenuClick, userEmail, userRole, userName, academicYear }: HeaderProps) {
  return (
    <header className="h-16 lg:h-16 glass border-b border-black/[0.03] sticky top-0 z-50 px-4 lg:px-6 flex items-center justify-between">
      {/* Mobile Menu & Logo */}
      <div className="flex items-center gap-4 lg:hidden">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-xl bg-muted text-foreground opacity-60 border border-border"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm">
                <img src="/school-logo.png" alt="Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="font-black text-slate-900 text-sm italic tracking-tighter">Virtue V2</span>
        </div>
      </div>

      {/* Search Bar (Hidden on Mobile) */}
      <div className="max-w-xl w-full relative hidden lg:block">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 text-foreground opacity-40">
          <Search className="w-4 h-4" />
        </div>
        <input 
          type="text" 
          placeholder="Quick search... (Alt + S)"
          className="w-full pl-12 pr-12 py-3.5 bg-muted rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none text-foreground"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-background border border-border rounded-lg shadow-sm pointer-events-none">
            <Command className="w-3 h-3 text-foreground opacity-40" />
            <span className="text-[10px] font-bold text-foreground opacity-40">K</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 lg:gap-8">
        <div className="hidden md:flex items-center gap-4 mr-4">
             <button className="flex items-center gap-2 px-5 py-2.5 bg-muted hover:bg-muted/80 rounded-xl transition-all text-foreground opacity-60 hover:opacity-100 font-bold text-xs uppercase tracking-widest">
                <Calendar className="w-4 h-4" />
                Session 2025-26
             </button>
        </div>

        <ThemeCustomizer />

        <button className="relative w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-muted hover:opacity-80 rounded-xl lg:rounded-2xl transition-all group">
            <Bell className="w-5 h-5 text-foreground opacity-50 group-hover:text-primary transition-colors" />
            <span className="absolute top-2.5 lg:top-3.5 right-2.5 lg:right-3.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-500/20" />
        </button>

        <div className="h-8 lg:h-10 w-[1px] bg-border mx-1 lg:mx-2" />

        <div className="relative group/profile">
          <div className="flex items-center gap-2 lg:gap-4 cursor-pointer hover:bg-muted p-1 lg:p-2 rounded-xl lg:rounded-2xl transition-all border border-transparent hover:border-border">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-foreground">{userName || userEmail || "Virtue User"}</p>
                <p className="text-[10px] font-bold text-foreground opacity-40 uppercase tracking-tighter italic">{userRole || "Admin"}</p>
             </div>
             <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-bg flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                <User className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
             </div>
             <ChevronDown className="w-4 h-4 text-foreground opacity-30 group-hover/profile:opacity-100 transition-colors hidden lg:block" />
          </div>

          <div className="absolute right-0 top-full mt-2 w-48 bg-background rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-border opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all duration-200 z-50 p-2 transform origin-top translate-y-2 group-hover/profile:translate-y-0">
             <button 
                onClick={async () => {
                   const { signOutAction } = await import("@/lib/actions/auth-native");
                   await signOutAction();
                   window.location.href = "/login";
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
             >
                <LogOut className="w-4 h-4" /> Sign Out
             </button>
          </div>
        </div>
      </div>
    </header>
  );
}
