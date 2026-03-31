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
  Terminal,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTabs, Tab } from "@/context/tab-context";
import { createClient } from "@/lib/supabase/client";

// Redundant: Role-based access is now handled via the native userRole prop

import { hasAccess, ROLES, Role, isOwnerOrHigher } from "@/lib/utils/rbac";

type MenuItem = {
  id: string;
  name: string;
  icon: any;
  component?: string;
  requiredRole?: Role;
  subItems?: Array<{ id: string; name: string; component: string }>;
};

const menuItems: MenuItem[] = [
  { id: "overview", name: "Overview", icon: LayoutDashboard, component: "Overview" },
  { 
    id: "students", 
    name: "Students", 
    icon: GraduationCap, 
    component: "Students",
    subItems: [
      { id: "students-all", name: "All Students", component: "Students" },
      { id: "students-add", name: "Add Student", component: "Students" },
      { id: "students-enquiries", name: "Enquiries", component: "Students" },
      { id: "students-promotion", name: "Student Promotion", component: "Students" },
      { id: "students-attendance", name: "Daily Attendance", component: "Students" },
      { id: "students-reports", name: "Reports", component: "Students" },
    ]
  },
  { 
    id: "salaries", 
    name: "Salaries", 
    icon: Briefcase,
    component: "Salaries",
    requiredRole: ROLES.ACCOUNTANT,
    subItems: [
      { id: "salary-dashboard", name: "Salary Hub", component: "Salaries" },
      { id: "salary-manager", name: "Unified Payroll Manager", component: "Salaries" },
      { id: "salary-batches", name: "Payroll Batches", component: "Salaries" },
      { id: "salary-payments", name: "Manage Salary Registry", component: "Salaries" },
    ]
  },
  { 
    id: "finance", 
    name: "Finance", 
    icon: Wallet,
    component: "Finance",
    requiredRole: ROLES.ACCOUNTANT,
    subItems: [
      { id: "fee-collection", name: "Fee Collection", component: "Finance" },
      { id: "fee-manager", name: "Fee Management", component: "Finance" },
      { id: "discounts", name: "Discounts", component: "Finance" },
      { id: "payment-requests", name: "Payment Requests", component: "Finance" },
    ]
  },
  { id: "accounting", name: "Accounting", icon: Calculator, component: "Accounting", requiredRole: ROLES.ACCOUNTANT },
  { id: "teachers", name: "Teachers", icon: Users, component: "Teachers", requiredRole: ROLES.PRINCIPAL },
  { 
    id: "staff", 
    name: "Staff", 
    icon: Users,
    component: "Staff",
    requiredRole: ROLES.PRINCIPAL,
    subItems: [
      { id: "staff-directory", name: "Directory", component: "Staff" },
      { id: "staff-attendance", name: "Attendance Ledger", component: "Staff" },
      { id: "staff-roles", name: "Role Management", component: "Staff" },
      { id: "staff-import", name: "Bulk Import", component: "Staff" }
    ]
  },
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
  { 
    id: "attendance", 
    name: "Attendance", 
    icon: CalendarCheck, 
    subItems: [
      { id: "attendance-student", name: "Velocity Run (Students)", component: "Attendance" },
      { id: "attendance-staff", name: "Payroll Ledger (Staff)", component: "Attendance" },
    ]
  },
  { id: "activities", name: "Activities", icon: Trophy, component: "Activities" },
  { id: "library", name: "Library", icon: Library, component: "Library" },
  { id: "transport", name: "Transport", icon: Bus, component: "Transport" },
  { id: "communication", name: "Communication", icon: MessageSquare, component: "Communication" },
  { 
    id: "settings", 
    name: "Settings", 
    icon: Settings, 
    subItems: [
      { id: "settings-general", name: "General Settings", component: "Settings" },
      { id: "settings-banking", name: "Banking Integration", component: "Settings" },
      { id: "settings-audit", name: "System Audit Log", component: "Settings" }
    ]
  },
  { 
    id: "developer", 
    name: "Developer Portal", 
    icon: Terminal, 
    requiredRole: ROLES.DEVELOPER,
    component: "Developer Dashboard"
  },
];

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  userRole?: Role;
}

