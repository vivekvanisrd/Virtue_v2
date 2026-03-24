"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Users, CreditCard, CheckCircle2, ArrowRight, ArrowLeft,
  MapPin, Bus, School, Heart, Building, Info, ChevronDown, Search, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { studentAdmissionSchema, type StudentAdmissionData } from "@/types/student";
import { submitAdmissionAction, searchStudentsAction } from "@/lib/actions/student-actions";
import { getAdmissionReferenceData, getSectionsByClass } from "@/lib/actions/reference-actions";
import { AlertCircle } from "lucide-react";
import { StudentAdmissionSummary } from "./student-admission-summary";

const steps = [
  { id: 1, title: "Personal",  icon: User },
  { id: 2, title: "Academic",  icon: School },
  { id: 3, title: "Family",    icon: Users },
  { id: 4, title: "Address",   icon: MapPin },
  { id: 5, title: "Financial", icon: CreditCard },
  { id: 6, title: "More",      icon: Info },
  { id: 7, title: "Review",    icon: CheckCircle2 },
];

// Reusable compact input
// Reusable compact input
function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-black text-white/80 uppercase tracking-widest">{label}</label>
        {error && <span className="text-[9px] text-rose-400 font-bold uppercase tracking-tighter animate-pulse">{error}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls = "bg-white/10 border border-white/20 rounded-lg px-2.5 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors w-full";
const selectCls = "bg-white/10 border border-white/20 rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors w-full";

export function StudentForm() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [admissionId, setAdmissionId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [duplicateAadhaar, setDuplicateAadhaar] = useState<string | null>(null);
  const [refData, setRefData] = useState<{
    branches: any[],
    academicYears: any[],
    classes: any[],
    feeSchedules: any[]
  }>({
    branches: [],
    academicYears: [],
    classes: [],
    feeSchedules: []
  });
  const [sections, setSections] = useState<any[]>([]);
  const [isLoadingRef, setIsLoadingRef] = useState(true);

  // Fetch Reference Data
  useEffect(() => {
    async function fetchRefData() {
        setIsLoadingRef(true);
        const res = await getAdmissionReferenceData();
        if (res.success && res.data) {
            setRefData(res.data);
            
            // Set default values if not already set
            const currentAY = res.data.academicYears.find((y: any) => y.isCurrent);
            if (currentAY) {
                // We'll use setValue or just rely on defaultValues if we can find them.
                // For now, these will be populated in selects.
            }
        }
        setIsLoadingRef(false);
    }
    fetchRefData();
  }, []);

  const { register, handleSubmit, formState: { errors }, watch, reset, trigger } = useForm<StudentAdmissionData>({
    resolver: zodResolver(studentAdmissionSchema) as any,
    mode: "onBlur",
    defaultValues: {
      gender: "Male",
      paymentType: "Term-wise",
      admissionDate: new Date().toISOString().split("T")[0],
      admissionType: "New",
      boardingType: "Day Scholar",
      country: "India",
      transportRequired: false,
    },
  });

  const onSubmit = async (data: StudentAdmissionData) => {
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      const result = await submitAdmissionAction(data);
      
      if (result.success && result.data) {
        setAdmissionId(result.data.admissionId);
        setSubmittedData(data);
        setSubmitted(true);
      } else {
        setFormError(result.error);
      }
    } catch (err) {
      setFormError("An unexpected error occurred. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmittedData(null);
    setAdmissionId(null);
    setCurrentStep(1);
    reset();
  };

  const nextStep = async () => {
    if (duplicateAadhaar) return;

    const fieldsByStep: Record<number, (keyof StudentAdmissionData)[]> = {
      1: ["firstName", "lastName", "middleName", "dateOfBirth", "gender", "bloodGroup", "category", "phone", "email", "aadhaarNumber", "usnSrnNumber", "motherTongue", "placeOfBirth", "birthCertNo"],
      2: ["admissionDate", "academicYearId", "branchId", "classId", "sectionId", "rollNumber", "feeScheduleId", "penNumber", "apaarId", "samagraId", "stsId", "biometricId", "tcNumber"],
      3: ["fatherName", "fatherPhone", "fatherAlternatePhone", "fatherEmail", "fatherOccupation", "fatherQualification", "motherName", "motherPhone", "motherAlternatePhone", "motherEmail", "motherOccupation", "motherQualification", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "whatsappNumber"],
      4: ["currentAddress", "city", "pinCode", "state", "country", "transportRequired", "transportRouteId", "pickupStop", "dropStop", "transportMonthlyFee"],
      5: ["paymentType", "tuitionFee", "admissionFee", "cautionDeposit", "libraryFee", "labFee", "sportsFee", "developmentFee", "examFee", "discountId1", "discountReason1"],
      6: ["admissionType", "boardingType", "medicalConditions", "allergies", "bankAccountName", "bankAccountNumber", "bankIfscCode", "reference"],
    };

    const fieldsToValidate = fieldsByStep[currentStep];
    if (fieldsToValidate) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) return;
    }
    
    setCurrentStep(Math.min(currentStep + 1, steps.length));
  };

  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 1));
  const transportRequired = watch("transportRequired");
  const firstName = watch("firstName");
  const aadhaarNumber = watch("aadhaarNumber");

  const performSearch = useCallback(async (q: string) => {
    if (!q || q.length < 3) {
      setSearchResults([]);
      setDuplicateAadhaar(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchStudentsAction(q);
      if (res.success && res.data) {
        setSearchResults(res.data);
        // Check for exact Aadhaar match to block admission
        const match = res.data.find((s: any) => s.aadhaarNumber === aadhaarNumber && (aadhaarNumber?.length ?? 0) > 5);
        setDuplicateAadhaar(match ? match.aadhaarNumber : null);
      } else {
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [aadhaarNumber]);

  useEffect(() => {
    const term = firstName || aadhaarNumber;
    const skip = !term || term.length < 3;
    
    const timer = setTimeout(() => {
      if (!skip) performSearch(term);
      else {
        setSearchResults([]);
        setDuplicateAadhaar(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [firstName, aadhaarNumber, performSearch]);

  if (submitted && submittedData && admissionId) {
    return (
      <StudentAdmissionSummary 
        studentData={submittedData} 
        admissionId={admissionId} 
        onReset={handleReset} 
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ─── Progress Steps ─── */}
      <div className="flex justify-between mb-4 relative px-2">
        <div className="absolute top-4 left-0 w-full h-0.5 bg-white/10 -z-10" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 -z-10 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((step) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStep(step.id)}
              className="flex items-center gap-1.5 group outline-none"
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 border-2",
                isActive ? "bg-violet-600 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.3)] scale-110"
                  : isCompleted ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                  : "bg-[#1e1e30] border-white/10 text-white/40 group-hover:border-white/20"
              )}>
                <StepIcon className={cn("w-4 h-4", isActive ? "text-white" : "text-inherit")} />
              </div>
              <span className={cn(
                "text-[11px] font-black uppercase tracking-wider transition-colors duration-300 hidden sm:block",
                isActive ? "text-white" : "text-white/60 group-hover:text-white/80"
              )}>
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Form ─── */}
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-3"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault(); // Prevent accidental form submission on Enter
          }
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="bg-[#1a1a2e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] -z-10 rounded-full" />

            {/* ─── STEP 1: Personal ─── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Personal Details</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Basic student identity information</p>
                  </div>
                </div>

                {/* Duplicate Alert */}
                <AnimatePresence>
                  {duplicateAadhaar && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-rose-500/20 border border-rose-500/50 rounded-xl p-3 flex items-start gap-3 mb-2"
                    >
                      <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-rose-300 uppercase leading-none">Duplicate Prevention Active</p>
                        <p className="text-[10px] text-rose-200/70 font-medium mt-1">
                          A student with Aadhaar <span className="text-rose-400 font-bold">{duplicateAadhaar}</span> is already admitted to this school. 
                          <span className="block mt-1 font-bold text-rose-300 underline">Admission for this Aadhaar is blocked.</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="First Name *" error={errors.firstName?.message} className="lg:col-span-2 relative">
                    <div className="relative group">
                      <input {...register("firstName")} placeholder="First Name" className={cn(inputCls, "pr-8")} />
                      {isSearching && <Search className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-violet-400" />}
                    </div>

                    {/* Live Search Dropdown */}
                    <AnimatePresence>
                      {searchResults.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-[100] left-0 right-0 top-full mt-1 bg-[#1e1e30] border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-2xl ring-1 ring-white/10"
                        >
                          <div className="px-2 py-1.5 border-b border-white/5 bg-white/5">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Similar Students Found</p>
                          </div>
                          <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                            {searchResults.map((student) => (
                              <div key={student.id} className="p-2.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-default">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-white truncate">{student.firstName} {student.lastName}</p>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                      <p className="text-[9px] text-white/50 font-bold uppercase truncate">
                                        P: {student.family?.fatherName || 'N/A'}
                                      </p>
                                      <p className="text-[9px] text-violet-400/80 font-bold uppercase">
                                        {student.phone || student.family?.fatherPhone || 'No Phone'}
                                      </p>
                                    </div>
                                    {student.aadhaarNumber && (
                                      <p className={cn(
                                        "text-[8px] font-black px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-tighter",
                                        student.aadhaarNumber === aadhaarNumber ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse" : "bg-white/5 text-white/40 border border-white/10"
                                      )}>
                                        Aadhaar: {student.aadhaarNumber}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-tighter">
                                      {student.academic?.class?.name || 'Class N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Field>
                  <Field label="Middle Name" error={errors.middleName?.message}>
                    <input {...register("middleName")} placeholder="Middle" className={inputCls} />
                  </Field>
                  <Field label="Last Name *" error={errors.lastName?.message} className="lg:col-span-2">
                    <input {...register("lastName")} placeholder="Last Name" className={inputCls} />
                  </Field>
                  <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
                    <input {...register("dateOfBirth")} type="date" className={inputCls} />
                  </Field>
                  <Field label="Gender" error={errors.gender?.message}>
                    <select {...register("gender")} className={selectCls}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>
                  <Field label="Blood Group" error={errors.bloodGroup?.message}>
                    <select {...register("bloodGroup")} className={selectCls}>
                      <option value="">Select</option>
                      {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Category" error={errors.category?.message}>
                    <select {...register("category")} className={selectCls}>
                      <option value="">Select</option>
                      {["General","OBC","SC","ST","EWS"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Phone" error={errors.phone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-white/50 text-sm font-medium">+91</span>
                      <input {...register("phone")} placeholder="XXXXX" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Email" error={errors.email?.message} className="lg:col-span-2">
                    <input {...register("email")} type="email" placeholder="student@email.com" className={inputCls} />
                  </Field>
                  <Field label="Aadhaar Number *" error={errors.aadhaarNumber?.message}>
                    <input {...register("aadhaarNumber")} placeholder="XXXX XXXX XXXX" className={inputCls} />
                  </Field>
                  <Field label="USN / SRN Number" error={errors.usnSrnNumber?.message}>
                    <input {...register("usnSrnNumber")} placeholder="USN" className={inputCls} />
                  </Field>
                  <Field label="Mother Tongue" error={errors.motherTongue?.message}>
                    <input {...register("motherTongue")} placeholder="e.g. Telugu" className={inputCls} />
                  </Field>
                  <Field label="Place of Birth" error={errors.placeOfBirth?.message}>
                    <input {...register("placeOfBirth")} placeholder="City" className={inputCls} />
                  </Field>
                  <Field label="Birth Certificate No" error={errors.birthCertNo?.message}>
                    <input {...register("birthCertNo")} placeholder="BC-XXXXX" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 2: Academic ─── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <School className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Academic & Fee Schedule</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Class placement and academic details</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Admission Date *" error={errors.admissionDate?.message}>
                    <input {...register("admissionDate")} type="date" className={inputCls} />
                  </Field>
                  <Field label="Academic Year *" error={errors.academicYearId?.message}>
                    <select {...register("academicYearId")} className={selectCls} disabled={isLoadingRef}>
                      <option value="">Select Year</option>
                      {refData.academicYears.map(y => (
                        <option key={y.id} value={y.id}>{y.name} {y.isCurrent ? '(Current)' : ''}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Branch *" error={errors.branchId?.message}>
                    <select {...register("branchId")} className={selectCls} disabled={isLoadingRef}>
                      <option value="">Select Branch</option>
                      {refData.branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Class *" error={errors.classId?.message}>
                    <select 
                      {...register("classId", { 
                        onChange: async (e) => {
                          const res = await getSectionsByClass(e.target.value);
                          if (res.success) setSections(res.data || []);
                        }
                      })} 
                      className={selectCls} 
                      disabled={isLoadingRef}
                    >
                      <option value="">Select Class</option>
                      {refData.classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Section" error={errors.sectionId?.message}>
                    <select {...register("sectionId")} className={selectCls} disabled={sections.length === 0}>
                      <option value="">Select Section</option>
                      {sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Roll Number" error={errors.rollNumber?.message}>
                    <input {...register("rollNumber")} placeholder="Roll No" className={inputCls} />
                  </Field>
                  <Field label="Fee Schedule" error={errors.feeScheduleId?.message}>
                    <select {...register("feeScheduleId")} className={selectCls} disabled={isLoadingRef}>
                      <option value="">Select Schedule</option>
                      {refData.feeSchedules.map(fs => (
                        <option key={fs.id} value={fs.id}>{fs.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="PEN Number" error={errors.penNumber?.message}>
                    <input {...register("penNumber")} placeholder="PEN" className={inputCls} />
                  </Field>
                  <Field label="Apaar ID" error={errors.apaarId?.message}>
                    <input {...register("apaarId")} placeholder="Apaar ID" className={inputCls} />
                  </Field>
                  <Field label="Samagra ID" error={errors.samagraId?.message}>
                    <input {...register("samagraId")} placeholder="Samagra" className={inputCls} />
                  </Field>
                  <Field label="STS / SATS ID" error={errors.stsId?.message}>
                    <input {...register("stsId")} placeholder="STS ID" className={inputCls} />
                  </Field>
                  <Field label="Biometric ID" error={errors.biometricId?.message}>
                    <input {...register("biometricId")} placeholder="Bio ID" className={inputCls} />
                  </Field>
                  <Field label="TC Number" error={errors.tcNumber?.message}>
                    <input {...register("tcNumber")} placeholder="TC No" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 3: Family ─── */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Family Details</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Parental and emergency contact information</p>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-violet-400/70 uppercase tracking-wider">Father</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Father Name *" error={errors.fatherName?.message} className="lg:col-span-2">
                    <input {...register("fatherName")} placeholder="Full Name" className={inputCls} />
                  </Field>
                  <Field label="Father Phone *" error={errors.fatherPhone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-white/50 text-sm font-medium">+91</span>
                      <input {...register("fatherPhone")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Alternate Phone" error={errors.fatherAlternatePhone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-white/50 text-sm font-medium">+91</span>
                      <input {...register("fatherAlternatePhone")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Father Email" error={errors.fatherEmail?.message}>
                    <input {...register("fatherEmail")} type="email" placeholder="email" className={inputCls} />
                  </Field>
                  <Field label="Occupation" error={errors.fatherOccupation?.message}>
                    <input {...register("fatherOccupation")} placeholder="Occupation" className={inputCls} />
                  </Field>
                  <Field label="Qualification" error={errors.fatherQualification?.message}>
                    <input {...register("fatherQualification")} placeholder="Qualification" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-pink-400/70 uppercase tracking-wider mt-2">Mother</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Mother Name" error={errors.motherName?.message} className="lg:col-span-2">
                    <input {...register("motherName")} placeholder="Full Name" className={inputCls} />
                  </Field>
                  <Field label="Mother Phone" error={errors.motherPhone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-white/50 text-sm font-medium">+91</span>
                      <input {...register("motherPhone")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Alternate Phone" error={errors.motherAlternatePhone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-white/50 text-sm font-medium">+91</span>
                      <input {...register("motherAlternatePhone")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Mother Email" error={errors.motherEmail?.message}>
                    <input {...register("motherEmail")} type="email" placeholder="email" className={inputCls} />
                  </Field>
                  <Field label="Occupation" error={errors.motherOccupation?.message}>
                    <input {...register("motherOccupation")} placeholder="Occupation" className={inputCls} />
                  </Field>
                  <Field label="Qualification" error={errors.motherQualification?.message}>
                    <input {...register("motherQualification")} placeholder="Qualification" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-wider mt-2">Emergency Contact</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Field label="Contact Name" error={errors.emergencyContactName?.message}>
                    <input {...register("emergencyContactName")} placeholder="Name" className={inputCls} />
                  </Field>
                  <Field label="Contact Phone" error={errors.emergencyContactPhone?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-white/50 text-sm font-medium">+91</span>
                      <input {...register("emergencyContactPhone")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                  <Field label="Relation" error={errors.emergencyContactRelation?.message}>
                    <input {...register("emergencyContactRelation")} placeholder="e.g. Uncle" className={inputCls} />
                  </Field>
                  <Field label="WhatsApp Number" error={errors.whatsappNumber?.message}>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-white/50 text-sm font-medium">+91</span>
                      <input {...register("whatsappNumber")} placeholder="Phone" className={`${inputCls} pl-10`} />
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 4: Address ─── */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Address Details</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Permanent and current residential address</p>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-green-400/70 uppercase tracking-wider">Current Address</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Address" error={errors.currentAddress?.message} className="lg:col-span-3">
                    <input {...register("currentAddress")} placeholder="Street Address" className={inputCls} />
                  </Field>
                  <Field label="City" error={errors.city?.message}>
                    <input {...register("city")} placeholder="City" className={inputCls} />
                  </Field>
                  <Field label="Pin Code" error={errors.pinCode?.message}>
                    <input {...register("pinCode")} placeholder="PIN" className={inputCls} />
                  </Field>
                  <Field label="State" error={errors.state?.message}>
                    <input {...register("state")} placeholder="State" className={inputCls} />
                  </Field>
                  <Field label="Country" error={errors.country?.message}>
                    <input {...register("country")} placeholder="Country" className={inputCls} />
                  </Field>
                </div>

                <div className="border-t border-white/10 my-4" />
                <div className="flex items-center gap-3">
                  <input {...register("transportRequired")} type="checkbox" id="transport" className="w-4 h-4 accent-violet-500" />
                  <label htmlFor="transport" className="text-xs font-bold text-white/70 flex items-center gap-2">
                    <Bus className="w-4 h-4 text-yellow-400" /> Transport Required
                  </label>
                </div>
                {transportRequired && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                    <Field label="Route" error={errors.transportRouteId?.message}>
                      <select {...register("transportRouteId")} className={selectCls}>
                        <option value="">Select Route</option>
                        <option value="r1">Route 1 - East</option>
                        <option value="r2">Route 2 - West</option>
                      </select>
                    </Field>
                    <Field label="Pickup Stop" error={errors.pickupStop?.message}>
                      <input {...register("pickupStop")} placeholder="Stop name" className={inputCls} />
                    </Field>
                    <Field label="Drop Stop" error={errors.dropStop?.message}>
                      <input {...register("dropStop")} placeholder="Stop name" className={inputCls} />
                    </Field>
                    <Field label="Monthly Fee (₹)" error={errors.transportMonthlyFee?.message}>
                      <input {...register("transportMonthlyFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                    </Field>
                  </div>
                )}
                <div className="border-t border-white/10 my-4" />
                <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-wider">Previous School</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-1">
                  <Field label="School Name" className="lg:col-span-2">
                    <input {...register("previousSchool")} placeholder="Previous School" className={inputCls} />
                  </Field>
                  <Field label="Class">
                    <input {...register("previousClass")} placeholder="e.g. Class 5" className={inputCls} />
                  </Field>
                  <Field label="TC Number">
                    <input {...register("previousTcNumber")} placeholder="TC No" className={inputCls} />
                  </Field>
                  <Field label="Date of Leaving">
                    <input {...register("dateOfLeaving")} type="date" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 5: Financial ─── */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                    <CreditCard className="w-3.5 h-3.5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Financial & Fee Breakdown</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Annual tuition, transport and miscellaneous fees</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Payment Type *" error={errors.paymentType?.message} className="lg:col-span-2">
                    <select {...register("paymentType")} className={selectCls}>
                      <option value="Term-wise">Term-wise (50/25/25)</option>
                      <option value="One-time">One-time (Annual)</option>
                    </select>
                  </Field>
                  <Field label="Tuition Fee *" error={errors.tuitionFee?.message}>
                    <input {...register("tuitionFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Admission Fee" error={errors.admissionFee?.message}>
                    <input {...register("admissionFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Caution Deposit" error={errors.cautionDeposit?.message}>
                    <input {...register("cautionDeposit", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-wider">Fee Components (Optional)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  <Field label="Library" error={errors.libraryFee?.message}>
                    <input {...register("libraryFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Lab" error={errors.labFee?.message}>
                    <input {...register("labFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Sports" error={errors.sportsFee?.message}>
                    <input {...register("sportsFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Development" error={errors.developmentFee?.message}>
                    <input {...register("developmentFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Exam" error={errors.examFee?.message}>
                    <input {...register("examFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mt-2">Discounts</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Discount 1" error={errors.discountId1?.message}>
                    <select {...register("discountId1")} className={selectCls}>
                      <option value="">No Discount</option>
                      <option value="d_scholar">Merit Scholar 25%</option>
                      <option value="d_staff">Staff Ward 50%</option>
                      <option value="d_sibling">Sibling Discount 10%</option>
                    </select>
                  </Field>
                  <Field label="Reason" error={errors.discountReason1?.message} className="sm:col-span-2">
                    <input {...register("discountReason1")} placeholder="Reason" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 6: More Info ─── */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center">
                    <Info className="w-3.5 h-3.5 text-fuchsia-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">More Information</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Health, bank, and systemic details</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Admission Type *" error={errors.admissionType?.message}>
                    <select {...register("admissionType")} className={selectCls}>
                      <option value="New">New Admission</option>
                      <option value="Transfer">Transfer</option>
                    </select>
                  </Field>
                  <Field label="Boarding Type *" error={errors.boardingType?.message}>
                    <select {...register("boardingType")} className={selectCls}>
                      <option value="Day Scholar">Day Scholar</option>
                      <option value="Hostel">Hostel</option>
                    </select>
                  </Field>
                  <Field label="Medical Record" error={errors.medicalConditions?.message} className="lg:col-span-2">
                    <input {...register("medicalConditions")} placeholder="Medical Conditions" className={inputCls} />
                  </Field>
                  <Field label="Allergies" error={errors.allergies?.message}>
                    <input {...register("allergies")} placeholder="Allergies" className={inputCls} />
                  </Field>
                  <Field label="Bank Account" error={errors.bankAccountName?.message} className="lg:col-span-2">
                    <input {...register("bankAccountName")} placeholder="Account Name" className={inputCls} />
                  </Field>
                  <Field label="Account Number" error={errors.bankAccountNumber?.message} className="lg:col-span-2">
                    <input {...register("bankAccountNumber")} placeholder="Account Number" className={inputCls} />
                  </Field>
                  <Field label="IFSC Code" error={errors.bankIfscCode?.message}>
                    <input {...register("bankIfscCode")} placeholder="IFSC" className={inputCls} />
                  </Field>
                  <Field label="Referred By" error={errors.reference?.message} className="lg:col-span-2">
                    <input {...register("reference")} placeholder="Name" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 7: Review ─── */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Final Review</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Verify details before official admission</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="text-[10px] text-violet-400 font-bold uppercase mb-2">Step 1 – Personal</p>
                    <p className="text-xs text-white/70">Verify name, DOB, gender, blood group, Aadhaar.</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="text-[10px] text-blue-400 font-bold uppercase mb-2">Step 2 – Academic</p>
                    <p className="text-xs text-white/70">Check class, section, branch, Academic Year.</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="text-[10px] text-pink-400 font-bold uppercase mb-2">Step 3 – Family</p>
                    <p className="text-xs text-white/70">Verify parent and emergency contact details.</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="text-[10px] text-orange-400 font-bold uppercase mb-2">Step 5 – Financial</p>
                    <p className="text-xs text-white/70">Confirm fee components and discounts (Term 3).</p>
                  </div>
                </div>
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3">
                  <p className="text-xs text-violet-200 font-medium">
                    ✓ By submitting, a Student ID will be generated automatically in the format <span className="font-mono">VR-[BRANCH]-STU-XXXXX</span>. Fees will be split 50/25/25 across terms.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ─── Navigation & Actions ─── */}
        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center bg-[#0a0a1a]/40 sticky bottom-0 z-10 p-4 -mx-6 -mb-6 rounded-b-2xl">
          {formError && (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 text-[10px] animate-shake">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="font-bold">{formError}</span>
            </div>
          )}

          {Object.keys(errors).length > 0 && (
            <div className="flex flex-col gap-1 text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 text-[10px]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="font-bold">Please fix the following errors:</span>
              </div>
              <ul className="list-disc list-inside pl-5 opacity-80">
                {Object.entries(errors).map(([field, err]: [string, any]) => (
                  <li key={field}>{field}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1 || isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </button>

            <div className="flex items-center gap-1 mx-2">
              {steps.map(s => (
                <div key={s.id} className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  currentStep === s.id ? "bg-violet-500 scale-125" : currentStep > s.id ? "bg-emerald-500" : "bg-white/20"
                )} />
              ))}
            </div>

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!!duplicateAadhaar}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-500/20 disabled:opacity-30 disabled:cursor-not-allowed",
                  duplicateAadhaar && "bg-rose-600 hover:bg-rose-600"
                )}
              >
                {duplicateAadhaar ? "Blocked" : "Next"} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !!duplicateAadhaar}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : duplicateAadhaar ? "Aadhaar Found" : "✓ Submit Admission"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
