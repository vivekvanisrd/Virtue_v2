"use client";

import React, { useState } from "react";
import { Search, CheckCircle2, AlertCircle, Loader2, Building2 } from "lucide-react";

export default function IFSCTestLab() {
  const [ifsc, setIfsc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulated existing form fields
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");

  const handleValidate = async () => {
    // 1. Auto-sanitize (removes the invisible spaces that caused the Excel errors)
    const cleanIfsc = ifsc.trim().toUpperCase();
    
    // Update input box to show the cleaned version
    setIfsc(cleanIfsc);
    setError(null);
    setResult(null);

    if (cleanIfsc.length !== 11) {
      setError("IFSC must be exactly 11 characters.");
      return;
    }

    setIsLoading(true);

    try {
      // 2. Call the free Razorpay API
      const response = await fetch(`https://ifsc.razorpay.com/${cleanIfsc}`);

      if (response.status === 200) {
        const data = await response.json();
        setResult(data);
        // 3. Smart Auto-fill!
        setBankName(data.BANK);
        setBranchName(data.BRANCH);
      } else if (response.status === 404) {
        setError("Invalid IFSC Code. Bank branch not found in RBI registry.");
        setBankName("");
        setBranchName("");
      } else {
        setError("Validation service temporarily down.");
      }
    } catch (err) {
      setError("Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white max-w-xl w-full p-8 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">IFSC Simulation Lab</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Test the Razorpay Auto-Sanitizer & Validator</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Simulation Input */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
              Test an IFSC Code (Try adding spaces)
            </label>
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-300" />
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                onBlur={handleValidate} // Trigger validation when user clicks away
                onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                placeholder="e.g.   UTIB0001382   "
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 tracking-wider outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
              />
              {isLoading && (
                <div className="absolute right-4">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              )}
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2 ml-2 italic">
              * The validation fires automatically when you click outside the box (onBlur).
            </p>
          </div>

          <div className="h-px bg-slate-100 w-full my-8" />

          {/* Auto-filled Result Fields */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 mb-4">
              Auto-filled Bank Details
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Bank Name</label>
                <input
                  readOnly
                  value={bankName}
                  placeholder="Auto-filled..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Branch Name</label>
                <input
                  readOnly
                  value={branchName}
                  placeholder="Auto-filled..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Status Banners */}
          {error && (
            <div className="mt-6 p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm">Validation Failed</p>
                <p className="text-xs font-medium opacity-80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {result && !error && (
            <div className="mt-6 p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-700 animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm">Valid IFSC Code</p>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-1">
                  Located at: {result.ADDRESS}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
