"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Briefcase, FileText, Building, CheckCircle2, ArrowRight, ArrowLeft, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { staffOnboardingSchema, type StaffOnboardingData } from "@/types/staff";
import { createStaffAction, updateStaffAction } from "@/lib/actions/staff-actions";
import { useTenant } from "@/context/tenant-context";

const steps = [
  { id: 1, title: "Personal",  icon: User },
  { id: 2, title: "Professional", icon: Briefcase },
  { id: 3, title: "Statutory", icon: FileText },
  { id: 4, title: "Bank",      icon: Building },
  { id: 5, title: "Review",    icon: CheckCircle2 },
];

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        {error && <span className="text-[10px] text-rose-500 font-bold animate-pulse">{error}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls = "bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all w-full shadow-sm";
const selectCls = "bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-3.5 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all w-full shadow-sm";

interface StaffFormProps {
    mode?: "onboard" | "edit";
    staffId?: string;
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function StaffForm({ mode = "onboard", staffId, initialData, onSuccess }: StaffFormProps) {
  const { schoolId, userRole, branchId: currentBranchId } = useTenant();
  const isAdmin = userRole === "OWNER" || userRole === "DEVELOPER";
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<any>(null);

  const { register, handleSubmit, formState: { errors }, reset, trigger, getValues, setValue } = useForm<StaffOnboardingData>({
    resolver: zodResolver(staffOnboardingSchema) as any,
    mode: "onBlur",
    defaultValues: initialData || {
      gender: "Female",
      role: "Teacher",
      dateOfJoining: new Date().toISOString().split("T")[0],
      department: "Academics",
      branchId: initialData?.branchId || currentBranchId || ""
    },
  });

  // 🛡️ RECOVERY LOCK: Sync form state when initialData arrives (e.g. on Edit)
  useEffect(() => {
    if (initialData) {
      console.log("🧬 [StaffForm] Priority Identity Hook: Force-Syncing record state...");
      reset(initialData);
      
      // Zero-Tolerance Sync: Ensure absolute field commitment
      if (initialData.branchId) {
          setValue("branchId", initialData.branchId, { shouldDirty: true, shouldValidate: true });
      }
      if (initialData.dob) {
          setValue("dob", initialData.dob, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [initialData, reset, setValue]);

  const [refData, setRefData] = useState<{
    branches: any[],
    departments: any[],
    categories: any[]
  }>({
    branches: [],
    departments: [],
    categories: []
  });
  const [isLoadingRef, setIsLoadingRef] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchRefData() {
            if (!schoolId) return;
            setIsLoadingRef(true);
            try {
                const { getAdmissionReferenceData } = await import("@/lib/actions/reference-actions");
                const { getDepartments, getStaffCategories } = await import("@/lib/actions/staff-config-actions");

                const [res, deptRes, catRes] = await Promise.all([
                    getAdmissionReferenceData(),
                    getDepartments(schoolId),
                    getStaffCategories(schoolId)
                ]);

                if (isMounted && res.success && res.data) {
                    setRefData({
                        branches: res.data.branches,
                        departments: deptRes.success ? (deptRes.data as any[]) : [],
                        categories: catRes.success ? (catRes.data as any[]) : []
                    });
                    
                    // 🛡️ BRANCH LOCK: Only auto-select if field is currently empty
                    const val = getValues("branchId");
                    if (!val) {
                        const targetId = initialData?.branchId || (isAdmin ? res.data.branches[0]?.id : currentBranchId);
                        if (targetId) setValue("branchId", targetId, { shouldValidate: true });
                    }
                }
            } catch (e) {
                console.error("❌ [RefData_Fetch_Error]", e);
            } finally {
                if (isMounted) setIsLoadingRef(false);
            }
        }
        fetchRefData();
        return () => { isMounted = false; };
    }, [schoolId, currentBranchId, isAdmin, initialData?.branchId]); // 🛑 Loop Terminated

  const onSubmit = async (data: StaffOnboardingData) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const result = mode === "edit" && staffId
        ? await updateStaffAction(staffId, data)
        : await createStaffAction(data);

      if (result.success) {
        setSubmitted(true);
        if (onSuccess) onSuccess();
      } else {
        setFormError(result.error);
      }
    } catch (err: any) {
      setFormError({ 
        error: "Connectivity Interference: Our secure pool is in high demand. Please try again.",
        code: "UNEXPECTED_SYSTEM_ERROR"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setCurrentStep(1);
    reset();
  };

  const nextStep = async () => {
    const fieldsByStep: Record<number, (keyof StaffOnboardingData)[]> = {
      1: ["firstName", "lastName", "middleName", "phone", "email", "gender", "dob", "branchId", "address"],
      2: ["role", "department", "designation", "qualification", "experienceYears", "basicSalary", "dateOfJoining"],
      3: ["panNumber", "pfNumber", "uanNumber", "esiNumber", "aadhaarNumber"],
      4: ["bankName", "accountName", "accountNumber", "ifscCode"],
    };

    const fieldsToValidate = fieldsByStep[currentStep];
    if (fieldsToValidate) {
      let isValid = await trigger(fieldsToValidate);
      
      // 🛡️ IDENTITY SENTINEL: Forensic Repair Mode
      if (!isValid && currentStep === 1) {
          const currentId = getValues("branchId");
          const currentDob = getValues("dob");
          
          if (!currentId || !currentDob) {
              console.log("🛠️ [StaffForm] Identity Sentinel triggered. Attempting deep state repair...");
              const recoveryBranchId = initialData?.branchId || currentBranchId;
              const recoveryDob = initialData?.dob;

              if (recoveryBranchId) setValue("branchId", recoveryBranchId, { shouldValidate: true });
              if (recoveryDob) setValue("dob", recoveryDob, { shouldValidate: true });
              
              // Second Attempt: Re-validate after state injection
              isValid = await trigger(fieldsToValidate);
          }
      }

      if (!isValid) {
          console.warn("⚠️ [StaffForm] Validation Failed on Step", currentStep, errors);
          if (currentStep === 1 && !getValues("branchId")) {
              setFormError("System Error: Campus identity is missing. Please refresh the page.");
          }
          return;
      }
    }
    
    setFormError(null);
    setCurrentStep(Math.min(currentStep + 1, steps.length));
  };

  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 1));

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0f172a] rounded-[48px] p-16 text-center text-white relative overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.3)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-primary/10 pointer-events-none" />
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[100px] rounded-full" />
          
          <div className="relative z-10 space-y-8">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-4xl font-black italic tracking-tighter">Personnel Profile: <span className="text-emerald-400 uppercase">Registered</span></h2>
              <p className="text-slate-400 font-bold text-lg max-w-md mx-auto">
                Credentials and portal access have been initialized for {getValues("firstName")}.
              </p>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleReset} 
                className="px-12 py-5 bg-white text-slate-900 rounded-[20px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Register Another Member
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 rounded-[40px] border border-slate-200/60 p-6 shadow-2xl flex flex-col md:flex-row gap-6 relative overflow-hidden backdrop-blur-xl">
      {/* Sidebar Progress */}
      <div className="w-full md:w-64 shrink-0 bg-slate-900 rounded-[32px] p-6 relative overflow-hidden hidden md:block border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col h-full">
          <h3 className="text-white font-black text-xl tracking-tight mb-8 drop-shadow-sm flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full"></div>
            Staff Onboarding
          </h3>
          <div className="space-y-6 flex-1">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;
              return (
                <div key={step.id} className="relative">
                  {idx !== steps.length - 1 && (
                    <div className={cn("absolute left-5 top-10 bottom-[-24px] w-0.5 rounded-full transition-all duration-500", isPast ? "bg-primary" : "bg-white/10")} />
                  )}
                  <div className={cn("flex items-center gap-4 group transition-all duration-300", isActive ? "opacity-100 translate-x-1" : isPast ? "opacity-100" : "opacity-40")}>
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0 border-2", isActive ? "bg-primary border-primary shadow-lg shadow-primary/40" : isPast ? "bg-primary/20 border-primary" : "bg-white/5 border-white/10")}>
                      {isPast ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-white/50")} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-0.5">Step {step.id}</p>
                      <p className={cn("text-sm font-bold tracking-tight transition-colors", isActive ? "text-white" : "text-white/70")}>{step.title}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-slate-100 relative min-h-[600px] flex flex-col">
        {formError && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-[32px] flex flex-col gap-4 shadow-xl shadow-rose-100/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-200">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-rose-900 font-black text-lg tracking-tight">Submission Blocked</h3>
                  <p className="text-rose-700/70 text-sm font-bold leading-relaxed mt-1">
                    {typeof formError === 'string' ? formError : formError.error}
                  </p>
                </div>
                {(typeof formError === 'object' && formError.code) && (
                  <div className="px-3 py-1 bg-rose-200/50 rounded-full text-[10px] font-black text-rose-600 uppercase tracking-widest">
                    Code: {formError.code}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-rose-100">
                 <button 
                  onClick={() => setFormError(null)}
                  className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
                  type="button"
                 >
                   Clear Alert
                 </button>
                 <span className="text-[10px] italic text-rose-300">Sovereign Sentinel V8.1 Final Polish</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <form id="staff-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 h-full overflow-y-auto custom-scrollbar pb-20 px-1">
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black tracking-tight text-slate-800 border-b border-slate-100 pb-2 mb-6">Personal details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <Field label="FIRST NAME" error={errors.firstName?.message}>
                        <input {...register("firstName")} className={inputCls} placeholder="John" />
                      </Field>
                      <Field label="MIDDLE NAME">
                        <input {...register("middleName")} className={inputCls} placeholder="William" />
                      </Field>
                      <Field label="LAST NAME" error={errors.lastName?.message}>
                        <input {...register("lastName")} className={inputCls} placeholder="Doe" />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="EMAIL" error={errors.email?.message}>
                        <input {...register("email")} type="email" className={inputCls} placeholder="john@example.com" />
                      </Field>
                      <Field label="PHONE NUMBER" error={errors.phone?.message}>
                        <input {...register("phone")} className={inputCls} placeholder="9876543210" />
                      </Field>
                    </div>

                    <Field label="RESIDENTIAL ADDRESS" error={errors.address?.message} className="md:col-span-3">
                        <textarea 
                          {...register("address")} 
                          rows={2}
                          className={cn(inputCls, "resize-none py-4")} 
                          placeholder="Complete residential address with house number, street, and landmark..."
                        />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <Field label="DATE OF BIRTH" error={errors.dob?.message}>
                        <input {...register("dob")} type="date" className={inputCls} />
                      </Field>
                      <Field label="GENDER" error={errors.gender?.message}>
                        <select {...register("gender")} className={selectCls}>
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </Field>
                      {isAdmin ? (
                        <Field label="BRANCH" error={errors.branchId?.message}>
                          <select {...register("branchId")} className={selectCls} disabled={isLoadingRef}>
                            {refData.branches.length === 0 ? (
                              <option value="">No Branches Found</option>
                            ) : (
                              refData.branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
                              ))
                            )}
                          </select>
                        </Field>
                      ) : (
                        <input type="hidden" {...register("branchId")} />
                      )}
                    </div>

                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black tracking-tight text-slate-800 border-b border-slate-100 pb-2 mb-6">Professional Profile</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="NATURE OF ROLE" error={errors.role?.message}>
                        <select {...register("role")} className={selectCls}>
                          {refData.categories.length === 0 ? (
                            <>
                              <option value="Teacher">Teaching Staff</option>
                              <option value="Admin">Administration</option>
                              <option value="Management">Management Staff</option>
                            </>
                          ) : (
                            refData.categories.map(cat => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))
                          )}
                        </select>
                      </Field>
                      <Field label="DEPARTMENT" error={errors.department?.message}>
                        <select {...register("department")} className={selectCls}>
                          {refData.departments.length === 0 ? (
                            <>
                              <option value="Academics">Academics</option>
                              <option value="Finance">Finance</option>
                              <option value="Operations">Operations</option>
                            </>
                          ) : (
                            refData.departments.map(dept => (
                              <option key={dept.id} value={dept.name}>{dept.name}</option>
                            ))
                          )}
                        </select>
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <Field label="DESIGNATION" error={errors.designation?.message}>
                        <input {...register("designation")} className={inputCls} placeholder="e.g. Senior Math Teacher" />
                      </Field>
                      <Field label="QUALIFICATION" error={errors.qualification?.message}>
                        <input {...register("qualification")} className={inputCls} placeholder="e.g. M.Sc, B.Ed" />
                      </Field>
                      <Field label="EXPERIENCE (YEARS)" error={errors.experienceYears?.message}>
                        <input {...register("experienceYears")} type="number" step="0.5" className={inputCls} placeholder="0" />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="DATE OF JOINING" error={errors.dateOfJoining?.message}>
                        <input {...register("dateOfJoining")} type="date" className={inputCls} />
                      </Field>
                      <Field label="BASIC SALARY (₹) PRE-TAX" error={errors.basicSalary?.message}>
                        <input {...register("basicSalary")} type="number" className={inputCls} placeholder="45000" />
                      </Field>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black tracking-tight text-slate-800 border-b border-slate-100 pb-2 mb-6">Statutory Compliance</h2>
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
                      <p className="text-xs font-bold text-amber-800">These details are heavily encrypted in our database and used purely for Payroll calculations and tax compliance.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="PAN CARD NUMBER" error={errors.panNumber?.message}>
                        <input 
                          {...register("panNumber")} 
                          className={cn(inputCls, "uppercase")} 
                          placeholder="ABCDE1234F"
                          onChange={(e) => setValue("panNumber", e.target.value.toUpperCase())}
                        />
                      </Field>
                      <Field label="AADHAAR NUMBER" error={errors.aadhaarNumber?.message}>
                        <input {...register("aadhaarNumber")} className={inputCls} placeholder="1234 5678 9012" />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="PF / UAN NUMBER" error={errors.uanNumber?.message}>
                        <input {...register("uanNumber")} className={inputCls} placeholder="UAN if applicable" />
                      </Field>
                      <Field label="ESI NUMBER" error={errors.esiNumber?.message}>
                        <input {...register("esiNumber")} className={inputCls} placeholder="ESI registration" />
                      </Field>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black tracking-tight text-slate-800 border-b border-slate-100 pb-2 mb-6">Payroll / Bank Routing</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="BANK NAME" error={errors.bankName?.message}>
                        <input {...register("bankName")} className={inputCls} placeholder="HDFC Bank" />
                      </Field>
                      <Field label="IFSC CODE" error={errors.ifscCode?.message}>
                        <input {...register("ifscCode")} className={cn(inputCls, "uppercase")} placeholder="HDFC0001234" />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="ACCOUNT DIRECTORY NAME" error={errors.accountName?.message}>
                        <input {...register("accountName")} className={inputCls} placeholder="John Doe" />
                      </Field>
                      <Field label="ACCOUNT NUMBER" error={errors.accountNumber?.message}>
                        <input {...register("accountNumber")} className={inputCls} placeholder="5010023..." />
                      </Field>
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] rounded-full" />
                       <h2 className="text-xl font-black tracking-tight mb-2">Final Review</h2>
                       <p className="text-slate-400 text-sm">Please ensure all HR data is correct before formally generating the profile.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Employee Name</p>
                         <p className="text-sm font-bold text-slate-900">{getValues("firstName")} {getValues("lastName")}</p>
                       </div>
                       <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Designation & Role</p>
                         <p className="text-sm font-bold text-slate-900">{getValues("designation")} ({getValues("role")})</p>
                       </div>
                       <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Date of Birth</p>
                         <p className="text-sm font-bold text-slate-900">{getValues("dob")}</p>
                       </div>
                       <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Date of Joining</p>
                         <p className="text-sm font-bold text-slate-900">{getValues("dateOfJoining")}</p>
                       </div>
                       <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Contract Salary</p>
                         <p className="text-sm font-black text-emerald-600">₹{getValues("basicSalary")} pre-tax</p>
                       </div>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 flex items-center justify-between rounded-bl-[32px] rounded-br-[32px]">
          <button
            onClick={prevStep}
            disabled={currentStep === 1 || isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          {currentStep < steps.length ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg active:scale-95"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Onboarding..." : "Confirm & Register"} <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      {/* 🛠️ Sovereign Debug Console (Transparency Mode) */}
      <div className="mt-10 p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl font-mono text-[10px] text-slate-400">
        <div className="flex items-center gap-2 mb-2 text-slate-200 uppercase tracking-widest font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Transparency Audit
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <div className="text-slate-500 mb-1 border-b border-slate-700 pb-1">DATABASE RECORD (INCOMING)</div>
                <div className="space-y-1">
                    <div>DOB: <span className="text-white">{String(initialData?.dob || "NULL")}</span></div>
                    <div>BRANCH: <span className="text-white">{String(initialData?.branchId || "NULL")}</span></div>
                    <div>SALARY: <span className="text-white">{String(initialData?.basicSalary || "NULL")}</span></div>
                </div>
            </div>
            <div>
                <div className="text-slate-500 mb-1 border-b border-slate-700 pb-1">LIVE FORM STATE</div>
                <div className="space-y-1">
                    <div>DOB: <span className="text-emerald-400">{String(getValues("dob") || "EMPTY")}</span></div>
                    <div>BRANCH: <span className="text-emerald-400">{String(getValues("branchId") || "EMPTY")}</span></div>
                    <div>SALARY: <span className="text-emerald-400">{String(getValues("basicSalary") || "EMPTY")}</span></div>
                    <div className="mt-2 border-t border-slate-700 pt-1 text-slate-500 uppercase">System Status</div>
                    <div>DATA_ORIGIN: <span className="text-white">{initialData?.id ? "DATABASE_DEEP" : "PARTIAL_SUMMARY"}</span></div>
                    <div>SENTINEL_AUTH: <span className={initialData?.id ? "text-emerald-400" : "text-rose-400"}>{initialData?.id ? "ESTABLISHED" : "PENDING_REFRESH"}</span></div>
                    
                    <div className="mt-4 border-t border-slate-700 pt-2">
                        <div className="text-[10px] text-slate-500 mb-1 tracking-widest uppercase">Raw Incoming Database Dump (Transparency Mode)</div>
                        <pre className="text-[8px] text-slate-400 overflow-x-auto whitespace-pre-wrap bg-slate-950 p-3 rounded-lg border border-slate-800">
                            {JSON.stringify((initialData as any)?._raw_incoming, (key, value) => {
                                if (['professional', 'statutory', 'bank', 'advances', 'branch'].includes(key)) return '[Loaded]';
                                return value;
                            }, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
        </div>
      </div>
    </div>
  );
}
