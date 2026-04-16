"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { initializeSystem } from "@/lib/actions/setup-actions";
import { setupSchema } from "@/lib/validations/setup";
import { 
  Building2, 
  User, 
  Calendar,
  ShieldCheck,
  Building,
  Loader2,
  CheckCircle2,
  Zap,
  ChevronRight,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SovereignSidebar } from "@/components/setup/SovereignSidebar";

// 🧬 PaVa-EDUX Setup Page — no PaVa-ID generator needed (schoolCode is the canonical ID)

export default function DeveloperSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");

  const router = useRouter();

  const { register, handleSubmit, watch, setValue, formState: { errors, isValid } } = useForm<any>({
    resolver: zodResolver(setupSchema),
    mode: "all",
    defaultValues: {
      academicYear: "2026-27",
      academicYearStart: "2026-04-01"
    }
  });

  const formValues = watch();

  // 🧬 Auto-Suggest Short Code based on School Name
  useEffect(() => {
    if (formValues.schoolName && !formValues.schoolCode) {
      const words = formValues.schoolName.split(" ").filter((w: string) => w.length > 0);
      let suggestedCode = "";
      
      if (words.length > 1) {
        suggestedCode = words.map((word: string) => word[0]).join("");
      } else {
        suggestedCode = words[0].slice(0, 6);
      }
      
      setValue("schoolCode", suggestedCode.toUpperCase().replace(/[^A-Z0-9]/g, ""), { shouldValidate: true });
    }
  }, [formValues.schoolName, setValue]);

  // 🕵️ Intersection Observer for Section Highlighting
  useEffect(() => {
    const observerOptions = { root: null, rootMargin: "-20% 0px -70% 0px", threshold: 0 };
    const handleIntersect = (entries: IntersectionObserverEntry[]) => { entries.forEach(entry => { if (entry.isIntersecting) setActiveSection(entry.target.id); }); };
    const observer = new IntersectionObserver(handleIntersect, observerOptions);
    ["basic", "compliance", "regional", "academic", "finalize"].forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    const result = await initializeSystem(data);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } else {
      alert(result.error);
    }
    setIsLoading(false);
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[40px] shadow-2xl max-w-md w-full text-center border border-slate-100 italic">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">PAVA-EDUX Genesis Active</h2>
          <p className="text-slate-500 leading-relaxed mb-8">Institutional node has been successfully committed to the Sovereign Registry.</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="h-screen bg-slate-50 flex overflow-hidden">
      
      {/* 🏛️ Left Sovereign Rail (Indigo Canvas) */}
      <div className="w-full max-w-[420px] h-full shadow-2xl z-20">
        <SovereignSidebar 
           activeSection={activeSection}
           shortCode={formValues.schoolCode || ""}
        />
      </div>

      {/* 📊 Right Power Hub Canvas (Dense Dashboard) */}
      <div className="flex-1 h-full overflow-y-auto bg-white relative">
        
        {/* Top Sticky Hub Header */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-16 py-8 flex justify-between items-center border-b border-slate-100">
           <div>
             <h2 className="text-[10px] font-black text-[#4F46E5] uppercase tracking-widest leading-none mb-1">PAVA-EDUX Node Deployment</h2>
             <p className="text-sm font-bold text-slate-800">2026-27 Phase 1 Instantiation</p>
           </div>
           <button className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
           </button>
        </div>

        <div className="max-w-4xl mx-auto px-16 py-20 space-y-20">
          
          {/* Section: BASIC IDENTITY */}
          <section id="basic" className="space-y-12">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full School Name</label>
               <input 
                 {...register("schoolName")} 
                 className={cn("w-full px-8 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-black text-slate-800 text-lg", errors.schoolName && "border-red-400")} 
                 placeholder="e.g. Durga International" 
               />
               {errors.schoolName && <p className="text-xs text-red-500 font-bold">{errors.schoolName.message?.toString()}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Short Code (Immutable)</label>
                 <input 
                   {...register("schoolCode")} 
                   className="w-full px-8 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-black text-slate-800 uppercase text-lg" 
                   placeholder="e.g. DURGA" 
                 />
                 {errors.schoolCode && <p className="text-xs text-red-500 font-bold ml-1">{errors.schoolCode.message?.toString()}</p>}
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Status</label>
                 <div className="w-full px-8 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-2xl font-black text-slate-800 text-lg">
                    ACTIVE
                 </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
                <input {...register("email")} className={cn("w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-xl outline-none focus:border-primary transition-all font-bold", errors.email && "border-red-400")} />
                {errors.email && <p className="text-xs text-red-500 font-bold ml-1">{errors.email.message?.toString()}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Contact</label>
                <input {...register("phone")} className={cn("w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-xl outline-none focus:border-primary transition-all font-bold", errors.phone && "border-red-400")} />
                {errors.phone && <p className="text-xs text-red-500 font-bold ml-1">{errors.phone.message?.toString()}</p>}
              </div>
            </div>
          </section>

          {/* Section: COMPLIANCE LAYER (Owner/Sovereign Identity) */}
          <section id="compliance" className="pt-20 border-t border-slate-100 space-y-12">
            <h3 className="text-2xl font-black tracking-tight text-slate-900 leading-none">Compliance & Ownership</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner First Name</label>
                  <input {...register("ownerFirstName")} className={cn("w-full px-8 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-black text-slate-800 text-lg", errors.ownerFirstName && "border-red-400")} />
                  {errors.ownerFirstName && <p className="text-xs text-red-500 font-bold ml-1">{errors.ownerFirstName.message?.toString()}</p>}
               </div>
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner Last Name</label>
                  <input {...register("ownerLastName")} className={cn("w-full px-8 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-black text-slate-800 text-lg", errors.ownerLastName && "border-red-400")} />
                  {errors.ownerLastName && <p className="text-xs text-red-500 font-bold ml-1">{errors.ownerLastName.message?.toString()}</p>}
               </div>
               <div className="space-y-4 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner Principal Email</label>
                  <input {...register("ownerEmail")} className={cn("w-full px-8 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-black text-slate-800 text-lg", errors.ownerEmail && "border-red-400")} />
                  {errors.ownerEmail && <p className="text-xs text-red-500 font-bold ml-1">{errors.ownerEmail.message?.toString()}</p>}
               </div>
               <div className="md:col-span-2 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                  <p className="text-xs font-black text-amber-700 uppercase tracking-widest">🔐 Security Notice</p>
                  <p className="text-sm text-amber-600 mt-1">Owner will be prompted to set their own password on first login. No password is set by the developer.</p>
               </div>
            </div>
          </section>

          {/* Section: ACADEMIC SETUP */}
          <section id="academic" className="pt-20 border-t border-slate-100 space-y-12">
             <h3 className="text-2xl font-black tracking-tight text-slate-900 leading-none">Foundational DNA</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</label>
                   <input {...register("academicYear")} className={cn("w-full px-8 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-black text-slate-800 text-lg", errors.academicYear && "border-red-400")} />
                   {errors.academicYear && <p className="text-xs text-red-500 font-bold ml-1">{errors.academicYear.message?.toString()}</p>}
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                   <input {...register("academicYearStart")} type="date" className={cn("w-full px-8 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-black text-slate-800 text-lg", errors.academicYearStart && "border-red-400")} />
                   {errors.academicYearStart && <p className="text-xs text-red-500 font-bold ml-1">{errors.academicYearStart.message?.toString()}</p>}
                </div>
             </div>
          </section>

          {/* Finalize Trigger */}
          <section id="finalize" className="pt-24 pb-12">
             <button 
                disabled={isLoading || !isValid}
                onClick={handleSubmit(onSubmit)}
                className="w-full py-8 bg-primary hover:bg-primary/90 text-white rounded-3xl font-black text-2xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-20 disabled:grayscale group uppercase"
             >
                {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <>COMMENCE GENESIS <ChevronRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" /></>}
             </button>
             <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">Law 3: Atomic Instantiation Active</p>
          </section>

        </div>
      </div>
    </main>
  );
}
