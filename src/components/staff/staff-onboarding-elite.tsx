"use client";
import { cn } from "@/lib/utils";

import React, { useState, useEffect } from "react";
import { 
  User, Briefcase, Landmark, CheckCircle2, 
  ChevronRight, ChevronLeft, ShieldCheck, 
  Info, Sparkles, Building2, MapPin
} from "lucide-react";
import { createStaffAction, updateStaffAction } from "@/lib/actions/staff-actions";
import { useTenant } from "@/context/tenant-context";
import { 
  staffBasicSchema, 
  staffProfessionalSchema, 
  staffStatutorySchema, 
  staffBankSchema 
} from "@/types/staff";
import * as z from "zod";

interface StaffOnboardingEliteProps {
  mode: "onboard" | "edit";
  staffId?: string;
  initialData?: any;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function StaffOnboardingElite({ 
  mode, 
  staffId, 
  initialData, 
  onCancel, 
  onSuccess 
}: StaffOnboardingEliteProps) {
  const { schoolId, userRole, branchId: sessionBranchId } = useTenant();
  const isAdmin = userRole === "OWNER" || userRole === "DEVELOPER";
  const [refData, setRefData] = useState<{ branches: any[], categories: any[] }>({ branches: [], categories: [] });
  const [isLoadingRef, setIsLoadingRef] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<any>(initialData || {
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "Female",
    dob: "",
    address: "",
    role: "Teacher",
    branchId: "",
    // Professional
    designation: "",
    department: "Academics",
    qualification: "",
    experienceYears: 0,
    dateOfJoining: new Date().toISOString().split('T')[0],
    basicSalary: 10000,
    // Statutory
    panNumber: "",
    aadhaarNumber: "",
    pfNumber: "",
    uanNumber: "",
    esiNumber: "",
    // Bank
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: ""
  });

  const steps = [
    { id: 1, title: "Identity", icon: User, color: "text-emerald-500", bg: "bg-emerald-50" },
    { id: 2, title: "Professional", icon: Briefcase, color: "text-indigo-500", bg: "bg-indigo-50" },
    { id: 3, title: "Financial", icon: Landmark, color: "text-amber-500", bg: "bg-amber-50" },
    { id: 4, title: "Genesis", icon: ShieldCheck, color: "text-rose-500", bg: "bg-rose-50" }
  ];

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const isPendingValue = (val: any) => {
    if (typeof val !== 'string') return false;
    return val === "[REQ_VERIFY]" || val === "0000000000" || val.includes("@pending.com");
  };

  const getPendingStyles = (field: string) => {
    return isPendingValue(formData[field]) ? "ring-2 ring-amber-400 bg-amber-50 focus:ring-amber-500 border-amber-300" : "";
  };

  // 🔒 Auto-inject session branchId for STAFF/PRINCIPAL (non-admin) roles
  useEffect(() => {
    if (!formData.branchId && sessionBranchId) {
      updateField("branchId", sessionBranchId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionBranchId]);

  // 📦 Load role categories + branch list for OWNER/DEVELOPER
  useEffect(() => {
    if (!schoolId) return;
    let isMounted = true;
    async function loadRefs() {
      setIsLoadingRef(true);
      try {
        const { getStaffCategories, getDepartments, seedDefaultsIfEmpty } = await import("@/lib/actions/staff-config-actions");
        
        // 🛡️ GENESIS SEED: Ensure standard roles/depts exist for the institution
        await seedDefaultsIfEmpty(schoolId);

        const [catRes, deptRes] = await Promise.all([
          getStaffCategories(schoolId),
          getDepartments(schoolId)
        ]);

        let branches: any[] = [];
        if (isAdmin) {
          const { getAdmissionReferenceData } = await import("@/lib/actions/reference-actions");
          const brRes = await getAdmissionReferenceData();
          if (brRes.success && brRes.data) branches = brRes.data.branches;
          // Auto-select first branch for admin if no branchId is set
          if (!formData.branchId && branches[0]?.id) {
            updateField("branchId", branches[0].id);
          }
        }
        if (isMounted) setRefData({ 
          categories: catRes.success ? (catRes.data as any[]) : [], 
          departments: deptRes.success ? (deptRes.data as any[]) : [],
          branches 
        });
      } catch (e) {
        console.error("❌ [EliteForm] Ref load error", e);
      } finally {
        if (isMounted) setIsLoadingRef(false);
      }
    }
    loadRefs();
    return () => { isMounted = false; };
  }, [schoolId, isAdmin]);

  const validateStep = (stepNum: number) => {
    let schema: z.ZodObject<any>;
    const dataToValidate = formData;

    switch (stepNum) {
      case 1: schema = staffBasicSchema; break;
      case 2: schema = staffProfessionalSchema; break;
      case 3: 
        // Merge Statutory and Bank for step 3
        schema = z.object({ ...staffStatutorySchema.shape, ...staffBankSchema.shape });
        break;
      default: return true;
    }

    const result = schema.safeParse(dataToValidate);
    if (!result.success) {
      const errors: Record<string, string> = {};
      (result.error.issues || []).forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setValidationErrors(errors);
      return false;
    }
    setValidationErrors({});
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const handleBack = () => {
    setValidationErrors({});
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = mode === "edit" 
        ? await updateStaffAction(staffId!, formData)
        : await createStaffAction(formData);

      if (result.success) {
        if (onSuccess) onSuccess();
        onCancel();
      } else {
        setError((result as any).error || "A secure protocol error occurred during institutional commit.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

   return (
    <div className="max-w-4xl mx-auto flex flex-col py-6 px-4 animate-in fade-in zoom-in duration-500">
      {/* 🏛️ ELITE HEADER (The Sovereign Welcome) */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold tracking-widest uppercase mb-3">
          <Sparkles className="w-3 h-3" /> PaVa-EDUX Sovereign Onboarding
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
          {mode === "edit" ? "Profile" : "Personnel"} <span className="text-indigo-600">{mode === "edit" ? "Correction" : "Enrolling"}.</span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          {mode === "edit" ? "Modifying existing institution record with high-fidelity protocols." : "Initiating genesis record for new campus personnel."}
        </p>
      </div>

      {/* 🏛️ STEP INDICATOR (Glassmorphic Track) */}
      <div className="w-full max-w-2xl mb-16 flex justify-between relative px-2 mx-auto">
         <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
         <div 
            className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -translate-y-1/2 -z-10 transition-all duration-700" 
            style={{ width: `${((step - 1) / 3) * 100}%` }}
         />
         
         {steps.map((s) => (
           <div key={s.id} className="flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border-2 ${
                  step >= s.id 
                  ? "bg-white border-emerald-500 scale-110" 
                  : "bg-slate-50 border-slate-200"
                }`}
              >
                <s.icon className={`w-5 h-5 ${step >= s.id ? "text-emerald-500" : "text-slate-400"}`} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= s.id ? "text-slate-700" : "text-slate-400"}`}>
                {s.title}
              </span>
           </div>
         ))}
      </div>

      {/* 🏛️ MAIN FORM CONTAINER (Glassmorphic Elite Card) */}
      <div className="w-full glass rounded-3xl premium-shadow border border-white/50 p-8 min-h-[450px] relative pb-24">
         {/* Decorative Background Blob */}
         <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl -z-10" />
         <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl -z-10" />

         {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs flex items-center gap-3 animate-bounce">
               <Info className="w-4 h-4" /> {error}
            </div>
         )}

         {/* --- STEP 1: IDENTITY (BIO-DATA) --- */}
         {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
               {/* Designation + Department + Qualification (3-col) */}
              <div className="grid grid-cols-3 gap-6">
                 <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">First Name</label>
                    <input 
                      type="text" 
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      className={`w-full bg-slate-50/50 border ${validationErrors.firstName ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none`}
                      placeholder="Enter legal first name"
                    />
                    {validationErrors.firstName && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.firstName}</p>}
                 </div>
                 <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Middle Name</label>
                    <input 
                      type="text" 
                      value={formData.middleName}
                      onChange={(e) => updateField("middleName", e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                 </div>
                 <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Last Name</label>
                    <input 
                      type="text" 
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      className={`w-full bg-slate-50/50 border ${validationErrors.lastName ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none`}
                    />
                    {validationErrors.lastName && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.lastName}</p>}
                 </div>
              </div>               {/* DOB + Gender + Role (3-col) */}
               <div className="grid grid-cols-3 gap-6">
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Date of Birth
                     </label>
                     <input 
                       type="date" 
                       value={formData.dob}
                       onChange={(e) => updateField("dob", e.target.value)}
                       className={cn(
                          "w-full bg-emerald-50/30 border rounded-xl px-4 py-3 text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none",
                          validationErrors.dob ? "border-rose-400 ring-2 ring-rose-500/10" : "border-emerald-100"
                       )}
                     />
                     {validationErrors.dob && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.dob}</p>}
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Gender</label>
                     <select 
                       value={formData.gender}
                       onChange={(e) => updateField("gender", e.target.value)}
                       className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                     >
                       <option value="Female">Female</option>
                       <option value="Male">Male</option>
                       <option value="Other">Other</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Nature of Role</label>
                     <select 
                       value={formData.role}
                       onChange={(e) => updateField("role", e.target.value)}
                       disabled={isLoadingRef}
                       className="w-full bg-indigo-50/30 border border-indigo-100 rounded-xl px-4 py-3 text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                     >
                       {refData.categories.length === 0 ? (
                         <>
                           <option value="Teacher">Teaching Staff</option>
                           <option value="Admin">Administration</option>
                         </>
                       ) : (
                         refData.categories.map((cat: any) => (
                           <option key={cat.id} value={cat.name}>{cat.name}</option>
                         ))
                       )}
                     </select>
                  </div>
               </div>

               {/* Phone + Email */}
               <div className="grid grid-cols-2 gap-6">
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Primary Phone</label>
                     <input 
                       type="tel" 
                       value={formData.phone}
                       onChange={(e) => updateField("phone", e.target.value)}
                       className={cn(
                          "w-full bg-slate-50/50 border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 transition-all outline-none",
                          validationErrors.phone ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200',
                          getPendingStyles("phone")
                       )}
                       placeholder="e.g. +91 98765 43210"
                     />
                     {validationErrors.phone && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.phone}</p>}
                     {isPendingValue(formData.phone) && <p className="text-[10px] text-amber-600 font-black mt-1 ml-1 italic animate-pulse">! DATA MISSING</p>}
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Institutional Email</label>
                     <input 
                       type="email" 
                       value={formData.email}
                       onChange={(e) => updateField("email", e.target.value)}
                       className={cn(
                          "w-full bg-slate-50/50 border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 transition-all outline-none",
                          validationErrors.email ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200',
                          getPendingStyles("email")
                       )}
                       placeholder="staff@virtue.com"
                     />
                     {validationErrors.email && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.email}</p>}
                     {isPendingValue(formData.email) && <p className="text-[10px] text-amber-600 font-black mt-1 ml-1 italic animate-pulse">! DATA MISSING</p>}
                  </div>
               </div>

                {/* Residential Address */}
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Residential Address</label>
                  <textarea
                     value={formData.address}
                     onChange={(e) => updateField("address", e.target.value)}
                     rows={2}
                     className={cn(
                        "w-full bg-slate-50/50 border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none",
                        validationErrors.address ? "border-rose-400 ring-2 ring-rose-500/10" : "border-slate-200"
                     )}
                     placeholder="Complete residential address with house number, street, and landmark..."
                  />
                  {validationErrors.address && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.address}</p>}
               </div>

                {/* Branch Selector — OWNER/DEVELOPER only */}
               {isAdmin && refData.branches.length > 0 && (
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Campus Assignment</label>
                     <select
                        value={formData.branchId}
                        onChange={(e) => updateField("branchId", e.target.value)}
                        disabled={isLoadingRef}
                        className={cn(
                           "w-full bg-rose-50/30 border rounded-xl px-4 py-3 text-sm font-bold text-rose-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none",
                           validationErrors.branchId ? "border-rose-400 ring-2 ring-rose-500/10" : "border-rose-100"
                        )}
                     >
                        <option value="">Select Campus...</option>
                        {refData.branches.map((b: any) => (
                           <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                     </select>
                     {validationErrors.branchId && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.branchId}</p>}
                  </div>
               )}
            </div>
         )}

         {/* --- STEP 2: PROFESSIONAL (CAREER LAYER) --- */}
         {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
               {/* Designation + Department + Qualification (3-col) */}
               {/* Designation + Department + Qualification (3-col) */}
               <div className="grid grid-cols-3 gap-6">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Official Designation</label>
                    <input 
                      type="text" 
                      value={formData.designation}
                      onChange={(e) => updateField("designation", e.target.value)}
                      className={cn(
                        "w-full bg-slate-50/50 border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all",
                        validationErrors.designation ? "border-rose-400 ring-2 ring-rose-500/10" : "border-indigo-200 focus:border-indigo-500"
                      )}
                      placeholder="e.g. Senior Teacher"
                    />
                    {validationErrors.designation && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.designation}</p>}
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Departmental Vertical</label>
                    <select 
                      value={formData.department}
                      onChange={(e) => updateField("department", e.target.value)}
                      className={cn(
                        "w-full bg-slate-50/50 border rounded-xl px-4 py-3 text-sm font-medium outline-none",
                        validationErrors.department ? "border-rose-400 ring-2 ring-rose-500/10" : "border-slate-200"
                      )}
                    >
                      {(refData.departments || []).length === 0 ? (
                        <>
                           <option value="Academics">Academics</option>
                           <option value="Administration">Administration</option>
                        </>
                      ) : (
                        (refData.departments || []).map((d: any) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))
                      )}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Qualification</label>
                    <input 
                      type="text" 
                      value={formData.qualification}
                      onChange={(e) => updateField("qualification", e.target.value)}
                      className={cn(
                        "w-full bg-slate-50/50 border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all",
                        validationErrors.qualification ? "border-rose-400 ring-2 ring-rose-500/10" : "border-indigo-200 focus:border-indigo-500"
                      )}
                      placeholder="e.g. M.Sc, B.Ed"
                    />
                    {validationErrors.qualification && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.qualification}</p>}
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Monthly Basic Salary (₹)</label>
                    <input 
                      type="number" 
                      value={formData.basicSalary}
                      onChange={(e) => updateField("basicSalary", Number(e.target.value))}
                      className={cn(
                        "w-full bg-indigo-50/30 border rounded-xl px-4 py-3 text-sm font-bold text-indigo-700 outline-none transition-all",
                        validationErrors.basicSalary ? "border-rose-400 ring-2 ring-rose-500/10" : "border-indigo-100"
                      )}
                    />
                    {validationErrors.basicSalary && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.basicSalary}</p>}
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Experience (Years)</label>
                    <input 
                      type="number" 
                      value={formData.experienceYears}
                      onChange={(e) => updateField("experienceYears", Number(e.target.value))}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                    />
                 </div>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Date of Joining</label>
                  <input 
                    type="date" 
                    value={formData.dateOfJoining}
                    onChange={(e) => updateField("dateOfJoining", e.target.value)}
                    className={cn(
                       "w-full bg-slate-50/50 border rounded-xl px-4 py-3 text-sm font-medium outline-none",
                       validationErrors.dateOfJoining ? "border-rose-400 ring-2 ring-rose-500/10" : "border-slate-200"
                    )}
                  />
                  {validationErrors.dateOfJoining && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.dateOfJoining}</p>}
                               </div>
             </div>
         )}

         {/* --- STEP 3: FINANCIAL (LANDMARK LAYER) --- */}
         {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
               {/* Designation + Department + Qualification (3-col) */}
               <div className="flex items-center gap-2 mb-2">
                  <span className="p-2 bg-amber-50 rounded-lg text-amber-600"><Building2 className="w-4 h-4" /></span>
                  <div className="font-bold text-slate-800 text-sm">Banking & Statutory Protocols</div>
               </div>

               {/* Bank Name + Account Holder Name */}
               <div className="grid grid-cols-2 gap-5">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Bank Name</label>
                    <input 
                      type="text" 
                      value={formData.bankName}
                      onChange={(e) => updateField("bankName", e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                      placeholder="e.g. HDFC Bank"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Account Holder Name</label>
                    <input 
                      type="text" 
                      value={formData.accountName}
                      onChange={(e) => updateField("accountName", e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                      placeholder="Full name as on passbook"
                    />
                 </div>
               </div>

               {/* Account Number + IFSC */}
               <div className="grid grid-cols-2 gap-5">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Account Number</label>
                    <input 
                      type="text" 
                      value={formData.accountNumber}
                      onChange={(e) => updateField("accountNumber", e.target.value)}
                      className="w-full bg-amber-50/30 border border-amber-100 rounded-xl px-4 py-3 text-sm font-bold text-amber-700 outline-none"
                      placeholder="Enter full account number"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">IFSC Code</label>
                    <input 
                      type="text" 
                      value={formData.ifscCode}
                      onChange={(e) => updateField("ifscCode", e.target.value.toUpperCase())}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none uppercase"
                      placeholder="e.g. HDFC0001234"
                    />
                 </div>
               </div>

               {/* Statutory Section */}
               <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Statutory Compliance</div>
                  
                  {/* PAN + Aadhaar */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">PAN Card Number</label>
                       <input 
                         type="text"
                         value={formData.panNumber}
                         onChange={(e) => updateField("panNumber", e.target.value.toUpperCase())}
                         className={`w-full bg-slate-50/50 border ${validationErrors.panNumber ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm font-medium outline-none uppercase`}
                         placeholder="ABCDE1234F"
                       />
                       {validationErrors.panNumber && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.panNumber}</p>}
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Aadhaar (UIDAI)</label>
                       <input 
                         type="text"
                         value={formData.aadhaarNumber}
                         onChange={(e) => updateField("aadhaarNumber", e.target.value)}
                         className={`w-full bg-slate-50/50 border ${validationErrors.aadhaarNumber ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm font-medium outline-none`}
                         placeholder="1234 5678 9012"
                       />
                       {validationErrors.aadhaarNumber && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{validationErrors.aadhaarNumber}</p>}
                    </div>
                  </div>

                  {/* PF + UAN + ESI */}
                  <div className="grid grid-cols-3 gap-5">
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">PF Number</label>
                       <input 
                         type="text"
                         value={formData.pfNumber}
                         onChange={(e) => updateField("pfNumber", e.target.value)}
                         className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                         placeholder="If applicable"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">UAN Number</label>
                       <input 
                         type="text"
                         value={formData.uanNumber}
                         onChange={(e) => updateField("uanNumber", e.target.value)}
                         className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                         placeholder="If applicable"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">ESI Number</label>
                       <input 
                         type="text"
                         value={formData.esiNumber}
                         onChange={(e) => updateField("esiNumber", e.target.value)}
                         className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                         placeholder="If applicable"
                       />
                    </div>
                  </div>
               </div>
            </div>
          )}

         {/* --- STEP 4: GENESIS (Atmostpheric Summary) --- */}
         {step === 4 && (
            <div className="space-y-8 animate-in zoom-in duration-500 text-center py-10">
               <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10" />
               </div>
               
               <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Ready for Genesis.</h2>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto">
                     All institutional protocols have been verified. Click below to commit this personnel record to the Sovereign Ledger.
                  </p>
               </div>

               <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left">
                     <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Full Name</div>
                     <div className="text-sm font-bold text-slate-700">{formData.firstName} {formData.lastName}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-left">
                     <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-tighter">Salary Alignment</div>
                     <div className="text-sm font-bold text-indigo-700">₹{formData.basicSalary}</div>
                  </div>
               </div>

               <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-left max-w-md mx-auto flex items-center gap-4">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  <div>
                    <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest leading-none">Identity Proofing</div>
                    <div className="text-xs text-emerald-800 font-medium">Branch Jailing Verified • Tenancy Secure</div>
                  </div>
               </div>
            </div>
         )}

         {/* --- NAVIGATION FOOTER --- */}
         <div className="mt-12 flex items-center justify-between">
            <button
               onClick={onCancel}
               className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest px-4 py-2"
            >
               Discard
            </button>

            <div className="flex gap-4">
               {step > 1 && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-600 text-xs font-bold rounded-2xl hover:bg-slate-100 transition-all border border-slate-100 active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
               )}

               {step < 4 ? (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white text-xs font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95 hover:shadow-emerald-500/20"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
               ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-10 py-3 bg-indigo-600 text-white text-xs font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95 hover:shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {isSubmitting ? "Committing..." : "Finalize Protocol"} <CheckCircle2 className="w-4 h-4" />
                  </button>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
