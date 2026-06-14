"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DefaultValues } from "react-hook-form";
import { submitEnquiryAction } from "@/lib/actions/enquiry-actions";
import { User, Phone, Mail, School, CheckCircle2, ChevronRight, Loader2, Users, Sparkles } from "lucide-react";
import { globalPhoneSchema, globalEmailSchema } from "@/lib/utils/validations";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useOptionalTenant } from "@/context/tenant-context";

const inputCls = "w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-foreground opacity-30 focus:outline-none focus:border-primary focus:bg-muted transition-all";

const enquirySchema = z.object({
  studentFirstName: z.string().min(1, "First Name required"),
  studentLastName: z.string().optional(),
  requestedClass: z.string().min(1, "Grade required"),
  previousSchool: z.string().optional(),
  parentName: z.string().min(1, "Parent Name required"),
  parentPhone: globalPhoneSchema,
  parentEmail: globalEmailSchema.optional().or(z.literal("")),
  notes: z.string().optional(),
  referredBy: z.string().optional(),
  referrerPhone: globalPhoneSchema.optional().or(z.literal("")),
});

type EnquiryFormData = z.infer<typeof enquirySchema>;

export function EnquiryForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<EnquiryFormData>({
    resolver: zodResolver(enquirySchema),
    mode: "onBlur",
    defaultValues: {
      requestedClass: ""
    }
  });

  const { register, handleSubmit, formState: { errors }, reset } = form;

  const { hasDraft, restoreDraft, clearDraft, draftData } = useFormDraft(
    form,
    "virtue_admission_enquiry_draft"
  );

  const context = useOptionalTenant();
  const schoolId = context?.schoolId || "VGA-MNB01";
  const academicYear = context?.academicYear || "2026-27";

  const onSubmit = async (data: EnquiryFormData) => {
    setLoading(true);
    setServerError(null);

    const submitData = {
      schoolId: schoolId,
      ...data,
      parentPhone: data.parentPhone || "",
      academicYear: academicYear || "2026-27"
    };

    const result = await submitEnquiryAction(submitData);
    
    if (result.success) {
      setSuccess(true);
      clearDraft();
    } else {
      setServerError(result.error || "Failed to submit enquiry.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-emerald-500/30 rounded-3xl p-8 text-center max-w-md mx-auto shadow-2xl shadow-emerald-500/10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full point-events-none" />
        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Enquiry Received!</h2>
        <p className="text-foreground opacity-60 text-sm leading-relaxed mb-6 font-medium">
          Thank you for showing interest in PaVa-EDUX. Our admissions team will review your details and contact you shortly.
        </p>
        <button 
          onClick={() => setSuccess(false)}
          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-white/10"
        >
          Submit Another
        </button>
      </motion.div>
    );
  }

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit(onSubmit)}
      className="bg-background/80 backdrop-blur-xl border border-border rounded-[32px] p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="mb-8 border-b border-white/10 pb-6">
        <h2 className="text-3xl font-black text-white tracking-tight mb-2">Admissions Enquiry</h2>
        <p className="text-foreground opacity-60 font-medium text-sm">Fill out the form below to register your interest for the upcoming 2026-27 academic year.</p>
      </div>

      <AnimatePresence>
        {hasDraft && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl bg-violet-950/40 border border-violet-500/20 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Unsaved Progress Detected</h4>
                  <p className="text-xs text-zinc-400">We found a draft from your last session. Would you like to restore it?</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button 
                  type="button" 
                  onClick={clearDraft}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Start Fresh
                </button>
                <button 
                  type="button" 
                  onClick={restoreDraft}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2 text-xs rounded-xl shadow-lg shadow-violet-600/20 active:scale-95 transition-all"
                >
                  Restore Draft
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {serverError && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-6 text-sm font-bold"
          >
            {serverError}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 relative z-10">
        {/* Child Details */}
        <div>
          <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> Student Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1"><input {...register("studentFirstName")} placeholder="First Name *" className={inputCls} />{errors.studentFirstName && <span className="text-[10px] text-rose-400 font-bold px-1">{errors.studentFirstName.message}</span>}</div>
            <div className="flex flex-col gap-1"><input {...register("studentLastName")} placeholder="Last Name" className={inputCls} /></div>
            <div className="flex flex-col gap-1"><select {...register("requestedClass")} className={inputCls} defaultValue="">
              <option value="" disabled>Grade Applying For *</option>
              {[
                "Play Group", "Nursery", "LKG", "UKG", "1st Grade", "2nd Grade", 
                "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", 
                "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade"
              ].map(c => (
                <option key={c} value={c} className="text-black">{c}</option>
              ))}
            </select>{errors.requestedClass && <span className="text-[10px] text-rose-400 font-bold px-1">{errors.requestedClass.message}</span>}</div>
            <div className="flex flex-col gap-1"><input {...register("previousSchool")} placeholder="Previous School (Optional)" className={inputCls} /></div>
          </div>
        </div>

        <div className="border-t border-white/10" />

        {/* Parent Details */}
        <div>
          <h3 className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" /> Parent/Guardian Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1"><input {...register("parentName")} placeholder="Full Name *" className={inputCls} />{errors.parentName && <span className="text-[10px] text-rose-400 font-bold px-1">{errors.parentName.message}</span>}</div>
            <div className="flex flex-col gap-1">
              <div className="relative flex items-center">
                <span className="absolute left-4 text-white/50 text-sm font-medium">+91</span>
                <input 
                  {...register("parentPhone")} 
                  type="tel" 
                  placeholder="Phone Number *" 
                  className={`${inputCls} pl-12`} 
                  onInput={(e: any) => {
                    e.target.value = e.target.value.replace(/[^\d]/g, "");
                  }}
                />
              </div>
              {errors.parentPhone && <span className="text-[10px] text-rose-400 font-bold px-1">{errors.parentPhone.message}</span>}
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2"><input {...register("parentEmail")} type="email" placeholder="Email Address" className={inputCls} />{errors.parentEmail && <span className="text-[10px] text-rose-400 font-bold px-1">{errors.parentEmail.message}</span>}</div>
          </div>
        </div>

        <div className="border-t border-white/10" />

        {/* Additional Info */}
        <div>
          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <School className="w-3.5 h-3.5" /> Additional Information
          </h3>
          <textarea 
            {...register("notes")} 
            placeholder="Any specific questions or requirements?" 
            rows={3} 
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="border-t border-white/10" />

        {/* References */}
        <div>
          <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Reference Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1"><input {...register("referredBy")} placeholder="Referrer Name (Optional)" className={inputCls} /></div>
            <div className="flex flex-col gap-1">
              <div className="relative flex items-center">
                <span className="absolute left-4 text-white/50 text-sm font-medium">+91</span>
                <input 
                  {...register("referrerPhone")} 
                  type="tel" 
                  placeholder="Referrer Phone (Optional)" 
                  className={`${inputCls} pl-12`} 
                  onInput={(e: any) => {
                    e.target.value = e.target.value.replace(/[^\d]/g, "");
                  }}
                />
              </div>
              {errors.referrerPhone && <span className="text-[10px] text-rose-400 font-bold px-1">{errors.referrerPhone.message}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {(form.formState.isDirty || draftData) && (
            <button 
              type="button" 
              onClick={clearDraft}
              className="sm:w-1/3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-sm py-4 rounded-xl transition-all border border-rose-500/20 flex items-center justify-center gap-2"
            >
              Reset Form
            </button>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className={`${(form.formState.isDirty || draftData) ? "sm:w-2/3" : "w-full"} bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white font-black text-sm py-4 rounded-xl transition-all shadow-xl shadow-fuchsia-500/20 flex items-center justify-center gap-2 disabled:opacity-50 group`}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <>Submit Enquiry Request <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </div>
      </div>
    </motion.form>
  );
}
