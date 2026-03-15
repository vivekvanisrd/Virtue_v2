import { 
  Search, 
  Bell, 
  Command, 
  User, 
  ChevronDown,
  Calendar,
  Menu,
  Sparkles
} from "lucide-react";
import { ThemeCustomizer } from "./theme-customizer";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 lg:h-16 glass border-b border-black/[0.03] sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between">
      {/* Mobile Menu & Logo */}
      <div className="flex items-center gap-4 lg:hidden">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Virtue V2</span>
        </div>
      </div>

      {/* Search Bar (Hidden on Mobile) */}
      <div className="max-w-xl w-full relative hidden lg:block">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input 
          type="text" 
          placeholder="Quick search... (Alt + S)"
          className="w-full pl-12 pr-12 py-3.5 bg-slate-100/50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm pointer-events-none">
            <Command className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400">K</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 lg:gap-8">
        <div className="hidden md:flex items-center gap-4 mr-4">
             <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-slate-600 font-bold text-xs uppercase tracking-widest">
                <Calendar className="w-4 h-4" />
                Session 2025-26
             </button>
        </div>

        <ThemeCustomizer />

        <button className="relative w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl lg:rounded-2xl transition-all group">
            <Bell className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
            <span className="absolute top-2.5 lg:top-3.5 right-2.5 lg:right-3.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-500/20" />
        </button>

        <div className="h-8 lg:h-10 w-[1px] bg-slate-200 mx-1 lg:mx-2" />

        <div className="flex items-center gap-2 lg:gap-4 cursor-pointer hover:bg-slate-50 p-1 lg:p-2 rounded-xl lg:rounded-2xl transition-all group border border-transparent hover:border-slate-100">
           <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">Pandu Sir</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Admin</p>
           </div>
           <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-bg flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-all">
              <User className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
           </div>
           <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors hidden lg:block" />
        </div>
      </div>
    </header>
  );
}
