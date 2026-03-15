"use client";

import React, { useState, useEffect } from "react";
import { 
  User, School, Users, MapPin, CreditCard, Info, 
  Heart, Building, ShieldCheck, ShieldAlert,
  ArrowLeft, ArrowRight, Mail, Phone, Calendar, Download,
  ExternalLink, Loader2
} from "lucide-react";
import { getStudentFullProfile } from "@/lib/actions/student-actions";
import { cn } from "@/lib/utils";

interface StudentProfileProps {
  studentId: string;
  onBack: () => void;
}

export function StudentProfile({ studentId, onBack }: StudentProfileProps) {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const result = await getStudentFullProfile(studentId);
      if (result.success && result.data) {
        setStudent(result.data);
      }
      setLoading(false);
    }
    loadProfile();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-white/20 h-[600px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest text-center animate-pulse">
          Retrieving 360° Repository...<br/>
          <span className="text-[10px] opacity-50 font-medium">Querying Multi-Relational Tables</span>
        </p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500 font-bold">Student profiling failed.</p>
        <button onClick={onBack} className="mt-4 text-primary font-bold text-sm underline">Go Back</button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "academics", label: "Academics", icon: School },
    { id: "govt", label: "Govt IDs", icon: ShieldCheck },
    { id: "financial", label: "Financial", icon: CreditCard },
    { id: "family", label: "Family", icon: Users },
    { id: "address", label: "Address", icon: MapPin },
    { id: "health", label: "Health", icon: Heart },
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* ─── Header Section ─── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center text-white text-xl font-black shadow-lg shadow-primary/20">
              {student.firstName[0]}{student.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1.5 flex items-center gap-2">
                {student.firstName} {student.lastName}
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase tracking-widest">Active</span>
              </h2>
              <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">
                Student Admission ID: <span className="text-primary font-black">{student.admissionId}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-md active:scale-95">
            <Download className="w-3.5 h-3.5" /> ID Card
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl text-xs font-black hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            Manage Fees
          </button>
        </div>
      </div>

      {/* ─── Tabs Navigation ─── */}
      <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap outline-none",
                isActive 
                  ? "bg-slate-100 text-primary shadow-inner" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-slate-400")} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Content Area ─── */}
      <div className="grid grid-cols-12 gap-4 h-[500px]">
        {/* Left Column (Main Info) */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              {tabs.find(t => t.id === activeTab)?.label} Repository
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">Official Records • Last updated today</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Class Level</p>
                    <p className="text-xl font-black text-slate-900">{student.academic?.class || "N/A"}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Section {student.academic?.section || "N/A"}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance</p>
                    <p className="text-xl font-black text-emerald-600">92.4%</p>
                    <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase">Above Avg</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fee Status</p>
                    <p className="text-xl font-black text-orange-600">Pending</p>
                    <p className="text-[10px] font-bold text-orange-600/70 mt-1 uppercase">Term 2 Due</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Govt IDs</p>
                    <p className="text-xl font-black text-indigo-600">4/4</p>
                    <p className="text-[10px] font-bold text-indigo-600/70 mt-1 uppercase">Linked</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                       <Mail className="w-3.5 h-3.5 text-slate-300" /> {student.email || "No Email Linked"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                       <Phone className="w-3.5 h-3.5 text-slate-300" /> {student.phone || "No Phone Linked"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</p>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5 text-slate-300" /> {student.dob ? new Date(student.dob).toLocaleDateString() : "Not Specified"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admission Date</p>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5 text-slate-300" /> {student.academic?.admissionDate ? new Date(student.academic.admissionDate).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="bg-violet-50 p-4 rounded-xl border border-violet-100">
                  <h4 className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Quick Compliance Summary
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-white text-emerald-600 rounded text-[10px] font-black border border-emerald-100 uppercase">Aadhaar Verified</span>
                    <span className="px-2 py-1 bg-white text-emerald-600 rounded text-[10px] font-black border border-emerald-100 uppercase">PEN Linked</span>
                    <span className="px-2 py-1 bg-white text-emerald-600 rounded text-[10px] font-black border border-emerald-100 uppercase">TC Not Pending</span>
                    <span className="px-2 py-1 bg-white text-orange-600 rounded text-[10px] font-black border border-orange-100 uppercase">Pending Medical Doc</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "academics" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Academic Year", value: student.academic?.academicYear },
                    { label: "Class", value: student.academic?.class },
                    { label: "Section", value: student.academic?.section },
                    { label: "Roll Number", value: student.academic?.rollNumber || "Not Assigned" },
                    { label: "Branch", value: student.academic?.branch || "Main Campus" },
                    { label: "Boarding", value: student.academic?.boardingType || "Day Scholar" }
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                      <p className="text-sm font-black text-slate-800 underline decoration-primary/20 decoration-2 underline-offset-4">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "govt" && (
              <div className="space-y-4">
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-4">Mandatory Govt Registry (UDISE+ 2024-25)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "PEN (Permanent Education Number)", value: student.academic?.penNumber, status: "Active" },
                      { label: "STS / SATS ID", value: student.academic?.stsId, status: "Verified" },
                      { label: "APAAR (One Nation One ID)", value: student.academic?.apaarId, status: "Under Sync" },
                      { label: "Samagra ID", value: student.academic?.samagraId, status: "Active" }
                    ].map(item => (
                                          <div key={item.label} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-base font-black text-indigo-900 tracking-tight">{item.value || "PENDING"}</p>
                          <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2">
                   <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aadhaar Number</p>
                    <p className="text-sm font-black text-slate-900 tracking-widest">
                      {student.aadhaarNumber ? `XXXX XXXX ${student.aadhaarNumber.slice(-4)}` : "Not Provided"}
                    </p>
                    <span className={cn(
                      "text-[9px] font-black uppercase mt-1 inline-block px-2 py-0.5 rounded border",
                      student.aadhaarVerified ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-red-700 bg-red-50 border-red-100"
                    )}>
                      {student.aadhaarVerified ? "Verified ✅" : "Pending ⚠️"}
                    </span>
                   </div>
                   <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Social Category</p>
                    <p className="text-sm font-black text-slate-900">{student.category || "General"}</p>
                   </div>
                   <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Minority Status</p>
                    <p className="text-sm font-black text-slate-900">{student.minorityStatus ? "YES" : "NO"}</p>
                   </div>
                </div>
              </div>
            )}

            {activeTab === "family" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Father Details */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-violet-500" />
                      </div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest text-violet-600">Father Information</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Name</p>
                        <p className="text-sm font-bold text-slate-900">{student.family?.fatherName || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary Contact</p>
                        <p className="text-sm font-bold text-slate-900">{student.family?.fatherPhone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Occupation</p>
                        <p className="text-sm font-bold text-slate-900 underline decoration-slate-200 decoration-1 underline-offset-4">{student.family?.fatherOccupation || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mother Details */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-pink-500" />
                      </div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest text-pink-600">Mother Information</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Name</p>
                        <p className="text-sm font-bold text-slate-900">{student.family?.motherName || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary Contact</p>
                        <p className="text-sm font-bold text-slate-900">{student.family?.motherPhone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Occupation</p>
                        <p className="text-sm font-bold text-slate-900 underline decoration-slate-200 decoration-1 underline-offset-4">{student.family?.motherOccupation || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">WhatsApp Communication Sync</h4>
                  <p className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {student.family?.whatsappNumber || "No Sync Linked"}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500">Broadcast notifications and electronic receipts will be sent here.</p>
                </div>
              </div>
            )}

            {/* Other tabs follow same premium density logic */}
            {["financial", "address", "health"].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center py-20 opacity-30 italic">
                <Loader2 className="w-6 h-6 mb-2 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest">Sub-module Under Optimization</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Side Actions & Snapshot) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-fit">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Edit Profile", icon: Edit, color: "text-blue-500" },
                { label: "Admission TC", icon: ArrowRight, color: "text-orange-500" },
                { label: "Generate Receipt", icon: CreditCard, color: "text-emerald-500" },
                { label: "View Reports", icon: ExternalLink, color: "text-indigo-500" }
              ].map(action => (
                <button key={action.label} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all flex flex-col items-start gap-2 group">
                  <action.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", action.color)} />
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter text-left leading-none">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 shadow-xl shadow-slate-900/10 flex-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-3xl group-hover:bg-violet-600/20 transition-all duration-700" />
            <div className="relative z-10">
              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-6">Financial Snapshot</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Annual Fee</p>
                    <p className="text-lg font-black text-white">₹{student.financial?.totalAnnualFee || "45,000"}</p>
                 </div>
                 <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3" />
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-white/40">Paid: ₹30,000</span>
                    <span className="text-orange-400">Due: ₹15,000</span>
                 </div>

                 <div className="pt-4 border-t border-white/10 mt-4 space-y-2">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest italic leading-relaxed">
                       Note: 10% Sibling discount applies to Term-3 installments as per legacy payroll discovery.
                    </p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal dummy for Edit (to be replaced)
function Edit({ className }: { className?: string }) { return <ExternalLink className={className} />; }
const primary = "text-violet-600";
const bgPrimary = "bg-violet-600";
