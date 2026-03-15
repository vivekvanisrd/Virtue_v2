"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

import { TabProvider, useTabs } from "@/context/tab-context";
import { TabList } from "./tab-list";
import { GenericModule } from "../dashboard/generic-module";
import { OverviewContent } from "../dashboard/overview";
import { StudentsContent } from "../dashboard/students";
import { FinanceContent } from "../dashboard/finance";

function WorkspaceRenderer() {
  const { tabs, activeTabId } = useTabs();

  return (
    <div className="flex-1 relative">
      {tabs.map((tab) => (
        <div 
          key={tab.id}
          className={tab.id === activeTabId ? "block animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}
        >
          {tab.id === "overview" && <OverviewContent />}
          {(tab.id === "students" || tab.id === "students-all" || tab.id === "students-add" || tab.id === "students-promotion" || tab.id === "students-reports") && (
            <StudentsContent tabId={tab.id} />
          )}
          {tab.id === "finance" && <FinanceContent />}
          
          {/* Generic mappings for other cataloged modules */}
          {["salaries", "accounting", "teachers", "staff", "academics", "attendance", "activities", "library", "transport", "communication", "settings"].includes(tab.id) && (
            <GenericModule 
              title={tab.title} 
              description={`Modern ${tab.title} and information systems for Virtue School`}
            />
          )}

          {/* Fallback for truly unknown tabs */}
          {!["overview", "students", "students-all", "students-add", "students-promotion", "students-reports", "finance", "salaries", "accounting", "teachers", "staff", "academics", "attendance", "activities", "library", "transport", "communication", "settings"].includes(tab.id) && (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 py-40">
              <h2 className="text-2xl font-bold italic">Module Implementation Pending</h2>
              <p>The {tab.title} section is coming soon.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <TabProvider>
      <div className="flex min-h-screen bg-background selection:bg-primary/10 selection:text-primary relative">
        <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
        
        <main className="flex-1 min-h-screen bg-background transition-all duration-300">
          <Header onMenuClick={() => setIsMobileOpen(true)} />
          <TabList />
          
          <div className="p-4 lg:p-4 max-w-[1600px] mx-auto">
            <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-4 lg:space-y-6">
              <WorkspaceRenderer />
            </main>
          </div>
        </main>
      </div>
    </TabProvider>
  );
}
