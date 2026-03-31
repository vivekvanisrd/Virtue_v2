import React, { useState, useEffect } from "react";
import { GraduationCap, Users, Loader2 } from "lucide-react";
import { StudentForm } from "../students/student-form";
import { StudentDirectory } from "../students/student-directory";
import { EnquiryManager } from "../students/enquiry-manager";
import { StudentPromotionManager } from "../students/student-promotion";

import { StudentProfile } from "../students/student-profile";
import { StudentHub } from "../students/StudentHub";
import { VelocityAttendance } from "../attendance/VelocityAttendance";
import { MarksEntryGrid } from "../academics/MarksEntryGrid";
import { StudentImportHub } from "../students/StudentImportHub";
import { getStudentListAction } from "@/lib/actions/student-actions";

interface StudentsContentProps {
  tabId: string;
  params?: { studentId: string };
}

export function StudentsContent({ tabId, params }: StudentsContentProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (tabId === "students-attendance" || tabId === "students-exams") {
        setLoading(true);
        try {
          const result = await getStudentListAction(); 
          if (result.success) {
            setStudents(result.data);
          }
        } catch (err) {
          console.error("Failed to load student data for module:", tabId, err);
        }
        setLoading(false);
      }
    }
    loadData();
  }, [tabId]);

  if (tabId === "student-profile") {
    return <StudentProfile studentId={params?.studentId || ""} onBack={() => {}} />;
  }

  if (tabId === "students-add") {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Student Admission</h2>
            <p className="text-slate-500 font-medium text-sm mt-1">Enroll a student into the Virtue system</p>
          </div>
        </div>
        <StudentForm />
      </div>
    );
  }

  if (tabId === "students-import") {
    return <StudentImportHub />;
  }

  if (tabId === "students-enquiries") {
    return (
      <div className="space-y-4 h-full">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Admission Enquiries
            </h2>
            <p className="text-foreground opacity-50 font-medium text-[10px] uppercase tracking-wider">Manage incoming enquiries from website</p>
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

  if (tabId === "students") {
    return <StudentHub />;
  }

  if (loading) {
     return (
        <div className="h-full flex items-center justify-center py-40">
           <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40 animate-pulse">Initializing Velocity Engine...</p>
           </div>
        </div>
     );
  }

  if (tabId === "students-attendance") {
    return <VelocityAttendance students={students} classId="DEMO" sectionId="A" />;
  }

  if (tabId === "students-exams") {
    return <MarksEntryGrid students={students} examTypeId="DEMO" subjectId="DEMO" subjectName="Mathematics" />;
  }

  // Default: Student Directory (students-all or general students fallback)
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Student Directory
          </h2>
          <p className="text-foreground opacity-50 font-medium text-[10px] uppercase tracking-wider">Search, filter and manage all enrolled students</p>
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
