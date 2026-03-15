"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Users, CreditCard, CheckCircle2, ArrowRight, ArrowLeft,
  MapPin, Bus, School, Heart, Building, Info, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { studentAdmissionSchema, type StudentAdmissionData } from "@/types/student";
import { submitAdmissionAction } from "@/lib/actions/student-actions";
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
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-[11px] font-black text-white/80 uppercase tracking-widest">{label}</label>
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

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<StudentAdmissionData>({
    resolver: zodResolver(studentAdmissionSchema) as any,
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

  const nextStep = () => setCurrentStep(p => Math.min(p + 1, steps.length));
  const prevStep = () => setCurrentStep(p => Math.max(p - 1, 1));
  const transportRequired = watch("transportRequired");

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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="First Name *" className="lg:col-span-2">
                    <input {...register("firstName")} placeholder="First Name" className={inputCls} />
                  </Field>
                  <Field label="Middle Name">
                    <input {...register("middleName")} placeholder="Middle" className={inputCls} />
                  </Field>
                  <Field label="Last Name *" className="lg:col-span-2">
                    <input {...register("lastName")} placeholder="Last Name" className={inputCls} />
                  </Field>
                  <Field label="Date of Birth">
                    <input {...register("dateOfBirth")} type="date" className={inputCls} />
                  </Field>
                  <Field label="Gender">
                    <select {...register("gender")} className={selectCls}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>
                  <Field label="Blood Group">
                    <select {...register("bloodGroup")} className={selectCls}>
                      <option value="">Select</option>
                      {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Category">
                    <select {...register("category")} className={selectCls}>
                      <option value="">Select</option>
                      {["General","OBC","SC","ST","EWS"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Phone">
                    <input {...register("phone")} placeholder="+91 XXXXX" className={inputCls} />
                  </Field>
                  <Field label="Email" className="lg:col-span-2">
                    <input {...register("email")} type="email" placeholder="student@email.com" className={inputCls} />
                  </Field>
                  <Field label="Aadhaar Number">
                    <input {...register("aadhaarNumber")} placeholder="XXXX XXXX XXXX" className={inputCls} />
                  </Field>
                  <Field label="USN / SRN Number">
                    <input {...register("usnSrnNumber")} placeholder="USN" className={inputCls} />
                  </Field>
                  <Field label="Mother Tongue">
                    <input {...register("motherTongue")} placeholder="e.g. Telugu" className={inputCls} />
                  </Field>
                  <Field label="Place of Birth">
                    <input {...register("placeOfBirth")} placeholder="City" className={inputCls} />
                  </Field>
                  <Field label="Birth Certificate No">
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
                  <Field label="Admission Date *">
                    <input {...register("admissionDate")} type="date" className={inputCls} />
                  </Field>
                  <Field label="Academic Year *">
                    <select {...register("academicYearId")} className={selectCls}>
                      <option value="">Select Year</option>
                      <option value="ay_2025">2025-26</option>
                      <option value="ay_2024">2024-25</option>
                    </select>
                  </Field>
                  <Field label="Branch *">
                    <select {...register("branchId")} className={selectCls}>
                      <option value="">Select Branch</option>
                      <option value="VR-MNB01">Main Branch</option>
                    </select>
                  </Field>
                  <Field label="Class *">
                    <select {...register("classId")} className={selectCls}>
                      <option value="">Select Class</option>
                      {Array.from({length: 12}, (_, i) => (
                        <option key={i+1} value={`cls_${i+1}`}>Class {i+1}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Section">
                    <select {...register("sectionId")} className={selectCls}>
                      <option value="">Select Section</option>
                      {["A","B","C","D"].map(s => <option key={s} value={`sec_${s}`}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Roll Number">
                    <input {...register("rollNumber")} placeholder="Roll No" className={inputCls} />
                  </Field>
                  <Field label="Fee Schedule">
                    <select {...register("feeScheduleId")} className={selectCls}>
                      <option value="">Select Schedule</option>
                      <option value="fs_std">Standard</option>
                    </select>
                  </Field>
                  <Field label="PEN Number">
                    <input {...register("penNumber")} placeholder="PEN" className={inputCls} />
                  </Field>
                  <Field label="Apaar ID">
                    <input {...register("apaarId")} placeholder="Apaar ID" className={inputCls} />
                  </Field>
                  <Field label="Samagra ID">
                    <input {...register("samagraId")} placeholder="Samagra" className={inputCls} />
                  </Field>
                  <Field label="STS / SATS ID">
                    <input {...register("stsId")} placeholder="STS ID" className={inputCls} />
                  </Field>
                  <Field label="Biometric ID">
                    <input {...register("biometricId")} placeholder="Bio ID" className={inputCls} />
                  </Field>
                  <Field label="TC Number">
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
                  <Field label="Father Name" className="lg:col-span-2">
                    <input {...register("fatherName")} placeholder="Full Name" className={inputCls} />
                  </Field>
                  <Field label="Father Phone">
                    <input {...register("fatherPhone")} placeholder="+91" className={inputCls} />
                  </Field>
                  <Field label="Alternate Phone">
                    <input {...register("fatherAlternatePhone")} placeholder="+91" className={inputCls} />
                  </Field>
                  <Field label="Father Email">
                    <input {...register("fatherEmail")} type="email" placeholder="email" className={inputCls} />
                  </Field>
                  <Field label="Occupation">
                    <input {...register("fatherOccupation")} placeholder="Occupation" className={inputCls} />
                  </Field>
                  <Field label="Qualification">
                    <input {...register("fatherQualification")} placeholder="Qualification" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-pink-400/70 uppercase tracking-wider mt-2">Mother</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Mother Name" className="lg:col-span-2">
                    <input {...register("motherName")} placeholder="Full Name" className={inputCls} />
                  </Field>
                  <Field label="Mother Phone">
                    <input {...register("motherPhone")} placeholder="+91" className={inputCls} />
                  </Field>
                  <Field label="Alternate Phone">
                    <input {...register("motherAlternatePhone")} placeholder="+91" className={inputCls} />
                  </Field>
                  <Field label="Mother Email">
                    <input {...register("motherEmail")} type="email" placeholder="email" className={inputCls} />
                  </Field>
                  <Field label="Occupation">
                    <input {...register("motherOccupation")} placeholder="Occupation" className={inputCls} />
                  </Field>
                  <Field label="Qualification">
                    <input {...register("motherQualification")} placeholder="Qualification" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-wider mt-2">Emergency Contact</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Field label="Contact Name">
                    <input {...register("emergencyContactName")} placeholder="Name" className={inputCls} />
                  </Field>
                  <Field label="Contact Phone">
                    <input {...register("emergencyContactPhone")} placeholder="+91" className={inputCls} />
                  </Field>
                  <Field label="Relation">
                    <input {...register("emergencyContactRelation")} placeholder="e.g. Uncle" className={inputCls} />
                  </Field>
                  <Field label="WhatsApp Number">
                    <input {...register("whatsappNumber")} placeholder="+91" className={inputCls} />
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
                  <Field label="Address" className="lg:col-span-3">
                    <input {...register("currentAddress")} placeholder="Street Address" className={inputCls} />
                  </Field>
                  <Field label="City">
                    <input {...register("city")} placeholder="City" className={inputCls} />
                  </Field>
                  <Field label="Pin Code">
                    <input {...register("pinCode")} placeholder="PIN" className={inputCls} />
                  </Field>
                  <Field label="State">
                    <input {...register("state")} placeholder="State" className={inputCls} />
                  </Field>
                  <Field label="Country">
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
                    <Field label="Route">
                      <select {...register("transportRouteId")} className={selectCls}>
                        <option value="">Select Route</option>
                        <option value="r1">Route 1 - East</option>
                        <option value="r2">Route 2 - West</option>
                      </select>
                    </Field>
                    <Field label="Pickup Stop">
                      <input {...register("pickupStop")} placeholder="Stop name" className={inputCls} />
                    </Field>
                    <Field label="Drop Stop">
                      <input {...register("dropStop")} placeholder="Stop name" className={inputCls} />
                    </Field>
                    <Field label="Monthly Fee (₹)">
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
                {/* ... existing financial content exactly as it was ... */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                    <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Financial & Fee Components</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Annual tuition, transport and miscellaneous fees</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Payment Type" className="lg:col-span-2">
                    <select {...register("paymentType")} className={selectCls}>
                      <option value="Term-wise">Term-wise (50/25/25)</option>
                      <option value="One-time">One-time (Annual)</option>
                    </select>
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-wider">Fee Components</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Field label="Tuition Fee (₹)">
                    <input {...register("tuitionFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Admission Fee (₹)">
                    <input {...register("admissionFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Library Fee (₹)">
                    <input {...register("libraryFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Lab Fee (₹)">
                    <input {...register("labFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Sports Fee (₹)">
                    <input {...register("sportsFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Development Fee (₹)">
                    <input {...register("developmentFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Exam Fee (₹)">
                    <input {...register("examFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Computer Fee (₹)">
                    <input {...register("computerFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Miscellaneous (₹)">
                    <input {...register("miscellaneousFee", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Caution Deposit (₹)">
                    <input {...register("cautionDeposit", { valueAsNumber: true })} type="number" placeholder="0" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mt-2">Discounts (Applied to Term 3)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Discount 1 Type">
                    <select {...register("discountId1")} className={selectCls}>
                      <option value="">No Discount</option>
                      <option value="d_scholar">Merit Scholar 25%</option>
                      <option value="d_staff">Staff Ward 50%</option>
                      <option value="d_sibling">Sibling Discount 10%</option>
                    </select>
                  </Field>
                  <Field label="Reason">
                    <input {...register("discountReason1")} placeholder="Reason" className={inputCls} />
                  </Field>
                  <Field label="Discount 2 Type">
                    <select {...register("discountId2")} className={selectCls}>
                      <option value="">No Discount</option>
                      <option value="d_scholar">Merit Scholar 25%</option>
                      <option value="d_staff">Staff Ward 50%</option>
                      <option value="d_sibling">Sibling Discount 10%</option>
                    </select>
                  </Field>
                  <Field label="Reason">
                    <input {...register("discountReason2")} placeholder="Reason" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* ─── STEP 6: More Details ─── */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Other Information</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Admission and boarding preferences</p>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider">
                  <Heart className="w-3 h-3 inline mr-1" />Medical Record
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Field label="Medical Conditions" className="lg:col-span-2">
                    <input {...register("medicalConditions")} placeholder="e.g. Asthma" className={inputCls} />
                  </Field>
                  <Field label="Allergies" className="lg:col-span-2">
                    <input {...register("allergies")} placeholder="e.g. Peanuts" className={inputCls} />
                  </Field>
                  <Field label="Doctor Name">
                    <input {...register("doctorName")} placeholder="Dr. Name" className={inputCls} />
                  </Field>
                  <Field label="Doctor Phone">
                    <input {...register("doctorPhone")} placeholder="+91" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-blue-400/70 uppercase tracking-wider mt-2">
                  <Building className="w-3 h-3 inline mr-1" />Bank Details
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Account Holder Name" className="sm:col-span-2">
                    <input {...register("bankAccountName")} placeholder="Name on account" className={inputCls} />
                  </Field>
                  <Field label="Account Number">
                    <input {...register("bankAccountNumber")} placeholder="XXXXXXXXXXXXXX" className={inputCls} />
                  </Field>
                  <Field label="IFSC Code">
                    <input {...register("bankIfscCode")} placeholder="IFSC" className={inputCls} />
                  </Field>
                  <Field label="Bank Branch">
                    <input {...register("bankBranch")} placeholder="Branch" className={inputCls} />
                  </Field>
                </div>
                <p className="text-[10px] font-bold text-slate-400/70 uppercase tracking-wider mt-2">Other Info</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Admission Type">
                    <select {...register("admissionType")} className={selectCls}>
                      <option value="New">New Admission</option>
                      <option value="Transfer">Transfer</option>
                      <option value="Lateral">Lateral Entry</option>
                    </select>
                  </Field>
                  <Field label="Boarding Type">
                    <select {...register("boardingType")} className={selectCls}>
                      <option value="Day Scholar">Day Scholar</option>
                      <option value="Hostel">Hostel</option>
                    </select>
                  </Field>
                  <Field label="Reference" className="sm:col-span-2">
                    <input {...register("reference")} placeholder="How did they find us?" className={inputCls} />
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
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-500/20"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "✓ Submit Admission"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
