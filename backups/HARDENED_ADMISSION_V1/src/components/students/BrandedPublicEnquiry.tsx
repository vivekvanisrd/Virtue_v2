"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Users, MapPin, School, CheckCircle2, 
  ArrowRight, ArrowLeft, CreditCard, ShieldCheck,
  AlertCircle, Loader2, Sparkles, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { publicEnquirySchema, type PublicEnquiryData } from "@/types/student";
import { publicSubmitEnquiryAction } from "@/lib/actions/student-actions";
import { getPublicPortalMetadata } from "@/lib/actions/reference-actions";
import { createPaymentLinkAction } from "@/lib/actions/payment-actions";
import { checkExistingEnquiryAction } from "@/lib/actions/enquiry-actions";
import { useDebounce } from "@/lib/hooks/use-debounce";

interface BrandedPublicEnquiryProps {
  branchId: string;
}

export function BrandedPublicEnquiry({ branchId }: BrandedPublicEnquiryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [invalidBranch, setInvalidBranch] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [refData, setRefData] = useState<{
    branchName: string;
    schoolName: string;
    schoolId: string;
    classes: any[];
  } | null>(null);

  const [existingRecord, setExistingRecord] = useState<{ id: string, name: string } | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PublicEnquiryData>({
    resolver: zodResolver(publicEnquirySchema) as any,
    defaultValues: {
      branchId: branchId,
      gender: "Male"
    }
  });

  const watchPhone = watch("fatherPhone");
  const debouncedPhone = useDebounce(watchPhone, 800);

  // Force-sync branchCode into the form state on mount
  useEffect(() => {
    if (branchId) {
      setValue("branchId", branchId);
    }
  }, [branchId, setValue]);

  // Smart Redirection: Check for existing records as parent types
  useEffect(() => {
    if (debouncedPhone?.length >= 10 && refData?.schoolId) {
        const check = async () => {
            const res = await checkExistingEnquiryAction(debouncedPhone, refData.schoolId);
            if (res.success && res.exists) {
                setExistingRecord({ id: res.enquiryId!, name: res.studentName! });
            } else {
                setExistingRecord(null);
            }
        }
        check();
    } else {
        setExistingRecord(null);
    }
  }, [debouncedPhone, refData?.schoolId]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await getPublicPortalMetadata(branchId);
        if (res.success && res.data) {
          setRefData(res.data);
          setInvalidBranch(false);
        } else {
          setInvalidBranch(true);
        }
      } catch (e) {
        setInvalidBranch(true);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [branchId]);

  const onSubmit = async (data: PublicEnquiryData) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await publicSubmitEnquiryAction(data);
      if (res.success && res.data) {
        setSubmitted(true);
        setStudentId(res.data.id);
        setStudentName(`${data.firstName} ${data.lastName}`);
      } else {
        setFormError(res.error || "Submission failed. Please check form data.");
      }
    } catch (err) {
      setFormError("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    // Logic removed. Management Review is now mandatory before payment.
    alert("Please wait for management's approval link on WhatsApp.");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Waking up Portal Engine...</p>
        </div>
      </div>
    );
  }

  if (invalidBranch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white rounded-[40px] p-12 shadow-2xl border border-slate-100 text-center"
        >
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Portal Disabled</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            The admission portal for branch <span className="font-bold text-rose-500">"{branchId}"</span> is currently unconfigured or disabled in the system.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Please contact the school office.
          </div>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[40px] p-12 shadow-2xl border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Application Received!</h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed">
            Your admission enquiry for <span className="font-bold text-slate-900">{studentName}</span> has been successfully submitted to <span className="font-bold text-slate-900">{refData?.branchName}</span>.
          </p>
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 mb-10 text-left">
            <h3 className="text-indigo-900 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Next Steps
            </h3>
            <ul className="space-y-4">
                <li className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                    <p className="text-sm font-medium text-slate-600 leading-tight">School Management will review the academic details provided.</p>
                </li>
                <li className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                    <p className="text-sm font-medium text-slate-600 leading-tight">Once verified, we will share the <b>Review & Pay Portal</b> link on your registered phone number.</p>
                </li>
                <li className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 text-black">3</div>
                    <p className="text-sm font-medium text-slate-600 leading-tight italic">You may then finalize the admission and secure the seat.</p>
                </li>
            </ul>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full h-16 rounded-2xl bg-slate-950 text-white text-lg px-8 font-bold shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
          >
            Finished, Close Portal
          </button>
          
          <div className="mt-12 pt-12 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" /> SECURE ENROLLMENT SYSTEM
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <header className="mb-12 text-center">
        <div className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4">
          Online Admission Portal
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
          {refData?.schoolName || "Loading School..." }
        </h1>
        <p className="text-slate-500 font-bold text-sm uppercase tracking-wide">
          Official Registration Portal &bull; {refData?.branchName || "Main Branch" }
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white rounded-[32px] p-8 lg:p-12 shadow-xl border border-slate-50 relative overflow-hidden">
             <input type="hidden" {...register("branchId")} value={branchId} />
             
             {/* ─── Simplified Public Form Fields ─── */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Student Identity</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-tight">First Name *</label>
                            <input {...register("firstName")} placeholder="First name" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" />
                            {errors.firstName && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.firstName.message}</p>}
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-tight">Last Name *</label>
                            <input {...register("lastName")} placeholder="Last name" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" />
                            {errors.lastName && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.lastName.message}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-tight">Enquiring for Class *</label>
                        <select {...register("classId")} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20">
                            <option value="">Select a Class</option>
                            {refData?.classes?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.classId && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.classId.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-tight">Date of Birth</label>
                            <input {...register("dateOfBirth")} type="date" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-tight">Gender *</label>
                            <select {...register("gender")} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-tight">Student Aadhaar Number (Optional)</label>
                        <input {...register("aadhaarNumber")} placeholder="XXXX XXXX XXXX" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" />
                        {errors.aadhaarNumber && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.aadhaarNumber.message}</p>}
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Parent Details</p>
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-tight">Father's Full Name *</label>
                        <input {...register("fatherName")} placeholder="Father's full name" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" />
                        {errors.fatherName && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.fatherName.message}</p>}
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-tight">Primary Phone Number *</label>
                        <input {...register("fatherPhone")} placeholder="10 Digit Phone" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" />
                        {errors.fatherPhone && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.fatherPhone.message}</p>}
                        
                        {/* Redirection Alert */}
                        <AnimatePresence>
                            {existingRecord && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-4 p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 border border-white/10"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white text-xs font-black uppercase tracking-tight mb-1">Found Your Application!</p>
                                            <p className="text-indigo-100 text-[10px] mb-3 leading-tight font-medium">We found a previous record for <b>{existingRecord.name}</b>. You don't need to fill this form again.</p>
                                            <button 
                                                type="button"
                                                onClick={() => window.location.href = `/public/admission/pay/${existingRecord.id}`}
                                                className="w-full bg-white text-indigo-600 font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-lg"
                                            >
                                                Go to Payment Portal <ArrowRight className="inline-block w-3 h-3 ml-1" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-tight">Contact Email</label>
                        <input {...register("fatherEmail")} type="email" placeholder="email@example.com" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" />
                        {errors.fatherEmail && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.fatherEmail.message}</p>}
                    </div>
                </div>
             </div>

             {Object.keys(errors).length > 0 && (
                <div className="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 text-[10px] font-black">!</div>
                    <div>
                        <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Incomplete Form</p>
                        <p className="text-[11px] text-rose-500">Please provide all mandatory fields marked with an asterisk (*).</p>
                    </div>
                </div>
             )}

             <div className="mt-8 pt-8 border-t border-slate-50 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                   <p className="text-xs font-bold text-slate-900 mb-1">Data Privacy Notice</p>
                   <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
                      By submitting this form, you certify that the information provided is correct. This registration is provisional and subject to verification of Aadhaar and other documents by the school administration.
                   </p>
                </div>
             </div>
        </div>
        
        {formError && (
            <p className="bg-rose-50 text-rose-500 px-6 py-4 rounded-2xl border border-rose-100 text-sm font-bold animate-shake">
                ⚠️ Error: {formError}
            </p>
        )}

        <div className="flex justify-end pt-4">
            <button 
                type="submit" 
                disabled={isSubmitting} 
                className="h-16 px-16 rounded-[24px] bg-primary text-white font-black text-lg shadow-2xl shadow-primary/30 hover:scale-105 transition-all active:scale-95 flex items-center justify-center"
            >
               {isSubmitting ? "Processing Application..." : "Submit & Continue"} <ArrowRight className="ml-2 w-6 h-6" />
            </button>
        </div>
      </form>

      <footer className="mt-20 text-center pb-12">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Powered by PaVa-EDUX Education Platform</p>
          <div className="flex justify-center gap-6 opacity-30 h-8">
             <School className="w-5 h-5 text-slate-400" />
          </div>
      </footer>
    </div>
  );
}
