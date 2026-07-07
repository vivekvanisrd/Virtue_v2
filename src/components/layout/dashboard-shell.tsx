"use client";

import React, { Suspense } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

import { TabProvider, useTabs } from "@/context/tab-context";
import { TabList } from "./tab-list";
import { GenericModule } from "../dashboard/generic-module";
import { TenantProvider, useTenant } from "@/context/tenant-context";
import { RazorpayCallbackHandler } from "../finance/RazorpayCallbackHandler";
import dynamic from "next/dynamic";
import { checkNewInternalNoticesAction } from "@/lib/actions/communication-actions";

const OverviewContent = dynamic(() => import("../dashboard/overview").then(mod => mod.OverviewContent), { 
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" /> 
});
const StudentsContent = dynamic(() => import("../dashboard/students").then(mod => mod.StudentsContent), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const FinanceContent = dynamic(() => import("../dashboard/finance").then(mod => mod.FinanceContent), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const RazorpaySimulationLab = dynamic(() => import("../developer/RazorpaySimulationLab"), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const ActivityLogViewer = dynamic(() => import("../dashboard/activity-log").then(mod => mod.ActivityLogViewer), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const StaffContent = dynamic(() => import("../dashboard/staff").then(mod => mod.StaffContent), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const StudentHub = dynamic(() => import("../students/StudentHub").then(mod => mod.StudentHub), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const StaffHub = dynamic(() => import("../dashboard/staff-hub").then(mod => mod.StaffHub), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const SalariesContent = dynamic(() => import("../dashboard/salaries").then(mod => mod.SalariesContent), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const BankSettings = dynamic(() => import("../dashboard/bank-settings").then(mod => mod.BankSettings), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const VelocityAttendance = dynamic(() => import("../attendance/VelocityAttendance").then(mod => mod.VelocityAttendance), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const AttendanceKiosk = dynamic(() => import("../attendance/v2-1/AttendanceKiosk").then(mod => mod.AttendanceKiosk), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const InstitutionalSetupHub = dynamic(() => import("../dashboard/InstitutionalSetupHub").then(mod => mod.InstitutionalSetupHub), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const AcademicArchitectHub = dynamic(() => import("../academics/AcademicArchitectHub"), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const VelocityAttendanceRunner = dynamic(() => import("../attendance/VelocityAttendanceRunner"), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const GenesisLab = dynamic(() => import("../../app/dashboard/setup/genesis/page"), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const FeeMasterHub = dynamic(() => import("../finance/FeeMasterHub").then(mod => mod.FeeMasterHub), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const ClassDashboardContent = dynamic(() => import("../dashboard/class-dashboard").then(mod => mod.ClassDashboardContent), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const TransportContent = dynamic(() => import("../dashboard/transport").then(mod => mod.TransportContent), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const SchoolCalendarPage = dynamic(() => import("../../app/dashboard/calendar/page"), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const MailboxHub = dynamic(() => import("../dashboard/MailboxHub").then(mod => mod.MailboxHub), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const ApprovalsHub = dynamic(() => import("../dashboard/ApprovalsHub").then(mod => mod.ApprovalsHub), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});
const StaffProfileHub = dynamic(() => import("../staff/StaffProfileHub"), {
  loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-3xl" />
});

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
          {tab.id === "my-profile" && <StaffProfileHub />}
          {tab.id.startsWith("staff-profile-") && (
            <StaffProfileHub targetStaffId={tab.id.replace("staff-profile-", "")} />
          )}
          {(tab.id === "students-all" || tab.id === "students-add" || tab.id === "students-promotion" || tab.id === "students-reports" || tab.id === "students-enquiries" || tab.id === "students-exams" || tab.id === "students-import") && (
            <StudentsContent tabId={tab.id} />
          )}
          {tab.id.startsWith("student-profile-") && (
            <StudentsContent tabId="student-profile" params={{ studentId: tab.id.replace("student-profile-", "") }} />
          )}
          {tab.id.startsWith("class-profile-") && (
            <ClassDashboardContent tabId="class-profile" params={{ classId: tab.id.replace("class-profile-", "") }} />
          )}
          {(tab.id === "finance" || tab.id.startsWith("fee-") || tab.id.startsWith("collection-") || /fee|finance|payroll|razorpay|bank/i.test(tab.id)) && tab.id !== "fee-master-registry" && (
            <FinanceContent 
               tabId={tab.id} 
               params={tab.params || {}} 
            />
          )}
          {tab.id === "fee-master-registry" && <FeeMasterHub />}

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
          {tab.id === "attendance-kiosk" && (
            <AttendanceKiosk />
          )}
          {tab.id === "attendance-calendar" && (
            <SchoolCalendarPage />
          )}

          {tab.id === "razorpay-lab" && (
            <RazorpaySimulationLab />
          )}

          {/* 🎓 Sovereign Academic & Attendance Expansion */}
          {tab.id === "acad-config" && <AcademicArchitectHub />}
          {tab.id === "acad-genesis" && <GenesisLab />}

          {/* Transport Module */}
          {(tab.id === "transport" || tab.id.startsWith("transport-")) && (
            <TransportContent tabId={tab.id} params={tab.params} />
          )}

          {/* Communication / Mailbox Hub Module */}
          {tab.id === "communication" && <MailboxHub params={tab.params} />}

          {/* Approvals Hub Module */}
          {tab.id === "approvals" && <ApprovalsHub />}

          {/* Generic mappings for other cataloged modules */}
          {["accounting", "teachers", "academics", "attendance", "activities", "library"].includes(tab.id) && (
            <GenericModule 
              title={tab.title} 
              description={`Modern ${tab.title} and information systems powered by PaVa-EDUX`}
            />
          )}

          {/* Fallback for truly unknown tabs */}
          {!([ "overview", "students", "staff", "accounting", "teachers", "academics", "attendance", "activities", "library", "transport", "communication", "settings", "student", "fee", "class", "my-profile", "staff-profile"].some(pre => tab.id.toLowerCase().startsWith(pre)) || /fee|finance|salary|razorpay|bank/i.test(tab.id)) && (
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
  capabilities = {},
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
  capabilities?: Record<string, boolean>;
}) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [activeToast, setActiveToast] = React.useState<{ id: string; subject: string; body: string } | null>(null);
  const seenNoticeIds = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!userEmail) return;

    const checkNotices = async () => {
      try {
        const res = await checkNewInternalNoticesAction();
        if (res.success && res.data) {
          const notice = res.data;
          if (!seenNoticeIds.current.has(notice.id)) {
            seenNoticeIds.current.add(notice.id);
            setActiveToast({ id: notice.id, subject: notice.subject, body: notice.body });
            
            // Auto dismiss after 10 seconds
            setTimeout(() => {
              setActiveToast(prev => prev?.id === notice.id ? null : prev);
            }, 10000);
          }
        }
      } catch (err) {
        console.error("Failed to check notices:", err);
      }
    };

    // Run check immediately, then poll every 12 seconds
    checkNotices();
    const interval = setInterval(checkNotices, 12000);

    return () => clearInterval(interval);
  }, [userEmail]);

  return (
    <TabProvider>
      <TenantProvider value={{ 
        schoolId: schoolId || "", 
        schoolName: schoolName || "PaVa-EDUX",
        branchId: activeBranchId || "", 
        userRole: userRole || "", 
        userName: userName || "",
        userEmail: userEmail || "",
        academicYear: academicYear || "",
        isOperationalReady,
        capabilities: capabilities || {}
      }}>
        <div className="flex min-h-screen bg-background selection:bg-primary/10 selection:text-primary relative">
          <Sidebar 
            isMobileOpen={isMobileOpen} 
            setIsMobileOpen={setIsMobileOpen} 
            userRole={userRole as any}
            schoolName={schoolName}
            isOperationalReady={isOperationalReady}
          />
          
          {/* [SOVEREIGN_SYNC_V2.1] - Ensures fresh data fetch on every render */}
          <main className="flex-1 min-h-screen bg-background transition-all duration-300 overflow-hidden flex flex-col relative">
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
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50/50">
              <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-4 lg:space-y-6">
                <WorkspaceRenderer />
              </div>
            </div>

            {/* Intercepts Razorpay callback params & records payment */}
            <Suspense fallback={null}>
              <RazorpayCallbackHandler />
            </Suspense>

            {/* Live Real-time Portal Notification Popup */}
            {activeToast && (
              <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl border border-indigo-100 shadow-2xl p-4 flex gap-3 animate-in slide-in-from-bottom-5 duration-300 font-sans">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600 text-lg">
                  🔔
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-slate-400 text-[10px] tracking-wider uppercase">New Portal Notice</h4>
                    <button 
                      onClick={() => setActiveToast(null)} 
                      className="text-slate-400 hover:text-slate-600 font-bold leading-none text-base"
                    >
                      &times;
                    </button>
                  </div>
                  <h5 className="font-black text-slate-800 text-sm mt-1 truncate">{activeToast.subject}</h5>
                  <p className="text-slate-600 text-xs mt-1 leading-normal max-h-16 overflow-y-auto pr-1 whitespace-pre-wrap">{activeToast.body}</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </TenantProvider>
    </TabProvider>
  );
}
