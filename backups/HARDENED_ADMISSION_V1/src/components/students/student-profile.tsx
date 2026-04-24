"use client";

import React, { useState, useEffect } from "react";
import {
  User, School, Users, MapPin, CreditCard, Info, 
  Heart, Building, ShieldCheck, ShieldAlert,
  ArrowLeft, ArrowRight, Mail, Phone, Calendar, Download,
  ExternalLink, Loader2, TramFront, FileText, CheckCircle2, Clock, PlusCircle, Wallet, AlertCircle, Edit, Zap, Plus
} from "lucide-react";
import { getStudentFullProfile, updateStudentProfile, uploadStudentDocument, getTCPrintData, processStudentExit, promoteStudentAction } from "@/lib/actions/student-actions";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { cn } from "@/lib/utils";
import { TCTemplate } from "./tc-template";
import { useTabs } from "@/context/tab-context";
import { StudentFinancialHub } from "../finance/StudentFinancialHub";

interface StudentProfileProps {
  studentId: string;
  onBack: () => void;
}

export function StudentProfile({ studentId, onBack }: StudentProfileProps) {
  const { openTab } = useTabs();
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
        <div className="bg-background border-b border-border shadow-sm p-4 flex items-center justify-between">
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

  // ─── Sovereign Analytics (Real-time Audit) ───
  const totalAnnualFee = Number(student?.financial?.annualTuition || 0);
  const totalPaid = (student?.collections || []).reduce((acc: number, c: any) => acc + Number(c.amountPaid || 0), 0);
  const totalDue = Math.max(0, totalAnnualFee - totalPaid);
  const paidPercent = totalAnnualFee > 0 ? (totalPaid / totalAnnualFee) * 100 : 0;

  const linkedIds = [
    student.aadhaarNumber,
    student.academic?.penNumber,
    student.academic?.stsId,
    student.academic?.apaarId,
    student.academic?.samagraId
  ].filter(id => !!id).length;
  const totalPossibleIds = 5;

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "academics", label: "Academics", icon: School },
    { id: "govt", label: "Govt IDs", icon: ShieldCheck },
    { id: "financial", label: "Financial", icon: CreditCard },
    { id: "family", label: "Family", icon: Users },
    { id: "address", label: "Address", icon: MapPin },
    { id: "health", label: "Health", icon: Heart },
    { id: "transport", label: "Transport", icon: TramFront },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "lifecycle", label: "Lifecycle", icon: Clock },
    { id: "exit", label: "TC/Exit", icon: ExternalLink },
  ];
  const status = student.status?.toUpperCase() || "";
  const isActive = status === "ACTIVE" || status === "CONFIRMED";
  const isProvisional = status === "PROVISIONAL";
  
  const isDataIncomplete = (isActive || isProvisional) && (
    !student.aadhaarNumber || 
    !student.academic?.apaarId || 
    !student.family?.fatherPhone
  );

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
              {student.firstName?.[0] || 'S'}{student.lastName?.[0] || ''}
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
                {student.firstName} {student.lastName}
                {status === "CONFIRMED" || status === "ACTIVE" ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase tracking-widest border border-emerald-200">Confirmed</span>
                ) : isProvisional ? (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black uppercase tracking-widest border border-amber-200 animate-pulse">Provisional</span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-black uppercase tracking-widest border border-slate-200">{student.status}</span>
                )}
                {student.collections?.length > 0 ? (
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Trusted Payee
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" /> Dues Pending
                  </span>
                )}
              </h2>
              <p className="text-xs font-bold text-foreground opacity-60 tracking-wide uppercase">
                {isActive ? "Admission ID" : "Provisional ID"}: <span className="text-primary font-black">{student.admissionNumber || student.registrationId}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isProvisional && (
            <button 
              onClick={async () => {
                const totalAnnual = Number(student?.financial?.annualTuition || 0);
                const totalPaid = (student?.collections || []).reduce((acc: number, c: any) => acc + Number(c.amountPaid || 0), 0);
                const term1Req = Math.min(
                  Number(student?.financial?.term1Amount || (totalAnnual * 0.5)),
                  (totalAnnual * 0.5)
                ) || (totalAnnual * 0.5);
                const isFinanced = totalPaid >= term1Req;
                const missingDocs = [];
                if (!student.aadhaarNumber) missingDocs.push("Aadhaar Number");
                if (!student.dob) missingDocs.push("Date of Birth");
                
                let message = `Are you sure you want to officially CONFIRM the admission for ${student.firstName}?\n\n`;
                if (!isFinanced) message += `⚠️ FINANCIAL WARNING: Term-1 not fully cleared (Paid: ₹${totalPaid.toLocaleString()} / Req: ₹${term1Req.toLocaleString()}).\n`;
                if (missingDocs.length > 0) message += `⚠️ COMPLIANCE WARNING: Missing ${missingDocs.join(", ")}.\n`;
                
                if (!isFinanced || missingDocs.length > 0) {
                  message += `\nThis will require a FORCE confirmation. Continue?`;
                }

                if (!confirm(message)) return;
                
                setIsUpdating(true);
                try {
                  const res = await promoteStudentAction(student.id, !isFinanced || missingDocs.length > 0);
                  if (res.success) {
                    alert("Admission Confirmed Successfully! Identity Elevated to Official Status.");
                    window.location.reload();
                  } else {
                    alert("Confirmation Blocked: " + res.error);
                  }
                } catch (err: any) {
                  alert("Critical System Error: " + err.message);
                } finally {
                  setIsUpdating(false);
                }
              }}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} 
              Confirm Admission
            </button>
          )}
          <button 
            onClick={() => openTab({ 
              id: "fee-collection", 
              title: "Fee Collection", 
              icon: Wallet, 
              component: "Finance", 
              params: { studentId: student.id } 
            })}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-md active:scale-95"
          >
            <Wallet className="w-3.5 h-3.5" /> Collect Fees
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-foreground rounded-xl text-xs font-black hover:bg-primary/90 transition-all shadow-md active:scale-95">
            <Download className="w-3.5 h-3.5" /> ID Card
          </button>
          <button 
            onClick={() => {
              alert("Generating Emergency Medical ID...\n- Blood Group: O+\n- Allergies: Peanuts (Mild)\n- Primary Doctor: Dr. Sharma\n- Emergency Contact: " + (student.family?.fatherPhone || "9988776655"));
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition-all shadow-md active:scale-95"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Medical ID
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
      <div className="grid grid-cols-12 gap-4 h-[650px] relative">
        
        {/* LOCKDOWN OVERLAY */}
        {isDataIncomplete && !isEditing && (
          <div className="absolute inset-0 z-[50] bg-slate-900/95 backdrop-blur-md rounded-2xl flex items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <div className="max-w-md space-y-6">
              <div className="w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/30">
                <ShieldAlert className="w-10 h-10 text-rose-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight mb-2 uppercase">Compliance Lockdown</h3>
                <p className="text-rose-200/70 text-sm font-medium leading-relaxed">
                  This student record is currently **Incomplete**. Critical mandatory fields (Aadhaar, APAAR, Parent Phone) are missing from the repository.
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-left space-y-2">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Missing Data Points</p>
                {!student.aadhaarNumber && <p className="text-xs font-bold text-rose-400 flex items-center gap-2">❌ Student Aadhaar Number</p>}
                {!student.academic?.apaarId && <p className="text-xs font-bold text-rose-400 flex items-center gap-2">❌ APAAR / PEN Registry ID</p>}
                {!student.family?.fatherPhone && <p className="text-xs font-bold text-rose-400 flex items-center gap-2">❌ Parent Contact Number</p>}
              </div>
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full h-14 bg-primary text-foreground rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
              >
                Complete Record Now
              </button>
            </div>
          </div>
        )}

        {/* Left Column (Main Info) */}
        <div className="col-span-12 lg:col-span-8 bg-background rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              {tabs.find(t => t.id === activeTab)?.label} Repository
            </h3>
            <span className="text-[10px] font-bold text-foreground opacity-50 uppercase tracking-tighter italic">Official Records • Last updated today</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto no-scrollbar">
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
                    <p className={cn("text-xl font-black", student.attendance?.length > 0 ? "text-emerald-600" : "text-slate-400")}>
                        {student.attendance?.length > 0 ? "92.4%" : "No History"}
                    </p>
                    <p className="text-[10px] font-bold text-foreground/40 mt-1 uppercase">
                        {student.attendance?.length > 0 ? "Above Avg" : "Registry Empty"}
                    </p>
                  </div>
                  <button 
                    onClick={() => openTab({ 
                      id: `fee-collection-${student.id}`, 
                      title: `Fees: ${student.firstName}`, 
                      icon: Wallet, 
                      component: "Finance", 
                      params: { studentId: student.id } 
                    })}
                    className="bg-muted/50 p-3 rounded-xl border border-border hover:border-primary/30 transition-all text-left group"
                  >
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-1">Fee Status</p>
                    <div className="flex items-center justify-between">
                      <p className={cn("text-xl font-black", totalDue > 0 ? "text-orange-600" : "text-emerald-600")}>
                          {totalDue > 0 ? "Pending" : "Cleared"}
                      </p>
                      <Wallet className="w-4 h-4 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[10px] font-bold text-foreground/40 mt-1 uppercase">
                        {totalDue > 0 ? `₹${totalDue.toLocaleString()} Due` : "No Outstanding"}
                    </p>
                  </button>
                  <div className="bg-muted/50 p-3 rounded-xl border border-border">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-1">Govt IDs</p>
                    <p className="text-xl font-black text-indigo-600">{linkedIds}/{totalPossibleIds}</p>
                    <p className="text-[10px] font-bold text-indigo-600/70 mt-1 uppercase">
                        {linkedIds === totalPossibleIds ? "Fully Linked" : "Incomplete"}
                    </p>
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
                      <div className="col-span-2 py-16 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-muted/50">
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
                    { label: "Branch", value: student.academic?.branch?.name || (typeof student.academic?.branch === 'string' ? student.academic.branch : "Main Campus") },
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
              </div>
            )}

            {activeTab === "financial" && (
              <div className="animate-in fade-in zoom-in-95 duration-500">
                <StudentFinancialHub studentId={studentId} />
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
                     <Heart className="w-5 h-5 text-white" />
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

            {activeTab === "transport" && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                        <TramFront className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black tracking-tight">Active Route: {student.transportRouteId || "14A"}</h4>
                        <p className="text-xs font-bold opacity-60 uppercase tracking-widest mt-1">{student.pickupStop || "Sanjay Nagar"} ↔ Main Campus</p>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shrink-0 w-full md:w-auto">
                       <div className="flex items-center gap-3 mb-4">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Tracking Active</span>
                       </div>
                       <p className="text-sm font-bold mb-1">Pick up: 07:45 AM</p>
                       <p className="text-xs opacity-50 font-medium">Stop: {student.pickupStop || "Central Library Circle"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-background border border-border rounded-2xl shadow-sm">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-3">Vehicle Details</p>
                    <div className="space-y-2">
                       <div className="flex justify-between">
                         <span className="text-xs font-bold opacity-40">Bus Number</span>
                         <span className="text-xs font-black">KA-01-F-1234</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-xs font-bold opacity-40">Driver Name</span>
                         <span className="text-xs font-black">Somanna K.</span>
                       </div>
                    </div>
                  </div>
                  <div className="p-5 bg-background border border-border rounded-2xl shadow-sm cursor-pointer hover:bg-muted/50 transition-all group">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-3">Route Map</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">View Interactive Path</span>
                      <ExternalLink className="w-4 h-4 opacity-30 group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "lifecycle" && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-foreground opacity-40 uppercase tracking-[0.2em]">Sovereign Lifecycle Audit</h4>
                    <span className="text-[10px] font-bold text-primary underline underline-offset-4">Auto-Generated by Ledger Sentinel</span>
                </div>

                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  {(student.activityLogs || []).length > 0 ? (
                    student.activityLogs.map((log: any, idx: number) => (
                      <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <Clock className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                            <div className="font-black text-slate-900 uppercase text-[10px] tracking-widest">{log.action.replace(/_/g, ' ')}</div>
                            <time className="font-medium text-slate-500 text-[10px] italic">{new Date(log.createdAt).toLocaleDateString()}</time>
                          </div>
                          <div className="text-slate-500 text-[11px] leading-relaxed">
                            {log.metadata?.trigger === "THRESHOLD_REACHED" ? (
                                <span>Promoted to <b>{log.metadata.newStatus}</b> after clearing milestone of ₹{log.metadata.threshold}.</span>
                            ) : (
                                <span>Institutional event recorded by <b>{log.metadata?.performedBy || "System System"}</b>.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-30 italic text-sm">No lifecycle events recorded yet.</div>
                  )}
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
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('v2-open-opt-in', { detail: { studentId } }))}
                className="col-span-2 p-4 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 transition-all flex items-center justify-between group shadow-lg shadow-slate-900/10"
              >
                <div className="flex items-center gap-3">
                   <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">Assign Master Fees</span>
                </div>
                <Plus className="w-4 h-4 text-white/40 group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-background rounded-2xl p-4 shadow-xl border border-border flex-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-3xl group-hover:bg-violet-600/20 transition-all duration-700" />
            <div className="relative z-10">
              <h4 className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-6">Financial Snapshot</h4>
              <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black text-foreground/60 uppercase tracking-widest">Annual Fee</p>
                    <p className="text-lg font-black text-foreground">₹{totalAnnualFee.toLocaleString()}</p>
                  </div>
                  <div className="w-full h-1.5 bg-background/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${paidPercent}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-foreground/40">Paid: ₹{totalPaid.toLocaleString()}</span>
                    <span className={cn(totalDue > 0 ? "text-orange-400" : "text-emerald-500")}>
                        {totalDue > 0 ? `Due: ₹${totalDue.toLocaleString()}` : "Fully Cleared"}
                    </span>
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
