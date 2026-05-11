"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Shield, Zap, Clock, Smartphone, Fingerprint, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// In a real app, this would be fetched from the backend action every 15 seconds.
// For smooth UI experience, we'll generate the payload structure here, but signature validation happens on the backend.
import { getSovereignIdentity } from "@/lib/actions/identity-actions";

export function AttendanceKiosk() {
  const [token, setToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(15);
  const [schoolId, setSchoolId] = useState("VIVES-001");

  useEffect(() => {
    // We would ideally fetch the true encrypted token from the server.
    // For the UI, we'll generate a time-based string that mimics it.
    const generateToken = () => {
      const timestamp = Math.floor(Date.now() / 1000);
      // Format: SOV2_[SchoolID]_[Timestamp]_[RandomSignature]
      const sig = Math.random().toString(36).substring(2, 10).toUpperCase();
      setToken(`SOV2_${schoolId}_${timestamp}_${sig}`);
      setTimeLeft(15);
    };

    generateToken();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateToken();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [schoolId]);

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-950 overflow-hidden relative font-sans text-slate-50">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Left Side: Branding & Info */}
      <div className="flex-1 p-12 flex flex-col justify-center z-10 relative">
         <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
               <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                  <Shield className="w-8 h-8 text-white" />
               </div>
               <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter text-white">
                     Sovereign <span className="text-blue-500 italic">Sentinel</span>
                  </h1>
                  <p className="text-sm font-bold text-blue-200 uppercase tracking-widest mt-1">
                     Dynamic Kiosk Engine
                  </p>
               </div>
            </div>
            
            <p className="text-xl font-medium text-slate-300 max-w-md leading-relaxed">
               Please open your Sovereign Staff App and scan this secure code to punch in or out.
            </p>
         </div>

         <div className="space-y-6">
            {[
               { icon: Smartphone, title: "Mobile Verification", desc: "Scan using the official Staff App." },
               { icon: Fingerprint, title: "Device Binding", desc: "Locked to your authorized hardware." },
               { icon: Zap, title: "Instant Sync", desc: "Real-time ledger updates across the ERP." }
            ].map((feature, idx) => (
               <div key={idx} className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm max-w-md">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                     <feature.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                     <p className="text-sm font-bold text-white">{feature.title}</p>
                     <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{feature.desc}</p>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Right Side: The QR Code */}
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-12 relative z-10 shadow-2xl">
         
         <div className="absolute top-8 right-8 flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Secure Link Active</span>
         </div>

         <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Scan to Enter</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Dynamic Security Token</p>
         </div>

         <motion.div 
            key={token} // Animate on token change
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-slate-100 relative group"
         >
            {/* Corner Markers for futuristic look */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-blue-600 rounded-tl-xl" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-blue-600 rounded-tr-xl" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-blue-600 rounded-bl-xl" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-blue-600 rounded-br-xl" />

            <QRCodeSVG 
               value={token} 
               size={320} 
               level="H"
               includeMargin={false}
               fgColor="#0f172a" // slate-900
            />
         </motion.div>

         <div className="mt-12 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
               <RefreshCcw className={cn("w-4 h-4", timeLeft <= 3 ? "text-rose-500 animate-spin" : "text-slate-400")} />
               <p className={cn("text-sm font-black uppercase tracking-widest", timeLeft <= 3 ? "text-rose-500" : "text-slate-500")}>
                  Code refreshes in {timeLeft}s
               </p>
            </div>
            
            {/* Progress Bar */}
            <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
               <motion.div 
                  className={cn("h-full rounded-full transition-all duration-1000 ease-linear", timeLeft <= 3 ? "bg-rose-500" : "bg-blue-600")}
                  style={{ width: `${(timeLeft / 15) * 100}%` }}
               />
            </div>
         </div>

      </div>
    </div>
  );
}
