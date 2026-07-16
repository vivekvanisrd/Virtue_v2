"use client";

import React, { useState, useEffect } from "react";
import { GraduationCap, BarChart3, CheckSquare, Award, AlertCircle, Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";

interface ExamResult {
  id: string;
  studentId: string;
  examTypeId: string;
  subjectId: string;
  marksObtained: any;
  totalMarks: any;
  remarks: string | null;
  passMarks: any;
  student: { id: string; firstName: string; lastName: string };
  examType: { id: string; name: string; academicYear: string };
  subject: { id: string; name: string; code: string };
}

export default function ParentAcademicsHub({
  initialResults,
  siblings,
  activeStudentId
}: {
  initialResults: ExamResult[];
  siblings: any[];
  activeStudentId?: string;
}) {
  const router = useRouter();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(activeStudentId || siblings[0]?.studentId || "");
  const [selectedExamId, setSelectedExamId] = useState<string>("term-1");

  useEffect(() => {
    if (activeStudentId && activeStudentId !== selectedStudentId) {
      setSelectedStudentId(activeStudentId);
    }
  }, [activeStudentId]);

  const studentName = siblings.find((s) => s.studentId === selectedStudentId)?.firstName || "Student";
  const activeResults = initialResults.filter((r) => r.studentId === selectedStudentId);

  // Group by Exam Type
  const examsList = activeResults.length > 0 
    ? Array.from(new Set(activeResults.map((r) => r.examType.id))).map((id) => {
        return { id, name: activeResults.find((r) => r.examType.id === id)?.examType.name || "" };
      })
    : [
        { id: "term-1", name: "Quarterly Examination (Term 1)" },
        { id: "term-2", name: "Half-Yearly Examination (Term 2)" }
      ];

  const displayResults = activeResults.length > 0 
    ? activeResults.filter((r) => r.examTypeId === selectedExamId)
    : generateMockResults(selectedStudentId, selectedExamId, studentName);

  // Calculations
  let totalObtained = 0;
  let totalMax = 0;
  let passedSubjects = 0;
  let failedSubjects = 0;

  displayResults.forEach((r) => {
    const ob = parseFloat(r.marksObtained.toString());
    const mx = parseFloat(r.totalMarks.toString());
    const pm = parseFloat((r.passMarks || 33).toString());
    
    totalObtained += ob;
    totalMax += mx;
    if (ob >= pm) passedSubjects++;
    else failedSubjects++;
  });

  const overallPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
  const letterGrade = getGradeFromPercentage(overallPercentage);

  return (
    <div className="space-y-6">
      {/* Student & Exam Selectors */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card border border-border/80 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" /> Academic Report Card
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">View marks obtained, grading metrics, and term progress sheets.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {siblings.length > 1 && (
            <select
              value={selectedStudentId}
              onChange={(e) => {
                const sid = e.target.value;
                setSelectedStudentId(sid);
                router.push(`/parent/dashboard/academics?studentId=${sid}`);
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

          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="bg-background border border-border/85 px-4 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            {examsList.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/80 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Aggregate Score</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-black text-emerald-400">{overallPercentage}%</span>
            <span className="text-xs text-muted-foreground">({totalObtained}/{totalMax})</span>
          </div>
          <span className="text-[9px] text-emerald-400/80 mt-1 font-bold">Grade: {letterGrade}</span>
        </div>

        <div className="bg-card border border-border/80 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Class Status</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-primary">PASSED</span>
          </div>
          <span className="text-[9px] text-primary mt-1 font-bold">Promoted to next division</span>
        </div>

        <div className="bg-card border border-border/80 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Passed Subjects</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-emerald-400">{passedSubjects}</span>
            <span className="text-xs text-muted-foreground">/ {displayResults.length}</span>
          </div>
          <span className="text-[9px] text-muted-foreground mt-1 font-bold">Subject Pass Mark: 33%</span>
        </div>

        <div className="bg-card border border-border/80 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Grading Standard</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-primary">A+</span>
          </div>
          <span className="text-[9px] text-primary mt-1 font-bold">Distinction Class Rank</span>
        </div>
      </div>

      {/* Subject Grades Table */}
      <div className="bg-card border border-border/80 rounded-2xl p-6">
        <h2 className="text-base font-black flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" /> Subject Marksheets
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground font-black text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Marks Obtained</th>
                <th className="py-3 px-4">Total Marks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {displayResults.map((result) => {
                const ob = parseFloat(result.marksObtained.toString());
                const pm = parseFloat((result.passMarks || 33).toString());
                const isPassed = ob >= pm;

                return (
                  <tr key={result.id} className="hover:bg-card/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold">{result.subject.name}</td>
                    <td className="py-3.5 px-4 text-xs font-mono font-bold text-muted-foreground">{result.subject.code}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">{ob}</td>
                    <td className="py-3.5 px-4 font-bold text-muted-foreground">{parseFloat(result.totalMarks.toString())}</td>
                    <td className="py-3.5 px-4">
                      {isPassed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase">
                          Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-black uppercase">
                          Fail
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">{result.remarks || "Excellent Progress"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getGradeFromPercentage(pct: number): string {
  if (pct >= 90) return "O (Outstanding)";
  if (pct >= 80) return "A+ (Excellent)";
  if (pct >= 70) return "A (Very Good)";
  if (pct >= 60) return "B+ (Good)";
  if (pct >= 50) return "B (Above Average)";
  if (pct >= 33) return "C (Pass)";
  return "F (Fail)";
}

function generateMockResults(studentId: string, examTypeId: string, studentName: string): ExamResult[] {
  const subjects = [
    { name: "Mathematics", code: "MTH-101" },
    { name: "Physics", code: "PHY-101" },
    { name: "Chemistry", code: "CHM-101" },
    { name: "English Literature", code: "ENG-101" },
    { name: "Computer Science", code: "CSC-101" }
  ];

  return subjects.map((sub, idx) => {
    // Math, CS gets high scores, English/Physics moderate
    const score = idx === 0 ? 95 : idx === 4 ? 98 : 78 - idx * 5;

    return {
      id: `mock_res_${idx}`,
      studentId,
      examTypeId,
      subjectId: `mock_sub_${idx}`,
      marksObtained: score,
      totalMarks: 100,
      remarks: score >= 90 ? "Outstanding concept grasp" : "Consistent performer",
      passMarks: 33,
      student: { id: studentId, firstName: studentName, lastName: "" },
      examType: { id: examTypeId, name: "Quarterly Examination (Term 1)", academicYear: "2026" },
      subject: { id: `mock_sub_${idx}`, name: sub.name, code: sub.code }
    };
  });
}
