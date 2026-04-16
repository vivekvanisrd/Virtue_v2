"use client";

import React, { Suspense } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

import { TabProvider, useTabs } from "@/context/tab-context";
import { TabList } from "./tab-list";
import { GenericModule } from "../dashboard/generic-module";
import { OverviewContent } from "../dashboard/overview";
import { StudentsContent } from "../dashboard/students";
import { FinanceContent } from "../dashboard/finance";
import RazorpaySimulationLab from "../developer/RazorpaySimulationLab";
import { RazorpayCallbackHandler } from "../finance/RazorpayCallbackHandler";

import { StaffRolesManager } from "../dashboard/staff-roles";
import { StaffImportManager } from "../dashboard/staff-import";
import { ActivityLogViewer } from "../dashboard/activity-log";
import { StaffContent } from "../dashboard/staff";
import { StudentHub } from "../students/StudentHub";
import { StaffHub } from "../dashboard/staff-hub";
import { SalariesContent } from "../dashboard/salaries";
import { BankSettings } from "../dashboard/bank-settings";
import { VelocityAttendance } from "../attendance/VelocityAttendance";
import { TenantProvider, useTenant } from "@/context/tenant-context";
import { InstitutionalSetupHub } from "../dashboard/InstitutionalSetupHub";

function WorkspaceRenderer() {
  const { tabs, activeTabId } = useTabs();
  const { schoolId } = useTenant();
  console.log("[WORKSPACE_RENDERER] Active:", activeTabId, "Tabs:", tabs.map(t => t.id));

  return (
    <div className="flex-1 relative">
      {tabs.map((tab) => (
        <div 
          key={tab.id}
          className={tab.id === activeTabId ? "block animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}
        >
          {tab.id === "overview" && <OverviewContent />}
          {tab.id === "settings" && <InstitutionalSetupHub />}
          {tab.id === "students" && <StudentHub />}
          {(tab.id === "students-all" || tab.id === "students-add" || tab.id === "students-promotion" || tab.id === "students-reports" || tab.id === "students-enquiries" || tab.id === "students-exams" || tab.id === "students-import") && (
            <StudentsContent tabId={tab.id} />
          )}
          {tab.id.startsWith("student-profile-") && (
            <StudentsContent tabId="student-profile" params={{ studentId: tab.id.replace("student-profile-", "") }} />
          )}
          {(tab.id === "finance" || tab.id.startsWith("fee-") || tab.id.startsWith("collection-") || /fee|finance|payroll|razorpay/i.test(tab.id)) && (
            <FinanceContent 
               tabId={tab.id.startsWith("fee-collection") ? "fee-collection" : tab.id} 
               params={tab.params || {}} 
            />
          )}

          {/* Staff Module */}
          {tab.id === "staff" && <StaffHub />}
          {(tab.id === "staff-directory" || tab.id === "staff-attendance" || tab.id === "staff-roles" || tab.id === "staff-import" || tab.id.startsWith("staff-profile-") || tab.id.startsWith("staff-financials-")) && (
            <StaffContent tabId={tab.id} params={tab.params} />
          )}

          {/* Salaries Module */}
          {(tab.id === "salaries" || /salary/i.test(tab.id)) && (
            <SalariesContent tabId={tab.id} />
          )}

          {tab.id === "settings-banking" && <BankSettings schoolId={schoolId} />}
          {tab.id === "settings-audit" && <ActivityLogViewer />}
          
          {/* Attendance Hub Mappings */}
          {(tab.id === "attendance-student" || tab.id === "students-attendance") && (
            <VelocityAttendance />
          )}
          {tab.id === "attendance-staff" && (
            <StaffContent tabId="staff-attendance" />
          )}

          {tab.id === "razorpay-lab" && (
            <RazorpaySimulationLab />
          )}

          {/* Generic mappings for other cataloged modules */}
          {["accounting", "teachers", "academics", "attendance", "activities", "library", "transport", "communication"].includes(tab.id) && (
            <GenericModule 
              title={tab.title} 
              description={`Modern ${tab.title} and information systems powered by PaVa-EDUX`}
            />
          )}

          {/* Fallback for truly unknown tabs */}
          {!([ "overview", "students", "staff", "accounting", "teachers", "academics", "attendance", "activities", "library", "transport", "communication", "settings"].some(pre => tab.id.toLowerCase().startsWith(pre)) || /fee|finance|salary|razorpay/i.test(tab.id)) && (
            <div className="flex flex-col items-center justify-center h-full text-foreground opacity-30 py-40">
              <h2 className="text-2xl font-bold italic text-rose-500">Module Implementation Pending (HARD_OVERRIDE_V7)</h2>
              <p>The {tab.title} section (ID: {tab.id}) is coming soon.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DashboardShell({
  children,
  userEmail,
  userRole,
  userName,
  academicYear,
  branches = [],
  activeBranchId = "GLOBAL",
  schoolId,
  schoolName,
  activeBranchName,
  isOperationalReady = true,
}: {
  children: React.ReactNode;
  userEmail?: string;
  userRole?: string;
  userName?: string;
  academicYear?: string;
  branches?: any[];
  activeBranchId?: string;
  activeBranchName?: string;
  schoolId?: string;
  schoolName?: string;
  isOperationalReady?: boolean;
}) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <TabProvider>
      <TenantProvider value={{ 
        schoolId: schoolId || "", 
        schoolName: schoolName || "PaVa-EDUX",
        branchId: activeBranchId || "", 
        userRole: userRole || "", 
        userName: userName || "",
        academicYear: academicYear || "",
        isOperationalReady
      }}>
        <div className="flex min-h-screen bg-background selection:bg-primary/10 selection:text-primary relative">
          <Sidebar 
            isMobileOpen={isMobileOpen} 
            setIsMobileOpen={setIsMobileOpen} 
            userRole={userRole as any}
            schoolName={schoolName}
            isOperationalReady={isOperationalReady}
          />
          
          <main className="flex-1 min-h-screen bg-background transition-all duration-300 overflow-hidden flex flex-col">
            <Header 
              onMenuClick={() => setIsMobileOpen(true)} 
              userEmail={userEmail}
              userRole={userRole}
              userName={userName}
              schoolName={schoolName}
              academicYear={academicYear}
              branches={branches}
              activeBranchId={activeBranchId}
              activeBranchName={activeBranchName}
            />
            <TabList />
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-4 lg:space-y-6">
                <WorkspaceRenderer />
              </div>
            </div>

            {/* Intercepts Razorpay callback params & records payment */}
            <Suspense fallback={null}>
              <RazorpayCallbackHandler />
            </Suspense>
          </main>
        </div>
      </TenantProvider>
    </TabProvider>
  );
}
