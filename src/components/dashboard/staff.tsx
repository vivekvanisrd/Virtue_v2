import React, { useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { StaffDirectory } from "../staff/staff-directory";
import { StaffForm } from "../staff/staff-form";
import { StaffAttendanceSheet } from "../staff/StaffAttendanceSheet";

interface StaffContentProps {
  tabId?: string;
}

export function StaffContent({ tabId }: StaffContentProps) {
  const [activeView, setActiveView] = useState<"directory" | "onboard">("directory");

  return (
    <div className="space-y-4 h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {activeView === "directory" ? "Staff Directory" : "Onboard New Staff"}
          </h2>
          <p className="text-foreground opacity-50 font-medium text-[10px] uppercase tracking-wider">
            {activeView === "directory" ? "Search, filter and manage all school personnel" : "Register a new teacher or administrative staff member"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveView(activeView === "directory" ? "onboard" : "directory")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5"
          >
            {activeView === "directory" ? (
              <><UserPlus className="w-3.5 h-3.5" /> + New Onboarding</>
            ) : (
              <><Users className="w-3.5 h-3.5" /> View Directory</>
            )}
          </button>
        </div>
      </div>
      
      {tabId === "staff-attendance" ? (
         <StaffAttendanceSheet />
      ) : (
         activeView === "directory" ? <StaffDirectory /> : <StaffForm />
      )}
    </div>
  );
}
