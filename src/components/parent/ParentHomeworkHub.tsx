"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Calendar, Clock, CheckCircle2, AlertCircle, FileText, User, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface HomeworkTask {
  id: string;
  classId: string;
  subjectId: string;
  homeworkDate: Date | string;
  dueDate: Date | string;
  title: string;
  description: string;
  attachment: string | null;
  status: string;
  class: { name: string };
  section?: { name: string } | null;
  submissions: Array<{
    id: string;
    submittedAt: Date | string;
    submissionStatus: string;
    teacherRemarks: string | null;
    marks: any;
  }>;
}

export default function ParentHomeworkHub({
  initialHomework,
  siblings,
  activeStudentId
}: {
  initialHomework: HomeworkTask[];
  siblings: any[];
  activeStudentId?: string;
}) {
  const router = useRouter();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(activeStudentId || siblings[0]?.studentId || "");
  const [activeTab, setActiveTab] = useState<"HOMEWORK" | "TIMETABLE">("HOMEWORK");
  const [selectedTask, setSelectedTask] = useState<HomeworkTask | null>(null);

  useEffect(() => {
    if (activeStudentId && activeStudentId !== selectedStudentId) {
      setSelectedStudentId(activeStudentId);
    }
  }, [activeStudentId]);

  const studentName = siblings.find((s) => s.studentId === selectedStudentId)?.firstName || "Student";
  const displayHomework = initialHomework.length > 0 
    ? initialHomework 
    : generateMockHomework(selectedStudentId);

  const timetable = generateMockTimetable();

  return (
    <div className="space-y-6">
      {/* Student & Tab Selectors */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card border border-border/80 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Classes & Homework
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Access homework lists, warded timetables, and teacher grades.</p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {siblings.length > 1 && (
            <select
              value={selectedStudentId}
              onChange={(e) => {
                const sid = e.target.value;
                setSelectedStudentId(sid);
                router.push(`/parent/dashboard/homework?studentId=${sid}`);
              }}
              className="bg-background border border-border/85 px-4 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              {siblings.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.firstName}
                </option>
              ))}
            </select>
          )}

          <div className="flex bg-background border border-border/80 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setActiveTab("HOMEWORK")}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === "HOMEWORK" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Homework
            </button>
            <button
              onClick={() => setActiveTab("TIMETABLE")}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === "TIMETABLE" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Timetable
            </button>
          </div>
        </div>
      </div>

      {activeTab === "HOMEWORK" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Homework List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-black flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-primary" /> Assigned Homework Tasks
              </h2>

              <div className="space-y-3">
                {displayHomework.map((task) => {
                  const submission = task.submissions[0];
                  const isSubmitted = !!submission;
                  const isEvaluated = submission?.submissionStatus === "EVALUATED";

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="bg-background hover:bg-card/30 border border-border/60 p-4.5 rounded-xl flex justify-between items-center cursor-pointer hover:border-primary/40 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-wider">
                            {task.class.name}
                          </span>
                          <h3 className="text-sm font-black">{task.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-bold pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary" /> Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div>
                        {isEvaluated ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-black">
                            Graded
                          </span>
                        ) : isSubmitted ? (
                          <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-black">
                            Submitted
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 rounded-full text-xs font-black">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Homework Detail Overlay Panel */}
          <div className="lg:col-span-1">
            {selectedTask ? (
              <div className="bg-card border border-border/80 p-6 rounded-2xl space-y-5 sticky top-24">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-black">{selectedTask.title}</h3>
                  <span className="text-[10px] text-muted-foreground font-bold">
                    Class: {selectedTask.class.name}
                  </span>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Details</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed bg-background p-3 rounded-xl border border-border/60">
                      {selectedTask.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Assigned</h4>
                      <p className="font-bold">{new Date(selectedTask.homeworkDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Deadline</h4>
                      <p className="font-bold text-rose-400">{new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {selectedTask.submissions[0] && (
                    <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl space-y-2">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Teacher Feedback
                      </h4>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Grade Marks:</span>
                          <span className="font-black text-primary">{selectedTask.submissions[0].marks || "Pending"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pt-1">
                          <span className="text-muted-foreground">Remarks:</span>
                          <p className="text-muted-foreground italic mt-0.5">
                            "{selectedTask.submissions[0].teacherRemarks || "Good submission."}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border/80 border-dashed p-10 rounded-2xl flex flex-col items-center justify-center text-center text-muted-foreground h-48 sticky top-24">
                <HelpCircle className="w-8 h-8 text-primary mb-2 opacity-50 animate-bounce" />
                <p className="text-xs font-bold">Select a homework card to view teacher evaluation details</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Timetable HUD View */
        <div className="bg-card border border-border/80 p-6 rounded-2xl">
          <h2 className="text-base font-black flex items-center gap-2 mb-4">
            <Clock className="w-4.5 h-4.5 text-primary" /> Class Timetable Schedule
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground font-black text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">Period / Day</th>
                  <th className="py-3 px-4">Mon</th>
                  <th className="py-3 px-4">Tue</th>
                  <th className="py-3 px-4">Wed</th>
                  <th className="py-3 px-4">Thu</th>
                  <th className="py-3 px-4">Fri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-bold">
                {timetable.map((row) => (
                  <tr key={row.period} className="hover:bg-card/40 transition-colors">
                    <td className="py-4 px-4 text-left border-r border-border/30">
                      <span className="block font-black text-sm text-primary">{row.period}</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">{row.time}</span>
                    </td>
                    {row.days.map((day, idx) => (
                      <td key={idx} className="py-4 px-4">
                        <span className="block text-sm">{day.subject}</span>
                        <span className="block text-[9px] text-muted-foreground font-black tracking-wide uppercase mt-0.5">
                          {day.teacher}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function generateMockHomework(studentId: string): HomeworkTask[] {
  const baseDate = new Date();
  
  return [
    {
      id: "mock_hw_1",
      classId: "mock_c1",
      subjectId: "mock_sub1",
      homeworkDate: new Date(baseDate.setDate(baseDate.getDate() - 3)).toISOString(),
      dueDate: new Date(baseDate.setDate(baseDate.getDate() + 2)).toISOString(),
      title: "Algebra Exercise 4.2 Problems",
      description: "Solve linear equations on page 84 problems 1 through 10. Show step-by-step methods clearly.",
      attachment: null,
      status: "PUBLISHED",
      class: { name: "Class 10" },
      submissions: [
        {
          id: "sub_1",
          submittedAt: new Date().toISOString(),
          submissionStatus: "EVALUATED",
          teacherRemarks: "Excellent working, all steps are accurate. Keep it up!",
          marks: 9.5
        }
      ]
    },
    {
      id: "mock_hw_2",
      classId: "mock_c1",
      subjectId: "mock_sub2",
      homeworkDate: new Date(baseDate.setDate(baseDate.getDate() - 2)).toISOString(),
      dueDate: new Date(baseDate.setDate(baseDate.getDate() + 4)).toISOString(),
      title: "Newtonian Physics Lab Writeup",
      description: "Submit a 2-page detailed report on the pendulum oscillation laboratory experiment carried out last Monday.",
      attachment: null,
      status: "PUBLISHED",
      class: { name: "Class 10" },
      submissions: []
    }
  ];
}

interface TimetableRow {
  period: string;
  time: string;
  days: Array<{ subject: string; teacher: string }>;
}

function generateMockTimetable(): TimetableRow[] {
  return [
    {
      period: "Period 1",
      time: "09:00 AM - 09:45 AM",
      days: [
        { subject: "Mathematics", teacher: "Mrs. K. Rama" },
        { subject: "Physics", teacher: "Mr. M. Gopi" },
        { subject: "Chemistry", teacher: "Dr. P. Srinivas" },
        { subject: "Mathematics", teacher: "Mrs. K. Rama" },
        { subject: "Physics", teacher: "Mr. M. Gopi" }
      ]
    },
    {
      period: "Period 2",
      time: "09:45 AM - 10:30 AM",
      days: [
        { subject: "Physics", teacher: "Mr. M. Gopi" },
        { subject: "English", teacher: "Mrs. Sarah" },
        { subject: "Mathematics", teacher: "Mrs. K. Rama" },
        { subject: "Computer Sc.", teacher: "Mrs. Lakshmi" },
        { subject: "English", teacher: "Mrs. Sarah" }
      ]
    },
    {
      period: "Period 3",
      time: "10:45 AM - 11:30 AM",
      days: [
        { subject: "Chemistry", teacher: "Dr. P. Srinivas" },
        { subject: "Mathematics", teacher: "Mrs. K. Rama" },
        { subject: "Physics", teacher: "Mr. M. Gopi" },
        { subject: "English", teacher: "Mrs. Sarah" },
        { subject: "Chemistry", teacher: "Dr. P. Srinivas" }
      ]
    },
    {
      period: "Period 4",
      time: "11:30 AM - 12:15 PM",
      days: [
        { subject: "English", teacher: "Mrs. Sarah" },
        { subject: "Computer Sc.", teacher: "Mrs. Lakshmi" },
        { subject: "English", teacher: "Mrs. Sarah" },
        { subject: "Chemistry", teacher: "Dr. P. Srinivas" },
        { subject: "Computer Sc.", teacher: "Mrs. Lakshmi" }
      ]
    }
  ];
}
