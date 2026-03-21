"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Building2, 
  Hash, 
  Mail, 
  Globe, 
  ArrowRight, 
  CheckCircle2,
  Loader2,
  X
} from "lucide-react";
import { createSchoolAction } from "@/lib/actions/super-admin-actions";

export function SchoolCreationForm({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      schoolId: formData.get("schoolId") as string,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      branchName: formData.get("branchName") as string,
      branchCode: formData.get("branchCode") as string,
      adminEmail: formData.get("adminEmail") as string,
    };

    const result = await createSchoolAction(data);

    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } else {
      setError(result.error || "Failed to create school");
    }
    setIsLoading(false);
  }

  return (
    <div className="p-1">
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* School Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  School Identity
                </h3>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 ml-1">Unique School ID</label>
                  <input
                    required
                    name="schoolId"
                    placeholder="e.g. VIRTUE-HQ"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 ml-1">Full School Name</label>
                  <input
                    required
                    name="name"
                    placeholder="e.g. Virtue Modern School"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 ml-1">Internal Code</label>
                  <input
                    required
                    name="code"
                    placeholder="e.g. VMS"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Branch & Admin Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Initial Deployment
                </h3>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 ml-1">First Branch Name</label>
                  <input
                    required
                    name="branchName"
                    placeholder="e.g. Main Campus"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 ml-1">Branch Code</label>
                  <input
                    required
                    name="branchCode"
                    placeholder="e.g. MAIN"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 ml-1">Owner Email</label>
                  <input
                    required
                    type="email"
                    name="adminEmail"
                    placeholder="owner@school.com"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 font-medium italic mt-1 leading-tight">
                    This email will be the primary access key for the school owner.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold animate-shake">
                <X className="w-5 h-5" />
                {error}
              </div>
            )}

            <button
              disabled={isLoading}
              type="submit"
              className="w-full py-4 bg-slate-900 group hover:bg-black text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Initialize School Instance
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 italic">Instance Ready</h2>
            <p className="text-slate-500 font-bold max-w-xs">
              The school has been successfully registered in the multi-tenant registry.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