export function Sidebar({ isMobileOpen, setIsMobileOpen, userRole = ROLES.STAFF }: SidebarProps) {
  const pathname = usePathname();
  const { openTab, activeTabId } = useTabs();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [width, setWidth] = React.useState(320);
  const [isResizing, setIsResizing] = React.useState(false);
  const [expandedItems, setExpandedItems] = React.useState<string[]>(["overview"]);

  // Removed legacy Supabase role check

  const visibleMenuItems = React.useMemo(() => {
    return menuItems.filter(item => {
      if (!item.requiredRole) return true;
      return hasAccess(userRole, item.requiredRole);
    });
  }, [userRole]);

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
          "fixed left-0 top-0 min-h-screen bg-sidebar-bg border-r border-border z-50 flex flex-col transition-all duration-300 shadow-2xl overflow-hidden ease-in-out lg:sticky lg:h-screen group/sidebar",
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
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-black/5 shrink-0 overflow-hidden border border-slate-100">
                <img src="/school-logo.png" alt="School Logo" className="w-full h-full object-contain p-1" />
              </div>
              <div className="truncate">
                <h1 className="text-lg font-black tracking-tight text-slate-900 italic">Virtue V2</h1>
                <p className="text-[8px] uppercase tracking-[2px] text-slate-400 font-bold">Enterprise Suite</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "p-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-all hidden lg:block",
                isCollapsed && "mt-2"
              )}
            >
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
            
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-all lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 relative z-10 px-4 overflow-y-auto custom-scrollbar overflow-x-hidden pb-10">
          {userRole === ROLES.DEVELOPER && (
            <div className="mb-6 space-y-1">
              <p className={cn(
                "px-6 text-[10px] font-black text-foreground opacity-20 uppercase tracking-[2px] mb-2 truncate",
                isCollapsed && "hidden"
              )}>System Core</p>
              <Link
                href="/super-admin"
                className={cn(
                  "group flex items-center gap-4 w-full text-left rounded-2xl transition-all duration-300 relative px-6 py-4 bg-primary/10 border border-primary/20",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <ShieldCheck className="w-5 h-5 shrink-0 text-primary group-hover:scale-110 transition-transform" />
                {!isCollapsed && (
                  <span className="font-black text-primary tracking-tight italic text-sm">Global Registry</span>
                )}
              </Link>
            </div>
          )}

          {visibleMenuItems.map((item) => {
            const isActive = activeTabId === item.id || item.subItems?.some(s => activeTabId === s.id);
            const isExpanded = expandedItems.includes(item.id);
            const hasSubItems = !!item.subItems?.length;

            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={(e) => {
                    if (hasSubItems) {
                      toggleExpand(item.id, e);
                      if (item.component) handleOpenTab(item);
                    } else {
                      handleOpenTab(item);
                    }
                  }}
                  title={isCollapsed ? item.name : ""}
                  className={cn(
                    "group flex items-center gap-4 w-full text-left rounded-2xl transition-all duration-300 relative",
                    isCollapsed ? "justify-center p-3" : "px-6 py-2",
                    isActive && !hasSubItems 
                      ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30" 
                      : (isActive ? "text-primary" : "text-foreground opacity-50 hover:bg-foreground/5 hover:opacity-100")
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0 transition-transform", isActive ? "text-primary" : "text-foreground opacity-40 group-hover:text-accent group-hover:scale-110")} />
                  
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
                            "flex items-center w-full px-4 py-1.5 rounded-xl text-xs font-bold transition-all border-l-2",
                            activeTabId === sub.id 
                              ? "text-accent border-accent bg-accent/5" 
                              : "text-foreground opacity-30 border-transparent hover:text-foreground opacity-60 hover:bg-foreground/[0.02]"
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

        {/* Footer removed to allow undisturbed scroll */}
      </aside>
    </>
  );
}
