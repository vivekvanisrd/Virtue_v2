"use client";

import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Settings2, 
  Bell,
  Search,
  Zap,
  BarChart3
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// 🔮 Dynamic Import for Interactive Sidebar (Prevents Hydration Mismatch)
const V2Sidebar = dynamic(() => import('./V2CommandSidebar').then(mod => mod.V2Sidebar), { 
  ssr: false,
  loading: () => <div className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-200 z-50 animate-pulse" />
});

export default function V2DeveloperLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div 
        className="min-h-screen bg-slate-50/80 text-slate-900 font-sans selection:bg-indigo-100"
        suppressHydrationWarning
    >
      {/* 🔮 Top Bar */}
      <header className="fixed top-0 right-0 left-0 h-20 bg-white/70 backdrop-blur-xl border-b border-white/40 z-40 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all"
          >
            <Menu className="w-5 h-5 text-slate-500" />
          </button>
          
          <div className="h-8 w-px bg-slate-200 mx-2" />
          
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/80">Command Center</span>
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight">Virtue Runtime</span>
                <span className="px-2 py-0.5 bg-indigo-50 text-[10px] font-black text-indigo-600 rounded-md border border-indigo-100">v2.0.5-STABLE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2 gap-3 mr-4">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                placeholder="Search registry..." 
                className="bg-transparent border-none focus:outline-none text-xs font-semibold w-48 placeholder:text-slate-400"
            />
            <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-neutral-400 font-bold">⌘K</span>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-2xl">
            <button className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all relative">
              <Bell className="w-4.5 h-4.5" />
              <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <button className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all">
              <Settings2 className="w-4.5 h-4.5" />
            </button>
            <div className="w-px h-6 bg-slate-200 my-auto" />
            <button className="p-1 px-3 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white text-[10px] font-black italic shadow-lg shadow-indigo-600/20">
                DV
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[10px] font-black text-slate-900 leading-none">Developer Account</div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Root Authority</div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* 🏮 Sidebar Component (No-SSR via Dynamic Import) */}
      <V2Sidebar isOpen={isSidebarOpen} />

      {/* 🚀 Main Content Shell */}
      <main className={cn(
        "transition-all duration-300 pt-28 pb-12 px-8 min-h-screen",
        isMounted && isSidebarOpen ? "pl-[22rem]" : "pl-8"
      )}>
        <div className="max-w-6xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
}
