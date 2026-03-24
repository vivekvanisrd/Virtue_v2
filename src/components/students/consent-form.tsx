"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitConsentAction } from "@/lib/actions/consent-actions";
import { User, Phone, MapPin, CheckCircle2, Shield, Loader2, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { globalPhoneSchema } from "@/lib/utils/validations";

interface ConsentFormProps {
  token: string;
  consentData: any;
}

const inputCls = "w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-foreground opacity-30 focus:outline-none focus:border-primary focus:bg-muted transition-all text-sm font-medium";

const consentSchema = z.object({
  updatedPhone: globalPhoneSchema,
  updatedAddress: z.string().min(5, "Address must be at least 5 characters"),
  consentCheckbox: z.boolean().refine(val => val === true, "You must agree to continue"),
});
type ConsentFormData = z.infer<typeof consentSchema>;

export function ConsentForm({ token, consentData }: ConsentFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isAlreadySubmitted = consentData.consentStatus !== "Pending";

  const { register, handleSubmit, formState: { errors } } = useForm<ConsentFormData>({
    resolver: zodResolver(consentSchema),
    mode: "onBlur",
    defaultValues: {
      updatedPhone: consentData.student?.family?.fatherPhone || "",
      updatedAddress: consentData.student?.address?.currentAddress || "",
    }
  });

  const onSubmit = async (data: ConsentFormData) => {
    setLoading(true);
    setServerError(null);

    const submitData = {
      updatedPhone: data.updatedPhone,
      updatedAddress: data.updatedAddress,
      consentStatus: "Confirmed" as const
    };

    const result = await submitConsentAction(token, submitData);
    
    if (result.success) {
      setSuccess(true);
    } else {
      setServerError(result.error || "Failed to submit consent.");
    }
    setLoading(false);
  };

  if (isAlreadySubmitted || success) {
    const status = success ? "Confirmed" : consentData.consentStatus;
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-emerald-500/30 rounded-3xl p-8 text-center max-w-md mx-auto shadow-2xl shadow-emerald-500/10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black text-foreground mb-2 tracking-tight relative z-10">Consent Registered</h2>
        <p className="text-foreground opacity-60 text-sm leading-relaxed mb-6 font-medium relative z-10">
          Your consent for the upcoming academic year ({consentData.academicYear?.year}) has been securely recorded. Thank you for continuing your journey with Virtue Modern School.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider relative z-10">
          Status: {status}
        </div>
      </motion.div>
    );
  }

  const stu = consentData.student;

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit(onSubmit)}
      className="bg-background/80 backdrop-blur-xl border border-border rounded-[32px] p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="mb-8 border-b border-white/10 pb-6 relative z-10 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight mb-1">Student Re-admission Consent</h2>
          <p className="text-foreground opacity-60 font-medium text-sm">Please verify the existing details and confirm admission for {consentData.academicYear?.year}.</p>
        </div>
      </div>

      <AnimatePresence>
        {serverError && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-6 text-sm font-bold relative z-10"
          >
            {serverError}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 relative z-10">
        {/* Existing Data Display */}
        <div className="bg-muted border border-border rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-50 mb-1 block flex items-center gap-1.5">
                <User className="w-3 h-3 text-blue-400" /> Student Name
              </span>
              <p className="text-sm font-bold text-foreground">{stu.firstName} {stu.lastName}</p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-50 mb-1 block flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-indigo-400" /> Current Class
              </span>
              <p className="text-sm font-bold text-foreground">{stu.academic?.classId || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Update Fields */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-4">Would you like to update your contact info?</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-50 mb-2 block flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-emerald-400" /> Primary Phone Number
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-white/50 text-sm font-medium">+91</span>
                <input 
                  {...register("updatedPhone")}
                  className={`${inputCls} pl-12`} 
                />
              </div>
              {errors.updatedPhone && <p className="text-[10px] text-rose-400 font-bold mt-1 px-1">{errors.updatedPhone.message}</p>}
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground opacity-50 mb-2 block flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-rose-400" /> Current Residential Address
              </label>
              <textarea 
                {...register("updatedAddress")}
                className={`${inputCls} resize-none`} 
                rows={2}
              />
              {errors.updatedAddress && <p className="text-[10px] text-rose-400 font-bold mt-1 px-1">{errors.updatedAddress.message}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 mt-2">
          <label className="flex items-start gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors">
            <input type="checkbox" {...register("consentCheckbox")} className="mt-1 w-5 h-5 rounded border-blue-500/50 bg-blue-500/20 text-blue-500 focus:ring-blue-500/50" />
            <span className="text-sm font-bold text-blue-100 leading-snug">
              I officially consent to continue the admission for {stu.firstName} {stu.lastName} for the {consentData.academicYear?.year} academic session, and agree to the latest fee structures and school policies.
            </span>
          </label>
          {errors.consentCheckbox && <p className="text-[10px] text-rose-400 font-bold mt-2 px-1 text-center">{errors.consentCheckbox.message}</p>}
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-foreground font-black text-sm py-4 rounded-xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
          ) : (
            <>Confirm Re-admission Consent</>
          )}
        </button>
      </div>
    </motion.form>
  );
}
