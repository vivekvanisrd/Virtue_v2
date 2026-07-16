"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  User, GraduationCap, CreditCard, BookOpen, 
  MessageSquare, FileText, ChevronRight, HelpCircle, AlertTriangle, ShieldAlert 
} from "lucide-react";

interface Sibling {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  relationType: string;
  isPrimary: boolean;
  feeResponsibility: boolean;
  className: string;
  sectionName: string;
  branchName: string;
  schoolName: string;
}

interface ComplianceStatus {
  isCompliant: boolean;
  isGracePeriod: boolean;
  daysRemaining: number;
  enrollmentAgeDays: number;
  missingFields: string[];
}

interface DashboardContentClientProps {
  siblings: Sibling[];
  activeStudentId: string;
  compliance?: ComplianceStatus | null;
  feeStatus?: any | null;
}

export function DashboardContentClient({ siblings, activeStudentId, compliance, feeStatus }: DashboardContentClientProps) {
  const router = useRouter();
  
  // Find selected student details
  const activeStudent = siblings.find(s => s.studentId === activeStudentId) || siblings[0];

  const handleSiblingChange = (studentId: string) => {
    router.push(`/parent/dashboard?studentId=${studentId}`);
  };

  const paidTotal = feeStatus?.feeBreakdown?.paidTotal ?? 0;
  const dueTotal = feeStatus?.feeBreakdown?.dueTotal ?? 0;

  if (!siblings || siblings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-card border border-border rounded-3xl p-8">
        <HelpCircle className="w-16 h-16 opacity-40 mb-4" />
        <h3 className="text-xl font-black">No Student Records Found</h3>
        <p className="text-sm opacity-60 max-w-sm mt-2">
          Your parent profile does not have any linked student records. Please contact school administration to link your ward profiles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Sibling Switcher Tabs */}
      {siblings.length > 1 && (
        <div className="bg-card/45 border border-border p-2 rounded-2xl flex flex-wrap gap-2">
          {siblings.map((sibling) => {
            const isActive = sibling.studentId === activeStudent.studentId;
            return (
              <button
                key={sibling.studentId}
                onClick={() => handleSiblingChange(sibling.studentId)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "bg-background/40 text-foreground/75 hover:text-foreground border border-border/80"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {sibling.firstName} {sibling.lastName}
              </button>
            );
          })}
        </div>
      )}

      {/* Ward Profile Header Card */}
      <div className="bg-gradient-to-br from-card to-background border border-border rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-primary to-accent rounded-2xl flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg">
              {activeStudent.firstName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black tracking-tight">{activeStudent.firstName} {activeStudent.lastName}</h2>
                <span className="bg-primary/10 border border-primary/20 text-primary font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                  {activeStudent.relationType}
                </span>
              </div>
              <p className="text-xs opacity-55 font-bold mt-0.5">Admission Number: {activeStudent.studentCode}</p>
              <p className="text-xs opacity-80 font-semibold mt-2 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary" />
                {activeStudent.className} — Section {activeStudent.sectionName}
              </p>
            </div>
          </div>

          <div className="text-left md:text-right border-t md:border-t-0 border-border/65 pt-4 md:pt-0">
            <p className="text-[10px] opacity-45 font-bold uppercase tracking-wider">Campus Branch</p>
            <p className="text-sm font-black">{activeStudent.branchName}</p>
            <p className="text-xs opacity-60 font-semibold mt-0.5">{activeStudent.schoolName}</p>
          </div>
        </div>
      </div>

      {/* Compliance Alert (if applicable) */}
      {compliance && !compliance.isCompliant && (
        <div className={`border rounded-3xl p-6 shadow-sm ${
          compliance.isGracePeriod 
            ? "bg-amber-50/60 border-amber-200" 
            : "bg-rose-50/60 border-rose-200"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              compliance.isGracePeriod 
                ? "bg-amber-100 border border-amber-200" 
                : "bg-rose-100 border border-rose-200"
            }`}>
              {compliance.isGracePeriod 
                ? <AlertTriangle className="w-6 h-6 text-amber-600" />
                : <ShieldAlert className="w-6 h-6 text-rose-600" />
              }
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-black uppercase tracking-wider ${
                compliance.isGracePeriod ? "text-amber-800" : "text-rose-800"
              }`}>
                {compliance.isGracePeriod 
                  ? `Action Required — ${compliance.daysRemaining} Days Remaining` 
                  : "Urgent: Compliance Documents Overdue"}
              </h3>
              <p className={`text-xs font-medium mt-1 leading-relaxed ${
                compliance.isGracePeriod ? "text-amber-700/80" : "text-rose-700/80"
              }`}>
                {compliance.isGracePeriod 
                  ? "The following documents are required to complete your ward's enrollment. Please submit them to the school office within the grace period."
                  : "The 30-day grace period has expired. The following documents must be submitted immediately to avoid restricted access to school services."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {compliance.missingFields.map((field) => (
                  <span 
                    key={field} 
                    className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                      compliance.isGracePeriod
                        ? "bg-amber-100 border-amber-200 text-amber-700"
                        : "bg-rose-100 border-rose-200 text-rose-700"
                    }`}
                  >
                    ✗ {field}
                  </span>
                ))}
              </div>
              <p className={`text-[10px] font-semibold mt-3 italic ${
                compliance.isGracePeriod ? "text-amber-600/70" : "text-rose-600/70"
              }`}>
                Please visit the school office or contact the administration to submit the missing documents.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fees Widget */}
        <div className="bg-card/40 border border-border/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black opacity-60 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Fee Ledger Summary
              </h3>
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black tracking-wide uppercase px-2 py-0.5 rounded-full">
                Active Cycle
              </span>
            </div>
            
            <div className="space-y-3 my-6">
              <div className="flex justify-between items-center py-1">
                <span className="text-xs opacity-50 font-bold">Total Paid to Date</span>
                <span className="text-sm font-black text-emerald-500">₹{paidTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-border/50">
                <span className="text-xs opacity-50 font-bold">Outstanding Balance</span>
                <span className="text-sm font-black text-rose-500">₹{dueTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => router.push(`/parent/dashboard/fees?studentId=${activeStudent.studentId}`)}
            className="w-full py-3 bg-background hover:opacity-90 border border-border text-foreground font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
          >
            View Statement & Pay Now <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Homework Widget */}
        <div className="bg-card/40 border border-border/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black opacity-60 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Active Homework
              </h3>
              <span className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black tracking-wide uppercase px-2 py-0.5 rounded-full">
                2 Pending
              </span>
            </div>

            <div className="space-y-2.5 my-4">
              <div className="p-3 bg-background/50 border border-border/60 rounded-xl">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-black text-foreground/90">Mathematics: Assignment 4.2</p>
                  <span className="text-[9px] opacity-45 font-bold shrink-0">Due Tomorrow</span>
                </div>
                <p className="text-[10px] opacity-50 mt-1 line-clamp-1">Solve questions 1-10 in homework notebook.</p>
              </div>
              
              <div className="p-3 bg-background/50 border border-border/60 rounded-xl">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-black text-foreground/90">General Science: Read Chapter 9</p>
                  <span className="text-[9px] opacity-45 font-bold shrink-0">Due Jul 12</span>
                </div>
                <p className="text-[10px] opacity-50 mt-1 line-clamp-1">Read chapter notes and draw structure diagrams.</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => router.push(`/parent/dashboard/homework?studentId=${activeStudent.studentId}`)}
            className="w-full py-3 bg-background hover:opacity-90 border border-border text-foreground font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            View All Assignments <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Notices Board */}
        <div className="bg-card/40 border border-border/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-black opacity-60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Campus Announcements
            </h3>

            <div className="space-y-3 my-4">
              <div className="p-3 bg-background/40 border border-border/55 rounded-xl flex gap-3">
                <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary text-[10px] font-black shrink-0">
                  Jul 8
                </div>
                <div>
                  <p className="text-xs font-black text-foreground/90">Annual Sports Registration Open</p>
                  <p className="text-[10px] opacity-50 mt-0.5 line-clamp-1">Register for track events at the physical education office.</p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => router.push(`/parent/dashboard/notifications`)}
            className="w-full py-3 bg-background hover:opacity-90 border border-border text-foreground font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            View Bulletin Board <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Portal Feedback & Help */}
        <div className="bg-card/40 border border-border/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-black opacity-60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Suggestions & Review
            </h3>
            <p className="text-xs opacity-50 font-semibold leading-relaxed my-4">
              Your feedback helps us improve our academic infrastructure and parent portal experience. Submit reviews or report errors directly to administrators.
            </p>
          </div>

          <button 
            onClick={() => router.push(`/parent/dashboard/feedback?studentId=${activeStudent.studentId}`)}
            className="w-full py-3 bg-background hover:opacity-90 border border-border text-foreground font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Submit Feedback <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
