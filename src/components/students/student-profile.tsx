"use client";

import React, { useState, useEffect } from "react";
import {
  User, School, Users, MapPin, CreditCard, Info, 
  Heart, Building, ShieldCheck, ShieldAlert,
  ArrowLeft, ArrowRight, Mail, Phone, Calendar, Download,
  ExternalLink, Loader2, TramFront, FileText, CheckCircle2, Clock, PlusCircle
} from "lucide-react";
import { getStudentFullProfile, updateStudentProfile, uploadStudentDocument, getTCPrintData, processStudentExit } from "@/lib/actions/student-actions";
import { cn } from "@/lib/utils";
import { TCTemplate } from "./tc-template";

interface StudentProfileProps {
  studentId: string;
  onBack: () => void;
}

export function StudentProfile({ studentId, onBack }: StudentProfileProps) {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tcPreviewData, setTCPreviewData] = useState<any>(null);
  const [showTCPreview, setShowTCPreview] = useState(false);

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

  const handleUpdate = async (updatedData: any) => {
    setIsUpdating(true);
    // Ensure nested data is prepared if flattened in state for some reason
    // But here we'll assume the state matches the DB structure
    const res = await updateStudentProfile(studentId, updatedData);
    if (res.success) {
      setStudent({ ...student, ...updatedData });
      setIsEditing(false);
    }
    setIsUpdating(false);
  };

  const handleDocUpload = async () => {
    const fileName = prompt("Enter Document Name (e.g. Birth Certificate):");
    if (!fileName) return;

    const res = await uploadStudentDocument(studentId, {
      fileName,
      fileType: "PDF",
      fileUrl: "https://mock-storage.supabase.co/doc-xyz.pdf"
    });

    if (res.success) {
      const result = await getStudentFullProfile(studentId);
      if (result.success) setStudent(result.data);
    }
  };

  const handleGenerateTC = async () => {
    setLoading(true);
    const res = await getTCPrintData(studentId);
    if (res.success) {
      setTCPreviewData(res.data);
      setShowTCPreview(true);
    }
    setLoading(false);
  };

  const handlePrintTC = () => {
    window.print();
  };

  if (showTCPreview && tcPreviewData) {
    return (
      <div className="fixed inset-0 z-[100] bg-background overflow-auto flex flex-col">
        <div className="bg-background border-b border-border shadow-sm">
           <div className="flex items-center gap-3">
             <button onClick={() => setShowTCPreview(false)} className="p-2 hover:bg-background/10 rounded-lg text-foreground">
                <ArrowLeft className="w-5 h-5" />
             </button>
             <h3 className="text-foreground font-black uppercase tracking-widest text-xs">Print Official Transfer Certificate</h3>
           </div>
           <button 
            onClick={handlePrintTC}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-foreground rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
           >
             <Download className="w-4 h-4" /> Finalize & Print
           </button>
        </div>
        <div className="flex-1 bg-muted py-20 px-4 print:bg-background print:p-0">
           <TCTemplate data={tcPreviewData} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-background/50 backdrop-blur-md rounded-2xl border border-white/20 h-[600px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-foreground opacity-50 text-xs font-black uppercase tracking-widest text-center animate-pulse">
          Retrieving 360° Repository...<br/>
          <span className="text-[10px] opacity-50 font-medium">Querying Multi-Relational Tables</span>
        </p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 text-center bg-background rounded-2xl border border-border">
        <p className="text-foreground opacity-60 font-bold">Student profiling failed.</p>
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
    { id: "documents", label: "Documents", icon: FileText },
    { id: "exit", label: "TC/Exit", icon: ExternalLink },
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* ─── Header Section ─── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-xl transition-colors text-foreground opacity-50 hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center text-foreground text-xl font-black shadow-lg shadow-primary/20">
              {student.firstName[0]}{student.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
                {student.firstName} {student.lastName}
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase tracking-widest">Active</span>
              </h2>
              <p className="text-xs font-bold text-foreground opacity-60 tracking-wide uppercase">
                Student Admission ID: <span className="text-primary font-black">{student.admissionId}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-foreground rounded-xl text-xs font-black hover:bg-primary/90 transition-all shadow-md active:scale-95">
            <Download className="w-3.5 h-3.5" /> ID Card
          </button>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 border",
              isEditing ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-background border-border text-foreground hover:bg-muted/50"
            )}
          >
            {isEditing ? "Exit Edit Mode" : "Manage Profile"}
          </button>
        </div>
      </div>

      {/* ─── Tabs Navigation ─── */}
      <div className="bg-background p-1 rounded-2xl border border-border shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                  ? "bg-muted text-primary shadow-inner" 
                  : "text-foreground opacity-60 hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-foreground opacity-50")} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Content Area ─── */}
      <div className="grid grid-cols-12 gap-4 h-[500px]">
        {/* Left Column (Main Info) */}
        <div className="col-span-12 lg:col-span-8 bg-background rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              {tabs.find(t => t.id === activeTab)?.label} Repository
            </h3>
            <span className="text-[10px] font-bold text-foreground opacity-50 uppercase tracking-tighter italic">Official Records • Last updated today</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-muted/50 p-3 rounded-xl border border-border">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-1">Class Level</p>
                    <p className="text-xl font-black text-foreground">{student.academic?.class?.name || (typeof student.academic?.class === 'string' ? student.academic.class : "N/A")}</p>
                    <p className="text-[10px] font-bold text-foreground opacity-60 mt-1 uppercase">Section {student.academic?.section?.name || (typeof student.academic?.section === 'string' ? student.academic.section : "N/A")}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-xl border border-border">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-1">Attendance</p>
                    <p className="text-xl font-black text-emerald-600">92.4%</p>
                    <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase">Above Avg</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-xl border border-border">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-1">Fee Status</p>
                    <p className="text-xl font-black text-orange-600">Pending</p>
                    <p className="text-[10px] font-bold text-orange-600/70 mt-1 uppercase">Term 2 Due</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-xl border border-border">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-1">Govt IDs</p>
                    <p className="text-xl font-black text-indigo-600">4/4</p>
                    <p className="text-[10px] font-bold text-indigo-600/70 mt-1 uppercase">Linked</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Email Address</p>
                    {isEditing ? (
                      <input 
                        type="email"
                        value={student.email || ""}
                        onChange={(e) => setStudent({...student, email: e.target.value})}
                        className="w-full bg-muted/50 border border-border rounded px-2 py-1 text-sm font-bold shadow-inner"
                      />
                    ) : (
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-foreground opacity-30" /> {student.email || "No Email Linked"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Phone Number</p>
                    {isEditing ? (
                      <input 
                        type="tel"
                        value={student.phone || ""}
                        onChange={(e) => setStudent({...student, phone: e.target.value})}
                        className="w-full bg-muted/50 border border-border rounded px-2 py-1 text-sm font-bold shadow-inner"
                      />
                    ) : (
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-foreground opacity-30" /> {student.phone || "No Phone Linked"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Date of Birth</p>
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5 text-foreground opacity-30" /> {student.dob ? new Date(student.dob).toLocaleDateString() : "Not Specified"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Admission Date</p>
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5 text-foreground opacity-30" /> {student.academic?.admissionDate ? new Date(student.academic.admissionDate).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="bg-violet-50 p-4 rounded-xl border border-violet-100">
                  <h4 className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Quick Compliance Summary
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-background text-emerald-600 rounded text-[10px] font-black border border-emerald-100 uppercase">Aadhaar Verified</span>
                    <span className="px-2 py-1 bg-background text-emerald-600 rounded text-[10px] font-black border border-emerald-100 uppercase">PEN Linked</span>
                    <span className="px-2 py-1 bg-background text-emerald-600 rounded text-[10px] font-black border border-emerald-100 uppercase">TC Not Pending</span>
                    <span className="px-2 py-1 bg-background text-orange-600 rounded text-[10px] font-black border border-orange-100 uppercase">Pending Medical Doc</span>
                  </div>
                </div>

                {isEditing && (
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <p className="text-xs font-black text-primary uppercase">Profile Editing Active</p>
                      <p className="text-[10px] text-foreground opacity-60 font-medium tracking-tight">Changes are logged immediately for accountability.</p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => handleUpdate({
                          firstName: student.firstName,
                          lastName: student.lastName,
                          email: student.email,
                          phone: student.phone,
                          family: {
                            id: student.family?.id,
                            fatherName: student.family?.fatherName,
                            fatherPhone: student.family?.fatherPhone,
                            motherName: student.family?.motherName,
                            motherPhone: student.family?.motherPhone,
                          },
                          address: {
                            id: student.address?.id,
                            currentAddress: student.address?.currentAddress,
                            city: student.address?.city,
                            state: student.address?.state,
                            pinCode: student.address?.pinCode,
                          }
                        })}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-primary text-foreground rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20"
                       >
                         {isUpdating ? "Saving..." : "Save Repository"}
                       </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Digital Document Vault</h4>
                   <button 
                    onClick={handleDocUpload}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-foreground opacity-70 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-border"
                   >
                     <PlusCircle className="w-3 h-3" /> Add Document
                   </button>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {student.documents?.length > 0 ? (
                      student.documents.map((doc: any) => (
                        <div key={doc.id} className="bg-background p-4 rounded-xl border border-border shadow-sm flex items-start gap-3 group hover:border-primary/30 transition-all cursor-default">
                          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center border border-border shrink-0">
                            <FileText className="w-5 h-5 text-foreground opacity-50 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-800 truncate">{doc.fileName}</p>
                            <p className="text-[9px] font-bold text-foreground opacity-50 mt-0.5 uppercase tracking-tighter">
                              {doc.fileType} • {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-slate-100 rounded-lg text-foreground opacity-50 hover:text-primary transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 py-16 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-muted/50/30">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-foreground opacity-30" />
                        </div>
                        <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">No Documents Archived</p>
                        <p className="text-[9px] text-foreground opacity-50 font-medium">Capture Aadhaar, TC or Birth Certificates</p>
                      </div>
                    )}
                 </div>
              </div>
            )}

            {activeTab === "academics" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Academic Year", value: student.academic?.academicYear },
                    { label: "Class", value: student.academic?.class?.name || (typeof student.academic?.class === 'string' ? student.academic.class : "N/A") },
                    { label: "Section", value: student.academic?.section?.name || (typeof student.academic?.section === 'string' ? student.academic.section : "N/A") },
                    { label: "Roll Number", value: student.academic?.rollNumber || "Not Assigned" },
                    { label: "Branch", value: student.academic?.branch || "Main Campus" },
                    { label: "Boarding", value: student.academic?.boardingType || "Day Scholar" }
                  ].map(item => (
                    <div key={item.label} className="bg-muted/50 p-3 rounded-lg border border-border">
                      <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">{item.label}</p>
                      <p className="text-sm font-black text-foreground underline decoration-primary/20 decoration-2 underline-offset-4">{item.value}</p>
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
                                          <div key={item.label} className="bg-background p-3 rounded-xl border border-indigo-100 shadow-sm">
                        <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest mb-1">{item.label}</p>
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
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Aadhaar Number</p>
                    <p className="text-sm font-black text-foreground tracking-widest">
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
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Social Category</p>
                    <p className="text-sm font-black text-foreground">{student.category || "General"}</p>
                   </div>
                   <div>
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Minority Status</p>
                    <p className="text-sm font-black text-foreground">{student.minorityStatus ? "YES" : "NO"}</p>
                   </div>
                </div>
              </div>
            )}

            {activeTab === "family" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Father Details */}
                  <div className="bg-muted/50 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Father Information</h4>
                    </div>
                     <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Full Name</p>
                        {isEditing ? (
                          <input 
                            value={student.family?.fatherName || ""}
                            onChange={(e) => setStudent({...student, family: {...student.family, fatherName: e.target.value}})}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold"
                          />
                        ) : (
                          <p className="text-sm font-bold text-foreground">{student.family?.fatherName || "N/A"}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Primary Contact</p>
                        {isEditing ? (
                          <input 
                            value={student.family?.fatherPhone || ""}
                            onChange={(e) => setStudent({...student, family: {...student.family, fatherPhone: e.target.value}})}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold"
                          />
                        ) : (
                          <p className="text-sm font-bold text-foreground">{student.family?.fatherPhone || "N/A"}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Occupation</p>
                        <p className="text-sm font-bold text-foreground underline decoration-slate-200 decoration-1 underline-offset-4">{student.family?.fatherOccupation || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Aadhaar Number</p>
                        {isEditing ? (
                          <input 
                            value={student.family?.fatherAadhaar || ""}
                            onChange={(e) => setStudent({...student, family: {...student.family, fatherAadhaar: e.target.value}})}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold"
                            placeholder="XXXX XXXX XXXX"
                          />
                        ) : (
                          <p className="text-sm font-bold text-primary">{student.family?.fatherAadhaar || "N/A"}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mother Details */}
                  <div className="bg-muted/50 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Mother Information</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Full Name</p>
                        {isEditing ? (
                          <input 
                            value={student.family?.motherName || ""}
                            onChange={(e) => setStudent({...student, family: {...student.family, motherName: e.target.value}})}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold"
                          />
                        ) : (
                          <p className="text-sm font-bold text-foreground">{student.family?.motherName || "N/A"}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Primary Contact</p>
                        {isEditing ? (
                          <input 
                            value={student.family?.motherPhone || ""}
                            onChange={(e) => setStudent({...student, family: {...student.family, motherPhone: e.target.value}})}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold"
                          />
                        ) : (
                          <p className="text-sm font-bold text-foreground">{student.family?.motherPhone || "N/A"}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Occupation</p>
                        <p className="text-sm font-bold text-foreground underline decoration-slate-200 decoration-1 underline-offset-4">{student.family?.motherOccupation || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Aadhaar Number</p>
                        {isEditing ? (
                          <input 
                            value={student.family?.motherAadhaar || ""}
                            onChange={(e) => setStudent({...student, family: {...student.family, motherAadhaar: e.target.value}})}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold"
                            placeholder="XXXX XXXX XXXX"
                          />
                        ) : (
                          <p className="text-sm font-bold text-primary">{student.family?.motherAadhaar || "N/A"}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">WhatsApp Communication Sync</h4>
                  <p className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {student.family?.whatsappNumber || "No Sync Linked"}
                  </p>
                  <p className="text-[10px] font-medium text-foreground opacity-60">Broadcast notifications and electronic receipts will be sent here.</p>
                </div>
              </div>
            )}

            {activeTab === "exit" && (
              <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className="bg-muted border border-border p-6 rounded-2xl text-foreground relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-1">Student Exit & TC Protocol</h4>
                  <p className="text-2xl font-black tracking-tight mb-4">Transfer Certificate Module</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    <div className="bg-background/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                       <p className="text-[10px] font-black text-foreground/50 uppercase tracking-widest mb-1">Current Status</p>
                       <p className="text-sm font-bold">{student.academic?.promotionStatus || "Active Study"}</p>
                    </div>
                    <div className="bg-background/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                       <p className="text-[10px] font-black text-foreground/50 uppercase tracking-widest mb-1">Dues Status</p>
                       <p className="text-sm font-bold text-emerald-400">Clear (Mocked)</p>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button 
                      onClick={handleGenerateTC}
                      className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                    >
                      Generate Official TC
                    </button>
                    <button className="px-6 py-2.5 bg-background/10 hover:bg-background/20 text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/10">
                      Process Withdrawal
                    </button>
                  </div>
                </div>

                <div className="bg-background p-6 rounded-2xl border border-border">
                   <h4 className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-4">TC Generation History</h4>
                   <div className="flex flex-col items-center justify-center py-10 opacity-40">
                      <Clock className="w-8 h-8 text-foreground opacity-30 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No prior TC issued for this student</p>
                   </div>
                </div>
              </div>
            )}

            {activeTab === "financial" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Fee Structure & Plan</h4>
                      <p className="text-xl font-black text-foreground tracking-tight">
                        {student.paymentType || student.financial?.paymentType || "Term-wise (50/25/25)"}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-emerald-100/50 flex items-center justify-between">
                       <span className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Base Tuition</span>
                       <span className="text-sm font-bold text-foreground">₹{student.tuitionFee || "0"}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Active Discounts</h4>
                      <p className="text-sm font-bold text-slate-800 mt-2">
                        {student.discountId1 ? student.discountReason1 || student.discountId1 : "No Active Discounts"}
                      </p>
                    </div>
                    {student.discountId1 && (
                      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-100/50 px-2 py-1 rounded w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                   <h4 className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Standard Components</h4>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     {[
                       { label: "Admission", val: student.admissionFee },
                       { label: "Library", val: student.libraryFee },
                       { label: "Lab", val: student.labFee },
                       { label: "Sports", val: student.sportsFee },
                       { label: "Dev Fee", val: student.developmentFee },
                       { label: "Exam Fee", val: student.examFee },
                       { label: "Caution", val: student.cautionDeposit },
                     ].map(fee => (
                       <div key={fee.label} className="bg-muted/50 p-3 rounded-xl border border-border flex items-center justify-between">
                         <span className="text-[10px] font-black text-foreground opacity-60 uppercase tracking-widest">{fee.label}</span>
                         <span className="text-xs font-bold text-foreground">₹{fee.val || "0"}</span>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}

            {activeTab === "address" && (
              <div className="space-y-6">
                <div className="bg-background p-5 rounded-xl border border-border shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                    </div>
                    <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Residential Address</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                    <div className="sm:col-span-2">
                       <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Street Address</p>
                       {isEditing ? (
                         <input 
                           value={student.address?.currentAddress || ""}
                           onChange={(e) => setStudent({...student, address: {...student.address, currentAddress: e.target.value}})}
                           className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold"
                         />
                       ) : (
                         <p className="text-sm font-medium text-foreground mt-1">{student.address?.currentAddress || "Not Provided"}</p>
                       )}
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">City & State</p>
                       {isEditing ? (
                         <div className="flex gap-2">
                           <input 
                             value={student.address?.city || ""}
                             onChange={(e) => setStudent({...student, address: {...student.address, city: e.target.value}})}
                             className="w-1/2 bg-background border border-border rounded px-2 py-1 text-sm font-bold"
                             placeholder="City"
                           />
                           <input 
                             value={student.address?.state || ""}
                             onChange={(e) => setStudent({...student, address: {...student.address, state: e.target.value}})}
                             className="w-1/2 bg-background border border-border rounded px-2 py-1 text-sm font-bold"
                             placeholder="State"
                           />
                         </div>
                       ) : (
                         <p className="text-sm font-bold text-foreground mt-1">{student.address?.city || "-"}, {student.address?.state || "-"}</p>
                       )}
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest">Pincode & Country</p>
                       {isEditing ? (
                          <input 
                            value={student.address?.pinCode || ""}
                            onChange={(e) => setStudent({...student, address: {...student.address, pinCode: e.target.value}})}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-bold"
                          />
                       ) : (
                         <p className="text-sm font-bold text-slate-800 mt-1">{student.address?.pinCode || "-"} | {student.address?.country || "India"}</p>
                       )}
                    </div>
                  </div>
                </div>

                <div className={cn("p-5 rounded-xl border relative overflow-hidden", student.transportRequired ? "bg-amber-50/50 border-amber-200" : "bg-muted/50 border-border")}>
                  {student.transportRequired && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center tracking-tight", student.transportRequired ? "bg-amber-500/20 border-amber-500/30" : "bg-slate-200/50 border-slate-300")}>
                      <TramFront className={cn("w-4 h-4", student.transportRequired ? "text-amber-600" : "text-foreground opacity-50")} />
                    </div>
                    <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Transport Requirements</h4>
                    {!student.transportRequired && (
                      <span className="ml-auto text-[9px] font-black text-foreground opacity-50 bg-background px-2 py-1 rounded shadow-sm uppercase tracking-widest border border-border">Not Subscribed</span>
                    )}
                  </div>

                  {student.transportRequired && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                       <div>
                         <p className="text-[9px] font-black text-amber-700/60 uppercase tracking-widest mb-1">Route ID</p>
                         <p className="text-sm font-bold text-amber-900">{student.transportRouteId || "Unassigned"}</p>
                       </div>
                       <div>
                         <p className="text-[9px] font-black text-amber-700/60 uppercase tracking-widest mb-1">Pickup Stop</p>
                         <p className="text-sm font-bold text-amber-900">{student.pickupStop || "-"}</p>
                       </div>
                       <div>
                         <p className="text-[9px] font-black text-amber-700/60 uppercase tracking-widest mb-1">Drop Stop</p>
                         <p className="text-sm font-bold text-amber-900">{student.dropStop || "-"}</p>
                       </div>
                       <div>
                         <p className="text-[9px] font-black text-amber-700/60 uppercase tracking-widest mb-1">Monthly Fee</p>
                         <p className="text-sm font-black text-amber-900 leading-tight">₹{student.transportMonthlyFee || "0"}</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "health" && (
              <div className="space-y-4">
                <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-100 flex items-start gap-4">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20 border border-white/20">
                     <Heart className="w-5 h-5 text-foreground" />
                   </div>
                   <div className="flex-1">
                     <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">Health & Medical Profile</h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Blood Group</p>
                          <p className="text-base font-black text-rose-700 drop-shadow-sm">{student.bloodGroup || "O+"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Known Allergies</p>
                          <p className="text-sm font-bold text-slate-800">{student.allergies || "None declared"}</p>
                        </div>
                        <div className="sm:col-span-2 pt-2 border-t border-rose-100/50">
                          <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Medical Conditions</p>
                          <p className="text-sm font-medium text-foreground opacity-70 leading-relaxed">{student.medicalConditions || "No chronic conditions declared during admission. Student is considered fit for physical activities."}</p>
                        </div>
                     </div>
                   </div>
                </div>

                <div className="bg-background p-4 rounded-xl border border-border">
                  <h4 className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-3">Family Physician Contact</h4>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 bg-muted/50 p-3 rounded-lg border border-border">
                       <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest mb-1">Doctor Name</p>
                       <p className="text-sm font-bold text-foreground">Dr. {student.doctorName || "Not Provided"}</p>
                    </div>
                    <div className="flex-1 bg-muted/50 p-3 rounded-lg border border-border">
                       <p className="text-[9px] font-black text-foreground opacity-50 uppercase tracking-widest mb-1">Clinic Phone</p>
                       <p className="text-sm font-bold text-foreground">{student.doctorPhone || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Side Actions & Snapshot) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="bg-background rounded-2xl border border-border shadow-sm p-4 h-fit">
            <h4 className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-4">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Edit Profile", icon: Edit, color: "text-blue-500" },
                { label: "Admission TC", icon: ArrowRight, color: "text-orange-500" },
                { label: "Generate Receipt", icon: CreditCard, color: "text-emerald-500" },
                { label: "View Reports", icon: ExternalLink, color: "text-indigo-500" }
              ].map(action => (
                <button key={action.label} className="p-3 bg-muted/50 hover:bg-slate-100 rounded-xl border border-border transition-all flex flex-col items-start gap-2 group">
                  <action.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", action.color)} />
                  <span className="text-[10px] font-black text-foreground opacity-70 uppercase tracking-tighter text-left leading-none">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-background rounded-2xl p-4 shadow-xl border border-border flex-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-3xl group-hover:bg-violet-600/20 transition-all duration-700" />
            <div className="relative z-10">
              <h4 className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-6">Financial Snapshot</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black text-foreground/60 uppercase tracking-widest">Annual Fee</p>
                    <p className="text-lg font-black text-foreground">₹{student.financial?.totalAnnualFee || "45,000"}</p>
                 </div>
                 <div className="w-full h-1.5 bg-background/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3" />
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-foreground/40">Paid: ₹30,000</span>
                    <span className="text-orange-400">Due: ₹15,000</span>
                 </div>

                 <div className="pt-4 border-t border-white/10 mt-4 space-y-2">
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest italic leading-relaxed">
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
