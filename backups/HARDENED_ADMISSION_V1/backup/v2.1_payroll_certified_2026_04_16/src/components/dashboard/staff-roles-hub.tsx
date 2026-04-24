"use client";
import React, { useState } from "react";
import { StaffRolesManager } from "./staff-roles";
import { RoleDefinitionManager } from "./role-definitions";
import { Shield, Key, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { InstitutionalConfigManager } from "./InstitutionalConfigManager";

export function StaffRolesHub() {
  const [activeTab, setActiveTab] = useState<"assign" | "define" | "setup">("assign");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-background p-2 rounded-2xl border border-border w-fit shadow-sm">
        <button 
          onClick={() => setActiveTab("assign")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
            activeTab === "assign" 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "hover:bg-muted text-foreground opacity-60 hover:opacity-100"
          )}
        >
          <Shield className="w-4 h-4" /> Role Assignment
        </button>
        <button 
          onClick={() => setActiveTab("define")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
            activeTab === "define" 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
              : "hover:bg-muted text-foreground opacity-60 hover:opacity-100"
          )}
        >
          <Key className="w-4 h-4" /> Custom Definitions
        </button>
        <button 
          onClick={() => setActiveTab("setup")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
            activeTab === "setup" 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" 
              : "hover:bg-muted text-foreground opacity-60 hover:opacity-100"
          )}
        >
          <Settings className="w-4 h-4" /> Global Setup
        </button>
      </div>

      {activeTab === "assign" ? <StaffRolesManager /> : activeTab === "define" ? <RoleDefinitionManager /> : <InstitutionalConfigManager />}
    </div>
  );
}
