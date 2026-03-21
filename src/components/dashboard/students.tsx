import React from "react";
import { GraduationCap, Users } from "lucide-react";
import { StudentForm } from "../students/student-form";
import { StudentDirectory } from "../students/student-directory";
import { EnquiryManager } from "../students/enquiry-manager";
import { StudentPromotionManager } from "../students/student-promotion";

interface StudentsContentProps {
  tabId: string;
}

export function StudentsContent({ tabId }: StudentsContentProps) {
  if (tabId === "students-add") {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Student Admission</h2>
            <p className="text-slate-500 font-medium text-[10px] uppercase tracking-wider">Enroll a new student into the Virtue System</p>
          </div>
        </div>
        <StudentForm />
      </div>
    );
  }

  if (tabId === "students-enquiries") {
    return (
      <div className="space-y-4 h-full">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Admission Enquiries
            </h2>
            <p className="text-slate-500 font-medium text-[10px] uppercase tracking-wider">Manage incoming enquiries from website</p>
          </div>
        </div>
        <EnquiryManager />
      </div>
    );
  }

  if (tabId === "students-promotion") {
    return (
      <div className="h-full">
        <StudentPromotionManager />
      </div>
    );
  }

  // Default: Student Directory (students-all or general students)
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Student Directory
          </h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase tracking-wider">Search, filter and manage all enrolled students</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />
            ))}
            <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">+</div>
          </div>
          <button className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> + New Admission
          </button>
        </div>
      </div>
      
      <StudentDirectory />
    </div>
  );
}
