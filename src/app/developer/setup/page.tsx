"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { initializeSystem, claimSchoolOwnership } from "@/lib/actions/setup-actions";
import { setupSchema, SetupInput } from "@/lib/validations/setup";
import { 
  Building2, 
  User, 
  Calendar,
  ArrowRight,
  ShieldCheck,
  Building,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function DeveloperSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [success, setSuccess] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<SetupInput>({
    resolver: zodResolver(setupSchema),
    mode: "onBlur",
    defaultValues: {
      academicYear: "2025-26",
      academicYearStart: "2025-04-01"
    }
  });

  const onSubmit = async (data: SetupInput) => {
    setIsLoading(true);
    setErrorText("");
    
    const result = await initializeSystem(data);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } else {
      setErrorText(result.error || "Initialization failed");
    }
    
    setIsLoading(false);
  };

  const onLinkClaim = async () => {
    setIsLinking(true);
    setErrorText("");
    const result = await claimSchoolOwnership("VR-SCH01");
    if (result.success) {
      setLinkSuccess(result.message || "Linked Successfully!");
      setTimeout(() => router.push("/dashboard"), 2000);
    } else {
      setErrorText(result.error || "Linkage failed");
    }
    setIsLinking(false);
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[30px] shadow-2xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">System Initialized!</h2>
          <p className="text-slate-500 mb-8">
            The school, active branch, and the owner account have been successfully generated.
          </p>
          <p className="text-sm font-bold text-primary animate-pulse">
            Redirecting to login portal...
          </p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 selection:bg-primary/10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full font-bold text-sm mb-4">
            <ShieldCheck className="w-4 h-4" />
            Developer Access Only
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-3 tracking-tight">System Initialization</h1>
          <p className="text-slate-500 text-lg">Onboard a new school and configure the core administrative environment.</p>
        </div>

        {errorText && (
          <div className="mb-8 p-4 bg-red-50 border-2 border-red-200 text-red-600 rounded-2xl font-bold flex items-center gap-3">
             <ShieldCheck className="w-5 h-5 shrink-0" />
             {errorText}
          </div>
        )}

        {linkSuccess && (
          <div className="mb-8 p-4 bg-green-50 border-2 border-green-200 text-green-600 rounded-2xl font-bold flex items-center gap-3 animate-bounce">
             <CheckCircle2 className="w-5 h-5 shrink-0" />
             {linkSuccess} - Redirecting to Dashboard...
          </div>
        )}

        {/* Quick Link Section */}
        <div className="mb-8 bg-blue-600 p-8 rounded-[30px] shadow-lg text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold italic">Detected 400+ Orphaned Records</h2>
                <p className="text-blue-100 text-sm opacity-90">Your account is currently unlinked. Connect to the existing school core.</p>
              </div>
            </div>
            <button 
              onClick={onLinkClaim}
              disabled={isLinking}
              className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-bold shadow-xl hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {isLinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Building className="w-5 h-5" />}
              Link to existing School (VR-SCH01)
            </button>
          </div>
        </div>

        <div className="relative flex items-center py-5 mb-8">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex- Luna text-slate-400 font-bold px-4 text-xs uppercase tracking-widest">OR INITIALIZE NEW TENANT</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Section 1: School Info */}
          <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">1. School Configuration</h2>
                <p className="text-slate-500 text-sm">Primary details for the new tenant</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">School Name</label>
                <input {...register("schoolName")} className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium", errors.schoolName && "border-red-400")} placeholder="e.g. Virtue High School" />
                {errors.schoolName && <p className="text-xs text-red-500 font-bold">{errors.schoolName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">School Code (3-6 chars)</label>
                <input {...register("schoolCode")} className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium uppercase", errors.schoolCode && "border-red-400")} placeholder="e.g. VHS" />
                {errors.schoolCode && <p className="text-xs text-red-500 font-bold">{errors.schoolCode.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Address</label>
                <input {...register("address")} className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium", errors.address && "border-red-400")} placeholder="Full address" />
                {errors.address && <p className="text-xs text-red-500 font-bold">{errors.address.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Official Phone</label>
                <input {...register("phone")} className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium", errors.phone && "border-red-400")} placeholder="School Phone" />
                {errors.phone && <p className="text-xs text-red-500 font-bold">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Official Email</label>
                <input {...register("email")} type="email" className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium", errors.email && "border-red-400")} placeholder="School Email" />
                {errors.email && <p className="text-xs text-red-500 font-bold">{errors.email.message}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Owner/Partner Info */}
          <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">2. Owner & Super Admin Setup</h2>
                <p className="text-slate-500 text-sm">Creates the first user with full OWNER privileges</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Owner First Name</label>
                <input {...register("ownerFirstName")} className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-purple-500 transition-all font-medium", errors.ownerFirstName && "border-red-400")} placeholder="First Name" />
                {errors.ownerFirstName && <p className="text-xs text-red-500 font-bold">{errors.ownerFirstName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Owner Last Name</label>
                <input {...register("ownerLastName")} className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-purple-500 transition-all font-medium", errors.ownerLastName && "border-red-400")} placeholder="Last Name" />
                {errors.ownerLastName && <p className="text-xs text-red-500 font-bold">{errors.ownerLastName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Admin Email</label>
                <input {...register("ownerEmail")} type="email" className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-purple-500 transition-all font-medium", errors.ownerEmail && "border-red-400")} placeholder="Admin login email" />
                {errors.ownerEmail && <p className="text-xs text-red-500 font-bold">{errors.ownerEmail.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Admin Phone</label>
                <input {...register("ownerPhone")} className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-purple-500 transition-all font-medium", errors.ownerPhone && "border-red-400")} placeholder="Admin Phone" />
                {errors.ownerPhone && <p className="text-xs text-red-500 font-bold">{errors.ownerPhone.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Admin Password</label>
                <input {...register("ownerPassword")} type="password" className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-purple-500 transition-all font-medium", errors.ownerPassword && "border-red-400")} placeholder="Strong password (>8 chars)" />
                {errors.ownerPassword && <p className="text-xs text-red-500 font-bold">{errors.ownerPassword.message}</p>}
              </div>
            </div>
          </div>

          {/* Section 3: Academic Year */}
          <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">3. Academic Calendar</h2>
                <p className="text-slate-500 text-sm">Set up the active academic cycle</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Academic Year</label>
                <input {...register("academicYear")} className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-green-500 transition-all font-medium", errors.academicYear && "border-red-400")} placeholder="2025-26" />
                {errors.academicYear && <p className="text-xs text-red-500 font-bold">{errors.academicYear.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Start Date</label>
                <input {...register("academicYearStart")} type="date" className={cn("w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-green-500 transition-all font-medium text-slate-700", errors.academicYearStart && "border-red-400")} />
                {errors.academicYearStart && <p className="text-xs text-red-500 font-bold">{errors.academicYearStart.message}</p>}
              </div>
            </div>
          </div>

          <button
            disabled={isLoading}
            type="submit"
            className="w-full py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Deploying Tenant...
              </>
            ) : (
              <>
                Initialize System Core
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
