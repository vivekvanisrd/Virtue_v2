"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  GraduationCap, 
  LayoutDashboard, 
  Wallet, 
  Settings, 
  ChevronRight,
  LogOut,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  GripVertical,
  Briefcase,
  BookOpen,
  Calculator,
  CalendarCheck,
  Trophy,
  Library,
  Bus,
  MessageSquare,
  ShieldCheck,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTabs, Tab } from "@/context/tab-context";

const menuItems = [
  { id: "overview", name: "Overview", icon: LayoutDashboard, component: "Overview" },
  { 
    id: "students", 
    name: "Students", 
    icon: GraduationCap, 
    subItems: [
      { id: "students-all", name: "All Students", component: "Students" },
      { id: "students-add", name: "Add Student", component: "Students" },
      { id: "students-promotion", name: "Student Promotion", component: "Students" },
      { id: "students-reports", name: "Reports", component: "Students" },
    ]
  },
  { 
    id: "salaries", 
    name: "Salaries", 
    icon: Briefcase,
    subItems: [
      { id: "salary-dashboard", name: "Salary Dashboard", component: "Salaries" },
      { id: "salary-manager", name: "Unified Manager", component: "Salaries" },
      { id: "salary-batches", name: "Payroll Batches", component: "Salaries" },
      { id: "salary-payments", name: "Record Payments", component: "Salaries" },
    ]
  },
  { 
    id: "finance", 
    name: "Finance", 
    icon: Wallet,
    subItems: [
      { id: "fee-collection", name: "Fee Collection", component: "Finance" },
      { id: "fee-manager", name: "Fee Management", component: "Finance" },
      { id: "discounts", name: "Discounts", component: "Finance" },
      { id: "payment-requests", name: "Payment Requests", component: "Finance" },
    ]
  },
  { id: "accounting", name: "Accounting", icon: Calculator, component: "Accounting" },
  { id: "teachers", name: "Teachers", icon: Users, component: "Teachers" },
  { id: "staff", name: "Staff", icon: Users, component: "Staff" },
  { 
    id: "academics", 
    name: "Academics", 
    icon: BookOpen,
    subItems: [
      { id: "acad-config", name: "Configuration", component: "Academics" },
      { id: "acad-timetable", name: "Timetables", component: "Academics" },
      { id: "acad-exams", name: "Examinations", component: "Academics" },
    ]
  },
  { id: "attendance", name: "Attendance", icon: CalendarCheck, component: "Attendance" },
  { id: "activities", name: "Activities", icon: Trophy, component: "Activities" },
  { id: "library", name: "Library", icon: Library, component: "Library" },
  { id: "transport", name: "Transport", icon: Bus, component: "Transport" },
  { id: "communication", name: "Communication", icon: MessageSquare, component: "Communication" },
  { id: "settings", name: "Settings", icon: Settings, component: "Settings" },
];

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { openTab, activeTabId } = useTabs();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [width, setWidth] = React.useState(320);
  const [isResizing, setIsResizing] = React.useState(false);
  const [expandedItems, setExpandedItems] = React.useState<string[]>(["overview"]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseEvent.clientX;
        if (newWidth > 200 && newWidth < 600) {
          setWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  React.useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleOpenTab = (item: any) => {
    openTab({ 
      id: item.id, 
      title: item.name, 
      icon: item.icon || ChevronRight, 
      component: item.component 
    });
    // Auto-close on mobile after selection
    if (window.innerWidth < 1024) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside 
        style={{ width: isCollapsed ? 80 : width }}
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar-bg border-r border-border z-50 flex flex-col transition-all duration-300 shadow-2xl overflow-hidden ease-in-out lg:sticky group/sidebar",
          isResizing && "transition-none",
          !isMobileOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Resizer handle (Desktop Only) */}
        {!isCollapsed && (
          <div 
            onMouseDown={startResizing}
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/40 transition-colors z-50 hidden lg:flex items-center justify-center"
          >
             <div className="w-[1px] h-10 bg-white/10 group-hover/sidebar:bg-white/30" />
          </div>
        )}

        {/* Sidebar background glow */}
        <div className="absolute top-[-20%] left-[-20%] w-full h-full bg-primary/10 blur-[100px] pointer-events-none" />
        
        {/* Branding & Collapse Toggle */}
        <div className={cn("flex items-center justify-between mb-8 lg:mb-10 relative z-10 p-6", isCollapsed && "justify-center px-0")}>
          {!isCollapsed && (
            <div className="flex items-center gap-4 p-2 animate-in fade-in duration-500">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20 shrink-0">
                <Sparkles className="w-6 h-6 text-white fill-white" />
              </div>
              <div className="truncate">
                <h1 className="text-lg font-bold tracking-tight">Virtue V2</h1>
                <p className="text-[8px] uppercase tracking-[2px] text-white/40 font-bold">Enterprise</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all hidden lg:block",
                isCollapsed && "mt-2"
              )}
            >
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
            
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 relative z-10 px-4 overflow-y-auto custom-scrollbar overflow-x-hidden pb-10">
          {menuItems.map((item) => {
            const isActive = activeTabId === item.id || item.subItems?.some(s => activeTabId === s.id);
            const isExpanded = expandedItems.includes(item.id);
            const hasSubItems = !!item.subItems?.length;

            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={(e) => hasSubItems ? toggleExpand(item.id, e) : handleOpenTab(item)}
                  title={isCollapsed ? item.name : ""}
                  className={cn(
                    "group flex items-center gap-4 w-full text-left rounded-2xl transition-all duration-300 relative",
                    isCollapsed ? "justify-center p-3" : "px-6 py-3",
                    isActive && !hasSubItems 
                      ? "bg-primary text-white shadow-xl shadow-primary/30" 
                      : (isActive ? "text-white" : "text-white/50 hover:bg-white/5 hover:text-white")
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0 transition-transform", isActive ? "text-white" : "text-white/40 group-hover:text-accent group-hover:scale-110")} />
                  
                  {!isCollapsed && (
                    <>
                      <span className="font-bold tracking-wide truncate animate-in fade-in slide-in-from-left-2 duration-300 text-sm">{item.name}</span>
                      {hasSubItems && (
                        <ChevronRight className={cn(
                          "ml-auto w-4 h-4 transition-transform duration-300",
                          isExpanded && "rotate-90"
                        )} />
                      )}
                    </>
                  )}
                </button>

                {/* Sub Items Accordion */}
                <AnimatePresence>
                  {hasSubItems && isExpanded && !isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pl-11 space-y-1"
                    >
                      {item.subItems!.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleOpenTab(sub)}
                          className={cn(
                            "flex items-center w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-l-2",
                            activeTabId === sub.id 
                              ? "text-accent border-accent bg-accent/5 shadow-[inset_0_0_20px_rgba(124,77,255,0.05)]" 
                              : "text-white/30 border-transparent hover:text-white/60 hover:border-white/10 hover:bg-white/[0.02]"
                          )}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto relative z-10 pt-4 border-t border-white/5 p-4 bg-[#1a1a2e]/80 backdrop-blur-md">
          <button className={cn(
            "flex items-center gap-4 w-full text-white/40 hover:bg-red-500/10 hover:text-red-400 rounded-2xl transition-all group",
            isCollapsed ? "justify-center p-3" : "px-6 py-4"
          )}>
            <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
            {!isCollapsed && <span className="font-bold text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
